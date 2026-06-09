import os
import shutil
import datetime
import numpy as np
import pandas as pd
import joblib
import time

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

from app.database import get_db
from app.models import User, Prediction, ModelVersion, Feedback, Dataset
from app.schemas import RenameDatasetRequest
from app.auth import check_admin_role
from app.ml_logic import clean_text, extract_stylometry
from app.ml_globals import get_models, ml_registry, update_global_ai_keywords

try:
    import psutil
except ImportError:
    psutil = None

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
async def get_admin_stats(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    start_time = time.time()
    db.execute(text("SELECT 1"))
    latency_ms = (time.time() - start_time) * 1000
    latency_str = f"{latency_ms:.1f} ms"

    total_users = db.query(User).count()
    total_predictions = db.query(Prediction).count()
    
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    active_accuracy = f"{active_model.accuracy * 100:.2f}%" if active_model else "0.00%"
    
    total_feedback = db.query(Feedback).count()
    
    ai_count = db.query(Prediction).filter(Prediction.prediction_result == "AI").count()
    human_count = db.query(Prediction).filter(Prediction.prediction_result == "Human").count()
    
    daily_activity = []
    
    for i in range(6, -1, -1):
        day = datetime.date.today() - datetime.timedelta(days=i)
        count = db.query(Prediction).filter(
            func.date(Prediction.created_at) == day
        ).count()
        
        daily_activity.append({
            "day": day.strftime("%a"), 
            "count": count
        })
    cpu_usage = 0.0
    ram_usage = 0.0
    if psutil:
        cpu_usage = psutil.cpu_percent(interval=None)
        ram_usage = psutil.virtual_memory().percent
    
    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "active_accuracy": active_accuracy,
        "total_feedback": total_feedback,
        "distribution": {
            "ai_count": ai_count,
            "human_count": human_count
        },
        "daily_activity": daily_activity,
        "server_metrics": {
            "cpu_usage": cpu_usage,
            "ram_usage": ram_usage,
            "latency": latency_str
        }
    }

@router.get("/models")
async def get_model_versions(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    versions = db.query(ModelVersion).order_by(ModelVersion.trained_at.desc()).all()
    return [
        {
            "id": v.id,
            "version_name": v.version_name,
            "accuracy": f"{v.accuracy * 100:.2f}%",
            "f1_score": f"{v.f1_score * 100:.2f}%",
            "is_active": v.is_active,
            "trained_at": v.trained_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for v in versions
    ]

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Format file tidak valid. Mohon unggah file berekstensi .csv")
    
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename_only, file_extension = os.path.splitext(file.filename)
    unique_filename = f"{filename_only}_{timestamp}{file_extension}"
    file_path = f"uploads/{unique_filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        temp_df = pd.read_csv(file_path)
        row_count = len(temp_df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file CSV: {str(e)}")

    new_dataset = Dataset(
        filename=unique_filename,
        file_path=file_path,
        uploaded_by=admin.id,
        row_count=row_count
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    
    return {
        "status": "success",
        "message": f"Dataset {file.filename} berhasil digabungkan dan diunggah.",
        "dataset_id": new_dataset.id,
        "row_count": row_count
    }

@router.post("/retrain/{dataset_id}")
async def retrain_model(
    dataset_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    dataset_record = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset_record:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    try:
        df_new = pd.read_csv(dataset_record.file_path)
        
        if 'text' not in df_new.columns or 'label' not in df_new.columns:
            raise HTTPException(status_code=400, detail="Dataset harus memiliki kolom 'text' dan 'label'.")

        if os.path.exists("final_detection_dataset.csv"):
            df_base = pd.read_csv("final_detection_dataset.csv")
            df_combined = pd.concat([df_base, df_new], ignore_index=True)
            print(f"Berhasil memuat dataset master: {len(df_base)} baris.")
        else:
            df_combined = df_new
            print("Warning: File 'final_detection_dataset.csv' tidak ditemukan. Menggunakan dataset baru sebagai master.")

        df_combined = df_combined.drop_duplicates(subset=['text']).reset_index(drop=True)

        df_combined['clean_text'] = df_combined['text'].apply(clean_text)

        style_features_list = []
        for t in df_combined['clean_text']:
            style_features_list.append(extract_stylometry(t).flatten())
        X_stilo_only = np.array(style_features_list)

        new_tfidf = TfidfVectorizer(max_features=1000)
        X_tfidf_only = new_tfidf.fit_transform(df_combined['clean_text']).toarray()

        X_hybrid = np.hstack((X_tfidf_only, X_stilo_only))
        y_new = df_combined['label']

        X_train_t, X_test_t, y_train, y_test = train_test_split(X_tfidf_only, y_new, test_size=0.2, random_state=42)
        X_train_s, X_test_s, _, _ = train_test_split(X_stilo_only, y_new, test_size=0.2, random_state=42)
        X_train_h, X_test_h, _, _ = train_test_split(X_hybrid, y_new, test_size=0.2, random_state=42)

        model_tfidf = LogisticRegression(max_iter=1000)
        model_tfidf.fit(X_train_t, y_train)
        pred_tfidf = model_tfidf.predict(X_test_t)
        acc_tfidf = accuracy_score(y_test, pred_tfidf)
        f1_tfidf = f1_score(y_test, pred_tfidf)

        model_stilo = LogisticRegression(max_iter=1000)
        model_stilo.fit(X_train_s, y_train)
        pred_stilo = model_stilo.predict(X_test_s)
        acc_stilo = accuracy_score(y_test, pred_stilo)
        f1_stilo = f1_score(y_test, pred_stilo)

        model_hybrid = LogisticRegression(max_iter=1000)
        model_hybrid.fit(X_train_h, y_train)
        pred_hybrid = model_hybrid.predict(X_test_h)
        acc_hybrid = accuracy_score(y_test, pred_hybrid)
        f1_hybrid = f1_score(y_test, pred_hybrid)

        version_code = datetime.datetime.utcnow().strftime("%Y%m%d%H%M")
        model_path = f"models/logistic_model_{version_code}.pkl"
        tfidf_path = f"models/tfidf_vectorizer_{version_code}.pkl"
        
        joblib.dump(model_hybrid, model_path)
        joblib.dump(new_tfidf, tfidf_path)

        shutil.copy(model_path, 'models/logistic_model.pkl')
        shutil.copy(tfidf_path, 'models/tfidf_vectorizer.pkl')
        
        get_models()
        
        db.query(ModelVersion).update({ModelVersion.is_active: False})
        
        new_version_record = ModelVersion(
            version_name=f"v-{version_code}",
            accuracy=acc_hybrid, 
            f1_score=f1_hybrid,
            dataset_id=dataset_id,
            model_path=model_path,
            is_active=True
        )
        db.add(new_version_record)
        db.commit()

        df_combined.to_csv("final_detection_dataset.csv", index=False, encoding="utf-8-sig")

        return {
            "status": "success",
            "message": "Model hibrida berhasil dilatih ulang dan diperbarui ke sistem.",
            "version": f"v-{version_code}",
            "accuracy": f"{acc_hybrid * 100:.2f}%",
            "f1_score": f"{f1_hybrid * 100:.2f}%"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang model: {str(e)}")

@router.get("/datasets")
async def get_uploaded_datasets(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    datasets = db.query(Dataset).order_by(Dataset.upload_date.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "row_count": d.row_count,
            "upload_date": d.upload_date.strftime("%Y-%m-%d %H:%M:%S")
        }
        for d in datasets
    ]

@router.get("/feedback")
async def get_user_feedbacks(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    feedbacks = db.query(Feedback).join(Prediction).order_by(Feedback.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "prediction_id": f.prediction_id,
            "input_text": f.prediction.input_text[:120] + "..." if len(f.prediction.input_text) > 120 else f.prediction.input_text,
            "system_prediction": f.prediction.prediction_result,
            "correct_label": f.correct_label,
            "comment": f.comment,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for f in feedbacks
    ]

@router.post("/models/activate/{model_id}")
async def activate_model_version(
    model_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    target_model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not target_model:
        raise HTTPException(status_code=404, detail="Versi model tidak ditemukan.")
        
    try:
        model_path = target_model.model_path
        tfidf_path = target_model.model_path.replace("logistic_model", "tfidf_vectorizer")
        
        shutil.copy(model_path, 'models/logistic_model.pkl')
        shutil.copy(tfidf_path, 'models/tfidf_vectorizer.pkl')
        
        get_models()
        
        db.query(ModelVersion).update({ModelVersion.is_active: False})
        target_model.is_active = True
        db.commit()
        
        return {
            "status": "success", 
            "message": f"Model versi {target_model.version_name} berhasil diaktifkan kembali."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal melakukan rollback model: {str(e)}")

@router.put("/datasets/{dataset_id}")
async def rename_dataset(
    dataset_id: int,
    data: RenameDatasetRequest,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    new_name = data.new_filename.strip()
    if not new_name.endswith('.csv'):
        new_name += '.csv'
        
    try:
        new_path = f"uploads/{new_name}"
        
        if os.path.exists(dataset.file_path):
            os.rename(dataset.file_path, new_path)
            
        dataset.filename = new_name
        dataset.file_path = new_path
        db.commit()
        
        return {"status": "success", "message": f"Dataset berhasil diubah namanya menjadi {new_name}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mengubah nama file: {str(e)}")

@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    try:
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
            
        db.delete(dataset)
        db.commit()
        
        return {"status": "success", "message": "Dataset dan berkas fisik berhasil dihapus secara permanen!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal menghapus dataset: {str(e)}")

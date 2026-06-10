import os
import shutil
import datetime
from huggingface_hub import HfApi
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
from app.ml_globals import load_active_models as get_models, ml_registry, update_global_ai_keywords

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

    global model, tfidf 

    dataset_record = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset_record:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    try:
        # 1. LOAD DATA
        df_new = pd.read_csv(dataset_record.file_path)
        
        # Validasi kolom
        if 'text' not in df_new.columns or 'label' not in df_new.columns:
            raise HTTPException(status_code=400, detail="Dataset harus memiliki kolom 'text' dan 'label'.")

        # 2. PENGGABUNGAN DATA (Anti Catastrophic Forgetting)
        if os.path.exists("final_detection_dataset.csv"):
            df_base = pd.read_csv("final_detection_dataset.csv")
            df_combined = pd.concat([df_base, df_new], ignore_index=True)
        else:
            df_combined = df_new

        df_combined = df_combined.drop_duplicates(subset=['text']).reset_index(drop=True)
        df_combined['clean_text'] = df_combined['text'].apply(clean_text)

        # 3. EKSTRAKSI FITUR STILOMETRI (7 DIMENSI)
        style_features_list = []
        print(f"Memulai ekstraksi stilometri untuk {len(df_combined)} baris...")
        
        for t in df_combined['clean_text']:
            feat = extract_stylometry(t)
            # Pastikan feat adalah list/array dengan 7 elemen
            style_features_list.append(feat.values if hasattr(feat, 'values') else feat)

        style_features_np = np.array(style_features_list)

        # 4. EKSTRAKSI TF-IDF BARU (FITUL ULANG)
        # Sangat penting: Gunakan fit_transform untuk dataset gabungan
        new_tfidf_vectorizer = TfidfVectorizer(max_features=1000)
        X_tfidf_only = new_tfidf_vectorizer.fit_transform(df_combined['clean_text']).toarray()

        # 5. GABUNGKAN FITUR HIBRIDA (1.007 DIMENSI)
        X_hybrid = np.hstack((X_tfidf_only, style_features_np))
        
        # FIX LABEL MAPPING: Pastikan label adalah integer
        # Kita buat fleksibel (bisa menangani string atau angka)
        y_new = df_combined['label'].apply(lambda x: 1 if str(x).lower() in ['1', 'ai'] else 0)

        # 6. SPLIT DATA & TRAINING (Ablation Study)
        X_train_h, X_test_h, y_train, y_test = train_test_split(X_hybrid, y_new, test_size=0.2, random_state=42)

        # Model Hibrida Utama
        model_hybrid = LogisticRegression(max_iter=1000)
        model_hybrid.fit(X_train_h, y_train)
        
        # Evaluasi
        y_pred = model_hybrid.predict(X_test_h)
        acc_hybrid = float(accuracy_score(y_test, y_pred))
        f1_h = float(f1_score(y_test, y_pred))

        # 7. DEFINISI PATH (Pastikan keduanya punya versi timestamp)
        version_code = datetime.datetime.utcnow().strftime("%Y%m%d%H%M")
        
        # File Aktif Utama
        active_model_path = 'models/logistic_model.pkl'
        active_tfidf_path = 'models/tfidf_vectorizer.pkl'
        
        # File Arsip/Cadangan (Wajib sepasang!)
        archive_model_path = f"models/logistic_model_{version_code}.pkl"
        archive_tfidf_path = f"models/tfidf_vectorizer_{version_code}.pkl"

        # 8. SIMPAN KE HARDDISK LOKAL (Total 4 file)
        joblib.dump(model_hybrid, active_model_path)
        joblib.dump(new_tfidf_vectorizer, active_tfidf_path)
        joblib.dump(model_hybrid, archive_model_path) 
        joblib.dump(new_tfidf_vectorizer, archive_tfidf_path)

        # 9. RELOAD MEMORI BACKEND
        global model, tfidf
        model = model_hybrid
        tfidf = new_tfidf_vectorizer
        update_global_ai_keywords()

        # -----------------------------------------------------------------
        # LOGIKA PERMANEN: UPLOAD SEMUA KE REPO (TAB FILES)
        # -----------------------------------------------------------------
        hf_token = os.getenv("HF_TOKEN")
        repo_id = "shouwiku/detectai-backend" 

        if hf_token:
            try:
                from huggingface_hub import HfApi
                api = HfApi()
                print(f"[HF-HUB] Sinkronisasi sepasang model versi {version_code}...")

                # A. Upload Model (Aktif & Arsip)
                api.upload_file(path_or_fileobj=active_model_path, path_in_repo=active_model_path, repo_id=repo_id, repo_type="space", token=hf_token)
                api.upload_file(path_or_fileobj=archive_model_path, path_in_repo=archive_model_path, repo_id=repo_id, repo_type="space", token=hf_token)

                # B. Upload TF-IDF (Aktif & Arsip)
                api.upload_file(path_or_fileobj=active_tfidf_path, path_in_repo=active_tfidf_path, repo_id=repo_id, repo_type="space", token=hf_token)
                api.upload_file(path_or_fileobj=archive_tfidf_path, path_in_repo=archive_tfidf_path, repo_id=repo_id, repo_type="space", token=hf_token)

                print(f"[HF-HUB] BERHASIL! Model dan TF-IDF versi {version_code} telah diunggah.")
            except Exception as hf_err:
                print(f"[HF-HUB ERROR] Gagal upload: {str(hf_err)}")
        
        # 10. UPDATE DATABASE (Simpan path arsip agar bisa di-rollback nantinya)
        db.query(ModelVersion).update({ModelVersion.is_active: False})
        new_version_record = ModelVersion(
            version_name=f"v-{version_code}",
            accuracy=acc_hybrid, 
            f1_score=f1_h,
            dataset_id=dataset_id,
            model_path=archive_model_path, # Database mencatat file model uniknya
            is_active=True
        )
        db.add(new_version_record)
        db.commit()

        # Update file master CSV
        df_combined.to_csv("final_detection_dataset.csv", index=False, encoding="utf-8-sig")

        return {
            "status": "success",
            "message": "Retraining sukses! Model di server & repositori telah diperbarui.",
            "version": f"v-{version_code}",
            "accuracy": f"{acc_hybrid * 100:.2f}%"
        }
    except Exception as e:
        db.rollback()
        print(f"Error Retrain: {str(e)}")

        model = model_hybrid
        tfidf = new_tfidf_vectorizer
        
        # Update Kata Kunci Dinamis
        update_global_ai_keywords()
        
        # 8. CATAT KE DATABASE
        db.query(ModelVersion).update({ModelVersion.is_active: False})
        
        new_version_record = ModelVersion(
            version_name=f"v-{version_code}",
            accuracy=acc_hybrid, 
            f1_score=f1_h,
            dataset_id=dataset_id,
            model_path=f"models/logistic_model_{version_code}.pkl", # Path arsip
            is_active=True
        )
        # Simpan juga file cadangan/arsip
        joblib.dump(model_hybrid, new_version_record.model_path)

        db.add(new_version_record)
        db.commit()

        # Update file master CSV
        df_combined.to_csv("final_detection_dataset.csv", index=False, encoding="utf-8-sig")

        return {
            "status": "success",
            "message": "Model hibrida berhasil dilatih ulang dan diperbarui.",
            "version": f"v-{version_code}",
            "accuracy": f"{acc_hybrid * 100:.2f}%",
            "f1_score": f"{f1_h * 100:.2f}%"
        }

    except Exception as e:
        db.rollback()
        print(f"Error Retrain: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang: {str(e)}")

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

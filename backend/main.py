from fastapi import FastAPI, HTTPException, Depends, status, Request
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import re
import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

# Import dari folder /app
from app.database import get_db
from app.models import User, Prediction, ModelVersion
from app.auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user, 
    check_admin_role
)
from app.ml_logic import clean_text, extract_stylometry

app = FastAPI()

# 1. MIDDLEWARE (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. LOAD MODELS
try:
    model = joblib.load('models/logistic_model.pkl')
    tfidf = joblib.load('models/tfidf_vectorizer.pkl')
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")

# 3. SCHEMAS (Pydantic)
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

class TextRequest(BaseModel):
    text: str


class FeedbackRequest(BaseModel):
    prediction_id: int
    correct_label: str
    comment: Optional[str] = None

# ==============================================================================
# ENDPOINTS
# ==============================================================================

@app.get("/")
def root():
    return {"status": "Online", "message": "AI Detection API with DB is ready"}

# --- AUTH SECTION ---

@app.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username sudah terdaftar")
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(username=user_data.username, password=hashed_pwd, role=user_data.role)
    
    db.add(new_user)
    db.commit()
    return {"message": "User berhasil didaftarkan"}

@app.post("/login")
async def login(user_data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username atau password salah")
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@app.get("/admin/dashboard")
async def admin_dashboard(admin: User = Depends(check_admin_role)):
    return {"message": f"Halo Admin {admin.username}, selamat datang di panel kontrol!"}

# 1. ENDPOINT FEEDBACK (BARU)
@app.post("/feedback")
async def save_feedback(data: FeedbackRequest, db: Session = Depends(get_db)):
    prediction = db.query(Prediction).filter(Prediction.id == data.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Data prediksi tidak ditemukan")
        
    from app.models import Feedback # Import lokal
    new_feedback = Feedback(
        prediction_id=data.prediction_id,
        correct_label=data.correct_label,
        comment=data.comment
    )
    db.add(new_feedback)
    db.commit()
    return {"status": "success", "message": "Terima kasih! Koreksi Anda berhasil disimpan."}

# --- HISTORY SECTION (RUTE YANG SEBELUMNYA HILANG) ---

@app.get("/history")
async def get_user_history(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    print(f"\n[GET /history] Menarik riwayat untuk user: {current_user.username}")
    
    predictions = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.created_at.desc()).all()
    
    return [
        {
            "id": p.id,
            "input_text": p.input_text[:100] + "..." if len(p.input_text) > 100 else p.input_text,
            "prediction_result": p.prediction_result,
            "confidence": f"{p.confidence * 100:.2f}%",
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for p in predictions
    ]

# --- PREDICTION SECTION ---

@app.post("/predict")
async def predict(
    text_request: TextRequest, 
    request: Request, 
    db: Session = Depends(get_db)
):
    try:
        cleaned = clean_text(text_request.text)
        style_feat = extract_stylometry(cleaned)
        tfidf_feat = tfidf.transform([cleaned]).toarray()
        combined = np.hstack((tfidf_feat, style_feat))
        
        prediction = model.predict(combined)[0]
        probability = model.predict_proba(combined)[0]
        
        res_label = "AI" if prediction == 1 else "Human"
        conf_value = float(probability[prediction])
        
        # Ekstrak nilai stilometri mentah untuk dikirim ke frontend
        # style_feat memiliki struktur [[avg_sent_len, lex_div, punct_dens]]
        raw_avg_sent = float(style_feat[0][0])
        raw_lex_div = float(style_feat[0][1])
        raw_punct_dens = float(style_feat[0][2])

        logged_user_id = None
        authorization = request.headers.get("Authorization")
        
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.split(" ")[1]
                from jose import jwt
                from app.auth import SECRET_KEY, ALGORITHM
                
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                username: str = payload.get("sub")
                user = db.query(User).filter(User.username == username).first()
                if user:
                    logged_user_id = user.id
            except Exception:
                pass

        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        model_v_id = active_model.id if active_model else None

        new_prediction = Prediction(
            input_text=text_request.text,
            prediction_result=res_label,
            confidence=conf_value,
            model_version_id=model_v_id,
            user_id=logged_user_id 
        )
        
        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)
        
        return {
            "status": "success",
            "prediction": res_label,
            "confidence": f"{conf_value*100:.2f}%",
            "prediction_id": new_prediction.id,
            # KIRIM NILAI DATA STILOMETRI KE FRONTEND
            "stylometry": {
                "avg_sent_len": f"{raw_avg_sent:.1f} kata/kalimat",
                "lex_div": f"{raw_lex_div * 100:.1f}% kosakata unik",
                "punct_dens": f"{raw_punct_dens * 100:.1f}% kerapatan tanda baca"
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import os
import shutil
from fastapi import UploadFile, File

# Pastikan folder penyimpanan uploads dan models ada di server
os.makedirs("uploads", exist_ok=True)
os.makedirs("models", exist_ok=True)

# ==============================================================================
# ENDPOINTS KHUSUS ADMINISTRATOR (DILINDUNGI JWT & ROLE CHECK)
# ==============================================================================

# 1. API UNTUK MENGAMBIL STATISTIK DASHBOARD ADMIN
# ==============================================================================
# UPDATE: API STATISTIK ADMIN (DENGAN DATA GRAFIK KOMPREHENSIF)
# ==============================================================================
@app.get("/admin/stats")
async def get_admin_stats(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    # 1. Hitung data dasar
    total_users = db.query(User).count()
    total_predictions = db.query(Prediction).count()
    
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    active_accuracy = f"{active_model.accuracy * 100:.2f}%" if active_model else "0.00%"
    
    from app.models import Feedback
    total_feedback = db.query(Feedback).count()
    
    # 2. Hitung distribusi hasil klasifikasi
    ai_count = db.query(Prediction).filter(Prediction.prediction_result == "AI").count()
    human_count = db.query(Prediction).filter(Prediction.prediction_result == "Human").count()
    
    # 3. Hitung aktivitas 7 hari terakhir (Menggunakan func.date yang 100% presisi)
    daily_activity = []
    print("\n=== DEBUG AKTIVITAS HARIAN ===")
    
    for i in range(6, -1, -1):
        day = datetime.date.today() - datetime.timedelta(days=i)
        
        # Bandingkan HANYA tanggalnya saja, abaikan jam menit detik (sangat aman)
        count = db.query(Prediction).filter(
            func.date(Prediction.created_at) == day
        ).count()
        
        daily_activity.append({
            "day": day.strftime("%a"), 
            "count": count
        })
        print(f"Tanggal: {day} ({day.strftime('%a')}) -> Jumlah Deteksi: {count}")
        
    print("==============================\n")
    
    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "active_accuracy": active_accuracy,
        "total_feedback": total_feedback,
        "distribution": {
            "ai_count": ai_count,
            "human_count": human_count
        },
        "daily_activity": daily_activity
    }

# 2. API UNTUK MENGAMBIL DAFTAR RIWAYAT VERSI MODEL
@app.get("/admin/models")
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

# 3. API UNTUK UNGGAH DATASET CSV BARU
@app.post("/admin/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Format file tidak valid. Mohon unggah file berekstensi .csv")
    
    file_path = f"uploads/{file.filename}"
    
    # Simpan file secara fisik ke folder uploads
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Hitung jumlah baris data di dalam CSV
    try:
        temp_df = pd.read_csv(file_path)
        row_count = len(temp_df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file CSV: {str(e)}")

    # Catat riwayat unggahan ke tabel datasets di MySQL
    from app.models import Dataset # Import lokal
    new_dataset = Dataset(
        filename=file.filename,
        file_path=file_path,
        uploaded_by=admin.id,
        row_count=row_count
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    
    return {
        "status": "success",
        "message": f"Dataset {file.filename} berhasil diunggah.",
        "dataset_id": new_dataset.id,
        "row_count": row_count
    }

# 4. API UNTUK MEMICU PROSES TRAINING ULANG (RETRAINING SYSTEM)
@app.post("/admin/retrain/{dataset_id}")
async def retrain_model(
    dataset_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    # Cari informasi dataset di database
    from app.models import Dataset # Import lokal
    dataset_record = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset_record:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    try:
        # Load dataset baru
        df_new = pd.read_csv(dataset_record.file_path)
        
        # Validasi kolom minimum
        if 'text' not in df_new.columns or 'label' not in df_new.columns:
            raise HTTPException(status_code=400, detail="Dataset harus memiliki kolom 'text' dan 'label'.")

        # A. Preprocessing
        df_new['clean_text'] = df_new['text'].apply(clean_text)

        # B. Ekstraksi Fitur Stilometri
        print("Mengekstrak fitur stilometri...")
        style_features_list = []
        for t in df_new['clean_text']:
            style_features_list.append(extract_stylometry(t).flatten())
        style_features = np.array(style_features_list)

        # C. Ekstraksi Fitur TF-IDF
        print("Membangun model TF-IDF baru...")
        new_tfidf = TfidfVectorizer(max_features=1000)
        tfidf_matrix = new_tfidf.fit_transform(df_new['clean_text']).toarray()

        # Gabungkan Fitur
        X_new = np.hstack((tfidf_matrix, style_features))
        y_new = df_new['label']

        # Split Data (80% Train, 20% Test)
        X_train, X_test, y_train, y_test = train_test_split(X_new, y_new, test_size=0.2, random_state=42)

        # D. Training Model Logistic Regression Baru
        print("Melatih model baru...")
        new_model = LogisticRegression(max_iter=1000)
        new_model.fit(X_train, y_train)

        # E. Evaluasi Performa
        from sklearn.metrics import accuracy_score, f1_score
        y_pred = new_model.predict(X_test)
        acc = float(accuracy_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred))

        # F. Menyimpan Model Fisik Baru ke Folder Server
        # Gunakan nama versi berbasis waktu unik untuk versioning
        version_code = datetime.datetime.utcnow().strftime("%Y%m%d%H%M")
        model_path = f"models/logistic_model_{version_code}.pkl"
        tfidf_path = f"models/tfidf_vectorizer_{version_code}.pkl"
        
        joblib.dump(new_model, model_path)
        joblib.dump(new_tfidf, tfidf_path)

        # G. PERBARUI FILE MODEL UTAMA YANG SEDANG AKTIF
        # Ini agar API /predict langsung menggunakan model baru tanpa harus restart server
        shutil.copy(model_path, 'models/logistic_model.pkl')
        shutil.copy(tfidf_path, 'models/tfidf_vectorizer.pkl')
        
        # Muat ulang model ke memori backend
        global model, tfidf
        model = joblib.load('models/logistic_model.pkl')
        tfidf = joblib.load('models/tfidf_vectorizer.pkl')

        # H. UPDATE DATABASE (Nonaktifkan semua model lama, aktifkan model baru)
        db.query(ModelVersion).update({ModelVersion.is_active: False})
        
        new_version_record = ModelVersion(
            version_name=f"v-{version_code}",
            accuracy=acc,
            f1_score=f1,
            dataset_id=dataset_id,
            model_path=model_path,
            is_active=True
        )
        db.add(new_version_record)
        db.commit()

        return {
            "status": "success",
            "message": "Model berhasil dilatih ulang dan diperbarui ke sistem produksi.",
            "version": f"v-{version_code}",
            "accuracy": f"{acc * 100:.2f}%",
            "f1_score": f"{f1 * 100:.2f}%"
        }

    except Exception as e:
        db.rollback()
        print(f"Error training: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang model: {str(e)}")

# ==============================================================================
# API TAMBAHAN UNTUK AKTIVASI MODEL & AUDIT FEEDBACK (ADMIN)
# ==============================================================================

# 1. API UNTUK MENGAMBIL DAFTAR DATASET YANG SUDAH DIUPLOAD
@app.get("/admin/datasets")
async def get_uploaded_datasets(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    from app.models import Dataset
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

# 2. API UNTUK MENGAMBIL DAFTAR FEEDBACK DARI USER (JOIN TABLE)
@app.get("/admin/feedback")
async def get_user_feedbacks(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    from app.models import Feedback, Prediction
    # Lakukan JOIN table antara Feedback dan Predictions untuk mengambil teks input yang dikoreksi
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

# 3. API UNTUK MENGAKTIFKAN KEMBALI MODEL VERSI LAMA (ROLLBACK SYSTEM)
@app.post("/admin/models/activate/{model_id}")
async def activate_model_version(
    model_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    target_model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not target_model:
        raise HTTPException(status_code=404, detail="Versi model tidak ditemukan.")
        
    try:
        # Tentukan file model (.pkl) dan vectorizer (.pkl) target
        model_path = target_model.model_path
        tfidf_path = target_model.model_path.replace("logistic_model", "tfidf_vectorizer")
        
        # Salin file target menjadi file utama pkl
        shutil.copy(model_path, 'models/logistic_model.pkl')
        shutil.copy(tfidf_path, 'models/tfidf_vectorizer.pkl')
        
        # Muat ulang (reload) model ke memori backend
        global model, tfidf
        model = joblib.load('models/logistic_model.pkl')
        tfidf = joblib.load('models/tfidf_vectorizer.pkl')
        
        # Update status is_active di database MySQL
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

if __name__ == "__main__":
    import uvicorn
    # Menggunakan string "main:app" agar mode reload otomatis aktif
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
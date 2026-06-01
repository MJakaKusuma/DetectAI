from fastapi import FastAPI, HTTPException, Depends, status, Request, UploadFile, File
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import re
import datetime
import os
import shutil
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

# IMPORT Scikit-Learn (Penting untuk Retraining)
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

# ==============================================================================
# INISIALISASI DIRECTORY & APP
# ==============================================================================
os.makedirs("uploads", exist_ok=True)
os.makedirs("models", exist_ok=True)

app = FastAPI()

app = FastAPI()

# 1. MIDDLEWARE (CORS) ... (tetap sama) ...

# ==============================================================================
# SISTEM EKSTRAKSI KATA KUNCI AI DINAMIS (BACKEND XAI)
# ==============================================================================
global_ai_keywords = []

def update_global_ai_keywords():
    """Mengambil 15 kata dengan koefisien positif terbesar beserta nilainya"""
    global global_ai_keywords, model, tfidf
    try:
        feature_names = tfidf.get_feature_names_out()
        coefs = model.coef_[0]
        tfidf_coefs = coefs[:len(feature_names)]
        
        word_coef_pairs = list(zip(feature_names, tfidf_coefs))
        sorted_pairs = sorted(word_coef_pairs, key=lambda x: x[1], reverse=True)
        
        # UBAH MENJADI FORMAT OBJEK (Mencatat Kata dan Nilai Koefisiennya)
        global_ai_keywords = [
            {"word": pair[0], "weight": float(pair[1])} 
            for pair in sorted_pairs[:15]
        ]
        print(f"\n[XAI] Berhasil memuat 15 kata kunci AI berbobot dinamis.")
    except Exception as e:
        print(f"\n[XAI Warning] Gagal mengekstrak kata kunci: {e}. Menggunakan fallback.")
        # fallback_words = ["komprehensif", "signifikan", "optimal", "fundamentalis", "sehingga", "oleh karena itu", "efisiensi", "integrasi", "transparansi", "fleksibilitas"]
        # Fallback menggunakan nilai desimal menurun
        global_ai_keywords = [
            {"word": word, "weight": float(10 - idx) / 2} 
            for idx, word in enumerate
        ]
# LOAD MODELS (DENGAN RE-CALCULATION KATA KUNCI)
try:
    model = joblib.load('models/logistic_model.pkl')
    tfidf = joblib.load('models/tfidf_vectorizer.pkl')
    print("Model loaded successfully!")
    update_global_ai_keywords() # <--- Jalankan fungsi ekstraksi di awal booting
except Exception as e:
    print(f"Error loading model: {e}")

# Middleware CORS agar Next.js diizinkan memanggil API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# LOAD MODEL UTAMA (Saat Booting Server)
try:
    model = joblib.load('models/logistic_model.pkl')
    tfidf = joblib.load('models/tfidf_vectorizer.pkl')
    print("Model loaded successfully!")
    update_global_ai_keywords()
except Exception as e:
    print(f"Error loading model: {e}")

# ==============================================================================
# SCHEMAS (Pydantic Models)
# ==============================================================================
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
# ENDPOINTS PUBLIK & PENGGUNA BIASA
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

# --- SYSTEM FEEDBACK ---

@app.post("/feedback")
async def save_feedback(data: FeedbackRequest, db: Session = Depends(get_db)):
    prediction = db.query(Prediction).filter(Prediction.id == data.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Data prediksi tidak ditemukan")
        
    from app.models import Feedback
    new_feedback = Feedback(
        prediction_id=data.prediction_id,
        correct_label=data.correct_label,
        comment=data.comment
    )
    db.add(new_feedback)
    db.commit()
    return {"status": "success", "message": "Terima kasih! Koreksi Anda berhasil disimpan."}

# --- USER PREDICTION HISTORY ---

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

# --- CORE PREDICTION PIPELINE ---

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
        
        # Ekstrak nilai stilometri mentah
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
            "stylometry": {
                "avg_sent_len": f"{raw_avg_sent:.1f} kata/kalimat",
                "lex_div": f"{raw_lex_div * 100:.1f}% kosakata unik",
                "punct_dens": f"{raw_punct_dens * 100:.1f}% kerapatan tanda baca"
            },
            "ai_keywords": global_ai_keywords
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# ENDPOINTS ADMINISTRATOR (DILINDUNGI JWT & ROLE CHECK)
# ==============================================================================

# 1. API STATISTIK DASHBOARD ADMIN (DENGAN VISUALISASI)
@app.get("/admin/stats")
async def get_admin_stats(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_predictions = db.query(Prediction).count()
    
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    active_accuracy = f"{active_model.accuracy * 100:.2f}%" if active_model else "0.00%"
    
    from app.models import Feedback
    total_feedback = db.query(Feedback).count()
    
    ai_count = db.query(Prediction).filter(Prediction.prediction_result == "AI").count()
    human_count = db.query(Prediction).filter(Prediction.prediction_result == "Human").count()
    
    daily_activity = []
    print("\n=== DEBUG AKTIVITAS HARIAN ===")
    
    for i in range(6, -1, -1):
        day = datetime.date.today() - datetime.timedelta(days=i)
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

# 2. API DAFTAR RIWAYAT VERSI MODEL
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

# 3. API UNTUK MENERIMA FILE DATASET DARI DATASETMERGER FRONTEND
@app.post("/admin/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Format file tidak valid. Mohon unggah file berekstensi .csv")
    
    # KUNCI INTEGRASI: Tambahkan timestamp unik pada nama file agar tidak saling menimpa
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename_only, file_extension = os.path.splitext(file.filename)
    unique_filename = f"{filename_only}_{timestamp}{file_extension}"
    file_path = f"uploads/{unique_filename}"
    
    # Simpan file secara fisik ke folder /uploads
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        temp_df = pd.read_csv(file_path)
        row_count = len(temp_df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file CSV: {str(e)}")

    # Catat riwayat unggahan ke tabel datasets di MySQL
    from app.models import Dataset
    new_dataset = Dataset(
        filename=unique_filename, # Simpan nama unik di DB
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

# 4. API UNTUK TRAINING ULANG MODEL MENGGUNAKAN METODE PENGGABUNGAN DATASET (MLOPS RUN)
@app.post("/admin/retrain/{dataset_id}")
async def retrain_model(
    dataset_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    # Cari informasi dataset di database
    from app.models import Dataset
    dataset_record = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset_record:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    try:
        # Load dataset baru yang baru digabungkan di Next.js
        df_new = pd.read_csv(dataset_record.file_path)
        
        # Validasi kolom minimum pada data baru
        if 'text' not in df_new.columns or 'label' not in df_new.columns:
            raise HTTPException(status_code=400, detail="Dataset harus memiliki kolom 'text' dan 'label'.")

        # LOGIKA PENGGABUNGAN AUTOMATIS (Mencegah Catastrophic Forgetting)
        if os.path.exists("final_detection_dataset.csv"):
            df_base = pd.read_csv("final_detection_dataset.csv")
            df_combined = pd.concat([df_base, df_new], ignore_index=True)
            print(f"Berhasil memuat dataset master: {len(df_base)} baris.")
        else:
            df_combined = df_new
            print("Warning: File 'final_detection_dataset.csv' tidak ditemukan. Menggunakan dataset baru sebagai master.")

        # Buang teks yang duplikat
        df_combined = df_combined.drop_duplicates(subset=['text']).reset_index(drop=True)

        # Cetak log penggabungan data secara visual di terminal
        print("\n" + "="*50)
        print("=== PROSES SINKRONISASI & RETRAINING DATASET ===")
        print(f"Data Baru Terbaca   : {len(df_new)} baris")
        print(f"Total Data Gabungan (Tanpa Duplikat): {len(df_combined)} baris")
        print("="*50 + "\n")

        # A. Preprocessing
        df_combined['clean_text'] = df_combined['text'].apply(clean_text)

        # B. Ekstraksi Fitur Stilometri (Feature Engineering)
        print("Mengekstrak fitur stilometri data gabungan...")
        style_features_list = []
        for t in df_combined['clean_text']:
            style_features_list.append(extract_stylometry(t).flatten())
        X_stilo_only = np.array(style_features_list)

        # C. Ekstraksi Fitur TF-IDF
        print("Membangun model TF-IDF baru dari data gabungan...")
        new_tfidf = TfidfVectorizer(max_features=1000)
        X_tfidf_only = new_tfidf.fit_transform(df_combined['clean_text']).toarray()

        # Gabungkan Fitur untuk Skenario Hibrida
        X_hybrid = np.hstack((X_tfidf_only, X_stilo_only))
        y_new = df_combined['label']

        # Split Data untuk Ketiga Skenario (Adu Adil dengan random_state=42)
        X_train_t, X_test_t, y_train, y_test = train_test_split(X_tfidf_only, y_new, test_size=0.2, random_state=42)
        X_train_s, X_test_s, _, _ = train_test_split(X_stilo_only, y_new, test_size=0.2, random_state=42)
        X_train_h, X_test_h, _, _ = train_test_split(X_hybrid, y_new, test_size=0.2, random_state=42)

        # -----------------------------------------------------------------
        # PROSES EVALUASI KOMPARATIF (ABLATION STUDY ONLINE)
        # -----------------------------------------------------------------
        print("Mengevaluasi skenario komparatif fitur...")

        # Skenario 1: TF-IDF Saja
        model_tfidf = LogisticRegression(max_iter=1000)
        model_tfidf.fit(X_train_t, y_train)
        pred_tfidf = model_tfidf.predict(X_test_t)
        acc_tfidf = accuracy_score(y_test, pred_tfidf)
        f1_tfidf = f1_score(y_test, pred_tfidf)

        # Skenario 2: Stilometri Saja
        model_stilo = LogisticRegression(max_iter=1000)
        model_stilo.fit(X_train_s, y_train)
        pred_stilo = model_stilo.predict(X_test_s)
        acc_stilo = accuracy_score(y_test, pred_stilo)
        f1_stilo = f1_score(y_test, pred_stilo)

        # Skenario 3: Hibrida (TF-IDF + Stilometri)
        model_hybrid = LogisticRegression(max_iter=1000)
        model_hybrid.fit(X_train_h, y_train)
        pred_hybrid = model_hybrid.predict(X_test_h)
        acc_hybrid = accuracy_score(y_test, pred_hybrid)
        f1_hybrid = f1_score(y_test, pred_hybrid)

        # Cetak Tabel Perbandingan Langsung di Terminal Backend
        print("\n" + "="*60)
        print("   ABLATION STUDY DI LEVEL PRODUKSI (WEB RETRAINING)")
        print("="*60)
        print(f"{'Skenario Pengujian':<30} | {'Accuracy':<10} | {'F1-Score':<10}")
        print("-"*60)
        print(f"{'1. TF-IDF Saja (1000 Fitur)':<30} | {acc_tfidf:<10.4f} | {f1_tfidf:<10.4f}")
        print(f"{'2. Stilometri Saja (3 Fitur)':<30} | {acc_stilo:<10.4f} | {f1_stilo:<10.4f}")
        print(f"{'3. Hibrida (TF-IDF + Stilo)':<30} | {acc_hybrid:<10.4f} | {f1_hybrid:<10.4f}")
        print("="*60 + "\n")
        # -----------------------------------------------------------------

        # F. Menyimpan Model Fisik Baru ke Folder Server
        version_code = datetime.datetime.utcnow().strftime("%Y%m%d%H%M")
        model_path = f"models/logistic_model_{version_code}.pkl"
        tfidf_path = f"models/tfidf_vectorizer_{version_code}.pkl"
        
        joblib.dump(model_hybrid, model_path)
        joblib.dump(new_tfidf, tfidf_path)

        # G. PERBARUI FILE MODEL UTAMA YANG SEDANG AKTIF
        shutil.copy(model_path, 'models/logistic_model.pkl')
        shutil.copy(tfidf_path, 'models/tfidf_vectorizer.pkl')
        
        # Muat ulang model hibrida ke memori aktif backend
        global model, tfidf
        model = joblib.load('models/logistic_model.pkl')
        tfidf = joblib.load('models/tfidf_vectorizer.pkl')

        # H. UPDATE DATABASE (Nonaktifkan model lama, aktifkan model hibrida baru)
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

        # I. UPDATE FILE DATASET MASTER FISIK DI SERVER
        df_combined.to_csv("final_detection_dataset.csv", index=False, encoding="utf-8-sig")
        print("[Log] Berkas 'final_detection_dataset.csv' berhasil diperbarui di server.")

        return {
            "status": "success",
            "message": "Model hibrida berhasil dilatih ulang dan diperbarui ke sistem.",
            "version": f"v-{version_code}",
            "accuracy": f"{acc_hybrid * 100:.2f}%",
            "f1_score": f"{f1_hybrid * 100:.2f}%"
        }

    except Exception as e:
        db.rollback()
        print(f"Error training: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang model: {str(e)}")

# --- ADMIN API: DATASET LIST ---
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

# --- ADMIN API: AUDIT FEEDBACK ---
@app.get("/admin/feedback")
async def get_user_feedbacks(
    admin: User = Depends(check_admin_role), 
    db: Session = Depends(get_db)
):
    from app.models import Feedback, Prediction
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

# --- ADMIN API: ROLLBACK ACTIVATION ---
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
        model_path = target_model.model_path
        tfidf_path = target_model.model_path.replace("logistic_model", "tfidf_vectorizer")
        
        shutil.copy(model_path, 'models/logistic_model.pkl')
        shutil.copy(tfidf_path, 'models/tfidf_vectorizer.pkl')
        
        global model, tfidf
        model = joblib.load('models/logistic_model.pkl')
        tfidf = joblib.load('models/tfidf_vectorizer.pkl')
        
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

# 1. Tambahkan skema request untuk ganti nama di bagian atas schemas/models
class RenameDatasetRequest(BaseModel):
    new_filename: str

# 2. API UNTUK MENGUBAH NAMA DATASET (DATABASE & FISIK)
@app.put("/admin/datasets/{dataset_id}")
async def rename_dataset(
    dataset_id: int,
    data: RenameDatasetRequest,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    from app.models import Dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    new_name = data.new_filename.strip()
    if not new_name.endswith('.csv'):
        new_name += '.csv'
        
    try:
        new_path = f"uploads/{new_name}"
        
        # Ubah nama file fisik di harddisk server jika ada
        if os.path.exists(dataset.file_path):
            os.rename(dataset.file_path, new_path)
            
        # Perbarui data di database MySQL
        dataset.filename = new_name
        dataset.file_path = new_path
        db.commit()
        
        return {"status": "success", "message": f"Dataset berhasil diubah namanya menjadi {new_name}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mengubah nama file: {str(e)}")

# 3. API UNTUK MENGHAPUS DATASET SECARA PERMANEN (DATABASE & FISIK)
@app.delete("/admin/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    from app.models import Dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan di database.")
        
    try:
        # Hapus file fisik di harddisk server agar menghemat penyimpanan disk
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
            
        # Hapus record dari database MySQL
        db.delete(dataset)
        db.commit()
        
        return {"status": "success", "message": "Dataset dan berkas fisik berhasil dihapus secara permanen!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal menghapus dataset: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import re
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# IMPORT DARI FILE database.py
from app.ml_logic import clean_text, extract_stylometry
from app.database import get_db, Prediction, ModelVersion # <--- Tambahkan ini

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    model = joblib.load('logistic_model.pkl')
    tfidf = joblib.load('tfidf_vectorizer.pkl')
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")

class TextRequest(BaseModel):
    text: str

@app.get("/")
def root():
    return {"status": "Online", "message": "AI Detection API with DB is ready"}

@app.post("/predict")
async def predict(request: TextRequest, db: Session = Depends(get_db)): # <--- Tambahkan db session
    try:
        # 1. Proses ML (Sama seperti sebelumnya)
        cleaned = clean_text(request.text)
        style_feat = extract_stylometry(cleaned)
        tfidf_feat = tfidf.transform([cleaned]).toarray()
        combined = np.hstack((tfidf_feat, style_feat))
        
        prediction = model.predict(combined)[0]
        probability = model.predict_proba(combined)[0]
        
        res_label = "AI" if prediction == 1 else "Human"
        conf_value = float(probability[prediction])
        
        # -----------------------------------------------------------------
        # BAGIAN DATABASE: SIMPAN HASIL KE MYSQL
        # -----------------------------------------------------------------
        # Cari tahu model versi mana yang sedang aktif saat ini
        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        model_v_id = active_model.id if active_model else None

        # Buat record baru untuk tabel predictions
        new_prediction = Prediction(
            input_text=request.text,
            prediction_result=res_label,
            confidence=conf_value,
            model_version_id=model_v_id,
            user_id=None # Saat ini masih guest (anonim)
        )
        
        db.add(new_prediction) # Masukkan ke antrean
        db.commit()            # Simpan permanen ke MySQL
        db.refresh(new_prediction) # Ambil ID yang baru saja dibuat
        # -----------------------------------------------------------------
        
        return {
            "status": "success",
            "prediction": res_label,
            "confidence": f"{conf_value*100:.2f}%",
            "prediction_id": new_prediction.id # Mengirimkan ID dari database
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
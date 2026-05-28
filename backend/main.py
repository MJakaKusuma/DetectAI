from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import re
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Prediction, ModelVersion
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, check_admin_role
from app.ml_logic import clean_text, extract_stylometry

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    model = joblib.load('models/logistic_model.pkl')
    tfidf = joblib.load('models/tfidf_vectorizer.pkl')
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

class TextRequest(BaseModel):
    text: str

@app.get("/")
def root():
    return {"status": "Online", "message": "AI Detection API is ready"}

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

@app.post("/predict")
async def predict(request: TextRequest, db: Session = Depends(get_db)):
    try:
        cleaned = clean_text(request.text)
        style_feat = extract_stylometry(cleaned)
        tfidf_feat = tfidf.transform([cleaned]).toarray()
        combined = np.hstack((tfidf_feat, style_feat))
        
        prediction = model.predict(combined)[0]
        probability = model.predict_proba(combined)[0]
        
        res_label = "AI" if prediction == 1 else "Human"
        conf_value = float(probability[prediction])
        
        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        model_v_id = active_model.id if active_model else None

        new_prediction = Prediction(
            input_text=request.text,
            prediction_result=res_label, # Perhatikan jika ada // lagi
            confidence=conf_value,
            model_version_id=model_v_id
        )
        # PERBAIKAN: Gunakan res_label (tanpa //)
        new_prediction.prediction_result = res_label 
        
        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction) # Perbaiki jadi new_prediction
        
        return {
            "status": "success",
            "prediction": res_label,
            "confidence": f"{conf_value*100:.2f}%",
            "prediction_id": new_prediction.id
        }
    except Exception as e:
        print(f"Error Detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
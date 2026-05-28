from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from app.ml_logic import clean_text, extract_stylometry

app = FastAPI()

# Agar Next.js bisa akses API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# LOAD "OTAK" MODEL
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
    return {"status": "Online", "message": "AI Detection API is ready"}

@app.post("/predict")
async def predict(request: TextRequest):
    try:
        # 1. Preprocess
        cleaned = clean_text(request.text)
        # 2. Stylometry
        style_feat = extract_stylometry(cleaned)
        # 3. TF-IDF
        tfidf_feat = tfidf.transform([cleaned]).toarray()
        # 4. Combine
        combined = np.hstack((tfidf_feat, style_feat))
        # 5. Predict
        prediction = model.predict(combined)[0]
        probability = model.predict_proba(combined)[0]
        
        return {
            "prediction": "AI" if prediction == 1 else "Human",
            "confidence": f"{probability[prediction]*100:.2f}%"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
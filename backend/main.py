from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import re
from fastapi.middleware.cors import CORSMiddleware

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

# Fungsi Preprocessing (Harus sama persis dengan app.py)
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_stylometry(text):
    sentences = text.split('.')
    sentences = [s for s in sentences if len(s) > 0]
    words = text.split()
    avg_sent_len = len(words) / len(sentences) if len(sentences) > 0 else 0
    lex_div = len(set(words)) / len(words) if len(words) > 0 else 0
    punct = len(re.findall(r'[.,!?;:]', text))
    punct_dens = punct / len(words) if len(words) > 0 else 0
    return np.array([avg_sent_len, lex_div, punct_dens]).reshape(1, -1)

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
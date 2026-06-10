from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
import numpy as np

from app.database import get_db
from app.models import User, Prediction, ModelVersion, Feedback
from app.schemas import TextRequest, FeedbackRequest
from app.auth import get_current_user, SECRET_KEY, ALGORITHM
from app.ml_logic import clean_text, extract_stylometry
from app.ml_globals import ml_registry

router = APIRouter()

@router.post("/feedback")
async def save_feedback(data: FeedbackRequest, db: Session = Depends(get_db)):
    prediction = db.query(Prediction).filter(Prediction.id == data.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Data prediksi tidak ditemukan")
        
    new_feedback = Feedback(
        prediction_id=data.prediction_id,
        correct_label=data.correct_label,
        comment=data.comment
    )
    db.add(new_feedback)
    db.commit()
    return {"status": "success", "message": "Terima kasih! Koreksi Anda berhasil disimpan."}

@router.get("/history")
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


@router.post("/predict")
async def predict(
    text_request: TextRequest, 
    request: Request, 
    db: Session = Depends(get_db)
):
    if ml_registry.model is None or ml_registry.tfidf is None:
        raise HTTPException(status_code=503, detail=f"Model belum dimuat. Silakan periksa server. Detail Error: {ml_registry.model_loading_error}")

    try:
        cleaned = clean_text(text_request.text)

        tfidf_feat = ml_registry.tfidf.transform([cleaned]).toarray()
        style_feat = np.array(extract_stylometry(cleaned)).reshape(1, -1)

        combined = np.hstack((tfidf_feat, style_feat))

        prediction = ml_registry.model.predict(combined)[0]
        if combined.shape[1] != 1007:
            raise HTTPException(status_code=500, detail="Feature mismatch")
        probability = ml_registry.model.predict_proba(combined)[0]

    except Exception as e:
        print("ERROR PREDICT:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    
    try:
        
        res_label = "AI" if prediction == 1 else "Human"
        conf_value = float(np.max(probability))
        
        # Ekstrak nilai stilometri mentah
        raw_avg_sent = float(style_feat[0][0])
        raw_lex_div = float(style_feat[0][1])
        raw_punct_dens = float(style_feat[0][2])
        raw_sent_len_var = float(style_feat[0][3])
        raw_noun_dens = float(style_feat[0][4])
        raw_verb_dens = float(style_feat[0][5])
        raw_adj_dens = float(style_feat[0][6])

        logged_user_id = None
        authorization = request.headers.get("Authorization")
        
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.split(" ")[1]
                from jose import jwt
                
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                username: str = payload.get("sub")
                if username:
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
                "punct_dens": f"{raw_punct_dens * 100:.1f}% kerapatan tanda baca",
                "sent_len_var": f"{raw_sent_len_var:.1f} standar deviasi",
                "noun_dens": f"{raw_noun_dens * 100:.1f}% kata benda",
                "verb_dens": f"{raw_verb_dens * 100:.1f}% kata kerja",
                "adj_dens": f"{raw_adj_dens * 100:.1f}% kata sifat"
            },
            "ai_keywords": ml_registry.ai_keywords
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        print("TFIDF shape:", tfidf_feat.shape)
        print("STYLO shape:", style_feat.shape)
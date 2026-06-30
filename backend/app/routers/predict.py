from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
import numpy as np
from jose import jwt
from scipy.sparse import hstack, csr_matrix

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
        raise HTTPException(
            status_code=503, 
            detail=f"Model belum dimuat. Silakan periksa server. Detail Error: {ml_registry.model_loading_error}"
        )

    # 1. Pemotongan Otomatis: Memotong teks masukan per paragraf (Paragraph Chunking)
    raw_paragraphs = [p.strip() for p in text_request.text.split("\n") if p.strip()]
    if not raw_paragraphs:
        raise HTTPException(status_code=400, detail="Teks masukan kosong atau tidak valid.")

    chunks_result = []
    total_ai_prob = 0.0
    valid_chunks_count = 0

    # Digunakan untuk kepentingan debug log di akhir eksekusi
    tfidf_shapes = []
    stylo_shapes = []

    try:
        for idx, paragraph in enumerate(raw_paragraphs):
            cleaned = clean_text(paragraph)
            words_count = len(cleaned.split())

            # Melewati paragraf yang terlalu pendek (misal: judul bab pendek atau nama penulis)
            if words_count < 3:
                prob = [0.5, 0.5]  # Probabilitas netral [Human, AI]
            else:
                # Transformasi leksikal TF-IDF (Sparse Matrix)
                tfidf_feat = ml_registry.tfidf.transform([cleaned])
                tfidf_shapes.append(tfidf_feat.shape)
                
                # Ekstraksi stilometri 35 dimensi
                style_feat_list = extract_stylometry(cleaned)
                style_feat_sparse = csr_matrix([style_feat_list])
                stylo_shapes.append(style_feat_sparse.shape)

                # Menggabungkan fitur hibrida secara sparse (hstack)
                combined = hstack([tfidf_feat, style_feat_sparse]).tocsr()

                # Penskalaan fitur hibrida menggunakan MaxAbsScaler
                if ml_registry.scaler is not None:
                    combined = ml_registry.scaler.transform(combined)

                # Validasi kesesuaian jumlah dimensi fitur
                expected_features = ml_registry.model.n_features_in_
                if combined.shape[1] != expected_features:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Feature mismatch pada paragraf ke-{idx+1}: Model membutuhkan {expected_features} fitur, tetapi input menghasilkan {combined.shape[1]}."
                    )

                # Prediksi probabilitas dari model
                prob = ml_registry.model.predict_proba(combined)[0]

            # Akumulasi nilai probabilitas AI untuk agregasi dokumen
            total_ai_prob += prob[1]
            valid_chunks_count += 1

            # Tentukan hasil klasifikasi parsial untuk paragraf ini
            chunk_label = "AI" if prob[1] > 0.5 else "Human"
            chunk_conf = float(prob[1] if prob[1] > 0.5 else prob[0])

            chunks_result.append({
                "paragraph_index": idx,
                "text": paragraph,
                "prediction": chunk_label,
                "confidence": f"{chunk_conf * 100:.2f}%",
                "probability_ai": float(prob[1])
            })

        # Agregasi Hasil Akhir (Global Prediction) berdasarkan rata-rata probabilitas AI
        avg_ai_prob = total_ai_prob / valid_chunks_count if valid_chunks_count > 0 else 0.5
        global_prediction = "AI" if avg_ai_prob > 0.5 else "Human"
        global_confidence = avg_ai_prob if avg_ai_prob > 0.5 else (1.0 - avg_ai_prob)

        # Ekstraksi statistik stilometri global (seluruh dokumen) untuk kompatibilitas frontend
        global_cleaned = clean_text(text_request.text)
        global_style_list = extract_stylometry(global_cleaned)

        raw_avg_sent = float(global_style_list[0])       # index 0: avg_sent_len
        raw_sent_len_var = float(global_style_list[1])   # index 1: sent_len_var
        raw_lex_div = float(global_style_list[6])        # index 6: lex_div
        raw_punct_dens = float(global_style_list[11])    # index 11: punct_dens
        raw_noun_dens = float(global_style_list[23])     # index 23: noun_dens
        raw_verb_dens = float(global_style_list[24])     # index 24: verb_dens
        raw_adj_dens = float(global_style_list[25])      # index 25: adj_dens

    except Exception as e:
        print("ERROR PREDICT CHUNKING:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    
    try:
        # Autentikasi Pengguna Opsional dari Token Bearer
        logged_user_id = None
        authorization = request.headers.get("Authorization")
        
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.split(" ")[1]
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

        # Menyimpan Log Hasil Prediksi Global Ke Database SQL
        new_prediction = Prediction(
            input_text=text_request.text,
            prediction_result=global_prediction,
            confidence=global_confidence,
            model_version_id=model_v_id,
            user_id=logged_user_id 
        )
        
        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)
        
        return {
            "status": "success",
            "prediction": global_prediction,
            "confidence": f"{global_confidence * 100:.2f}%",
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
            "ai_keywords": ml_registry.ai_keywords,
            "chunks": chunks_result  # <-- Next.js Anda dapat memetakan sorotan merah di UI menggunakan data ini!
        }
    except Exception as e:
        print(f"Error Database Log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Pengecekan aman untuk logging ke konsol server tanpa memicu NameError
        print(f"Selesai memproses dokumen. Jumlah paragraf: {len(raw_paragraphs)}")
        if tfidf_shapes:
            print("Contoh TFIDF shape (Sparse):", tfidf_shapes[0])
        if stylo_shapes:
            print("Contoh STYLO shape (Sparse):", stylo_shapes[0])
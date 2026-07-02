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
        # INDENTASI LEVEL 1: Blok try utama (Lekukan 8 spasi)
        for idx, paragraph in enumerate(raw_paragraphs):
            # INDENTASI LEVEL 2: Blok di dalam wilayah 'for' (Lekukan 12 spasi)
            cleaned = clean_text(paragraph)
            words_count = len(cleaned.split())

            # INDENTASI LEVEL 3: Blok pengujian di dalam wilayah 'for' (Lekukan 16 spasi)
            if words_count < 15:
                # Lewati evaluasi model. Beri status "Neutral" (Bebas Highlight di Next.js)
                # JANGAN tambahkan ke total_ai_prob agar tidak menyeret turun rata-rata dokumen!
                chunks_result.append({
                    "chunk_index": idx,
                    "text": paragraph,
                    "prediction": "Neutral",
                    "confidence": "N/A",
                    "probability_ai": 0.5
                })
            else:
                # HANYA EVALUASI PARAGRAF RELEVAN (YANG MEMILIKI PANJANG >= 15 KATA)
                tfidf_feat = ml_registry.tfidf.transform([cleaned])
                tfidf_shapes.append(tfidf_feat.shape)
                
                style_feat_list = extract_stylometry(paragraph)
                style_feat_sparse = csr_matrix([style_feat_list])
                stylo_shapes.append(style_feat_sparse.shape)

                combined = hstack([tfidf_feat, style_feat_sparse]).tocsr()

                if ml_registry.scaler is not None:
                    combined = ml_registry.scaler.transform(combined)

                expected_features = ml_registry.model.n_features_in_
                if combined.shape[1] != expected_features:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Feature mismatch pada paragraf ke-{idx+1}: Model membutuhkan {expected_features} fitur, tetapi input menghasilkan {combined.shape[1]}."
                    )

                prob = ml_registry.model.predict_proba(combined)[0]

                # Akumulasi nilai HANYA untuk paragraf isi yang valid (panjang)
                total_ai_prob += prob[1]
                valid_chunks_count += 1

                chunk_label = "AI" if prob[1] > 0.5 else "Human"
                chunk_conf = float(prob[1] if prob[1] > 0.5 else prob[0])
                chunk_conf_scaled = 0.5 + 0.5 * np.power((chunk_conf - 0.5) / 0.5, 0.6)

                chunks_result.append({
                    "chunk_index": idx,
                    "text": paragraph,
                    "prediction": chunk_label,
                    "confidence": f"{chunk_conf_scaled * 100:.2f}%",
                    "probability_ai": float(prob[1])
                })

        # --- SELESAI PERULANGAN FOR ---
        # Baris di bawah ini ditarik mundur sejajar dengan 'for' (Lekukan 8 spasi)
        avg_ai_prob = total_ai_prob / valid_chunks_count if valid_chunks_count > 0 else 0.5
        global_prediction = "AI" if avg_ai_prob > 0.5 else "Human"
        global_confidence_raw = avg_ai_prob if avg_ai_prob > 0.5 else (1.0 - avg_ai_prob)
        
        # --- PERBAIKAN 2: KALIBRASI PROBABILITAS GLOBAL (GAMMA = 0.6) ---
        global_confidence_scaled = 0.5 + 0.5 * np.power((global_confidence_raw - 0.5) / 0.5, 0.6)

        # --- PERBAIKAN 3: MEMETAKAN SELURUH 35 DIMENSI FITUR STILOMETRI DARI TEKS ASLI ---
        global_style_list = extract_stylometry(text_request.text)

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

        # Menyimpan Log Hasil Prediksi Global Ke Database SQL (Gunakan nilai float terkalibrasi)
        new_prediction = Prediction(
            input_text=text_request.text,
            prediction_result=global_prediction,
            confidence=global_confidence_scaled,
            model_version_id=model_v_id,
            user_id=logged_user_id 
        )
        
        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)
        
        # --- PERBAIKAN 4: INTEGRASI PAYLOAD STILOMETRI LENGKAP KE NEXT.JS ---
        return {
            "status": "success",
            "prediction": global_prediction,
            "confidence": f"{global_confidence_scaled * 100:.2f}%",
            "prediction_id": new_prediction.id,
            "stylometry": {
                # Kategori A: Panjang & Ritme Kalimat (6 Fitur)
                "avg_sent_len": f"{global_style_list[0]:.1f} kata/kalimat",
                "sent_len_var": f"{global_style_list[1]:.1f} standar deviasi",
                "avg_word_len": f"{global_style_list[2]:.1f} karakter/kata",
                "total_sentences": f"{int(global_style_list[3])} kalimat",
                "total_words": f"{int(global_style_list[4])} kata",
                "char_count": f"{int(global_style_list[5])} karakter",
                
                # Kategori B: Kekayaan Kosakata (5 Fitur)
                "lex_div": f"{global_style_list[6] * 100:.1f}% kosakata unik",
                "guiraud_index": f"{global_style_list[7]:.2f}",
                "herdan_index": f"{global_style_list[8]:.2f}",
                "hapax_ratio": f"{global_style_list[9] * 100:.1f}%",
                "yules_i": f"{global_style_list[10]:.2f}",
                
                # Kategori C: Tanda Baca & Karakter (12 Fitur)
                "punct_dens": f"{global_style_list[11] * 100:.1f}% kerapatan tanda baca",
                "comma_ratio": f"{global_style_list[12] * 100:.1f}%",
                "period_ratio": f"{global_style_list[13] * 100:.1f}%",
                "qmark_ratio": f"{global_style_list[14] * 100:.1f}%",
                "excl_ratio": f"{global_style_list[15] * 100:.1f}%",
                "colon_ratio": f"{global_style_list[16] * 100:.1f}%",
                "semicolon_ratio": f"{global_style_list[17] * 100:.1f}%",
                "hyphen_ratio": f"{global_style_list[18] * 100:.1f}%",
                "quote_ratio": f"{global_style_list[19] * 100:.1f}%",
                "bracket_ratio": f"{global_style_list[20] * 100:.1f}%",
                "uppercase_ratio": f"{global_style_list[21] * 100:.2f}%",
                "digit_ratio": f"{global_style_list[22] * 100:.2f}%",
                
                # Kategori D: Tata Bahasa (POS Density)
                "noun_dens": f"{global_style_list[23] * 100:.1f}%",
                "verb_dens": f"{global_style_list[24] * 100:.1f}%",
                "adj_dens": f"{global_style_list[25] * 100:.1f}%",
                "pronoun_dens": f"{global_style_list[26] * 100:.1f}%",
                "conj_dens": f"{global_style_list[27] * 100:.1f}%",
                "prep_dens": f"{global_style_list[28] * 100:.1f}%",
                "adv_dens": f"{global_style_list[29] * 100:.1f}%",
                "num_dens": f"{global_style_list[30] * 100:.1f}%",
                "foreign_dens": f"{global_style_list[31] * 100:.1f}%",
                "interj_dens": f"{global_style_list[32] * 100:.1f}%",
                "det_dens": f"{global_style_list[33] * 100:.1f}%",
                "part_dens": f"{global_style_list[34] * 100:.1f}%"
            },
            "ai_keywords": ml_registry.ai_keywords,
            "chunks_highlights": chunks_result  # <-- SINKRON: Menggunakan key 'chunks_highlights' untuk Next.js Anda!
        }
    except Exception as e:
        print(f"Error Database Log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        print(f"Selesai memproses dokumen. Jumlah paragraf: {len(raw_paragraphs)}")
        if tfidf_shapes:
            print("Contoh TFIDF shape (Sparse):", tfidf_shapes[0])
        if stylo_shapes:
            print("Contoh STYLO shape (Sparse):", stylo_shapes[0])
import joblib
import os
import traceback
from app.database import SessionLocal
from app.models import ModelVersion

class MLRegistry:
    model = None
    tfidf = None
    scaler = None  # <-- Ditambahkan slot scaler untuk MaxAbsScaler
    ai_keywords = []
    model_loading_error = "Belum ada upaya pemuatan" 

ml_registry = MLRegistry()

def update_global_ai_keywords():
    try:
        if ml_registry.tfidf is None or ml_registry.model is None:
            return
        feature_names = ml_registry.tfidf.get_feature_names_out()
        coefs = ml_registry.model.coef_[0]
        tfidf_coefs = coefs[:len(feature_names)]
        word_coef_pairs = list(zip(feature_names, tfidf_coefs))
        sorted_pairs = sorted(word_coef_pairs, key=lambda x: x[1], reverse=True)
        ml_registry.ai_keywords = [
            {"word": pair[0], "weight": float(pair[1])} 
            for pair in sorted_pairs[:15]
        ]
        print("[XAI] Keywords updated successfully.")
    except Exception as e:
        print(f"⚠️ XAI Error: {repr(e)}")

def load_active_models():
    db = SessionLocal()
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        print("[System] Menghubungi database untuk mencari model aktif...")
        active_info = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        
        if active_info:
            clean_path = active_info.model_path.replace("models/", "") if active_info.model_path.startswith("models/") else active_info.model_path
            
            m_path = os.path.join(base_dir, "models", clean_path)
            t_path = m_path.replace("logistic_model", "tfidf_vectorizer")
            s_path = m_path.replace("logistic_model", "scaler_style")  # Mappings ke scaler pkl
            
            print(f"[System] Mencoba memuat berkas di:\n - Model: {m_path}\n - TF-IDF: {t_path}\n - Scaler: {s_path}")
            
            if os.path.exists(m_path):
                ml_registry.model = joblib.load(m_path)
                ml_registry.tfidf = joblib.load(t_path)
                
                # Memuat scaler secara dinamis jika tersedia
                if os.path.exists(s_path):
                    ml_registry.scaler = joblib.load(s_path)
                    print("✅ Scaler berhasil dimuat.")
                else:
                    ml_registry.scaler = None
                    print("⚠️ WARNING: Scaler tidak ditemukan. Inferensi berjalan tanpa penskalaan.")
                
                ml_registry.model_loading_error = None
                update_global_ai_keywords()
                print(f"✅ SUKSES: Model {active_info.version_name} aktif di memori.")
            else:
                ml_registry.model_loading_error = f"File fisik tidak ditemukan di server. Jalur: {m_path}"
                print(f"❌ ERROR: {ml_registry.model_loading_error}")
        else:
            ml_registry.model_loading_error = "Tidak ada model yang ditandai 'is_active' di MySQL."
            print(f"⚠️ WARNING: {ml_registry.model_loading_error}")

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        ml_registry.model_loading_error = f"Tipe: {error_type} | Pesan: {error_msg}"
        print(f"❌ CRASH FATAL: {ml_registry.model_loading_error}")
        traceback.print_exc()
    finally:
        db.close()
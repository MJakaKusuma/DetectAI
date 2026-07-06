import joblib
import os
import traceback
from huggingface_hub import hf_hub_download
from app.database import SessionLocal
from app.models import ModelVersion

class MLRegistry:
    model = None
    tfidf = None
    scaler = None
    ai_keywords = []
    model_loading_error = "Belum ada upaya pemuatan" 

ml_registry = MLRegistry()

def update_global_ai_keywords():
    try:
        if ml_registry.tfidf is not None and ml_registry.model is not None:
            # Mengambil fitur-fitur leksikal teratas yang memengaruhi klasifikasi AI
            feature_names = ml_registry.tfidf.get_feature_names_out()
            coefficients = ml_registry.model.coef_[0][:500]  # Hanya fitur leksikal
            top_indices = coefficients.argsort()[-10:][::-1]
            ml_registry.ai_keywords = [
                {"word": feature_names[idx], "weight": float(coefficients[idx])}
                for idx in top_indices
            ]
            print("[XAI] Kata kunci AI berhasil diperbarui di memori.")
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
            s_path = m_path.replace("logistic_model", "scaler_style")
            
            print(f"[System] Memverifikasi keberadaan file fisik di disk lokal kontainer...")
            
            # LOGIKA AUTO-DOWNLOAD: Jika file tidak ditemukan secara lokal, tarik langsung dari Hugging Face Hub
            if not os.path.exists(m_path):
                print(f"[System] File {clean_path} tidak ditemukan secara lokal.")
                print(f"[System] Memulai proses sinkronisasi dari repositori shouwiku/detectai-models...")
                try:
                    os.makedirs(os.path.join(base_dir, "models"), exist_ok=True)
                    
                    # 1. Unduh file model biner
                    hf_hub_download(
                        repo_id="shouwiku/detectai-models",
                        filename=f"models/{clean_path}",
                        local_dir=base_dir,
                        repo_type="model"
                    )
                    
                    # 2. Unduh file TF-IDF Vectorizer biner
                    tfidf_filename = clean_path.replace("logistic_model", "tfidf_vectorizer")
                    hf_hub_download(
                        repo_id="shouwiku/detectai-models",
                        filename=f"models/{tfidf_filename}",
                        local_dir=base_dir,
                        repo_type="model"
                    )
                    
                    # 3. Unduh file MaxAbsScaler biner
                    scaler_filename = clean_path.replace("logistic_model", "scaler_style")
                    hf_hub_download(
                        repo_id="shouwiku/detectai-models",
                        filename=f"models/{scaler_filename}",
                        local_dir=base_dir,
                        repo_type="model"
                    )
                    print("✅ [MLOps SUCCESS] Sinkronisasi trilogi model biner berhasil diselesaikan.")
                except Exception as hf_err:
                    print(f"❌ [HF-HUB DOWNLOAD ERROR] Gagal mengunduh file biner: {str(hf_err)}")
                    # Jalur fallback menggunakan model dasar default jika unduhan gagal
                    m_path = os.path.join(base_dir, "models", "logistic_model.pkl")
                    t_path = os.path.join(base_dir, "models", "tfidf_vectorizer.pkl")
                    s_path = os.path.join(base_dir, "models", "scaler_style.pkl")
                    print(f"[System] Fallback diaktifkan. Mencoba memuat file default.")
            
            # Memuat objek biner dari lokal disk ke memori aktif server
            if os.path.exists(m_path):
                ml_registry.model = joblib.load(m_path)
                ml_registry.tfidf = joblib.load(t_path)
                
                if os.path.exists(s_path):
                    ml_registry.scaler = joblib.load(s_path)
                    print("✅ SUKSES: MaxAbsScaler berhasil dimuat ke memori aktif.")
                else:
                    ml_registry.scaler = None
                    print("⚠️ WARNING: Scaler tidak ditemukan. Inferensi berjalan tanpa penskalaan.")
                    
                ml_registry.model_loading_error = None
                update_global_ai_keywords()
                print(f"✅ SUKSES: Model {active_info.version_name} aktif di memori runtime.")
            else:
                ml_registry.model_loading_error = f"File fisik tidak ditemukan di server lokal maupun cloud. Jalur: {m_path}"
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
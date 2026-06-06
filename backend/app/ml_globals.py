import joblib
import os

class MLRegistry:
    model = None
    tfidf = None
    ai_keywords = []

ml_registry = MLRegistry()

def update_global_ai_keywords():
    try:
        if ml_registry.tfidf is None or ml_registry.model is None:
            print("[XAI Warning] Model atau TF-IDF belum dimuat.")
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
        print(f"\n[XAI] Berhasil memuat 15 kata kunci AI berbobot dinamis.")
    except Exception as e:
        print(f"\n[XAI Warning] Gagal mengekstrak kata kunci: {e}. Menggunakan fallback.")
        ml_registry.ai_keywords = []

def load_models():
    try:
        ml_registry.model = joblib.load('models/logistic_model.pkl')
        ml_registry.tfidf = joblib.load('models/tfidf_vectorizer.pkl')
        print("Model loaded successfully!")
        update_global_ai_keywords()
    except Exception as e:
        print(f"Error loading model: {e}")

import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# KUNCI INTEGRASI: Impor logika ekstraktor terpusat dari app/ml_logic.py
# Ini memastikan logika training offline dan prediksi online selalu sinkron 100%
from app.ml_logic import clean_text, extract_stylometry

# Pastikan direktori penyimpanan models ada di server
os.makedirs("models", exist_ok=True)

# ==============================================================================
# 1. MEMUAT DATASET UTAMA (CORPUS DATA)
# ==============================================================================
try:
    df = pd.read_csv("uploads/final_detection_dataset_app.csv")
    print(f"Dataset loaded successfully: {len(df)} rows")
except Exception as e:
    print(f"Error loading dataset: {e}. Pastikan berkas 'final_detection_dataset_app.csv' berada di direktori yang sama.")
    exit()

# ==============================================================================
# 2. PROSES PRA-PEMROSESAN DATA (PREPROCESSING)
# ==============================================================================
print("Pembersihan naskah teks (Preprocessing)...")
df['clean_text'] = df['text'].apply(clean_text)

# ==============================================================================
# 3. EKSTRAKSI FITUR STILOMETRI (7 DIMENSI BARU DENGAN NLP-ID & NUMPY)
# ==============================================================================
# SESUDAH (Mengaktifkan Progress Bar untuk Pandas)
print("Ekstraksi 7 fitur stilometrik dokumen menggunakan nlp-id & numpy...")
from tqdm import tqdm
tqdm.pandas() # Mengaktifkan integrasi progress bar ke Pandas

# Ganti '.apply' menjadi '.progress_apply'
df[['avg_sent_len', 'lex_div', 'punct_dens', 'sent_len_var', 'noun_dens', 'verb_dens', 'adj_dens']] = df['clean_text'].progress_apply(extract_stylometry)

# ==============================================================================
# 4. EKSTRAKSI FITUR TF-IDF & MATRIKS MATEMATIKA
# ==============================================================================
print("Ekstraksi pembobotan kata TF-IDF (1.000 fitur teratas)...")
tfidf = TfidfVectorizer(max_features=1000)
tfidf_matrix = tfidf.fit_transform(df['clean_text']).toarray()

# Memisahkan Matriks Fitur Masing-Masing Skenario
X_tfidf_only = tfidf_matrix

# Skenario 2: Hanya Stilometri (Kini menggunakan 7 kolom baru!)
X_stilo_only = df[['avg_sent_len', 'lex_div', 'punct_dens', 'sent_len_var', 'noun_dens', 'verb_dens', 'adj_dens']].values

# Skenario 3 Hibrida: Menggabungkan TF-IDF dan Stilometri (1.007 Dimensi)
X_hybrid = np.hstack((tfidf_matrix, X_stilo_only))

y = df['label']

# ==============================================================================
# 5. PEMBAGIAN DATA LATIH & DATA UJI (80% Train, 20% Test)
# ==============================================================================
X_train_t, X_test_t, y_train, y_test = train_test_split(X_tfidf_only, y, test_size=0.2, random_state=42)
X_train_s, X_test_s, _, _ = train_test_split(X_stilo_only, y, test_size=0.2, random_state=42)
X_train_h, X_test_h, _, _ = train_test_split(X_hybrid, y, test_size=0.2, random_state=42)

# ==============================================================================
# 6. PENILAIAN KOMPARATIF METODOLOGIS (ABLATION STUDY 1.007 DIMENSI)
# ==============================================================================
print("\nMengevaluasi skenario komparatif fitur...")

# Skenario 1: TF-IDF Saja (Leksikal)
model_tfidf = LogisticRegression(max_iter=1000)
model_tfidf.fit(X_train_t, y_train)
pred_tfidf = model_tfidf.predict(X_test_t)
acc_tfidf = accuracy_score(y_test, pred_tfidf)
f1_tfidf = f1_score(y_test, pred_tfidf)

# Skenario 2: Stilometri Saja (Kini menggunakan 7 Fitur hasil POS Tagging & Burstiness!)
model_stilo = LogisticRegression(max_iter=1000)
model_stilo.fit(X_train_s, y_train)
pred_stilo = model_stilo.predict(X_test_s)
acc_stilo = accuracy_score(y_test, pred_stilo)
f1_stilo = f1_score(y_test, pred_stilo)

# Skenario 3: Hibrida Terpadu (1.007 Fitur)
model_hybrid = LogisticRegression(max_iter=1000)
model_hybrid.fit(X_train_h, y_train)
pred_hybrid = model_hybrid.predict(X_test_h)
acc_hybrid = accuracy_score(y_test, pred_hybrid)
f1_hybrid = f1_score(y_test, pred_hybrid)

# Cetak Tabel Hasil Eksperimen Komparatif untuk Laporan Bab IV
print("\n" + "="*60)
print("     PERBANDINGAN AKURASI FITUR (ABLATION STUDY 1.007 DIMENSI)")
print("="*60)
print(f"{'Skenario Pengujian':<30} | {'Accuracy':<10} | {'F1-Score':<10}")
print("-"*60)
print(f"{'1. TF-IDF Saja (1,000 Fitur)':<30} | {acc_tfidf:<10.4f} | {f1_tfidf:<10.4f}")
print(f"{'2. Stilometri Saja (7 Fitur)':<30} | {acc_stilo:<10.4f} | {f1_stilo:<10.4f}")
print(f"{'3. Hibrida (TF-IDF + Stilo)':<30} | {acc_hybrid:<10.4f} | {f1_hybrid:<10.4f}")
print("="*60 + "\n")

# ==============================================================================
# 7. EVALUASI DETAIL MODEL HIBRIDA UTAMA (PRODUKSI) & PENYIMPANAN
# ==============================================================================
report = classification_report(y_test, pred_hybrid)
conf_matrix = confusion_matrix(y_test, pred_hybrid)

print("Classification Report (Model Hibrida Utama):\n", report)

# Simpan Model Hibrida Fisik langsung ke folder models/
joblib.dump(model_hybrid, 'models/logistic_model.pkl')
joblib.dump(tfidf, 'models/tfidf_vectorizer.pkl')

print("Model Hibrida Utama (1.007 Fitur) dan Vectorizer berhasil disimpan ke folder 'models/'!")

# Visualisasi Confusion Matrix Model Hibrida Utama
plt.figure(figsize=(6,4))
sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', xticklabels=['Human', 'AI'], yticklabels=['Human', 'AI'])
print("\nMenampilkan Confusion Matrix. Tutup jendela grafik untuk menyelesaikan program.")
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix (Model Hibrida Utama 1.007 Fitur)')
plt.show()
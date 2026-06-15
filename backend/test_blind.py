import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from app.ml_logic import clean_text, extract_stylometry
from tqdm import tqdm

# 1. Memuat berkas dataset pengujian eksternal dari folder uploads
# Pastikan berkas CSV eksternal Anda diletakkan pada folder uploads
file_test = "uploads/external_blind_test.csv"

try:
    df_test = pd.read_csv(file_test)
    print(f"Dataset eksternal berhasil dimuat, {len(df_test)} baris")
except Exception as e:
    print(f"Gagal memuat berkas, {e}")
    exit()

# 2. Proses praproses data teks eksternal
print("Pembersihan naskah teks eksternal...")
df_test["clean_text"] = df_test["text"].apply(clean_text)

# 3. Ekstraksi 7 fitur stilometrik dokumen menggunakan nlp-id
print("Ekstraksi 7 fitur stilometrik menggunakan nlp-id & numpy...")
tqdm.pandas()
df_test[["avg_sent_len", "lex_div", "punct_dens", "sent_len_var", "noun_dens", "verb_dens", "adj_dens"]] = df_test["clean_text"].progress_apply(extract_stylometry)

# 4. Memuat model hibrida dan vectorizer dari folder models
try:
    vectorizer = joblib.load("models/tfidf_vectorizer_testing_test.pkl")
    model = joblib.load("models/logistic_model_testing_test.pkl")
    print("Berhasil memuat model dan vectorizer aktif")
except Exception as e:
    print(f"Gagal memuat model, {e}")
    exit()

# 5. Ekstraksi TF-IDF untuk teks eksternal
print("Ekstraksi pembobotan kata TF-IDF...")
tfidf_matrix = vectorizer.transform(df_test["clean_text"]).toarray()

# 6. Menggabungkan fitur leksikal dan stilometrik (1.007 dimensi)
stilo_features = df_test[["avg_sent_len", "lex_div", "punct_dens", "sent_len_var", "noun_dens", "verb_dens", "adj_dens"]].values
X_hybrid_test = np.hstack((tfidf_matrix, stilo_features))
y_test_true = df_test["label"]

# 7. Memisahkan indeks data manusia (label = 0) secara global
human_indices = df_test.index[df_test["label"] == 0].tolist()
n_human = len(human_indices)
print(f"Ditemukan data manusia sebanyak, {n_human} dokumen")

# Wadah untuk menampung ringkasan hasil sub-pengujian
paired_results = []

# 8. Mengeksekusi pengujian berpasangan empat blok secara otomatis
# Program mencari semua nama unik model AI (label = 1) yang ada di kolom model
ai_models = df_test[df_test["label"] == 1]["model"].unique()

for ai_model_name in ai_models:
    # Mengambil indeks baris data untuk model AI spesifik ini
    ai_indices = df_test.index[(df_test["label"] == 1) & (df_test["model"] == ai_model_name)].tolist()
    n_ai = len(ai_indices)
    
    # Menggabungkan indeks 25 manusia dan 25 AI spesifik ini menjadi 50 data seimbang
    combined_indices = human_indices + ai_indices
    
    X_sub = X_hybrid_test[combined_indices]
    y_sub_true = y_test_true.iloc[combined_indices]
    
    # Prediksi label dan estimasi probabilitas menggunakan model hibrida
    y_sub_pred = model.predict(X_sub)
    y_sub_proba = model.predict_proba(X_sub) # Menghasilkan array probabilitas [P(0), P(1)]
    
    # Mengubah y_sub_true menjadi numpy array untuk penyelarasan indeks
    y_sub_true_arr = np.array(y_sub_true)
    
    # Mencari indeks baris data uji yang prediksinya BENAR (TN dan TP)
    tn_local_indices = np.where((y_sub_true_arr == 0) & (y_sub_pred == 0))[0]
    tp_local_indices = np.where((y_sub_true_arr == 1) & (y_sub_pred == 1))[0]
    
    # Mencari indeks baris data uji yang prediksinya SALAH (FP dan FN)
    fp_local_indices = np.where((y_sub_true_arr == 0) & (y_sub_pred == 1))[0]
    fn_local_indices = np.where((y_sub_true_arr == 1) & (y_sub_pred == 0))[0]
    
    # Menghitung rata-rata tingkat keyakinan (confidence score) dalam persen untuk prediksi BENAR
    # Untuk TN (Manusia tepat), kita mengambil rata-rata probabilitas kelas 0 (kolom indeks 0)
    if len(tn_local_indices) > 0:
        mean_conf_tn = np.mean(y_sub_proba[tn_local_indices, 0]) * 100
    else:
        mean_conf_tn = 0.0
        
    # Untuk TP (AI tepat), kita mengambil rata-rata probabilitas kelas 1 (kolom indeks 1)
    if len(tp_local_indices) > 0:
        mean_conf_tp = np.mean(y_sub_proba[tp_local_indices, 1]) * 100
    else:
        mean_conf_tp = 0.0
        
    # Menghitung rata-rata tingkat keyakinan (confidence score) dalam persen untuk prediksi SALAH
    # Untuk FP (Manusia dituduh AI), model memprediksi 1, maka mengambil rata-rata probabilitas kelas 1 (indeks 1)
    if len(fp_local_indices) > 0:
        mean_conf_fp = np.mean(y_sub_proba[fp_local_indices, 1]) * 100
    else:
        mean_conf_fp = 0.0
        
    # Untuk FN (AI lolos/terdeteksi manusia), model memprediksi 0, maka mengambil rata-rata probabilitas kelas 0 (indeks 0)
    if len(fn_local_indices) > 0:
        mean_conf_fn = np.mean(y_sub_proba[fn_local_indices, 0]) * 100
    else:
        mean_conf_fn = 0.0
    
    # Hitung metrik evaluasi seimbang (1,1)
    sub_acc = accuracy_score(y_sub_true, y_sub_pred)
    sub_f1 = f1_score(y_sub_true, y_sub_pred, average="weighted")
    
    # Hitung confusion matrix lokal
    sub_conf = confusion_matrix(y_sub_true, y_sub_pred)
    tn, fp, fn, tp = sub_conf.ravel()
    
    paired_results.append((
        ai_model_name, n_ai, sub_acc, sub_f1, 
        tn, fp, fn, tp, 
        mean_conf_tn, mean_conf_tp, mean_conf_fp, mean_conf_fn
    ))

# 9. Mencetak Tabel Evaluasi Berpasangan Seimbang ke Terminal
print("\n" + "="*110)
print("     HASIL EVALUASI BLIND TEST BERPASANGAN SEIMBANG (RASIO 1,1)")
print("="*110)
print(f"{'Skenario Sub-Pengujian (50 Dokumen)':<35} | {'N (H / AI)':<12} | {'Accuracy':<10} | {'F1-Score':<10} | {'Rata-Rata Confidence'}")
print("-"*110)

for item in paired_results:
    ai_name, n_val, acc, f1, tn, fp, fn, tp, conf_tn, conf_tp, conf_fp, conf_fn = item
    # Menampilkan nama skenario perbandingan
    skenario_label = f"Manusia vs {ai_name}"
    n_label = f"50 ({n_human} / {n_val})"
    conf_label = f"H {conf_tn:.2f}% / AI {conf_tp:.2f}%"
    print(f"{skenario_label:<35} | {n_label:<12} | {acc:<10.4f} | {f1:<10.4f} | {conf_label}")

print("="*110)

# 10. Mencetak rincian Confusion Matrix & Confidence untuk setiap sub-pengujian
print("\n" + "="*85)
print("     DETAIL CONFUSION MATRIX & TINGKAT KEYAKINAN TIAP SUB-PENGUJIAN")
print("="*85)
for item in paired_results:
    ai_name, n_val, acc, f1, tn, fp, fn, tp, conf_tn, conf_tp, conf_fp, conf_fn = item
    print(f"Skenario, Manusia melawan {ai_name}")
    print(f"  True Negative (TN - Manusia Tepat)        , {tn} dokumen (Rata-Rata Keyakinan {conf_tn:.2f}%)")
    print(f"  False Positive (FP - Manusia Salah Tuduh) , {fp} dokumen (Rata-Rata Keyakinan {conf_fp:.2f}%)")
    print(f"  False Negative (FN - AI Lolos)            , {fn} dokumen (Rata-Rata Keyakinan {conf_fn:.2f}%)")
    print(f"  True Positive (TP - AI Tepat)             , {tp} dokumen (Rata-Rata Keyakinan {conf_tp:.2f}%)")
    print("-" * 50)
print("="*85 + "\n")
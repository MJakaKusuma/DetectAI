import pandas as pd
import numpy as np
import joblib
import sys
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# ==============================================================================
# 1. INISIALISASI DAN PEMUATAN DATASET EKSTERNAL
# ==============================================================================
file_test = "uploads/external_blind_test.csv"

try:
    df_test = pd.read_csv(file_test)
    print(f"Dataset eksternal berhasil dimuat, {len(df_test)} baris")
except Exception as e:
    print(f"Gagal memuat berkas, {e}")
    sys.exit(1)

# ==============================================================================
# 2. PROSES PRA-PEMROSESAN DATA TEKS (PREPROCESSING)
# ==============================================================================
try:
    from app.ml_logic import clean_text, extract_stylometry
    from tqdm import tqdm
    print("Sukses mengimpor modul praproses terpusat")
except ImportError:
    print("Gagal mengimpor modul ml_logic atau tqdm dari sistem backend")
    sys.exit(1)

print("Pembersihan naskah teks eksternal...")
df_test["clean_text"] = df_test["text"].apply(clean_text)

print("Ekstraksi 7 fitur stilometrik dokumen menggunakan nlp-id dan numpy...")
tqdm.pandas()
df_test[["avg_sent_len", "lex_div", "punct_dens", "sent_len_var", "noun_dens", "verb_dens", "adj_dens"]] = df_test["clean_text"].progress_apply(extract_stylometry)

# ==============================================================================
# 3. PEMUATAN MODEL AKTIF & EKSTRAKSI FITUR HIBRIDA (1.007 DIMENSI)
# ==============================================================================
try:
    vectorizer = joblib.load("models/tfidf_vectorizer_testing_test.pkl")
    model = joblib.load("models/logistic_model_testing_test.pkl")
    print("Berhasil memuat model dan vectorizer aktif dari folder models")
except Exception as e:
    print(f"Gagal memuat model pkl dari folder, {e}")
    sys.exit(1)

print("Ekstraksi pembobotan kata TF-IDF...")
tfidf_matrix = vectorizer.transform(df_test["clean_text"]).toarray()

# Menggabungkan fitur leksikal dan stilometrik menjadi matriks hibrida tunggal
stilo_features = df_test[["avg_sent_len", "lex_div", "punct_dens", "sent_len_var", "noun_dens", "verb_dens", "adj_dens"]].values
X_hybrid_test = np.hstack((tfidf_matrix, stilo_features))
y_test_true = df_test["label"]

# ==============================================================================
# 4. EKSEKUSI PREDIKSI DAN ESTIMASI PROBABILITAS (INFERENSI)
# ==============================================================================
print("Mengeksekusi pengujian model hibrida...")
y_pred = model.predict(X_hybrid_test)
y_proba = model.predict_proba(X_hybrid_test)

# ==============================================================================
# FASE EVALUASI 1: ANALISIS GLOBAL & INDEPENDEN TIAP MODEL/SUMBER DATA
# ==============================================================================
acc_universal = accuracy_score(y_test_true, y_pred)
prec_universal = precision_score(y_test_true, y_pred, pos_label=1, zero_division=0)
rec_universal = recall_score(y_test_true, y_pred, pos_label=1, zero_division=0)
f1_universal = f1_score(y_test_true, y_pred, average="weighted")
conf_matrix = confusion_matrix(y_test_true, y_pred)
tn, fp, fn, tp = conf_matrix.ravel()

# Mencari indeks baris pengujian yang benar dan salah secara global
correct_global_idx = np.where(y_test_true == y_pred)[0]
incorrect_global_idx = np.where(y_test_true != y_pred)[0]

# Ekstrak tingkat keyakinan (probabilitas kelas yang diprediksi) secara global dalam persen
global_conf_scores = np.array([y_proba[i, pred] for i, pred in enumerate(y_pred)]) * 100

if len(correct_global_idx) > 0:
    mean_conf_correct_global = np.mean(global_conf_scores[correct_global_idx])
else:
    mean_conf_correct_global = 0.0

if len(incorrect_global_idx) > 0:
    mean_conf_incorrect_global = np.mean(global_conf_scores[incorrect_global_idx])
else:
    mean_conf_incorrect_global = 0.0

print("\n" + "="*115)
print("     FASE EVALUASI 1, LAPORAN DIAGNOSTIK BLIND TEST GLOBAL")
print("="*115)
print(f"Total Sampel Uji Eksternal (N)            , {len(df_test)} dokumen")
print(f"Akurasi Akhir Global (Accuracy)           , {acc_universal:.4f}")
print(f"Presisi Akhir Global (Precision)          , {prec_universal:.4f}")
print(f"Recall Akhir Global (Recall)              , {rec_universal:.4f}")
print(f"Skor F1 Akhir Global (F1-Score)           , {f1_universal:.4f}")
print("-"*115)
print(f"True Negative (TN - Manusia Tepat)        , {tn} dokumen")
print(f"False Positive (FP - Manusia Salah Tuduh) , {fp} dokumen")
print(f"False Negative (FN - AI Lolos)            , {fn} dokumen")
print(f"True Positive (TP - AI Tepat)             , {tp} dokumen")
print("-"*115)
print(f"Rerata Keyakinan saat Prediksi BENAR      , {mean_conf_correct_global:.2f}%")
print(f"Rerata Keyakinan saat Prediksi SALAH      , {mean_conf_incorrect_global:.2f}%")
print("="*115)

# Analisis Kinerja dan Tingkat Keyakinan Independen Tiap Model/Sumber
print("\n" + "="*115)
print("     LAPORAN KINERJA & TINGKAT KEYAKINAN KESELURUHAN UNTUK TIAP MODEL/SUMBER SECARA MANDIRI")
print("="*115)
print(f"{'Nama Model / Sumber Data':<25} | {'Sampel (N)':<10} | {'Accuracy':<10} | {'Rerata Conf (Semua)':<18} | {'Rerata Conf (Benar)':<18} | {'Rerata Conf (Salah)'}")
print("-"*115)

for model_name in df_test["model"].unique():
    # Mengambil indeks baris data yang sesuai dengan nama model/sumber saat ini
    indices = df_test.index[df_test["model"] == model_name].tolist()
    n_samples = len(indices)
    
    y_true_sub = y_test_true.iloc[indices].values
    y_pred_sub = y_pred[indices]
    proba_sub = y_proba[indices]
    
    # Hitung akurasi spesifik untuk subset model ini
    acc_sub = accuracy_score(y_true_sub, y_pred_sub)
    
    # Ekstrak tingkat keyakinan (probabilitas kelas yang diprediksi) untuk subset ini
    conf_scores_sub = np.array([proba_sub[i, pred] for i, pred in enumerate(y_pred_sub)]) * 100
    
    # Pisahkan indeks prediksi benar dan salah di dalam subset ini
    correct_idx = np.where(y_true_sub == y_pred_sub)[0]
    incorrect_idx = np.where(y_true_sub != y_pred_sub)[0]
    
    # Hitung rata-rata tingkat keyakinan
    mean_conf_all = np.mean(conf_scores_sub) if len(conf_scores_sub) > 0 else 0.0
    mean_conf_correct = np.mean(conf_scores_sub[correct_idx]) if len(correct_idx) > 0 else 0.0
    mean_conf_incorrect = np.mean(conf_scores_sub[incorrect_idx]) if len(incorrect_idx) > 0 else 0.0
    
    # Format penyajian teks persentase
    conf_all_label = f"{mean_conf_all:.2f}%"
    conf_correct_label = f"{mean_conf_correct:.2f}%"
    
    if len(incorrect_idx) > 0:
        conf_incorrect_label = f"{mean_conf_incorrect:.2f}%"
    else:
        conf_incorrect_label = "0.00% (Tiada Salah)"
    
    print(f"{model_name:<25} | {n_samples:<10} | {acc_sub:<10.4f} | {conf_all_label:<18} | {conf_correct_label:<18} | {conf_incorrect_label}")

print("="*115)

# ==============================================================================
# FASE EVALUASI 2: ANALISIS BERPASANGAN SEIMBANG (RASIO 1,1 - BASIS PATH TESTING)
# ==============================================================================
human_indices = df_test.index[df_test["label"] == 0].tolist()
n_human = len(human_indices)

paired_results = []
ai_models = df_test[df_test["label"] == 1]["model"].unique()

for ai_model_name in ai_models:
    # Mengambil indeks baris data untuk model AI spesifik ini
    ai_indices = df_test.index[(df_test["label"] == 1) & (df_test["model"] == ai_model_name)].tolist()
    n_ai = len(ai_indices)
    
    # Menggabungkan indeks data manusia dan AI spesifik ini menjadi seimbang
    combined_indices = human_indices + ai_indices
    
    X_sub = X_hybrid_test[combined_indices]
    y_sub_true = y_test_true.iloc[combined_indices]
    
    # Ambil hasil prediksi dan probabilitas untuk sub-dataset ini
    y_sub_pred = y_pred[combined_indices]
    y_sub_proba = y_proba[combined_indices]
    
    # Mengubah y_sub_true menjadi numpy array untuk penyelarasan indeks
    y_sub_true_arr = np.array(y_sub_true)
    
    # Mencari indeks baris data uji yang prediksinya BENAR (TN dan TP)
    tn_local_indices = np.where((y_sub_true_arr == 0) & (y_sub_pred == 0))[0]
    tp_local_indices = np.where((y_sub_true_arr == 1) & (y_sub_pred == 1))[0]
    
    # Mencari indeks baris data uji yang prediksinya SALAH (FP dan FN)
    fp_local_indices = np.where((y_sub_true_arr == 0) & (y_sub_pred == 1))[0]
    fn_local_indices = np.where((y_sub_true_arr == 1) & (y_sub_pred == 0))[0]
    
    # Menghitung rata-rata tingkat keyakinan (confidence score) dalam persen untuk prediksi BENAR
    if len(tn_local_indices) > 0:
        mean_conf_tn = np.mean(y_sub_proba[tn_local_indices, 0]) * 100
    else:
        mean_conf_tn = 0.0
        
    if len(tp_local_indices) > 0:
        mean_conf_tp = np.mean(y_sub_proba[tp_local_indices, 1]) * 100
    else:
        mean_conf_tp = 0.0
        
    # Menghitung rata-rata tingkat keyakinan (confidence score) dalam persen untuk prediksi SALAH
    if len(fp_local_indices) > 0:
        mean_conf_fp = np.mean(y_sub_proba[fp_local_indices, 1]) * 100
    else:
        mean_conf_fp = 0.0
        
    if len(fn_local_indices) > 0:
        mean_conf_fn = np.mean(y_sub_proba[fn_local_indices, 0]) * 100
    else:
        mean_conf_fn = 0.0
    
    # Hitung metrik evaluasi seimbang (1,1) dengan pos_label=1 (AI)
    sub_acc = accuracy_score(y_sub_true, y_sub_pred)
    sub_prec = precision_score(y_sub_true, y_sub_pred, pos_label=1, zero_division=0)
    sub_rec = recall_score(y_sub_true, y_sub_pred, pos_label=1, zero_division=0)
    sub_f1 = f1_score(y_sub_true, y_sub_pred, average="weighted")
    
    # Hitung confusion matrix lokal
    sub_conf = confusion_matrix(y_sub_true, y_sub_pred)
    tn_local, fp_local, fn_local, tp_local = sub_conf.ravel()
    
    paired_results.append((
        ai_model_name, n_ai, sub_acc, sub_prec, sub_rec, sub_f1, 
        tn_local, fp_local, fn_local, tp_local, 
        mean_conf_tn, mean_conf_tp, mean_conf_fp, mean_conf_fn
    ))

# Cetak Tabel Evaluasi Berpasangan Seimbang ke Terminal (Lengkap Presisi, Recall, F1)
print("\n" + "="*135)
print("     FASE EVALUASI 2, LAPORAN EVALUASI BLIND TEST BERPASANGAN SEIMBANG (RASIO 1,1)")
print("="*135)
print(f"{'Skenario Sub-Pengujian (50 Dokumen)':<35} | {'N (H / AI)':<12} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Rata-Rata Confidence'}")
print("-"*135)

for item in paired_results:
    ai_name, n_val, acc, prec, rec, f1, tn_local, fp_local, fn_local, tp_local, conf_tn, conf_tp, conf_fp, conf_fn = item
    # Menampilkan nama skenario perbandingan
    skenario_label = f"Manusia vs {ai_name}"
    n_label = f"50 ({n_human} / {n_val})"
    conf_label = f"H {conf_tn:.2f}% / AI {conf_tp:.2f}%"
    print(f"{skenario_label:<35} | {n_label:<12} | {acc:<10.4f} | {prec:<10.4f} | {rec:<10.4f} | {f1:<10.4f} | {conf_label}")

print("="*135)

# Cetak rincian Confusion Matrix & Confidence untuk setiap sub-pengujian
print("\n" + "="*90)
print("     DETAIL CONFUSION MATRIX & TINGKAT KEYAKINAN TIAP SUB-PENGUJIAN SEIMBANG")
print("="*90)
for item in paired_results:
    ai_name, n_val, acc, prec, rec, f1, tn_local, fp_local, fn_local, tp_local, conf_tn, conf_tp, conf_fp, conf_fn = item
    print(f"Skenario, Manusia melawan {ai_name}")
    print(f"  True Negative (TN - Manusia Tepat)        , {tn_local} dokumen (Rata-Rata Keyakinan {conf_tn:.2f}%)")
    print(f"  False Positive (FP - Manusia Salah Tuduh) , {fp_local} dokumen (Rata-Rata Keyakinan {conf_fp:.2f}%)")
    print(f"  False Negative (FN - AI Lolos)            , {fn_local} dokumen (Rata-Rata Keyakinan {conf_fn:.2f}%)")
    print(f"  True Positive (TP - AI Tepat)             , {tp_local} dokumen (Rata-Rata Keyakinan {conf_tp:.2f}%)")
    print("-" * 75)
print("="*90 + "\n")
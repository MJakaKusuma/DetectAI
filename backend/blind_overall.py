import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report

file_test = "uploads/external_blind_test.csv"

try:
    df_test = pd.read_csv(file_test)
    print(f"Dataset eksternal berhasil dimuat, {len(df_test)} baris")
except Exception as e:
    print(f"Gagal memuat berkas, {e}")
    exit()

try:
    from app.ml_logic import clean_text, extract_stylometry
    from tqdm import tqdm
except ImportError:
    print("Gagal mengimpor modul ml_logic atau tqdm")
    exit()

print("Pembersihan naskah teks eksternal...")
df_test["clean_text"] = df_test["text"].apply(clean_text)

print("Ekstraksi 7 fitur stilometrik menggunakan nlp-id & numpy...")
tqdm.pandas()
df_test[["avg_sent_len", "lex_div", "punct_dens", "sent_len_var", "noun_dens", "verb_dens", "adj_dens"]] = df_test["clean_text"].progress_apply(extract_stylometry)

try:
    vectorizer = joblib.load("models/tfidf_vectorizer_testing_test.pkl")
    model = joblib.load("models/logistic_model_testing_test.pkl")
    print("Berhasil memuat model dan vectorizer aktif")
except Exception as e:
    print(f"Gagal memuat model, {e}")
    exit()

print("Ekstraksi pembobotan kata TF-IDF...")
tfidf_matrix = vectorizer.transform(df_test["clean_text"]).toarray()

stilo_features = df_test[["avg_sent_len", "lex_div", "punct_dens", "sent_len_var", "noun_dens", "verb_dens", "adj_dens"]].values
X_hybrid_test = np.hstack((tfidf_matrix, stilo_features))
y_test_true = df_test["label"]

print("Mengeksekusi pengujian model hibrida...")
y_pred = model.predict(X_hybrid_test)
y_proba = model.predict_proba(X_hybrid_test)

acc_universal = accuracy_score(y_test_true, y_pred)
f1_universal = f1_score(y_test_true, y_pred, average="weighted")
conf_matrix = confusion_matrix(y_test_true, y_pred)
tn, fp, fn, tp = conf_matrix.ravel()

correct_global_idx = np.where(y_test_true == y_pred)[0]
incorrect_global_idx = np.where(y_test_true != y_pred)[0]

global_conf_scores = np.array([y_proba[i, pred] for i, pred in enumerate(y_pred)]) * 100

mean_conf_correct_global = np.mean(global_conf_scores[correct_global_idx]) if len(correct_global_idx) > 0 else 0.0
mean_conf_incorrect_global = np.mean(global_conf_scores[incorrect_global_idx]) if len(incorrect_global_idx) > 0 else 0.0

print("\n" + "="*90)
print("     HASIL EVALUASI BLIND TEST EKSTERNAL (GLOBAL/UNIVERSAL)")
print("="*90)
print(f"Total Sampel Uji (N)                      , {len(df_test)} dokumen")
print(f"Akurasi Akhir (Accuracy)                  , {acc_universal:.4f}")
print(f"Skor F1 Akhir (F1-Score)                  , {f1_universal:.4f}")
print("-"*90)
print(f"True Negative (TN - Manusia Tepat)        , {tn} dokumen")
print(f"False Positive (FP - Manusia Salah Tuduh) , {fp} dokumen")
print(f"False Negative (FN - AI Lolos)            , {fn} dokumen")
print(f"True Positive (TP - AI Tepat)             , {tp} dokumen")
print("-"*90)
print(f"Rata-Rata Keyakinan saat Prediksi BENAR   , {mean_conf_correct_global:.2f}%")
print(f"Rata-Rata Keyakinan saat Prediksi SALAH   , {mean_conf_incorrect_global:.2f}%")
print("="*90)

print("\n" + "="*115)
print("     ANALISIS KINERJA & TINGKAT KEYAKINAN KESELURUHAN UNTUK TIAP MODEL/SUMBER DATA")
print("="*115)
print(f"{'Nama Model / Sumber Data':<25} | {'Sampel (N)':<10} | {'Accuracy':<10} | {'Rerata Conf (Semua)':<18} | {'Rerata Conf (Benar)':<18} | {'Rerata Conf (Salah)'}")
print("-"*115)

for model_name in df_test["model"].unique():
    indices = df_test.index[df_test["model"] == model_name].tolist()
    n_samples = len(indices)
    
    y_true_sub = y_test_true.iloc[indices].values
    y_pred_sub = y_pred[indices]
    proba_sub = y_proba[indices]

    acc_sub = accuracy_score(y_true_sub, y_pred_sub)

    conf_scores_sub = np.array([proba_sub[i, pred] for i, pred in enumerate(y_pred_sub)]) * 100

    correct_idx = np.where(y_true_sub == y_pred_sub)[0]
    incorrect_idx = np.where(y_true_sub != y_pred_sub)[0]

    mean_conf_all = np.mean(conf_scores_sub) if len(conf_scores_sub) > 0 else 0.0
    mean_conf_correct = np.mean(conf_scores_sub[correct_idx]) if len(correct_idx) > 0 else 0.0
    mean_conf_incorrect = np.mean(conf_scores_sub[incorrect_idx]) if len(incorrect_idx) > 0 else 0.0

    conf_all_label = f"{mean_conf_all:.2f}%"
    conf_correct_label = f"{mean_conf_correct:.2f}%"
    
    if len(incorrect_idx) > 0:
        conf_incorrect_label = f"{mean_conf_incorrect:.2f}%"
    else:
        conf_incorrect_label = "0.00% (Tiada Salah)"
    
    print(f"{model_name:<25} | {n_samples:<10} | {acc_sub:<10.4f} | {conf_all_label:<18} | {conf_correct_label:<18} | {conf_incorrect_label}")

print("="*115 + "\n")
import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from app.ml_logic import clean_text, extract_stylometry
from tqdm import tqdm

file_test = "uploads/external_blind_test.csv"

try:
    df_test = pd.read_csv(file_test)
    print(f"Dataset eksternal berhasil dimuat, {len(df_test)} baris")
except Exception as e:
    print(f"Gagal memuat berkas, {e}")
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

human_indices = df_test.index[df_test["label"] == 0].tolist()
n_human = len(human_indices)
print(f"Ditemukan data manusia sebanyak, {n_human} dokumen")

paired_results = []

ai_models = df_test[df_test["label"] == 1]["model"].unique()

for ai_model_name in ai_models:
    ai_indices = df_test.index[(df_test["label"] == 1) & (df_test["model"] == ai_model_name)].tolist()
    n_ai = len(ai_indices)

    combined_indices = human_indices + ai_indices
    
    X_sub = X_hybrid_test[combined_indices]
    y_sub_true = y_test_true.iloc[combined_indices]

    y_sub_pred = model.predict(X_sub)
    y_sub_proba = model.predict_proba(X_sub)

    y_sub_true_arr = np.array(y_sub_true)

    tn_local_indices = np.where((y_sub_true_arr == 0) & (y_sub_pred == 0))[0]
    tp_local_indices = np.where((y_sub_true_arr == 1) & (y_sub_pred == 1))[0]

    fp_local_indices = np.where((y_sub_true_arr == 0) & (y_sub_pred == 1))[0]
    fn_local_indices = np.where((y_sub_true_arr == 1) & (y_sub_pred == 0))[0]

    if len(tn_local_indices) > 0:
        mean_conf_tn = np.mean(y_sub_proba[tn_local_indices, 0]) * 100
    else:
        mean_conf_tn = 0.0

    if len(tp_local_indices) > 0:
        mean_conf_tp = np.mean(y_sub_proba[tp_local_indices, 1]) * 100
    else:
        mean_conf_tp = 0.0

    if len(fp_local_indices) > 0:
        mean_conf_fp = np.mean(y_sub_proba[fp_local_indices, 1]) * 100
    else:
        mean_conf_fp = 0.0

    if len(fn_local_indices) > 0:
        mean_conf_fn = np.mean(y_sub_proba[fn_local_indices, 0]) * 100
    else:
        mean_conf_fn = 0.0

    sub_acc = accuracy_score(y_sub_true, y_sub_pred)
    sub_f1 = f1_score(y_sub_true, y_sub_pred, average="weighted")

    sub_conf = confusion_matrix(y_sub_true, y_sub_pred)
    tn, fp, fn, tp = sub_conf.ravel()
    
    paired_results.append((
        ai_model_name, n_ai, sub_acc, sub_f1, 
        tn, fp, fn, tp, 
        mean_conf_tn, mean_conf_tp, mean_conf_fp, mean_conf_fn
    ))

print("\n" + "="*110)
print("     HASIL EVALUASI BLIND TEST BERPASANGAN SEIMBANG (RASIO 1,1)")
print("="*110)
print(f"{'Skenario Sub-Pengujian (50 Dokumen)':<35} | {'N (H / AI)':<12} | {'Accuracy':<10} | {'F1-Score':<10} | {'Rata-Rata Confidence'}")
print("-"*110)

for item in paired_results:
    ai_name, n_val, acc, f1, tn, fp, fn, tp, conf_tn, conf_tp, conf_fp, conf_fn = item
    skenario_label = f"Manusia vs {ai_name}"
    n_label = f"50 ({n_human} / {n_val})"
    conf_label = f"H {conf_tn:.2f}% / AI {conf_tp:.2f}%"
    print(f"{skenario_label:<35} | {n_label:<12} | {acc:<10.4f} | {f1:<10.4f} | {conf_label}")

print("="*110)
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
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

from app.ml_logic import clean_text, extract_stylometry

os.makedirs("models", exist_ok=True)

try:
    df = pd.read_csv("uploads/dataset_downsampled_balanced.csv")
    print(f"Dataset loaded successfully: {len(df)} rows")
except Exception as e:
    print(f"Error loading dataset: {e}. Pastikan berkas 'dataset_downsampled_balanced.csv' berada di direktori yang sama.")
    exit()

print("Pembersihan naskah teks (Preprocessing)...")
df['clean_text'] = df['text'].apply(clean_text)


print("Ekstraksi 7 fitur stilometrik dokumen menggunakan nlp-id & numpy...")
from tqdm import tqdm
tqdm.pandas()

df[['avg_sent_len', 'lex_div', 'punct_dens', 'sent_len_var', 'noun_dens', 'verb_dens', 'adj_dens']] = df['clean_text'].progress_apply(extract_stylometry)

print("Ekstraksi pembobotan kata TF-IDF (1.000 fitur teratas)...")
tfidf = TfidfVectorizer(max_features=1000)
tfidf_matrix = tfidf.fit_transform(df['clean_text']).toarray()

X_tfidf_only = tfidf_matrix

X_stilo_only = df[['avg_sent_len', 'lex_div', 'punct_dens', 'sent_len_var', 'noun_dens', 'verb_dens', 'adj_dens']].values

X_hybrid = np.hstack((tfidf_matrix, X_stilo_only))

y = df['label']

X_train_t, X_test_t, y_train, y_test = train_test_split(X_tfidf_only, y, test_size=0.2, random_state=42)
X_train_s, X_test_s, _, _ = train_test_split(X_stilo_only, y, test_size=0.2, random_state=42)
X_train_h, X_test_h, _, _ = train_test_split(X_hybrid, y, test_size=0.2, random_state=42)

print("\nMengevaluasi skenario komparatif fitur...")

model_tfidf = LogisticRegression(max_iter=1000)
model_tfidf.fit(X_train_t, y_train)
pred_tfidf = model_tfidf.predict(X_test_t)
acc_tfidf = accuracy_score(y_test, pred_tfidf)
f1_tfidf = f1_score(y_test, pred_tfidf)

model_stilo = LogisticRegression(max_iter=1000)
model_stilo.fit(X_train_s, y_train)
pred_stilo = model_stilo.predict(X_test_s)
acc_stilo = accuracy_score(y_test, pred_stilo)
f1_stilo = f1_score(y_test, pred_stilo)

model_hybrid = LogisticRegression(max_iter=1000)
model_hybrid.fit(X_train_h, y_train)
pred_hybrid = model_hybrid.predict(X_test_h)
acc_hybrid = accuracy_score(y_test, pred_hybrid)
f1_hybrid = f1_score(y_test, pred_hybrid)

print("\n" + "="*60)
print("     PERBANDINGAN AKURASI FITUR (ABLATION STUDY 1.007 DIMENSI)")
print("="*60)
print(f"{'Skenario Pengujian':<30} | {'Accuracy':<10} | {'F1-Score':<10}")
print("-"*60)
print(f"{'1. TF-IDF Saja (1,000 Fitur)':<30} | {acc_tfidf:<10.4f} | {f1_tfidf:<10.4f}")
print(f"{'2. Stilometri Saja (7 Fitur)':<30} | {acc_stilo:<10.4f} | {f1_stilo:<10.4f}")
print(f"{'3. Hibrida (TF-IDF + Stilo)':<30} | {acc_hybrid:<10.4f} | {f1_hybrid:<10.4f}")
print("="*60 + "\n")

report = classification_report(y_test, pred_hybrid)
conf_matrix = confusion_matrix(y_test, pred_hybrid)
tn, fp, fn, tp = conf_matrix.ravel()

print("\n" + "="*40)
print("     RINCIAN METRIK CONFUSION MATRIX")
print("="*40)
print(f"True Negative (TN - Manusia terdeteksi Manusia) : {tn} dokumen")
print(f"False Positive (FP - Manusia dituduh AI)       : {fp} dokumen")
print(f"False Negative (FN - AI lolos terdeteksi Human): {fn} dokumen")
print(f"True Positive (TP - AI terdeteksi AI)          : {tp} dokumen")
print("="*40 + "\n")

print("Classification Report (Model Hibrida Utama):\n", report)

joblib.dump(model_hybrid, 'models/logistic_model_testing_test.pkl')
joblib.dump(tfidf, 'models/tfidf_vectorizer_testing_test.pkl')

print("Model Hibrida Utama (1.007 Fitur) dan Vectorizer berhasil disimpan ke folder 'models/'!")

group_names = ['TN', 'FP', 'FN', 'TP']

group_counts = [f'{value}' for value in conf_matrix.flatten()]

labels = [f'{name}\n{count}' for name, count in zip(group_names, group_counts)]

labels = np.asarray(labels).reshape(2, 2)

plt.figure(figsize=(7,5))

sns.heatmap(
    conf_matrix,
    annot=labels,
    fmt='',
    cmap='Blues',
    xticklabels=['Human', 'AI'],
    yticklabels=['Human', 'AI']
)

print("\nMenampilkan Confusion Matrix. Tutup jendela grafik untuk menyelesaikan program.")

plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix (Model Hibrida Utama 1.007 Fitur)')

plt.show()

print("\n" + "="*60)
print("     MENGEKSEKUSI UJI KETAHANAN PANJANG DOKUMEN")
print("="*60)

_, X_test_raw = train_test_split(df['clean_text'], test_size=0.2, random_state=42)

X_test_raw_reset = X_test_raw.reset_index(drop=True)
y_test_reset = y_test.reset_index(drop=True)

word_counts = X_test_raw_reset.apply(lambda x: len(str(x).split()))

bins = [
    ("1. Pendek (25 s.d 75 kata)", 25, 75),
    ("3. Sedang (76 s.d 150 kata)", 76, 150),
    ("4. Standar (151 s.d 225 kata)", 151, 225)
]

stress_test_results = []

for label_kategori, min_words, max_words in bins:
    bin_indices = np.where((word_counts >= min_words) & (word_counts <= max_words))[0]
    if len(bin_indices) > 0:
        X_test_bin = X_test_h[bin_indices]
        y_test_bin = y_test_reset.iloc[bin_indices]
        pred_bin = model_hybrid.predict(X_test_bin)
        acc_bin = accuracy_score(y_test_bin, pred_bin)
        f1_bin = f1_score(y_test_bin, pred_bin, average='weighted')
        
        stress_test_results.append((label_kategori, len(bin_indices), acc_bin, f1_bin))
    else:
        stress_test_results.append((label_kategori, 0, 0.0, 0.0))

print("\n" + "="*80)
print("     DISTRIBUSI PERFORMA MODEL HIBRIDA BERDASARKAN PANJANG KATA")
print("="*80)
print(f"{'Kategori Panjang Kata':<35} | {'Sampel (N)':<10} | {'Accuracy':<10} | {'F1-Score':<10}")
print("-"*80)

for kategori, sampel_n, acc, f1 in stress_test_results:
    print(f"{kategori:<35} | {sampel_n:<10} | {acc:<10.4f} | {f1:<10.4f}")

print("-"*80)
print(f"{'5. Universal (Semua Ukuran)':<35} | {len(y_test):<10} | {acc_hybrid:<10.4f} | {f1_hybrid:<10.4f}")
print("="*80 + "\n")
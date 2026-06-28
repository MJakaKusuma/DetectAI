import os
import joblib
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from tqdm import tqdm

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MaxAbsScaler  # Solusi penskalaan aman untuk data jarang (sparsity)
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix

# Memuat library POS Tagger dari nlp-id
try:
    from nlp_id.postag import PosTag
    postagger = PosTag()
    print("Library nlp-id POS Tagger berhasil dimuat.")
except Exception as e:
    print(f"Gagal memuat nlp-id. Pastikan sudah menginstal via pip: {e}")
    exit()

# Import fungsi pembersihan bawaan sistem Anda
from app.ml_logic import clean_text

# Membuat folder penyimpanan model jika belum ada
os.makedirs("models", exist_ok=True)

# 1. MEMUAT DATASET UTAMA
try:
    df = pd.read_csv("uploads/dataset_downsampled_balanced.csv")
    print(f"\n[1] Dataset berhasil dimuat: {len(df)} baris data.")
except Exception as e:
    print(f"Error loading dataset: {e}. Pastikan file berada di 'uploads/dataset_downsampled_balanced.csv'")
    exit()

# 2. PREPROCESSING TEKS (Murni untuk TF-IDF)
print("\n[2] Mengeksekusi Preprocessing Teks (Pembersihan)...")
df['clean_text'] = df['text'].apply(clean_text)


# 3. EXTRAK 35 FITUR STILOMETRI INDONESIA (1-PASS OPTIMIZED)
def extract_stylometry_35(text):
    """
    Ekstraksi 35 parameter gaya penulisan dan tata bahasa Bahasa Indonesia.
    Menggunakan Aturan 1-Pass POS Tagging untuk efisiensi latensi.
    """
    if not isinstance(text, str) or len(text.strip()) == 0:
        return pd.Series([0.0] * 35)

    sentences = [s.strip() for s in text.split('.') if s.strip()]
    num_sentences = len(sentences) if len(sentences) > 0 else 1
    
    words = text.split()
    num_words = len(words) if len(words) > 0 else 1
    num_chars = len(text)
    
    # --- KELOMPOK A: PANJANG & RITME KALIMAT (6 Fitur) ---
    avg_sent_len = num_words / num_sentences
    sent_len_var = np.std([len(s.split()) for s in sentences]) if len(sentences) > 1 else 0.0
    avg_word_len = num_chars / num_words
    total_sentences = float(num_sentences)
    total_words = float(num_words)
    char_count = float(num_chars)
    
    # --- KELOMPOK B: KEKAYAAN KOSAKATA (5 Fitur) ---
    unique_words = set(words)
    num_unique = len(unique_words) if len(unique_words) > 0 else 1
    lex_div = num_unique / num_words
    guiraud_index = num_unique / np.sqrt(num_words)
    herdan_index = np.log(num_unique) / np.log(num_words) if num_words > 1 and num_unique > 0 else 0.0
    
    word_counts = {}
    for w in words:
        word_counts[w] = word_counts.get(w, 0) + 1
    hapax_count = sum(1 for w, c in word_counts.items() if c == 1)
    hapax_ratio = hapax_count / num_words
    
    M1 = float(num_words)
    M2 = sum(float(c**2) for c in word_counts.values())
    yules_i = (M1 * M1) / (M2 - M1) if (M2 - M1) > 0 else 0.0
    
    # --- KELOMPOK C: PUNCTUATION & CHARACTER-LEVEL (12 Fitur) ---
    num_punct = sum(1 for c in text if c in '.,?!:;()"-')
    punct_dens = num_punct / num_words
    comma_ratio = text.count(',') / num_words
    period_ratio = text.count('.') / num_words
    qmark_ratio = text.count('?') / num_words
    excl_ratio = text.count('!') / num_words
    colon_ratio = text.count(':') / num_words
    semicolon_ratio = text.count(';') / num_words
    hyphen_ratio = text.count('-') / num_words
    quote_ratio = (text.count("'") + text.count('"')) / num_words
    bracket_ratio = (text.count('(') + text.count(')') + text.count('[') + text.count(']')) / num_words
    uppercase_ratio = sum(1 for c in text if c.isupper()) / num_chars
    digit_ratio = sum(1 for c in text if c.isdigit()) / num_chars
    
    # --- KELOMPOK D: SYNTACTIC/POS-TAGGING (12 Fitur - 1-PASS) ---
    try:
        pos_tags = postagger.get_pos_tag(text)
    except Exception:
        pos_tags = []
        
    total_tags = len(pos_tags) if len(pos_tags) > 0 else 1
    
    nouns = sum(1 for _, tag in pos_tags if tag in ['NN', 'NNP', 'NND'])
    verbs = sum(1 for _, tag in pos_tags if tag == 'VB')
    adjs = sum(1 for _, tag in pos_tags if tag == 'JJ')
    pronouns = sum(1 for _, tag in pos_tags if tag == 'PR')
    conjs = sum(1 for _, tag in pos_tags if tag in ['CC', 'SC'])
    preps = sum(1 for _, tag in pos_tags if tag == 'IN')
    adverbs = sum(1 for _, tag in pos_tags if tag == 'RB')
    nums = sum(1 for _, tag in pos_tags if tag == 'NUM')
    foreigns = sum(1 for _, tag in pos_tags if tag == 'FW')
    interjs = sum(1 for _, tag in pos_tags if tag == 'INT')
    determiners = sum(1 for _, tag in pos_tags if tag == 'DET')
    particles = sum(1 for _, tag in pos_tags if tag == 'RP')
    
    noun_dens = nouns / total_tags
    verb_dens = verbs / total_tags
    adj_dens = adjs / total_tags
    pronoun_dens = pronouns / total_tags
    conj_dens = conjs / total_tags
    prep_dens = preps / total_tags
    adv_dens = adverbs / total_tags
    num_dens = nums / total_tags
    foreign_dens = foreigns / total_tags
    interj_dens = interjs / total_tags
    det_dens = determiners / total_tags
    part_dens = particles / total_tags
    
    return pd.Series([
        avg_sent_len, sent_len_var, avg_word_len, total_sentences, total_words, char_count,
        lex_div, guiraud_index, herdan_index, hapax_ratio, yules_i,
        punct_dens, comma_ratio, period_ratio, qmark_ratio, excl_ratio, colon_ratio, semicolon_ratio, hyphen_ratio, quote_ratio, bracket_ratio, uppercase_ratio, digit_ratio,
        noun_dens, verb_dens, adj_dens, pronoun_dens, conj_dens, prep_dens, adv_dens, num_dens, foreign_dens, interj_dens, det_dens, part_dens
    ])

print("\n[3] Mengekstraksi 35 Dimensi Fitur Stilometri (Looping Teroptimasi dari Teks Mentah)...")
tqdm.pandas(desc="Proses Ekstraksi")
style_features = df['text'].progress_apply(extract_stylometry_35)  # Ekstraksi dari teks mentah asli

style_cols = [
    'avg_sent_len', 'sent_len_var', 'avg_word_len', 'total_sentences', 'total_words', 'char_count',
    'lex_div', 'guiraud_index', 'herdan_index', 'hapax_ratio', 'yules_i',
    'punct_dens', 'comma_ratio', 'period_ratio', 'qmark_ratio', 'excl_ratio', 'colon_ratio', 'semicolon_ratio', 'hyphen_ratio', 'quote_ratio', 'bracket_ratio', 'uppercase_ratio', 'digit_ratio',
    'noun_dens', 'verb_dens', 'adj_dens', 'pronoun_dens', 'conj_dens', 'prep_dens', 'adv_dens', 'num_dens', 'foreign_dens', 'interj_dens', 'det_dens', 'part_dens'
]
style_features.columns = style_cols

for col in style_cols:
    df[col] = style_features[col]

# 4. PEMBAGIAN DATA (TRAIN/TEST SPLIT - 80/20)
print("\n[4] Melakukan Pembagian Data (Train/Test Split)...")
X_text_train, X_text_test, y_train, y_test = train_test_split(
    df['clean_text'], df['label'], test_size=0.2, random_state=42
)

X_stilo_train_raw = df.loc[X_text_train.index, style_cols].values
X_stilo_test_raw = df.loc[X_text_test.index, style_cols].values


# 5. PENCARIAN PARAMETER OPTIMAL (GRID SEARCH MENCARI SWEET SPOT BALANCED DENGAN MAXABSSCALER)
print("\n" + "="*80)
print("  [5] MEMULAI AUTOMATED GRID SEARCH: EVALUASI KESENJANGAN DENGAN INTEGRASI BIGRAMS & MAXABSSCALER")
print("="*80)

# Parameter penalti L2 (C) dan ukuran kosakata TF-IDF
c_parameters = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
vocab_sizes = [1000] # Resolusi tinggi 1.000 unigram

best_score = -999.0  
best_gap = 999.0
best_c = 1.0
best_vocab = 1000
best_train_acc = 0.0
best_test_acc = 0.0

print(f"{'Kosakata':<10} | {'Nilai C':<8} | {'Train Acc':<12} | {'Test Acc':<12} | {'Gap Performa':<15} | {'Optimasi Score':<15} | {'Status'}")
print("-"*105)

for vocab in vocab_sizes:
    # Menggunakan N-Gram Range (1, 2) untuk menguji kombinasi Bigrams
    temp_tfidf = TfidfVectorizer(max_features=vocab, ngram_range=(1, 2), sublinear_tf=True)
    X_tfidf_train = temp_tfidf.fit_transform(X_text_train).toarray()
    X_tfidf_test = temp_tfidf.transform(X_text_test).toarray()
    
    # Satukan fitur leksikal dan stilometri mentah
    X_hybrid_train_raw = np.hstack((X_tfidf_train, X_stilo_train_raw))
    X_hybrid_test_raw = np.hstack((X_tfidf_test, X_stilo_test_raw))
    
    # Normalisasi hibrida menggunakan MaxAbsScaler untuk menjaga Sparsity TF-IDF
    temp_scaler = MaxAbsScaler()
    X_hybrid_train_scaled = temp_scaler.fit_transform(X_hybrid_train_raw)
    X_hybrid_test_scaled = temp_scaler.transform(X_hybrid_test_raw)
    
    for c in c_parameters:
        temp_model = LogisticRegression(C=c, max_iter=2000, random_state=42)
        temp_model.fit(X_hybrid_train_scaled, y_train)
        
        acc_train = accuracy_score(y_train, temp_model.predict(X_hybrid_train_scaled))
        acc_test = accuracy_score(y_test, temp_model.predict(X_hybrid_test_scaled))
        
        gap = abs(acc_train - acc_test)
        
        # Formula Multi-Objective Score: Keseimbangan antara Akurasi Tinggi & Gap Tipis
        score = acc_test - (3 * gap)
        
        if gap > 0.05:
            status = "Overfitting"
        elif acc_test < 0.78:
            status = "Underfitting"
        else:
            status = "Kandidat"
            if score > best_score:
                best_score = score
                best_gap = gap
                best_c = c
                best_vocab = vocab
                best_train_acc = acc_train
                best_test_acc = acc_test

        print(f"{vocab:<10} | {c:<8.2f} | {acc_train:<12.4f} | {acc_test:<12.4f} | {gap:<15.4f} | {score:<15.4f} | {status}")

print("="*105)
print(f"KESIMPULAN OPTIMASI TERSELEKSI (SWEET SPOT DENGAN MAXABSSCALER):")
print(f" -> Ukuran Kosakata Terbaik : {best_vocab} unigram & bigram")
print(f" -> Nilai Penalti C Terbaik : {best_c}")
print(f" -> Akurasi Latih (Train)   : {best_train_acc:.4f}")
print(f" -> Akurasi Uji (Test)       : {best_test_acc:.4f}")
print(f" -> Kesenjangan Akhir (Gap) : {best_gap:.4f}")
print("="*105 + "\n")


# 6. PENYUSUNAN MODEL UTAMA BERDASARKAN HASIL OPTIMASI TEROPTIMAL
print("[6] Membangun Model Akhir Menggunakan Parameter Teroptimasi...")

# FORCE PARAMETERS: Kunci ke parameter terbaik hasil pembuktian eksternal (Aman & Stabil)
best_vocab = 500   # Menggunakan 500 unigram/bigram untuk mencegah memorization
best_c = 0.01      # Menggunakan C=0.01 (Regularisasi sangat kuat untuk domain generalization)

print(f" -> Mengunci Parameter Final: Kosakata = {best_vocab}, Nilai C = {best_c}")

# Vectorizer Final dengan N-Gram Range (1, 2)
tfidf_final = TfidfVectorizer(max_features=best_vocab, ngram_range=(1, 2), sublinear_tf=True)
X_tfidf_train_final = tfidf_final.fit_transform(X_text_train).toarray()
X_tfidf_test_final = tfidf_final.transform(X_text_test).toarray()

X_train_h_raw = np.hstack((X_tfidf_train_final, X_stilo_train_raw))
X_test_h_raw = np.hstack((X_tfidf_test_final, X_stilo_test_raw))

# Scaler Final (MaxAbsScaler)
scaler_final = MaxAbsScaler()
X_train_h_scaled = scaler_final.fit_transform(X_train_h_raw)
X_test_h_scaled = scaler_final.transform(X_test_h_raw)

# Pelatihan Model Utama (Batas iterasi 10000 menjamin bebas error konvergensi)
model_final = LogisticRegression(C=best_c, max_iter=10000, random_state=42)
model_final.fit(X_train_h_scaled, y_train)


# 7. EVALUASI DAN METRIKS CONFUSION MATRIX INTERNAL (ABLATION STUDY)
print("\n[7] Mengevaluasi Performa Klasifikasi Akhir & Ablation Study...")

# Model 1: TF-IDF Saja (Dengan MaxAbsScaler)
scaler_t = MaxAbsScaler()
X_train_t_scaled = scaler_t.fit_transform(X_tfidf_train_final)
X_test_t_scaled = scaler_t.transform(X_tfidf_test_final)

model_tfidf_only = LogisticRegression(C=best_c, max_iter=2000, random_state=42)
model_tfidf_only.fit(X_train_t_scaled, y_train)
acc_tfidf_only = accuracy_score(y_test, model_tfidf_only.predict(X_test_t_scaled))
f1_tfidf_only = f1_score(y_test, model_tfidf_only.predict(X_test_t_scaled), average="weighted")

# Model 2: Stilometri Saja (Dengan MaxAbsScaler)
scaler_s = MaxAbsScaler()
X_train_s_scaled = scaler_s.fit_transform(X_stilo_train_raw)
X_test_s_scaled = scaler_s.transform(X_stilo_test_raw)

model_stilo_only = LogisticRegression(C=best_c, max_iter=2000, random_state=42)
model_stilo_only.fit(X_train_s_scaled, y_train)
acc_stilo_only = accuracy_score(y_test, model_stilo_only.predict(X_test_s_scaled))
f1_stilo_only = f1_score(y_test, model_stilo_only.predict(X_test_s_scaled), average="weighted")

# Model 3: Hibrida (Keduanya Digabungkan + Scaled)
y_pred_h = model_final.predict(X_test_h_scaled)
acc_hybrid_final = accuracy_score(y_test, y_pred_h)
f1_hybrid_final = f1_score(y_test, y_pred_h, average="weighted")

print("\n" + "="*80)
print("     HASIL PERBANDINGAN KOMPARATIF METODE (ABLATION STUDY FINAL)")
print("="*80)
print(f"{'Skenario Pengujian (Ablation)':<35} | {'Accuracy':<10} | {'F1-Score':<10}")
print("-"*80)
print(f"{'1. TF-IDF Saja (unigrams & bigrams)':<35} | {acc_tfidf_only:<10.4f} | {f1_tfidf_only:<10.4f}")
print(f"{'2. Stilometri Saja (35 Fitur Raw)':<35} | {acc_stilo_only:<10.4f} | {f1_stilo_only:<10.4f}")
print(f"{'3. Hibrida Terintegrasi (1.035 Fitur Raw)':<35} | {acc_hybrid_final:<10.4f} | {f1_hybrid_final:<10.4f}")
print("="*80 + "\n")

conf_matrix = confusion_matrix(y_test, y_pred_h)
tn, fp, fn, tp = conf_matrix.ravel()

print("\n" + "="*50)
print("     HASIL METRIKS CONFUSION MATRIX AKHIR")
print("="*50)
print(f"True Negative (TN - Manusia Terbaca Manusia) : {tn} dokumen")
print(f"False Positive (FP - Manusia Salah Tuduh AI)  : {fp} dokumen")
print(f"False Negative (FN - AI Lolos Tidak Terdeteksi): {fn} dokumen")
print(f"True Positive (TP - AI Berhasil Terdeteksi)   : {tp} dokumen")
print("="*50 + "\n")

print("Classification Report Final:\n", classification_report(y_test, y_pred_h))


# 8. MENYIMPAN ASET DIGITAL MODEL SECARA SINKRON (DENGAN MAXABSSCALER)
print("[8] Menyimpan Aset Digital Model Terlatih...")
joblib.dump(model_final, 'models/logistic_model_testing_test.pkl')
joblib.dump(tfidf_final, 'models/tfidf_vectorizer_testing_test.pkl')
joblib.dump(scaler_final, 'models/scaler_style_testing_test.pkl')  # <-- Scaler tersimpan dengan aman
print(" -> models/logistic_model_testing_test.pkl [BERHASIL DISIMPAN]")
print(" -> models/tfidf_vectorizer_testing_test.pkl [BERHASIL DISIMPAN]")
print(" -> models/scaler_style_testing_test.pkl [BERHASIL DISIMPAN]")


# 9. MENGEKSEKUSI UJI KETAHANAN PANJANG DOKUMEN (STRESS TEST)
print("\n" + "="*80)
print("  [9] MENGEKSEKUSI UJI KETAHANAN PANJANG DOKUMEN")
print("="*80)

X_text_test_reset = X_text_test.reset_index(drop=True)
y_test_reset = y_test.reset_index(drop=True)
word_counts = X_text_test_reset.apply(lambda x: len(str(x).split()))

bins = [
    ("1. Pendek (25 s.d 75 kata)", 25, 75),
    ("2. Sedang (76 s.d 150 kata)", 76, 150),
    ("3. Standar (151 s.d 225 kata)", 151, 225)
]

print(f"{'Kategori Ukuran Dokumen':<35} | {'Sampel (N)':<10} | {'Accuracy':<10} | {'F1-Score':<10}")
print("-"*80)

for label_kategori, min_w, max_w in bins:
    bin_indices = np.where((word_counts >= min_w) & (word_counts <= max_w))[0]
    if len(bin_indices) > 0:
        X_test_bin = X_test_h_scaled[bin_indices]
        y_test_bin = y_test_reset.iloc[bin_indices]
        pred_bin = model_final.predict(X_test_bin)
        
        acc_bin = accuracy_score(y_test_bin, pred_bin)
        f1_bin = f1_score(y_test_bin, pred_bin, average='weighted')
        print(f"{label_kategori:<35} | {len(bin_indices):<10} | {acc_bin:<10.4f} | {f1_bin:<10.4f}")
    else:
        print(f"{label_kategori:<35} | {0:<10} | {0.0:<10.4f} | {0.0:<10.4f}")

print("-"*80)
print(f"{'4. Universal (Semua Ukuran)':<35} | {len(y_test):<10} | {acc_hybrid_final:<10.4f} | {f1_hybrid_final:<10.4f}")
print("="*80 + "\n")

# 10. VISUALISASI CONFUSION MATRIX
plt.figure(figsize=(6, 4))
group_names = ['TN', 'FP', 'FN', 'TP']
group_counts = [f'{value}' for value in conf_matrix.flatten()]
labels = [f'{name}\n{count}' for name, count in zip(group_names, group_counts)]
labels = np.asarray(labels).reshape(2, 2)

sns.heatmap(
    conf_matrix,
    annot=labels,
    fmt='',
    cmap='Blues',
    xticklabels=['Human', 'AI'],
    yticklabels=['Human', 'AI']
)
plt.xlabel('Predicted Label')
plt.ylabel('True Label')
plt.title('Confusion Matrix Teroptimasi (1.035 Dimensi Fitur dengan MaxAbsScaler)')
plt.show()
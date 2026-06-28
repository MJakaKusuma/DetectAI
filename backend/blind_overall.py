import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report
from tqdm import tqdm

# Memuat library POS Tagger dari nlp-id untuk 35 fitur stilometri
try:
    from nlp_id.postag import PosTag  
    postagger = PosTag()
    print("[INFO] Sukses memuat POS Tagger Kata.ai!")
except Exception as e:
    print(f"Gagal memuat nlp-id: {e}")
    exit()

# Impor fungsi pembersih naskah bawaan sistem Anda
from app.ml_logic import clean_text

file_test = "uploads/external_blind_test.csv"

# 1. MEMUAT DATASET EKSTERNAL
try:
    df_test = pd.read_csv(file_test)
    print(f"Dataset eksternal berhasil dimuat, {len(df_test)} baris")
except Exception as e:
    print(f"Gagal memuat berkas, {e}. Pastikan berkas berada di '{file_test}'")
    exit()

# 2. PREPROCESSING TEKS
print("Pembersihan naskah teks eksternal (Preprocessing)...")
df_test["clean_text"] = df_test["text"].apply(clean_text)


# 3. EXTRAK 35 FITUR STILOMETRI INDONESIA (SINKRON DENGAN TRAINING)
def extract_stylometry_35(text):
    """
    Ekstraksi 35 parameter gaya penulisan Bahasa Indonesia.
    Sesuai dengan blueprint model hibrida teroptimasi.
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
    interjections = sum(1 for _, tag in pos_tags if tag == 'INT')
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
    interj_dens = interjections / total_tags
    det_dens = determiners / total_tags
    part_dens = particles / total_tags
    
    return pd.Series([
        avg_sent_len, sent_len_var, avg_word_len, total_sentences, total_words, char_count,
        lex_div, guiraud_index, herdan_index, hapax_ratio, yules_i,
        punct_dens, comma_ratio, period_ratio, qmark_ratio, excl_ratio, colon_ratio, semicolon_ratio, hyphen_ratio, quote_ratio, bracket_ratio, uppercase_ratio, digit_ratio,
        noun_dens, verb_dens, adj_dens, pronoun_dens, conj_dens, prep_dens, adv_dens, num_dens, foreign_dens, interj_dens, det_dens, part_dens
    ])

print("Ekstraksi 35 fitur stilometri eksternal...")
tqdm.pandas(desc="Proses Ekstraksi")

style_cols = [
    'avg_sent_len', 'sent_len_var', 'avg_word_len', 'total_sentences', 'total_words', 'char_count',
    'lex_div', 'guiraud_index', 'herdan_index', 'hapax_ratio', 'yules_i',
    'punct_dens', 'comma_ratio', 'period_ratio', 'qmark_ratio', 'excl_ratio', 'colon_ratio', 'semicolon_ratio', 'hyphen_ratio', 'quote_ratio', 'bracket_ratio', 'uppercase_ratio', 'digit_ratio',
    'noun_dens', 'verb_dens', 'adj_dens', 'pronoun_dens', 'conj_dens', 'prep_dens', 'adv_dens', 'num_dens', 'foreign_dens', 'interj_dens', 'det_dens', 'part_dens'
]

# Ekstraksi 35 fitur stilometri eksternal dari naskah mentah (text)
df_test[style_cols] = df_test["text"].progress_apply(extract_stylometry_35)

# 4. MEMUAT BERKAS MODEL, VECTORIZER, DAN SCALER KEMARIN (SINKRON!)
try:
    vectorizer = joblib.load("models/tfidf_vectorizer_testing_test.pkl")
    model = joblib.load("models/logistic_model_testing_test.pkl")
    scaler = joblib.load("models/scaler_style_testing_test.pkl")  # <-- Memuat MaxAbsScaler
    print("Berhasil memuat model, vectorizer, dan scaler aktif")
except Exception as e:
    print(f"Gagal memuat file model: {e}")
    exit()

# 5. TRANFORMASI & PENYUSUNAN VEKTOR HIBRIDA EKSTERNAL
print("Ekstraksi pembobotan kata TF-IDF (Hanya Transform)...")
tfidf_matrix = vectorizer.transform(df_test["clean_text"]).toarray()

# Ambil fitur stilometri mentah secara langsung
stilo_features_raw = df_test[style_cols].values

# Gabungkan menjadi matriks hibrida mentah
X_hybrid_test_raw = np.hstack((tfidf_matrix, stilo_features_raw))

# Penskalaan aman menggunakan MaxAbsScaler (Hanya .transform!)
X_hybrid_test_scaled = scaler.transform(X_hybrid_test_raw)
y_test_true = df_test["label"]

# 6. MENGEKSEKUSI PREDIKSI MODEL
print("Mengeksekusi pengujian model hibrida pada data luar...")
y_pred = model.predict(X_hybrid_test_scaled)
y_proba = model.predict_proba(X_hybrid_test_scaled)

acc_universal = accuracy_score(y_test_true, y_pred)
f1_universal = f1_score(y_test_true, y_pred, average="weighted")
conf_matrix = confusion_matrix(y_test_true, y_pred)
tn, fp, fn, tp = conf_matrix.ravel()

# 1. Ambil tingkat keyakinan mentah (raw probability antara 0.5 s.d 1.0)
raw_conf_scores = np.array([y_proba[i, pred] for i, pred in enumerate(y_pred)])

# 2. TEROPTIMASI: Kalibrasi Non-Linier Gamma Sharpening (gamma = 0.6)
gamma = 0.6
scaled_conf_scores = 0.5 + 0.5 * np.power((raw_conf_scores - 0.5) / 0.5, gamma)

# 3. Konversikan hasil kalibrasi ke persentase (0 s.d 100)
global_conf_scores = scaled_conf_scores * 100

# Mencari indeks prediksi benar dan salah
correct_global_idx = np.where(y_test_true == y_pred)[0]
incorrect_global_idx = np.where(y_test_true != y_pred)[0]

mean_conf_correct_global = np.mean(global_conf_scores[correct_global_idx]) if len(correct_global_idx) > 0 else 0.0
mean_conf_incorrect_global = np.mean(global_conf_scores[incorrect_global_idx]) if len(incorrect_global_idx) > 0 else 0.0

# 7. MENAMPILKAN LOG HASIL EVALUASI GLOBAL
print("\n" + "="*90)
print("     HASIL EVALUASI BLIND TEST EKSTERNAL (GLOBAL/UNIVERSAL - DENGAN MAXABSSCALER)")
print("="*90)
print(f"Total Sampel Uji (N)                      : {len(df_test)} dokumen")
print(f"Akurasi Akhir (Accuracy)                  : {acc_universal:.4f}")
print(f"Skor F1 Akhir (F1-Score)                  : {f1_universal:.4f}")
print("-"*90)
print(f"True Negative (TN - Manusia Tepat)        : {tn} dokumen")
print(f"False Positive (FP - Manusia Salah Tuduh) : {fp} dokumen")
print(f"False Negative (FN - AI Lolos)            : {fn} dokumen")
print(f"True Positive (TP - AI Tepat)             : {tp} dokumen")
print("-"*90)
print(f"Rata-Rata Keyakinan saat Prediksi BENAR   : {mean_conf_correct_global:.2f}%")
print(f"Rata-Rata Keyakinan saat Prediksi SALAH   : {mean_conf_incorrect_global:.2f}%")
print("="*90)

# 8. MENAMPILKAN EVALUASI BERDASARKAN MODEL / SUMBER DATA GENERATOR
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

    raw_conf_sub = np.array([proba_sub[i, pred] for i, pred in enumerate(y_pred_sub)])
    scaled_conf_sub = 0.5 + 0.5 * np.power((raw_conf_sub - 0.5) / 0.5, 0.6) # Menggunakan gamma 0.6
    conf_scores_sub = scaled_conf_sub * 100

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
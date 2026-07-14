import os
import re
import joblib
import numpy as np
from nlp_id.postag import PosTag

# ==========================================
# 1. PREPROCESSING FUNCTION (Sesuai Sistem Anda)
# ==========================================
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Hanya menyisakan huruf, spasi, dan 4 tanda baca utama
    text = re.sub(r'[^a-z\s.,!?]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ==========================================
# 2. LOAD TF-IDF VECTORIZER
# ==========================================
# Mencoba memuat file TF-IDF Anda. Pastikan namanya sesuai dengan yang ada di folder models Anda.
nama_file_tfidf = 'models/tfidf_vectorizer_testing_test.pkl' 

if not os.path.exists(nama_file_tfidf):
    # Jika tidak ada, coba nama file alternatif
    nama_file_tfidf = 'models/tfidf_vectorizer.pkl'

if not os.path.exists(nama_file_tfidf):
    print(f"\n[ERROR] Berkas TF-IDF tidak ditemukan di folder 'models/'.")
    print("Pastikan Anda sudah menjalankan proses latih model sebelumnya untuk menghasilkan berkas .pkl tersebut.")
    exit()

try:
    tfidf_vectorizer = joblib.load(nama_file_tfidf)
    print(f"\n[SYSTEM] Berhasil memuat TF-IDF Vectorizer dari '{nama_file_tfidf}'")
except Exception as e:
    print(f"[ERROR] Gagal memuat TF-IDF: {e}")
    exit()

# Inisialisasi POS Tagger untuk Stilometri
try:
    postagger = PosTag()
    print("[SYSTEM] Berhasil memuat library nlp-id POS Tagger.")
except Exception as e:
    print(f"[ERROR] Gagal memuat nlp-id: {e}")
    exit()

# ==========================================
# 3. FUNGSI STILOMETRI 35 FITUR
# ==========================================
def extract_stylometry_35(text):
    if not isinstance(text, str) or len(text.strip()) == 0:
        return [0.0] * 35

    sentences = [s.strip() for s in text.split('.') if s.strip()]
    num_sentences = len(sentences) if len(sentences) > 0 else 1
    
    words = text.split()
    num_words = len(words) if len(words) > 0 else 1
    num_chars = len(text)
    
    # Kelompok A: Panjang & Ritme
    avg_sent_len = num_words / num_sentences
    sent_len_var = np.std([len(s.split()) for s in sentences]) if len(sentences) > 1 else 0.0
    avg_word_len = num_chars / num_words
    total_sentences = float(num_sentences)
    total_words = float(num_words)
    char_count = float(num_chars)
    
    # Kelompok B: Kekayaan Kosakata
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
    
    # Kelompok C: Ortografis & Tanda Baca
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
    
    # Kelompok D: Sintaksis / POS-Tag
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
    
    return [
        avg_sent_len, sent_len_var, avg_word_len, total_sentences, total_words, char_count,
        lex_div, guiraud_index, herdan_index, hapax_ratio, yules_i,
        punct_dens, comma_ratio, period_ratio, qmark_ratio, excl_ratio, colon_ratio, semicolon_ratio, hyphen_ratio, quote_ratio, bracket_ratio, uppercase_ratio, digit_ratio,
        noun_dens, verb_dens, adj_dens, pronoun_dens, conj_dens, prep_dens, adv_dens, num_dens, foreign_dens, interj_dens, det_dens, part_dens
    ]

# ==========================================
# 4. EKSEKUSI PENGUJIAN HIBRIDA LENGKAP
# ==========================================
kalimat_contoh = "kecerdasan buatan merupakan teknologi yang berkembang sangat pesat."

print("\n" + "="*80)
print(f" INPUT KALIMAT CONTOH SKRIPSI:")
print(f" '{kalimat_contoh}'")
print("="*80)

# A. Pembersihan Teks
kalimat_bersih = clean_text(kalimat_contoh)
print(f"\n[1] Hasil Preprocessing Teks (Teks Bersih):")
print(f"    '{kalimat_bersih}'")

# B. Transformasi TF-IDF Riil
tfidf_sparse = tfidf_vectorizer.transform([kalimat_bersih])
tfidf_array = tfidf_sparse.toarray()[0]
feature_names = tfidf_vectorizer.get_feature_names_out()

# Dapatkan Karakter N-Gram yang AKTIF (nilai TF-IDF > 0)
non_zero_indices = np.nonzero(tfidf_array)[0]
non_zero_features = [(feature_names[i], tfidf_array[i], i) for i in non_zero_indices]
# Urutkan berdasarkan bobot TF-IDF tertinggi
non_zero_features = sorted(non_zero_features, key=lambda x: x[1], reverse=True)

print(f"\n[2] Hasil Transformasi TF-IDF Riil (Karakter 3-5 Gram yang Aktif):")
print(f"    Menemukan {len(non_zero_features)} pecahan karakter dari kosakata latih:")
print(f"    {'-'*70}")
print(f"    {'No':<4} | {'N-Gram Aktif':<15} | {'Indeks Kosakata':<15} | {'Bobot TF-IDF'}")
print(f"    {'-'*70}")
for idx, (ngram, score, vocab_idx) in enumerate(non_zero_features, 1):
    print(f"    {idx:<4} | '{ngram}':<15 | {vocab_idx:<15} | {score:.4f}")
print("-"*70)

# C. Ekstraksi 35 Stilometri
print("\n[3] Mengekstrak 35 Dimensi Fitur Stilometri Riil...")
fitur_nilai = extract_stylometry_35(kalimat_contoh)

style_cols = [
    'avg_sent_len', 'sent_len_var', 'avg_word_len', 'total_sentences', 'total_words', 'char_count',
    'lex_div', 'guiraud_index', 'herdan_index', 'hapax_ratio', 'yules_i',
    'punct_dens', 'comma_ratio', 'period_ratio', 'qmark_ratio', 'excl_ratio', 'colon_ratio', 'semicolon_ratio', 'hyphen_ratio', 'quote_ratio', 'bracket_ratio', 'uppercase_ratio', 'digit_ratio',
    'noun_dens', 'verb_dens', 'adj_dens', 'pronoun_dens', 'conj_dens', 'prep_dens', 'adv_dens', 'num_dens', 'foreign_dens', 'interj_dens', 'det_dens', 'part_dens'
]

print("\n" + "="*70)
print(f"     HASIL DESIMAL 35 FITUR STILOMETRI")
print("="*70)
print(f"{'No':<4} | {'Nama Parameter Fitur (Sistem)':<25} | {'Nilai Riil Output'}")
print("-"*70)
for idx, (col_name, val) in enumerate(zip(style_cols, fitur_nilai), 1):
    print(f"{idx:<4} | {col_name:<25} | {val:.6f}")
print("="*70 + "\n")
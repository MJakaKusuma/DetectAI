import os
import joblib
import numpy as np
import pandas as pd

# Menyalakan ANSI Colors untuk visualisasi terminal yang cantik
os.system("") 
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_GREEN = "\033[92m"
COLOR_RED = "\033[91m"
COLOR_BLUE = "\033[94m"
COLOR_YELLOW = "\033[93m"

print(f"{COLOR_BOLD}{COLOR_BLUE}" + "="*70)
print("      DETECTAI - SISTEM DETEKSI TEKS GENERATIF AI (TERMINAL TESTER)")
print("="*70 + f"{COLOR_RESET}")

# Memuat library POS Tagger dari nlp-id untuk 35 fitur stilometri
try:
    print("Memuat library POS Tagger Kata.ai, mohon tunggu...")
    from nlp_id.postag import PosTag  
    postagger = PosTag()
    print(f"{COLOR_GREEN}[INFO] Sukses memuat POS Tagger Kata.ai!{COLOR_RESET}")
except Exception as e:
    print(f"{COLOR_RED}Gagal memuat nlp-id: {e}{COLOR_RESET}")
    exit()

# Impor fungsi pembersih naskah bawaan sistem Anda
try:
    from app.ml_logic import clean_text
except ImportError:
    print(f"{COLOR_RED}Gagal mengimpor 'clean_text' dari app.ml_logic!{COLOR_RESET}")
    exit()

# Memuat model, vectorizer, dan scaler terlatih
try:
    print("Memuat berkas model hibrida teroptimasi...")
    vectorizer = joblib.load("models/tfidf_vectorizer_testing_test.pkl")
    model = joblib.load("models/logistic_model_testing_test.pkl")
    scaler = joblib.load("models/scaler_style_testing_test.pkl")
    print(f"{COLOR_GREEN}[INFO] Berhasil memuat model, vectorizer, dan scaler aktif!{COLOR_RESET}")
except Exception as e:
    print(f"{COLOR_RED}Gagal memuat file model di folder 'models/': {e}{COLOR_RESET}")
    exit()


def extract_stylometry_35(text):
    """
    Ekstraksi 35 parameter gaya penulisan Bahasa Indonesia asli mentah.
    """
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
    
    return [
        avg_sent_len, sent_len_var, avg_word_len, total_sentences, total_words, char_count,
        lex_div, guiraud_index, herdan_index, hapax_ratio, yules_i,
        punct_dens, comma_ratio, period_ratio, qmark_ratio, excl_ratio, colon_ratio, semicolon_ratio, hyphen_ratio, quote_ratio, bracket_ratio, uppercase_ratio, digit_ratio,
        noun_dens, verb_dens, adj_dens, pronoun_dens, conj_dens, prep_dens, adv_dens, num_dens, foreign_dens, interj_dens, det_dens, part_dens
    ]

# Mulai pengujian interaktif berulang
print(f"\n{COLOR_GREEN}Sistem siap menerima uji teks!{COLOR_RESET}")

while True:
    print(f"\n{COLOR_BOLD}{COLOR_BLUE}" + "-"*70 + f"{COLOR_RESET}")
    print(f"Ketik/Tempel naskah teks Bahasa Indonesia Anda di bawah ini:")
    print(f"{COLOR_YELLOW}(Tekan Enter dua kali berturut-turut pada baris kosong jika selesai mengetik){COLOR_RESET}")
    print(f"(Ketik 'exit' atau 'q' secara langsung lalu Enter untuk keluar dari program)")
    print("-"*70)
    
    # Membaca input multi-line
    user_input = []
    while True:
        line = input()
        if line == '':
            break
        user_input.append(line)
        
    raw_text = "\n".join(user_input).strip()
    
    if not raw_text:
        print(f"{COLOR_YELLOW}Peringatan: Input kosong. Silakan masukkan teks.{COLOR_RESET}")
        continue
        
    if raw_text.lower() in ['q', 'exit', 'quit']:
        print(f"\n{COLOR_BOLD}{COLOR_BLUE}Program selesai. Terima kasih telah menggunakan DETECTAI!{COLOR_RESET}")
        break
        
    # Validasi panjang kata minimal
    word_count_check = len(raw_text.split())
    if word_count_check < 20:
        print(f"{COLOR_RED}Gagal: Panjang naskah terlalu pendek ({word_count_check} kata). Minimal masukan adalah 20 kata.{COLOR_RESET}")
        continue
        
    print("\nSedang menganalisis naskah teks...")
    
    try:
        # 1. Pembersihan teks (Preprocessing untuk TF-IDF)
        cleaned_text = clean_text(raw_text)
        
        # 2. Ekstraksi 35 Fitur Stilometri (Dari teks mentah asli)
        stilo_features = np.array(extract_stylometry_35(raw_text)).reshape(1, -1)
        
        # 3. Ekstraksi TF-IDF (Hanya Transform)
        tfidf_feat = vectorizer.transform([cleaned_text]).toarray()
        
        # 4. Gabungkan dan Normalisasi menggunakan MaxAbsScaler
        combined_raw = np.hstack((tfidf_feat, stilo_features))
        combined_scaled = scaler.transform(combined_raw)
        
        # 5. Klasifikasi & Prediksi Probabilitas
        prediction = model.predict(combined_scaled)[0]
        proba = model.predict_proba(combined_scaled)[0]
        
        # 6. Jalankan Kalibrasi Non-Linier Teroptimasi (Gamma = 0.6)
        raw_conf = proba[prediction]
        scaled_conf = 0.5 + 0.5 * np.power((raw_conf - 0.5) / 0.5, 0.6)
        final_confidence = scaled_conf * 100
        
        # 7. MENAMPILKAN HASIL DIAGNOSTIK AKHIR
        print("\n" + "="*50)
        print("          HASIL PEMINDAIAN DETECTAI")
        print("="*50)
        
        if prediction == 1:
            print(f"Hasil Diagnosis  : {COLOR_BOLD}{COLOR_RED}[ TERINDIKASI AI GENERATED ]{COLOR_RESET}")
        else:
            print(f"Hasil Diagnosis  : {COLOR_BOLD}{COLOR_GREEN}[ TULISAN ORGANIK MANUSIA ]{COLOR_RESET}")
            
        print(f"Tingkat Keyakinan: {COLOR_BOLD}{COLOR_YELLOW}{final_confidence:.2f}%{COLOR_RESET}")
        print("-"*50)
        print(f"    ANALISIS PARAMETER GRAFIS STILOMETRI NYATA")
        print("-"*50)
        print(f"Rerata Panjang Kalimat     : {stilo_features[0][0]:.2f} kata/kalimat")
        print(f"Variabilitas Kalimat       : {stilo_features[0][1]:.2f} (Sentence Variance)")
        print(f"Rasio Kosa Kata Unik (TTR) : {stilo_features[0][6]*100:.2f}% kosakata unik")
        print(f"Rasio Huruf Kapital        : {stilo_features[0][21]*100:.3f}% dari total teks")
        print(f"Kerapatan Kata Benda (Noun): {stilo_features[0][23]*100:.2f}% dari total POS")
        print(f"Kerapatan Kata Kerja (Verb): {stilo_features[0][24]*100:.2f}% dari total POS")
        print(f"Kerapatan Konjungsi (Conj) : {stilo_features[0][27]*100:.2f}% dari total POS")
        print("="*50)
        
    except Exception as e:
        print(f"{COLOR_RED}Terjadi kesalahan saat memproses teks: {e}{COLOR_RESET}")
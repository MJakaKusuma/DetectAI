import re
import numpy as np
import pandas as pd
from nlp_id.postag import PosTag

try:
    postagger = PosTag()
    print("[INFO] Sukses memuat POS Tagger Kata.ai!")
except Exception as e:
    print(f"[Warning] Gagal inisialisasi POS Tagger: {e}")
    postagger = None

def clean_text(text):
    """Membersihkan teks dari URL, karakter aneh, dan spasi ganda"""
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_stylometry(text):
    """
    Ekstraksi 35 parameter gaya penulisan dan tata bahasa Bahasa Indonesia.
    Menggunakan Aturan 1-Pass POS Tagging untuk efisiensi latensi.
    """
    if not isinstance(text, str) or len(text.strip()) == 0:
        return [0.0] * 35

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
    uppercase_ratio = sum(1 for c in text if c.isupper()) / num_chars if num_chars > 0 else 0.0
    digit_ratio = sum(1 for c in text if c.isdigit()) / num_chars if num_chars > 0 else 0.0
    
    # --- KELOMPOK D: SYNTACTIC/POS-TAGGING (12 Fitur - 1-PASS) ---
    pos_tags = []
    if postagger is not None:
        try:
            pos_tags = postagger.get_pos_tag(text)
        except Exception:
            pass
        
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
    
    return [
        avg_sent_len, sent_len_var, avg_word_len, total_sentences, total_words, char_count,
        lex_div, guiraud_index, herdan_index, hapax_ratio, yules_i,
        punct_dens, comma_ratio, period_ratio, qmark_ratio, excl_ratio, colon_ratio, semicolon_ratio, hyphen_ratio, quote_ratio, bracket_ratio, uppercase_ratio, digit_ratio,
        noun_dens, verb_dens, adj_dens, pronoun_dens, conj_dens, prep_dens, adv_dens, num_dens, foreign_dens, interj_dens, det_dens, part_dens
    ]
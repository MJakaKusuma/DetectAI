import re
import numpy as np
import pandas as pd
from nlp_id import PosTag

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
    Ekstraksi Fitur Stilometrik Komprehensif (7 Dimensi Fitur):
    1. Rata-rata Panjang Kalimat (avg_sent_len)
    2. Keberagaman Kosakata (lex_div)
    3. Kerapatan Tanda Baca (punct_dens)
    4. Standar Deviasi Panjang Kalimat (sent_len_var / Burstiness)
    5. Kerapatan Kata Benda (noun_dens)
    6. Kerapatan Kata Kerja (verb_dens)
    7. Kerapatan Kata Sifat (adj_dens)
    """
    sentences = text.split('.')
    sentences = [s.strip() for s in sentences if len(s.strip()) > 0]

    words = text.split()
    total_words = len(words)

    avg_sentence_length = total_words / len(sentences) if len(sentences) > 0 else 0
    lexical_diversity = len(set(words)) / total_words if total_words > 0 else 0
    punctuation = len(re.findall(r'[.,!?;:]', text))
    punct_density = punctuation / total_words if total_words > 0 else 0

    sentence_lengths = [len(s.split()) for s in sentences]
    sent_len_var = np.std(sentence_lengths) if len(sentence_lengths) > 0 else 0

    noun_count = 0
    verb_count = 0
    adj_count = 0
    
    if total_words > 0 and postagger is not None:
        try:
            pos_tags = postagger.get_pos_tag(text)
            for _, tag in pos_tags:
                tag_upper = tag.upper()
                
                if tag_upper.startswith("NN"):
                    noun_count += 1
                elif tag_upper.startswith("VB"):
                    verb_count += 1
                elif tag_upper in ["ADJ", "JJ"]:
                    adj_count += 1
        except Exception as e:
            print(f"Error pada saat ekstraksi POS: {e}")
            
    noun_density = noun_count / total_words if total_words > 0 else 0
    verb_density = verb_count / total_words if total_words > 0 else 0
    adj_density = adj_count / total_words if total_words > 0 else 0
    
    return pd.Series([
        avg_sentence_length, 
        lexical_diversity, 
        punct_density,
        sent_len_var,
        noun_density,
        verb_density,
        adj_density
    ])
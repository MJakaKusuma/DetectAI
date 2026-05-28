import re
import numpy as np

# Fungsi Preprocessing (Harus sama persis dengan app.py)
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_stylometry(text):
    sentences = text.split('.')
    sentences = [s for s in sentences if len(s) > 0]
    words = text.split()
    avg_sent_len = len(words) / len(sentences) if len(sentences) > 0 else 0
    lex_div = len(set(words)) / len(words) if len(words) > 0 else 0
    punct = len(re.findall(r'[.,!?;:]', text))
    punct_dens = punct / len(words) if len(words) > 0 else 0
    return np.array([avg_sent_len, lex_div, punct_dens]).reshape(1, -1)
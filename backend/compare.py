import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix

# --- 1. DATASET UTAMA STUDI KASUS KOMPARATIF (N=20 SAMPEL) ---
raw_data = [
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "88.71%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "16.01%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "81.14%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "89.42%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "87.58%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "76.05%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "90.63%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "81.20%", "gpt_zero_raw": "100%", "zerogpt_raw": "6,10%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "90.37%", "gpt_zero_raw": "98%", "zerogpt_raw": "0%"},
    {"label": 0, "model": "journal expert si ubl", "detect_ai_raw": "72.69%", "gpt_zero_raw": "100%", "zerogpt_raw": "0%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "84.59%", "gpt_zero_raw": "100%", "zerogpt_raw": "89.1%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "98.10%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "93.34%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "94.68%", "gpt_zero_raw": "95%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "86.36%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "92.36%", "gpt_zero_raw": "95%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "90.36%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "90.06%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "83.86%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"},
    {"label": 1, "model": "gemini 3.5 flash", "detect_ai_raw": "96.47%", "gpt_zero_raw": "100%", "zerogpt_raw": "100%"}
]

df = pd.DataFrame(raw_data)

# --- 2. FUNGSI MEMBERSIHKAN STRING PERSENTASE KE FLOAT ---
def clean_pct(val):
    if pd.isna(val): 
        return 0.0
    s = str(val).replace("%", "").replace(",", ".").strip()
    return float(s)

df['detect_ai_val'] = df['detect_ai_raw'].apply(clean_pct)
df['gpt_zero_val'] = df['gpt_zero_raw'].apply(clean_pct)
df['zerogpt_val'] = df['zerogpt_raw'].apply(clean_pct)


# --- 3. LOGIKA PREDIKSI KUSTOM DETECTAI ---
# Jika label=0: detect_ai_val adalah Probabilitas MANUSIA. >50% berarti terprediksi MANUSIA (0), <50% terprediksi AI (1).
# Jika label=1: detect_ai_val adalah Probabilitas AI. >50% berarti terprediksi AI (1), <50% terprediksi MANUSIA (0).
def get_detect_ai_pred(row):
    val = row['detect_ai_val']
    if row['label'] == 0:
        return 0 if val >= 50.0 else 1
    else:
        return 1 if val >= 50.0 else 0

df['pred_detect_ai'] = df.apply(get_detect_ai_pred, axis=1)
df['correct_detect_ai'] = df['pred_detect_ai'] == df['label']

# Menghitung keyakinan prediksi: jika salah, nilai keyakinan adalah (100 - val)
def get_detect_ai_conf(row):
    val = row['detect_ai_val']
    if row['correct_detect_ai']:
        return val
    else:
        return 100.0 - val

df['conf_detect_ai'] = df.apply(get_detect_ai_conf, axis=1)


# --- 4. LOGIKA PREDIKSI SISTEM KOMERSIAL (GPTZero & ZeroGPT) ---
# Persentase gpt_zero_raw dan zerogpt_raw secara default menunjukkan "PROBABILITAS AI".
# Sehingga, jika >= 50% diprediksi AI (1), jika < 50% diprediksi MANUSIA (0).
df['pred_gpt_zero'] = df['gpt_zero_val'].apply(lambda x: 1 if x >= 50.0 else 0)
df['correct_gpt_zero'] = df['pred_gpt_zero'] == df['label']
df['conf_gpt_zero'] = df.apply(
    lambda r: r['gpt_zero_val'] if r['pred_gpt_zero'] == 1 else (100.0 - r['gpt_zero_val']), 
    axis=1
)

df['pred_zerogpt'] = df['zerogpt_val'].apply(lambda x: 1 if x >= 50.0 else 0)
df['correct_zerogpt'] = df['pred_zerogpt'] == df['label']
df['conf_zerogpt'] = df.apply(
    lambda r: r['zerogpt_val'] if r['pred_zerogpt'] == 1 else (100.0 - r['zerogpt_val']), 
    axis=1
)


# --- 5. FUNGSI KALKULASI METRIK EVALUASI FORMAL ---
def get_system_stats(y_true, y_pred, confidences, correctness):
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    mean_conf_all = np.mean(confidences)
    max_conf_all = np.max(confidences)
    min_conf_all = np.min(confidences)

    correct_idx = correctness == True
    incorrect_idx = correctness == False

    mean_conf_correct = np.mean(confidences[correct_idx]) if sum(correct_idx) > 0 else 0.0
    min_conf_correct = np.min(confidences[correct_idx]) if sum(correct_idx) > 0 else 0.0
    mean_conf_incorrect = np.mean(confidences[incorrect_idx]) if sum(incorrect_idx) > 0 else 0.0
    max_conf_incorrect = np.max(confidences[incorrect_idx]) if sum(incorrect_idx) > 0 else 0.0

    return {
        "TN": tn, "FP": fp, "FN": fn, "TP": tp,
        "Accuracy": f"{accuracy*100:.2f}%",
        "Precision": f"{precision*100:.2f}%",
        "Recall (Sensitivity)": f"{recall*100:.2f}%",
        "F1-Score": f"{f1:.4f}",
        "Overall Mean Confidence": f"{mean_conf_all:.2f}%",
        "Overall Max Confidence": f"{max_conf_all:.2f}%",
        "Overall Min Confidence": f"{min_conf_all:.2f}%",
        "Mean Confidence (Correct)": f"{mean_conf_correct:.2f}%",
        "Min Confidence (Correct)": f"{min_conf_correct:.2f}%",
        "Mean Confidence (Incorrect)": f"{mean_conf_incorrect:.2f}%" if sum(incorrect_idx) > 0 else "0.00% (N/A)",
        "Max Confidence (Incorrect)": f"{max_conf_incorrect:.2f}%" if sum(incorrect_idx) > 0 else "0.00% (N/A)"
    }

detect_ai_stats = get_system_stats(df['label'].values, df['pred_detect_ai'].values, df['conf_detect_ai'].values, df['correct_detect_ai'].values)
gpt_zero_stats = get_system_stats(df['label'].values, df['pred_gpt_zero'].values, df['conf_gpt_zero'].values, df['correct_gpt_zero'].values)
zerogpt_stats = get_system_stats(df['label'].values, df['pred_zerogpt'].values, df['conf_zerogpt'].values, df['correct_zerogpt'].values)

metrics_list = [
    "TN", "FP", "FN", "TP", 
    "Accuracy", "Precision", "Recall (Sensitivity)", "F1-Score",
    "Overall Mean Confidence", "Overall Max Confidence", "Overall Min Confidence",
    "Mean Confidence (Correct)", "Min Confidence (Correct)",
    "Mean Confidence (Incorrect)", "Max Confidence (Incorrect)"
]

# --- 6. CETAK TABEL KOMPARATIF UNTUK NASKAH SKRIPSI ---
print("\n" + "="*86)
print("     BENCHMARK EVALUATION METRICS COMPARISON (N=20 BALANCED SAMPLES)")
print("="*86)
print(f"{'Metric / Statistic':<35} | {'DETECTAI (Ours)':<15} | {'ZeroGPT':<13} | {'GPTZero':<12}")
print("-"*86)
for metric in metrics_list:
    # Memformat tampilan angka agar rata tengah secara simetris
    print(f"{metric:<35} | {str(detect_ai_stats[metric]):^15} | {str(zerogpt_stats[metric]):^13} | {str(gpt_zero_stats[metric]):^12}")
print("="*86 + "\n")


# --- 7. VISUALISASI 3 MATRIKS KEKACAUAN BERDAMPINGAN ---
fig, axes = plt.subplots(1, 3, figsize=(21, 6))
fig.suptitle('Komparasi Matriks Kekacauan Antar-Detektor (N=20 Sampel)', fontsize=18, fontweight='bold')

# Subplot 1: DETECTAI (Ours)
cm_detectai = confusion_matrix(df['label'], df['pred_detect_ai'], labels=[0, 1])
tn_d, fp_d, fn_d, tp_d = cm_detectai.ravel()
labels_detectai = [
    f'TN\n(Human)\n{tn_d}', f'FP\n(Accused AI)\n{fp_d}',
    f'FN\n(AI Escaped)\n{fn_d}', f'TP\n(AI Detected)\n{tp_d}'
]
labels_detectai = np.asarray(labels_detectai).reshape(2, 2)
sns.heatmap(cm_detectai, annot=labels_detectai, fmt='', cmap='Blues', ax=axes[0], cbar=False,
            xticklabels=['Human', 'AI'], yticklabels=['Human', 'AI'], annot_kws={"size": 14, "weight": "bold"})
axes[0].set_title('DETECTAI (Ours)', fontsize=16, fontweight='bold')
axes[0].set_xlabel('Predicted Label', fontsize=12)
axes[0].set_ylabel('True Label', fontsize=12)

# Subplot 2: ZeroGPT
cm_zerogpt = confusion_matrix(df['label'], df['pred_zerogpt'], labels=[0, 1])
tn_z, fp_z, fn_z, tp_z = cm_zerogpt.ravel()
labels_zerogpt = [
    f'TN\n(Human)\n{tn_z}', f'FP\n(Accused AI)\n{fp_z}',
    f'FN\n(AI Escaped)\n{fn_z}', f'TP\n(AI Detected)\n{tp_z}'
]
labels_zerogpt = np.asarray(labels_zerogpt).reshape(2, 2)
sns.heatmap(cm_zerogpt, annot=labels_zerogpt, fmt='', cmap='Greens', ax=axes[1], cbar=False,
            xticklabels=['Human', 'AI'], yticklabels=['', ''], annot_kws={"size": 14, "weight": "bold"})
axes[1].set_title('ZeroGPT', fontsize=16, fontweight='bold')
axes[1].set_xlabel('Predicted Label', fontsize=12)
axes[1].set_ylabel('')

# Subplot 3: GPTZero
cm_gptzero = confusion_matrix(df['label'], df['pred_gpt_zero'], labels=[0, 1])
tn_g, fp_g, fn_g, tp_g = cm_gptzero.ravel()
labels_gptzero = [
    f'TN\n(Human)\n{tn_g}', f'FP\n(Accused AI)\n{fp_g}',
    f'FN\n(AI Escaped)\n{fn_g}', f'TP\n(AI Detected)\n{tp_g}'
]
labels_gptzero = np.asarray(labels_gptzero).reshape(2, 2)
sns.heatmap(cm_gptzero, annot=labels_gptzero, fmt='', cmap='Oranges', ax=axes[2], cbar=False,
            xticklabels=['Human', 'AI'], yticklabels=['', ''], annot_kws={"size": 14, "weight": "bold"})
axes[2].set_title('GPTZero', fontsize=16, fontweight='bold')
axes[2].set_xlabel('Predicted Label', fontsize=12)
axes[2].set_ylabel('')

plt.tight_layout(rect=[0, 0, 1, 0.95])
plt.show()
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Data confusion matrix dari hasil pengujian komparatif
# Format: [[TN, FP], [FN, TP]]
cm_detect_ai = np.array([[10, 0], [0, 10]])
cm_zerogpt   = np.array([[10, 0], [0, 10]])
cm_gpt_zero  = np.array([[0, 10], [0, 10]])

# Siapkan plot dengan 1 baris dan 3 kolom
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle('Comparative Confusion Matrices (N=21)', fontsize=16, fontweight='bold', y=1.05)

# Label untuk anotasi gambar
labels_opt = ['TN\n(Human)', 'FP\n(Accused AI)', 'FN\n(AI Escaped)', 'TP\n(AI Detected)']

# 1. Plot DETECTAI
counts_1 = [f'{value}' for value in cm_detect_ai.flatten()]
annot_1 = [f'{name}\n{count}' for name, count in zip(labels_opt, counts_1)]
annot_1 = np.asarray(annot_1).reshape(2, 2)

sns.heatmap(cm_detect_ai, annot=annot_1, fmt='', cmap='Blues', cbar=False, ax=axes[0],
            xticklabels=['Human', 'AI'], yticklabels=['Human', 'AI'])
axes[0].set_title('DETECTAI (Ours)', fontsize=13, fontweight='bold')
axes[0].set_xlabel('Predicted Label')
axes[0].set_ylabel('True Label')

# 2. Plot ZeroGPT
counts_2 = [f'{value}' for value in cm_zerogpt.flatten()]
annot_2 = [f'{name}\n{count}' for name, count in zip(labels_opt, counts_2)]
annot_2 = np.asarray(annot_2).reshape(2, 2)

sns.heatmap(cm_zerogpt, annot=annot_2, fmt='', cmap='Greens', cbar=False, ax=axes[1],
            xticklabels=['Human', 'AI'], yticklabels=['Human', 'AI'])
axes[1].set_title('ZeroGPT', fontsize=13, fontweight='bold')
axes[1].set_xlabel('Predicted Label')
axes[1].set_ylabel('True Label')

# 3. Plot GPTZero
counts_3 = [f'{value}' for value in cm_gpt_zero.flatten()]
annot_3 = [f'{name}\n{count}' for name, count in zip(labels_opt, counts_3)]
annot_3 = np.asarray(annot_3).reshape(2, 2)

# Menggunakan warna 'Oranges' karena ada banyak False Positive (salah)
sns.heatmap(cm_gpt_zero, annot=annot_3, fmt='', cmap='Oranges', cbar=False, ax=axes[2],
            xticklabels=['Human', 'AI'], yticklabels=['Human', 'AI'])
axes[2].set_title('GPTZero', fontsize=13, fontweight='bold')
axes[2].set_xlabel('Predicted Label')
axes[2].set_ylabel('True Label')

plt.tight_layout()

# Simpan gambar untuk slide presentasi Anda
plt.savefig('models/comparative_confusion_matrices.png', dpi=300, bbox_inches='tight')
print("Gambar perbandingan berhasil disimpan di 'models/comparative_confusion_matrices.png'")
plt.show()
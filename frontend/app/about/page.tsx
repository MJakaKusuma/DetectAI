"use client";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-16 animate-fade-in">
      
      {/* Header Utama */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Landasan Teori & Metodologi</span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tight">Metodologi Klasifikasi Hibrida</h1>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
          Eksplorasi ilmiah di balik sistem **DETECTAI**. Bagaimana integrasi fitur leksikal permukaan dan analisis gaya bahasa bawah sadar dihitung secara matematis untuk membongkar sidik jari linguistik mesin.
        </p>
      </div>

      {/* Bagian Perbandingan Pendekatan Hibrida */}
      <section className="space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-slate-800">Dua Pilar Ekstraksi Fitur</h2>
          <p className="text-xs text-slate-400">Penggabungan metode statistik representasi kata dan analisis gaya penulisan kuantitatif:</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: TF-IDF */}
          <div className="p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl font-black">W</div>
            <h3 className="text-xl font-bold text-slate-800">1. Analisis Leksikal (500-D Karakter N-Gram)</h3>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Mendeteksi &quot;Apa&quot; yang Ditulis (Preferensi Kata kunci)</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Menggunakan metode pembobotan statistik <strong>Term Frequency-Inverse Document Frequency (TF-IDF)</strong> pada tingkat <strong>Karakter N-Gram (rentang panjang 3 s.d 5 karakter)</strong> untuk memetakan morfologi teks.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Model bahasa besar (LLMs) memiliki keterbatasan probabilistik yang menyebabkan mereka sering kali menggunakan kata sambung dan kata kerja aktif tertentu secara berulang (*over-optimization*) demi mempertahankan stabilitas tata bahasa formal.
            </p>
          </div>

          {/* Card 2: Stilometri */}
          <div className="p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl font-black">S</div>
            <h3 className="text-xl font-bold text-slate-800">2. Analisis Stilometrik (35-D Gaya Penulisan)</h3>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Mendeteksi &quot;Bagaimana&quot; Teks Ditulis (Kebiasaan Bawah Sadar)</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengevaluasi aspek kepenulisan intrinsik yang tidak dipengaruhi topik bahasan. Analisis ini mengisolasi variabilitas penulisan organik manusia dengan kelancaran kaku (*too perfect*) hasil generasi probabilitas mesin.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Meskipun AI modern dapat memanipulasi kosakata leksikal untuk menghindari deteksi kata kunci, AI sangat sulit meniru dinamika struktural, variasi ritme tanda baca alami, dan proporsi kelas kata sintaksis yang tidak konsisten khas manusia.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================================== */}
      {/* RINCIAN 35 FITUR STILOMETRI (4 KELOMPOK UTAMA) */}
      {/* ============================================================================== */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">Feature Architecture</span>
          <h3 className="text-2xl font-black text-slate-800 pt-2">Kompilasi 35 Fitur Stilometrik</h3>
          <p className="text-xs text-slate-400">Seluruh dimensi parameter gaya bahasa kuantitatif yang diekstrak dan dibagi ke dalam empat kategori analisis sintaksis-ortografis:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kelompok A */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 hover:bg-white hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Kelompok A (6 Fitur)</span>
              <span className="text-xs font-black text-slate-300">01</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-700">A. Ritme & Panjang Kalimat</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengevaluasi dimensi fisik dan dinamika kepenulisan dokumen. Meliputi: rata-rata panjang kalimat (<em>avg_sent_len</em>), rata-rata panjang kata (<em>avg_word_len</em>), variabilitas panjang kalimat/<em>Burstiness</em> (<em>sent_len_var</em>), akumulasi kalimat (<em>total_sentences</em>), total kata, dan jumlah karakter.
            </p>
          </div>

          {/* Kelompok B */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 hover:bg-white hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Kelompok B (5 Fitur)</span>
              <span className="text-xs font-black text-slate-300">02</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-700">B. Kekayaan & Diversitas Kosakata</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengukur keragaman diksi kosakata penulis secara logaritmik dan statistik. Meliputi: <em>Type-Token Ratio</em> (lex_div), Indeks Guiraud untuk meredam panjang dokumen, Indeks Herdan, rasio kata langka yang hanya muncul satu kali (<em>Hapax Legomena Ratio</em>), dan <em>Yule`s I Measure</em>.
            </p>
          </div>

          {/* Kelompok C */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 hover:bg-white hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Kelompok C (12 Fitur)</span>
              <span className="text-xs font-black text-slate-300">03</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-700">C. Densitas Tanda Baca & Ortografis</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengukur kepatuhan tanda baca secara global dan rasio sebarannya. Meliputi: kerapatan tanda baca global (<em>punct_dens</em>), rasio tanda koma (<em>comma_ratio</em>), tanda titik (<em>period_ratio</em>), tanda tanya, tanda seru, titik dua, titik koma, tanda hubung, tanda petik, tanda kurung, rasio huruf kapital, dan angka.
            </p>
          </div>

          {/* Kelompok D */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 hover:bg-white hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Kelompok D (12 Fitur)</span>
              <span className="text-xs font-black text-slate-300">04</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-700">D. Kerapatan Kelas Kata (Sintaksis POS)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Menggunakan <em>Part-of-Speech Tagging</em> Bahasa Indonesia untuk menghitung rasio sebaran kelas kata tata bahasa terhadap total seluruh kata dalam dokumen. Meliputi kerapatan: kata benda (<em>noun_dens</em>), verba/kata kerja, adjektiva/kata sifat, pronomina, konjungsi, preposisi, adverbia, numeralia, kata asing, interjeksi, determiner, dan partikel penegas.
            </p>
          </div>

        </div>
      </section>

      {/* ============================================================================== */}
      {/* FORMULASI MATEMATIKA PIPELINE DETEKSI */}
      {/* ============================================================================== */}
      <section className="space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-slate-800">Formulasi Matematis Sistem</h2>
          <p className="text-xs text-slate-400">Dasar pemodelan kalkulasi kuantitatif di sisi backend server:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Rumus 1: MaxAbsScaler */}
          <div className="p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Feature Scaling</span>
            <h4 className="text-sm font-bold text-slate-800">Penskalaan Fitur Gaya Bahasa (MaxAbsScaler)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Untuk menyelaraskan rentang dimensi nilai stilometri kontinu tanpa merusak sifat jarang (<em>sparsity</em>) dari matriks TF-IDF:
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center font-mono text-sm text-indigo-600 font-bold">
              x_scaled = x / max(|X|)
            </div>
            <p className="text-[10px] text-slate-400">
              *Metode ini menghindari pemusatan data (no centering) sehingga nilai nol asli pada matriks TF-IDF tetap terjaga secara mutlak.
            </p>
          </div>

          {/* Rumus 2: Kalibrasi Probabilitas */}
          <div className="p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Probability Sharpening</span>
            <h4 className="text-sm font-bold text-slate-800">Kalibrasi Eksponensial Non-Linier (Gamma = 0.4)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Meningkatkan contrast nilai keyakinan global di sekitar area ambigu demi ketegasan interpretasi laporan hasil:
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 font-mono text-[10px] sm:text-xs text-indigo-600 font-bold space-y-1">
              <p>Jika P_raw &gt;= 0.5:</p>
              <p className="pl-4">P_calibrated = 0.5 + 0.5 * ((P_raw - 0.5) / 0.5)^0.4</p>
              <p>Jika P_raw &lt; 0.5:</p>
              <p className="pl-4">P_calibrated = 0.5 - 0.5 * ((0.5 - P_raw) / 0.5)^0.4</p>
            </div>
            <p className="text-[10px] text-slate-400">
              *Teks dengan keyakinan global di bawah 75.00% diklasifikasikan ke dalam zona pengaman Ragu-Ragu untuk menghindari salah tuduh.
            </p>
          </div>

        </div>
      </section>

      {/* Model Klasifikasi & Performa Akhir */}
      <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full">Core Classifier Engine</span>
            <h3 className="text-2xl font-black mt-2 tracking-tight">Vektor Hibrida 535 Dimensi & Regresi Logistik L2</h3>
          </div>
          <div className="bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider">Akurasi Internal Model</p>
            <p className="text-xl font-black">94.20%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed pt-2">
          <p>
            Seluruh fitur numerik hasil ekstraksi TF-IDF tingkat Karakter N-Gram (500 dimensi) dan metrik Stilometri (35 dimensi) digabungkan secara sejajar menjadi satu vektor hibrida tunggal sepanjang <strong>535 dimensi</strong>. Vektor ini diumpankan secara langsung ke algoritma Regresi Logistik L2 dengan parameter invers regularisasi ketat (C=0.01) guna meminimalkan koefisien bobot yang terlalu ekstrem.
          </p>
          <p>
            Model ini diimplementasikan menggunakan solver <em>lbfgs</em> kuasi-Newton di sisi backend FastAPI secara asinkron. Pendekatan ini menghasilkan waktu inferensi yang sangat cepat (rata-rata 0,3 detik per dokumen) tanpa mengorbankan ketangguhan. Pada uji buta eksternal (125 sampel), DETECTAI membuktikan tingkat generalisasi yang andal dengan akurasi akhir global mencapai <strong>95.20%</strong>.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <span className="text-slate-400 font-bold">DETECTAI © 2026 ─ Universitas Bandar Lampung</span>
          <Link href="/dashboard" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30">
            Coba Pindai Teks
          </Link>
        </div>
      </section>

    </div>
  );
}
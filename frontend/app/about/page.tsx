"use client";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Landasan Teori</span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-800">Metodologi Klasifikasi Hibrida</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Bagaimana cara komputer membedakan buah pikiran manusia dengan hasil algoritma probabilitas matematika? Pelajari dasar ilmiah di balik sistem deteksi DetectAI.
        </p>
      </div>

      {/* Bagian Perbandingan Pendekatan */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        
        {/* Card 1: TF-IDF */}
        <div className="p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl font-bold">
            W
          </div>
          <h3 className="text-xl font-bold text-slate-800">1. Analisis Leksikal (TF-IDF)</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mendeteksi &quot;Apa&quot; yang Ditulis</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Term Frequency-Inverse Document Frequency (TF-IDF)</strong> adalah metode statistik untuk mengukur seberapa penting sebuah kata dalam suatu dokumen terhadap korpus data. 
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Teks generatif AI cenderung memiliki bobot leksikal yang kaku karena model bahasa besar (LLM) bekerja dengan memilih kata dengan probabilitas tertinggi yang sering kali menghasilkan pola kemunculan kata kunci tertentu yang terlalu teratur.
          </p>
        </div>

        {/* Card 2: Stilometri */}
        <div className="p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl font-bold">
            S
          </div>
          <h3 className="text-xl font-bold text-slate-800">2. Analisis Stilometrik (Stilometri)</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mendeteksi &quot;Bagaimana&quot; Teks Ditulis</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Stilometri</strong> adalah studi ilmiah yang menganalisis gaya penulisan kebahasaan seseorang secara statistik. Metode ini berasumsi bahwa setiap penulis (baik manusia maupun mesin) memiliki &quot;sidik jari linguistik&quot; yang unik.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Meskipun AI dapat diperintahkan untuk meniru kosakata tertentu, AI sangat sulit meniru dinamika struktural, variasi panjang kalimat, dan ritme tanda baca alami yang sering kali tidak konsisten pada tulisan manusia asli.
          </p>
        </div>

      </section>

      {/* ============================================================================== */}
      {/* RINCIAN 7 METRIK STILOMETRI YANG DIEKSTRAK (VERSI KOMPREHENSIF) */}
      {/* ============================================================================== */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 animate-fade-in">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">Feature Details</span>
          <h3 className="text-xl font-black text-slate-800 pt-1">7 Metrik Stilometri yang Diekstrak</h3>
          <p className="text-xs text-slate-400">Tujuh parameter statistik dan kelas kata utama yang diproses oleh model Regresi Logistik kami untuk mengidentifikasi sidik jari linguistik:</p>
        </div>

        {/* Grid Responsif (cols-1 di HP, cols-2 di Tablet, cols-3 di Laptop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* ========================== KELOMPOK 1: METRIK STRUKTURAL ========================== */}

          {/* Metrik 1 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Struktural</span>
              <span className="text-xs font-black text-slate-300">01</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">A. Rata-rata Panjang Kalimat</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio jumlah kata dibagi jumlah kalimat. AI cenderung memproduksi kalimat dengan panjang yang sangat seragam dan monoton (konstan di kisaran 12-16 kata), sedangkan manusia menulis dengan dinamika panjang kalimat yang bervariasi secara alami.
            </p>
          </div>

          {/* Metrik 2 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Struktural</span>
              <span className="text-xs font-black text-slate-300">02</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">B. Keberagaman Kosakata (Lexical Diversity)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Menggunakan rumus Type-Token Ratio (TTR) untuk menghitung kosa kata unik dibanding total seluruh kata. Manusia menggunakan kosa kata yang lebih beraneka ragam dan tidak terduga, sedangkan AI cenderung menggunakan kata-kata &quot;aman&quot; yang berulang demi menjaga tata bahasa baku.
            </p>
          </div>

          {/* Metrik 3 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Struktural</span>
              <span className="text-xs font-black text-slate-300">03</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">C. Kerapatan Tanda Baca</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio jumlah tanda baca utama terhadap total kata. AI memiliki kepatuhan statistik yang sangat kaku dan stabil dalam menempatkan tanda koma dan titik sesuai pedoman formal, menghasilkan tingkat kerapatan yang berbeda dengan tulisan manusia yang lebih fleksibel.
            </p>
          </div>

          {/* Metrik 4 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Struktural</span>
              <span className="text-xs font-black text-slate-300">04</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">D. Variabilitas Kalimat (Burstiness)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standar deviasi dari panjang kalimat di seluruh dokumen. Tulisan manusia memiliki tingkat burstiness yang tinggi (kalimat sangat panjang yang dikombinasikan dengan kalimat pendek), sedangkan AI memiliki variabilitas rendah karena panjang kalimatnya sangat seragam.
            </p>
          </div>

          {/* ========================== KELOMPOK 2: METRIK SINTAKSIS / POS ========================== */}

          {/* Metrik 5 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Sintaksis (POS)</span>
              <span className="text-xs font-black text-slate-300">05</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">E. Kerapatan Kata Benda (Nomina)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio kata benda (`NOUN` & `PROPN`) terhadap total seluruh kata, diekstrak menggunakan POS Tagger nlp-id. Tulisan AI cenderung memiliki kepadatan nomina yang sangat tinggi karena fokus menyajikan informasi secara padat dan ringkas dalam satu kalimat.
            </p>
          </div>

          {/* Metrik 6 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Sintaksis (POS)</span>
              <span className="text-xs font-black text-slate-300">06</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">F. Kerapatan Kata Kerja (Verba)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio kata kerja (`VERB`) terhadap total seluruh kata. Tulisan manusia secara alami memiliki kerapatan verba yang lebih tinggi karena manusia cenderung menceritakan proses tindakan (action-driven) dan hubungan aktif secara lebih dinamis dibanding mesin.
            </p>
          </div>

          {/* Metrik 7 */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Sintaksis (POS)</span>
              <span className="text-xs font-black text-slate-300">07</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700">G. Kerapatan Kata Sifat (Adjektiva)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio kata sifat (`ADJ` / `JJ`) terhadap total kata. AI seringkali menggunakan kata sifat formal secara berlebihan (seperti kata komprehensif, signifikan, optimal) guna memberikan penekanan teks yang terdengar sangat profesional dan berwibawa secara akademis.
            </p>
          </div>

        </div>
      </section>

      {/* Model Klasifikasi */}
      <section className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl border border-slate-800 space-y-6">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Algoritma Klasifikasi</span>
          <h3 className="text-xl font-bold mt-2">Model Regresi Logistik (Logistic Regression)</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Semua fitur numerik hasil ekstraksi TF-IDF (1.000 dimensi) dan metrik Stilometri (3 dimensi) digabungkan menjadi sebuah vektor masukan tunggal sepanjang **1.003 dimensi**. Vektor ini kemudian diproses menggunakan algoritma Regresi Logistik.
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          Regresi Logistik dipilih karena merupakan model klasifikasi linear yang efisien untuk data berdimensi tinggi, serta bersifat *interpretable*—artinya nilai bobot koefisien keputusannya dapat dianalisis secara transparan untuk memahami arah keputusan klasifikasi sistem.
        </p>
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-indigo-400 font-bold">Rata-rata Akurasi Pengujian: 97.66%</span>
          <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-all text-xs uppercase tracking-wider">
            Coba Analyzer
          </Link>
        </div>
      </section>

    </div>
  );
}
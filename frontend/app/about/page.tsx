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

      {/* Rincian 3 Metrik Stilometri */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-sm space-y-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">3 Metrik Stilometri yang Diekstrak</h3>
          <p className="text-xs text-slate-400">Tiga parameter statistik utama yang digunakan oleh model Regresi Logistik kami untuk mengidentifikasi gaya bahasa:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Metrik 1 */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">A. Rata-rata Panjang Kalimat</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dihitung dengan membagi total kata dengan jumlah kalimat. AI cenderung memproduksi kalimat yang sangat seragam (misal berkisar antara 14-16 kata secara konstan), sedangkan manusia menulis dengan dinamika yang acak (kalimat panjang diikuti kalimat pendek).
            </p>
          </div>

          {/* Metrik 2 */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">B. Keberagaman Kosakata (Lexical Diversity)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio perbandingan kata unik terhadap jumlah total kata (Type-Token Ratio). Manusia cenderung memiliki kosa kata yang lebih kaya dan tidak terduga, sedangkan AI cenderung menggunakan kosa kata yang lebih terbatas dan berulang demi menjaga tata bahasa baku.
            </p>
          </div>

          {/* Metrik 3 */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">C. Kerapatan Tanda Baca</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rasio penggunaan karakter tanda baca utama terhadap total seluruh kata dalam teks. AI memiliki kepatuhan statistik yang kaku dalam menggunakan tanda baca (seperti koma dan titik) sesuai kaidah tata bahasa formal, yang menghasilkan kerapatan nilai statistik yang berbeda dengan manusia.
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
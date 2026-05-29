"use client";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Hero Section */}
      <section className="w-full py-24 px-6 text-center bg-radial-gradient from-indigo-50/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold tracking-wider uppercase mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Riset Deteksi Teks Generatif Bahasa Indonesia
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-none mb-8">
            Deteksi Keaslian Teks dengan <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Metode Stilometri Hibrida
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Identifikasi perbedaan karakteristik penulisan manusia dan mesin. Kami mengevaluasi pola struktural linguistik teks secara komparatif untuk menjaga integritas informasi digital.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/dashboard" className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wider">
              Buka Analyzer
            </Link>
            <Link href="/register" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-sm uppercase tracking-wider">
              Buat Akun
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Mockup Preview */}
      <section className="w-full px-6 max-w-5xl -mt-4 mb-24">
        <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 pb-3 border-b border-slate-800 mb-4">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 font-mono ml-3">detect_ai_system_v1.0.sh</span>
          </div>
          <div className="bg-slate-950 rounded-lg p-6 font-mono text-sm text-slate-300 min-h-[160px] flex flex-col justify-between">
            <div>
              <p className="text-indigo-400"># Membaca korpus teks input...</p>
              <p className="text-slate-400">Analisis struktur kalimat: Selesai (Burstiness terdeteksi)</p>
              <p className="text-slate-400">Ekstraksi fitur TF-IDF: Selesai</p>
            </div>
            <div className="pt-4 border-t border-slate-900 mt-4 flex items-center justify-between text-xs">
              <span className="text-emerald-400">PREDIKSI: HUMAN WRITTEN</span>
              <span className="text-slate-500">Confidence: 96.84%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-20 px-6 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Dimensi Analisis Klasifikasi</h2>
            <p className="text-sm text-slate-500">Kombinasi analisis konten dan gaya penulisan untuk performa pengujian yang lebih optimal.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Analisis Stilometri" 
              desc="Mengukur standar deviasi panjang kalimat (Burstiness) dan kerapatan tanda baca secara statistik." 
              icon={
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              } 
            />
            <FeatureCard 
              title="Vektor leksikal TF-IDF" 
              desc="Memetakan bobot frekuensi kata guna mengidentifikasi kecenderungan repetisi kata pada teks generatif." 
              icon={
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              } 
            />
            <FeatureCard 
              title="Kecepatan Prediksi" 
              desc="Menggunakan model linear Regresi Logistik untuk kalkulasi cepat dengan parameter yang mudah diinterpretasikan." 
              icon={
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              } 
            />
          </div>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="p-8 border border-slate-100 rounded-2xl bg-[#fafafa] hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 hover:border-slate-200/50 transition-all duration-300">
      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
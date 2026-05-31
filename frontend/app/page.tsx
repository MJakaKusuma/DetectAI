"use client";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Hero Section (Split Layout) */}
      <section className="w-full py-16 lg:py-24 px-6 bg-radial-gradient from-indigo-50/50 to-transparent border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Kolom Kiri: Teks & CTA */}
          <div className="text-left space-y-8 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Hybrid AI Classifier Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
              Bedakan Karya <br />
              <span className="bg-linear-to-r from-indigo-600 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
                Manusia & Mesin
              </span>
            </h1>
            
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-lg">
              Evaluasi keaslian naskah Bahasa Indonesia secara presisi menggunakan metode hibrida komparatif ekstraksi fitur Stilometri dan TF-IDF.
            </p>

            {/* Statistik Ringkas di Hero untuk Meramaikan */}
            <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4 max-w-md text-center sm:text-left">
              <div>
                <h4 className="text-lg font-black text-indigo-600">97.66%</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Akurasi Model</p>
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800">150+</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topik Domain</p>
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800">1.003</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dimensi Fitur</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/dashboard" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:shadow-lg hover:shadow-indigo-100 transition-all text-center">
                Mulai Analyzer
              </Link>
              <Link href="/register" className="px-8 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all text-center">
                Daftar Akun
              </Link>
            </div>
          </div>

          {/* Kolom Kanan: Ilustrasi Vektor SVG Mewah & Dinamis */}
          <div className="flex justify-center lg:justify-end animate-fade-in">
            <svg width="450" height="420" viewBox="0 0 450 420" fill="none" className="w-full max-w-112.5">
              {/* Efek Cahaya Latar Belakang */}
              <circle cx="225" cy="210" r="150" fill="url(#hero-glow)" opacity="0.3" className="animate-pulse" />
              
              {/* Garis Jaringan / Grid Node */}
              <path d="M50,210 H400 M225,50 V370 M100,100 L350,320 M100,320 L350,100" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
              
              {/* Lingkaran Orbit Tengah */}
              <circle cx="225" cy="210" r="100" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6,6" className="animate-spin [animation-duration:25s]" />
              <circle cx="225" cy="210" r="130" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
              <circle cx="225" cy="210" r="60" stroke="#818cf8" strokeWidth="1" />

              {/* Node Jaringan Titik-Titik Saraf */}
              <circle cx="225" cy="50" r="6" fill="#6366f1" className="animate-pulse" />
              <circle cx="100" cy="100" r="5" fill="#3b82f6" />
              <circle cx="350" cy="100" r="5" fill="#818cf8" />
              <circle cx="50" cy="210" r="6" fill="#3b82f6" />
              <circle cx="400" cy="210" r="6" fill="#6366f1" />
              <circle cx="100" cy="320" r="5" fill="#818cf8" />
              <circle cx="350" cy="320" r="5" fill="#3b82f6" />
              <circle cx="225" cy="370" r="6" fill="#6366f1" className="animate-pulse" />

              {/* Grafis Utama Tengah (Pena vs Otak Mekanis) */}
              <g transform="translate(175, 160)">
                {/* Otak Sirkuit Kanan */}
                <path d="M45,10 C60,10 75,25 75,45 C75,65 60,80 45,80" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
                <path d="M45,25 C52,25 60,32 60,45 C60,58 52,65 45,65" stroke="#3b82f6" strokeWidth="3" />
                
                {/* Bulu Pena Kiri */}
                <path d="M5,80 C5,50 15,20 45,10 C45,30 35,60 25,80 Z" fill="url(#pen-grad)" stroke="#4f46e5" strokeWidth="2.5" />
                <line x1="25" y1="45" x2="15" y2="55" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="32" y1="28" x2="25" y2="35" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M25,80 L35,100" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* Efek Gradasi Warna */}
              <defs>
                <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="pen-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">Dimensi Analisis Klasifikasi</h2>
            <p className="text-xs text-slate-400">Kombinasi analisis gaya penulisan dan muatan kosakata untuk akurasi pendeteksian yang maksimal.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Analisis Stilometri" 
              desc="Menguji standar deviasi panjang kalimat (Burstiness) dan kerapatan tanda baca secara statistik." 
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
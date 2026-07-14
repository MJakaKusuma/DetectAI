import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ToastProvider } from "./components/toast";
import Navbar from "./components/navbar";

export const metadata: Metadata = {
  title: "DetectAI — AI Text Classifier",
  description: "Sistem deteksi teks generatif berbasis Stilometri dan TF-IDF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#f8fafc] text-slate-900 antialiased min-h-screen flex flex-col justify-between">
        <ToastProvider>
        <Navbar />

        {/* Main Content */}
        <main className="grow">
          {children}
        </main>

        {/* Professional Footer */}
        <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
                <span className="text-lg font-bold text-white tracking-tight">DetectAI</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Aplikasi riset klasifikasi teks untuk membedakan tulisan manusia dan kecerdasan buatan berbasis metode hibrida TF-IDF & Stilometri.
              </p>
            </div>
            {/* <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Teknologi</h4>
              <ul className="space-y-2 text-xs">
                <li>Gemma 4 31B IT (AI Generator)</li>
                <li>FastAPI & MySQL (Backend & DB)</li>
                <li>Next.js & Tailwind CSS (Frontend)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Penelitian</h4>
              <ul className="space-y-2 text-xs">
                <li>Metode: Klasifikasi Hibrida</li>
                <li>Fitur: TF-IDF & Stilometri</li>
                <li>Model: Regresi Logistik</li>
              </ul>
            </div> */}
          </div>
          <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 text-center text-xs">
            &copy; {new Date().getFullYear()} DetectAI — Proyek Riset Klasifikasi AI.
          </div>
        </footer>
      </ToastProvider>
      </body>
    </html>
  );
}
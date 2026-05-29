import React from "react";

// 1. STAT CARD (Gaya Dashboard Modern)
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}

export function StatCard({ title, value, trend, isPositive = true, icon }: StatCardProps) {
  return (
    <div className="p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-800">{value}</h3>
        {trend && (
          <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}>
            {isPositive ? "▲" : "▼"} {trend}
          </span>
        )}
      </div>
      <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
        {icon}
      </div>
    </div>
  );
}

// 2. ALERT CALLOUT
export function AlertCallout({ message, title = "Tips" }: { message: string; title?: string }) {
  return (
    <div className="flex gap-3 p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-xl text-slate-700 animate-fade-in">
      <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <div>
        <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-0.5">{title}</h5>
        <p className="text-xs text-indigo-950 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// 3. SCANNER LOADER (Animasi Pemindaian Canggih)
export function ScannerLoader() {
  return (
    <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-8 text-center space-y-4">
      <div className="relative w-20 h-20 mx-auto">
        {/* Ring Luar Berputar */}
        <div className="absolute inset-0 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
        {/* Ring Dalam Berlawanan Arah */}
        <div className="absolute inset-2 border-2 border-slate-200 border-b-slate-600 rounded-full animate-spin [animation-direction:reverse]" />
        {/* Titik Tengah Denyut */}
        <div className="absolute inset-6 bg-indigo-600 rounded-full animate-pulse flex items-center justify-center text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mengekstrak Fitur Teks</h4>
        <p className="text-[10px] text-slate-400">Menghitung matriks TF-IDF dan kalkulasi densitas stilometrik...</p>
      </div>
    </div>
  );
}
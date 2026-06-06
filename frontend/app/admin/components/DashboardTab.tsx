"use client";

import { StatCard, AlertCallout } from "../../components/dashboardwidgets";
import { AdminStats } from "../types";

interface DashboardTabProps {
  stats: AdminStats | null;
}

export default function DashboardTab({ stats }: DashboardTabProps) {
  if (!stats) {
    return (
      <div className="w-full min-h-100 flex items-center justify-center bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memverifikasi otorisasi & memuat data administrasi...</p>
        </div>
      </div>
    );
  }

  const totalPredictions = stats.distribution.ai_count + stats.distribution.human_count;
  const aiPercentage = totalPredictions > 0 ? (stats.distribution.ai_count / totalPredictions) * 100 : 0;
  
  const strokeDashArray = 251.2;
  const strokeDashOffset = strokeDashArray - (strokeDashArray * aiPercentage) / 100;

  const maxBarValue = Math.max(...stats.daily_activity.map(d => d.count), 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Grid Statistik Dasar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Pengguna" value={`${stats.total_users} Akun`} icon="👤" />
        <StatCard title="Total Prediksi" value={`${stats.total_predictions} Kali`} icon="⏳" />
        <StatCard title="Akurasi Model Aktif" value={stats.active_accuracy} icon="🎯" />
        <StatCard title="Umpan Balik User" value={`${stats.total_feedback} Koreksi`} icon="⚠️" />
      </div>

      {/* PANEL GRAFIK INTEGRASI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GRAFIK 1: Aktivitas Deteksi Harian */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Tren Aktivitas Deteksi Harian</h3>
            <p className="text-[10px] text-slate-400 mb-6">Visualisasi total panggilan API /predict dalam 7 hari terakhir.</p>
          </div>

          <div className="flex justify-between items-end h-52 pt-6 border-b border-slate-100">
            {stats.daily_activity.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 group">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded -translate-y-1">
                  {item.count}
                </span>
                <div className="w-8 sm:w-12 h-32 flex items-end">
                  <div 
                    className="w-full bg-linear-to-t from-indigo-500 to-blue-500 rounded-t-lg group-hover:from-indigo-600 group-hover:to-blue-600 transition-all duration-500"
                    style={{ height: `${(item.count / maxBarValue) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 py-3">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* GRAFIK 2: Distribusi Klasifikasi */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Proporsi Hasil Pengujian</h3>
            <p className="text-[10px] text-slate-400 mb-6 font-medium">Perbandingan persentase teks AI vs teks Manusia.</p>
          </div>

          <div className="relative flex justify-center items-center py-6">
            {totalPredictions === 0 ? (
              <div className="text-xs text-slate-400 text-center py-12">Belum ada data klasifikasi masuk.</div>
            ) : (
              <>
                <svg width="150" height="150" className="-rotate-90">
                  <circle cx="75" cy="75" r="40" fill="transparent" stroke="#10b981" strokeWidth="14" />
                  <circle 
                    cx="75" 
                    cy="75" 
                    r="40" 
                    fill="transparent" 
                    stroke="#f43f5e" 
                    strokeWidth="14" 
                    strokeDasharray={strokeDashArray}
                    strokeDashoffset={strokeDashOffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-slate-800">{aiPercentage.toFixed(0)}%</span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Deteksi AI</span>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center gap-6 pt-4 border-t border-slate-100 text-xs text-slate-600 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]" />
              <span>Human ({stats.distribution.human_count})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#f43f5e]" />
              <span>AI ({stats.distribution.ai_count})</span>
            </div>
          </div>
        </div>

      </div>

      <AlertCallout title="Pemberitahuan Sistem" message="Sebagai Administrator, Anda berhak melatih ulang model menggunakan dataset baru. Pastikan dataset telah terstruktur rapi untuk menjaga stabilitas parameter statistik model." />
    </div>
  );
}

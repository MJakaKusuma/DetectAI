"use client";

import { HistoryItem } from "../types";
import { StatCard } from "../../components/dashboardwidgets";

interface StatisticsTabProps {
  history: HistoryItem[];
}

export default function StatisticsTab({ history }: StatisticsTabProps) {
  const totalPredictions = history.length;
  const aiScansCount = history.filter(h => h.prediction_result === "AI").length;
  const humanScansCount = totalPredictions - aiScansCount;
  const aiPercentageLocal = totalPredictions > 0 ? (aiScansCount / totalPredictions) * 100 : 0;
  
  const strokeDashArray = 251.2;
  const strokeDashOffset = strokeDashArray - (strokeDashArray * aiPercentageLocal) / 100;

  const getDailyActivity = () => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activityMap: Record<string, number> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      activityMap[daysOfWeek[d.getDay()]] = 0;
    }
    
    history.forEach(item => {
      try {
        const dateParsed = new Date(item.created_at.replace(" ", "T"));
        const dayName = daysOfWeek[dateParsed.getDay()];
        if (dayName in activityMap) {
          activityMap[dayName]++;
        }
      } catch (e) {
        console.error(e);
      }
    });
    
    return Object.keys(activityMap).map(day => ({
      day,
      count: activityMap[day]
    }));
  };

  const dailyActivity = getDailyActivity();
  const maxBarValue = Math.max(...dailyActivity.map(d => d.count), 5);
  const aiRatio = totalPredictions > 0 ? ((aiScansCount / totalPredictions) * 100).toFixed(1) + "%" : "0%";

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Grid Statistik Angka (Dengan Ikon Mikro SVG Premium) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Total Pengujian */}
        <StatCard 
          title="Total Pengujian" 
          value={totalPredictions} 
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="3" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
              <line x1="7" y1="9" x2="17" y2="9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
              <line x1="7" y1="13" x2="13" y2="13" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            </svg>
          } 
        />

        {/* Card 2: Deteksi AI */}
        <StatCard 
          title="Deteksi AI" 
          value={`${aiScansCount} Dokumen`} 
          trend={aiRatio}
          isPositive={false}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {/* Cip Mikro Chip */}
              <rect x="5" y="5" width="14" height="14" rx="3" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="2" />
              <path d="M12,2 V5 M12,19 V22 M2,12 H5 M19,12 H22" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" fill="#f43f5e" className="animate-pulse" />
            </svg>
          } 
        />

        {/* Card 3: Deteksi Manusia */}
        <StatCard 
          title="Deteksi Manusia" 
          value={`${humanScansCount} Dokumen`} 
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {/* Ujung Pena Kaligrafi */}
              <path d="M12,4 L7,13 C7,13 10,14 12,17 C14,14 17,13 17,13 Z" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
              <line x1="12" y1="4" x2="12" y2="13" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="13" r="2" fill="#10b981" />
            </svg>
          } 
        />
      </div>

      {/* PANEL GRAFIK INTEGRASI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GRAFIK 1: Aktivitas Deteksi 7 Hari Terakhir */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Tren Aktivitas Deteksi Anda</h3>
            <p className="text-[10px] text-slate-400 mb-6 font-medium">Kalkulasi total pengujian teks yang Anda lakukan dalam 7 hari terakhir.</p>
          </div>

          {/* Rangka Batang */}
          <div className="flex justify-between items-end h-52 pt-6 border-b border-slate-100">
            {dailyActivity.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 group">
                {/* Nilai Hover */}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded -translate-y-1">
                  {item.count}
                </span>
                {/* Batang Dinamis */}
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

        {/* GRAFIK 2: Proporsi Hasil Klasifikasi */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Proporsi Pengujian Akun</h3>
            <p className="text-[10px] text-slate-400 mb-6 font-medium">Perbandingan persentase teks terdeteksi mesin vs manusia pada akun Anda.</p>
          </div>

          {/* Donut Chart SVG */}
          <div className="relative flex justify-center items-center py-6">
            {totalPredictions === 0 ? (
              // 100% NATIVE NO-DATA INTERACTIVE AD-HOC GRAPHICS
              <div className="text-center py-6 text-slate-400 space-y-4 flex flex-col items-center">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="35" stroke="#f1f5f9" strokeWidth="8" strokeDasharray="4,4" />
                  <rect x="45" y="45" width="30" height="30" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                  <line x1="53" y1="55" x2="67" y2="55" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  <line x1="53" y1="61" x2="61" y2="61" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  {/* Kaca Pembesar Kecil */}
                  <circle cx="75" cy="75" r="10" fill="#f8fafc" stroke="#6366f1" strokeWidth="2" />
                  <line x1="82" y1="82" x2="92" y2="92" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Belum Ada Riwayat Klasifikasi</p>
              </div>
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
                {/* Teks Persentase di Tengah Donut */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-slate-800">{aiPercentageLocal.toFixed(0)}%</span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Deteksi AI</span>
                </div>
              </>
            )}
          </div>

          {/* Legend Indikator */}
          <div className="flex justify-center gap-6 pt-4 border-t border-slate-100 text-xs text-slate-600 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]" />
              <span>Human ({humanScansCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#f43f5e]" />
              <span>AI ({aiScansCount})</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import AnalyzerTab from "./components/AnalyzerTab";
import HistoryTab from "./components/HistoryTab";
import StatisticsTab from "./components/StatisticsTab";
import { HistoryItem } from "./types";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "history" | "stats">("analyzer");
  const [username, setUsername] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleTabChange = (tab: "analyzer" | "history" | "stats") => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const data = await apiRequest<HistoryItem[]>("/history", "GET", null, token);
        setHistory(data);
      } catch (err) {
        console.error(err);
      }
    };

    if (activeTab !== "analyzer") {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[calc(100vh-16rem)]">
      
      {/* ============================================================================== */}
      {/* TAB NAVIGATION (SAAS CAPSULE STYLE - RESPONSIF) */}
      {/* ============================================================================== */}
      <div className="print:hidden flex bg-slate-100/80 p-1.5 rounded-2xl mb-8 gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap max-w-md border border-slate-200/40 shadow-xs">
        
        {/* Tab 1: Analyzer */}
        <button 
          type="button"
          onClick={() => handleTabChange("analyzer")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
            activeTab === "analyzer" 
              ? "bg-white text-indigo-600 shadow-xs" 
              : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Text Analyzer
        </button>

        {/* Tab 2: History (Hanya muncul jika login) */}
        {username && (
          <>
            <button 
              type="button"
              onClick={() => handleTabChange("history")} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === "history" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riwayat Uji
            </button>

            {/* Tab 3: Statistics (Hanya muncul jika login) */}
            <button 
              type="button"
              onClick={() => handleTabChange("stats")} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === "stats" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Statistik
            </button>
          </>
        )}
      </div>

      {activeTab === "analyzer" && <AnalyzerTab username={username} />}
      {activeTab === "history" && <HistoryTab history={history} />}
      {activeTab === "stats" && <StatisticsTab history={history} />}
      
    </div>
  );
}

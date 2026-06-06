"use client";

import { useState } from "react";
import { HistoryItem } from "../types";

interface HistoryTabProps {
  history: HistoryItem[];
}

export default function HistoryTab({ history }: HistoryTabProps) {
  // Paginasi Riwayat User (10 data per halaman)
  const ROWS_PER_PAGE = 10;
  const [historyPage, setHistoryPage] = useState(1);

  const indexOfLastRow = historyPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentHistoryRows = history.slice(indexOfFirstRow, indexOfLastRow);
  const totalHistoryPages = Math.ceil(history.length / ROWS_PER_PAGE);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden animate-fade-in flex flex-col justify-between min-h-100">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-6">Riwayat Klasifikasi Teks</h3>
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Belum ada riwayat pengujian yang tercatat.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <table className="w-full text-left text-sm text-slate-600 min-w-175">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Tanggal</th>
                  <th className="pb-3">Cuplikan Teks</th>
                  <th className="pb-3">Hasil Prediksi</th>
                  <th className="pb-3 text-right pr-2">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentHistoryRows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-4 text-xs font-medium text-slate-400 whitespace-nowrap pl-2">{item.created_at}</td>
                    <td className="py-4 font-medium text-slate-700 max-w-[150px] sm:max-w-xs truncate" title={item.input_text}>
                      {item.input_text}
                    </td>
                    <td className="py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.prediction_result === "AI" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {item.prediction_result === "AI" ? "🤖 AI" : "👤 Human"}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-slate-800 text-right pr-2">{item.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {history.length > ROWS_PER_PAGE && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-xs">
          <span className="text-slate-400">
            Menampilkan {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, history.length)} dari {history.length} data
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))} 
              disabled={historyPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 font-bold transition-all disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))} 
              disabled={historyPage === totalHistoryPages}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

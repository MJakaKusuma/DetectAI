"use client";

import { useState } from "react";
import { FeedbackItem } from "../types";

interface FeedbackTabProps {
  feedbacks: FeedbackItem[];
}

export default function FeedbackTab({ feedbacks }: FeedbackTabProps) {
  const ROWS_PER_PAGE = 10;
  const [feedbackPage, setFeedbackPage] = useState(1);

  const indexOfLastRow = feedbackPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentRows = feedbacks.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(feedbacks.length / ROWS_PER_PAGE);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm animate-fade-in flex flex-col justify-between min-h-100">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-6">Ulasan Koreksi Klasifikasi oleh Pengguna</h3>
        {feedbacks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">Belum ada umpan balik koreksi yang dikirimkan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-175">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider pb-2">
                  <th className="pb-3">Tanggal</th>
                  <th className="pb-3">Teks Input</th>
                  <th className="pb-3">Sistem</th>
                  <th className="pb-3">Seharusnya</th>
                  <th className="pb-3">Komentar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRows.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="py-4 text-xs font-medium text-slate-400 whitespace-nowrap">{f.created_at}</td>
                    <td className="py-4 font-medium text-slate-700 max-w-xs truncate">{f.input_text}</td>
                    <td className="py-4">
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold uppercase">{f.system_prediction}</span>
                    </td>
                    <td className="py-4">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">{f.correct_label}</span>
                    </td>
                    <td className="py-4 text-xs italic text-slate-400 max-w-xs truncate">{f.comment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginasi Feedback */}
      {feedbacks.length > ROWS_PER_PAGE && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-xs">
          <span className="text-slate-400">
            Menampilkan {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, feedbacks.length)} dari {feedbacks.length} data
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setFeedbackPage(prev => Math.max(prev - 1, 1))} 
              disabled={feedbackPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 font-bold transition-all disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setFeedbackPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={feedbackPage === totalPages}
              className="px-3 py-1.5 bg-slate-950 text-white rounded-lg font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

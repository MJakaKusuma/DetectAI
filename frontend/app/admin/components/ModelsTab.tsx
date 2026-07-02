"use client";

import { useState } from "react";
import { ModelVersionItem } from "../types";
import { useToast } from "../../components/toast";
import { apiRequest } from "../../lib/api";
import { Loader } from "react-feather";

interface ModelsTabProps {
  models: ModelVersionItem[] | null; // Menerima null untuk kondisi awal loading
  fetchAdminData: () => Promise<void>;
}

export default function ModelsTab({ models, fetchAdminData }: ModelsTabProps) {
  const ROWS_PER_PAGE = 10;
  const [modelPage, setModelPage] = useState(1);
  const { showToast } = useToast();

  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Jika models bernilai null (masih loading di awal), tampilkan loading screen
  if (models === null) {
    return (
      <div className="w-full min-h-100 flex items-center justify-center bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm animate-fade-in">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memverifikasi otorisasi & memuat data versi model...</p>
        </div>
      </div>
    );
  }

  const handleActivateModel = async (modelId: number, versionName: string) => {
    setActivatingId(modelId);
    const token = localStorage.getItem("token");
    try {
      await apiRequest(`/admin/models/activate/${modelId}`, "POST", null, token);
      showToast(`Model ${versionName} berhasil diaktifkan kembali!`, "success");
      await fetchAdminData();
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal mengaktifkan model.", "error");
    } finally {
      setActivatingId(null);
    }
  };

  const indexOfLastRow = modelPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentRows = models.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(models.length / ROWS_PER_PAGE);

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm animate-fade-in flex flex-col justify-between min-h-100">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-6">Manajemen Versi Model (Rollback System)</h3>
        {models.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">Belum ada versi model yang terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-162.5">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider pb-2">
                  <th className="pb-3">Tanggal Latih</th>
                  <th className="pb-3">Nama Versi</th>
                  <th className="pb-3">Akurasi</th>
                  <th className="pb-3">F1-Score</th>
                  <th className="pb-3 text-right">Aksi Produksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRows.map((item) => {
                  const isActivating = activatingId === item.id;
                  const isAnyLoading = activatingId !== null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-4 text-xs font-medium text-slate-400">{item.trained_at}</td>
                      <td className="py-4 font-bold text-slate-700">{item.version_name}</td>
                      <td className="py-4 font-semibold text-indigo-600">{item.accuracy}</td>
                      <td className="py-4 font-semibold text-slate-800">{item.f1_score}</td>
                      <td className="py-4 text-right">
                        {item.is_active ? (
                          <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase">
                            Active
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleActivateModel(item.id, item.version_name)} 
                            disabled={isAnyLoading}
                            className="inline-flex items-center justify-center min-w-20 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActivating ? (
                              <>
                                <Loader className="w-3 h-3 mr-1 animate-spin" />
                                Proses...
                              </>
                            ) : (
                              "Aktifkan"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {models.length > ROWS_PER_PAGE && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-xs">
          <span className="text-slate-400">
            Menampilkan {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, models.length)} dari {models.length} data
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setModelPage(prev => Math.max(prev - 1, 1))} 
              disabled={modelPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 font-bold transition-all disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setModelPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={modelPage === totalPages}
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
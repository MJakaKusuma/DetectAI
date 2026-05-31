"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import { StatCard } from "../components/dashboardwidgets";
import { useToast } from "../components/toast";
import { useRouter } from "next/navigation";
import { AlertCallout } from "../components/dashboardwidgets";

// INTERFACE DATA ADMIN
interface Distribution {
  ai_count: number;
  human_count: number;
}

interface DailyActivity {
  day: string;
  count: number;
}

interface AdminStats {
  total_users: number;
  total_predictions: number;
  active_accuracy: string;
  total_feedback: number;
  distribution: Distribution;
  daily_activity: DailyActivity[];
}

interface DatasetItem {
  id: number;
  filename: string;
  row_count: number;
  upload_date: string;
}

interface ModelVersionItem {
  id: number;
  version_name: string;
  accuracy: string;
  f1_score: string;
  is_active: boolean;
  trained_at: string;
}

interface FeedbackItem {
  id: number;
  prediction_id: number;
  input_text: string;
  system_prediction: string;
  correct_label: string;
  comment: string;
  created_at: string;
}

interface UploadResponse {
  dataset_id: number;
  row_count: number;
  status: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "training" | "models" | "feedback">("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [models, setModels] = useState<ModelVersionItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  // ==========================================
  // CONFIG & STATE PAGINASI (5 Baris per Halaman)
  // ==========================================
  const ROWS_PER_PAGE = 5;
  const [datasetPage, setDatasetPage] = useState(1);
  const [modelPage, setModelPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);

  // Reset nomor halaman ketika tab admin berpindah
  useEffect(() => {
    setDatasetPage(1);
    setModelPage(1);
    setFeedbackPage(1);
  }, [activeTab]);

  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      showToast("Akses ditolak! Menu khusus Administrator.", "error");
      router.push("/dashboard");
    } else {
      fetchAdminData();
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      if (activeTab === "dashboard") {
        const statsData = await apiRequest<AdminStats>("/admin/stats", "GET", null, token);
        setStats(statsData);
      } else if (activeTab === "training") {
        const datasetsData = await apiRequest<DatasetItem[]>("/admin/datasets", "GET", null, token);
        setDatasets(datasetsData);
      } else if (activeTab === "models") {
        const modelsData = await apiRequest<ModelVersionItem[]>("/admin/models", "GET", null, token);
        setModels(modelsData);
      } else if (activeTab === "feedback") {
        const feedbackData = await apiRequest<FeedbackItem[]>("/admin/feedback", "GET", null, token);
        setFeedbacks(feedbackData);
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal memuat data.", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error("Gagal mengunggah file.");

      await response.json();
      showToast(`Dataset berhasil disimpan!`, "success");
      setFile(null);
      
      const datasetsData = await apiRequest<DatasetItem[]>("/admin/datasets", "GET", null, token);
      setDatasets(datasetsData);
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal mengunggah berkas.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRetrain = async () => {
    if (!selectedDatasetId) {
      showToast("Pilih salah satu dataset terlebih dahulu!", "error");
      return;
    }

    setTraining(true);
    const token = localStorage.getItem("token");

    try {
      await apiRequest(`/admin/retrain/${selectedDatasetId}`, "POST", null, token);
      showToast("retraining selesai!", "success");
      setSelectedDatasetId("");
      setActiveTab("models"); 
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal melatih ulang model.", "error");
    } finally {
      setTraining(false);
    }
  };

  const handleActivateModel = async (modelId: number, versionName: string) => {
    const token = localStorage.getItem("token");
    try {
      await apiRequest(`/admin/models/activate/${modelId}`, "POST", null, token);
      showToast(`Model ${versionName} berhasil diaktifkan kembali!`, "success");
      fetchAdminData();
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal mengaktifkan model.", "error");
    }
  };

  // KALKULASI PARAMETER GRAFIK LOKAL (UNTUK SVG DONUT & BAR CHART)
  const totalPredictions = stats ? stats.distribution.ai_count + stats.distribution.human_count : 0;
  const aiPercentage = stats && totalPredictions > 0 ? (stats.distribution.ai_count / totalPredictions) * 100 : 0;
  
  const strokeDashArray = 251.2;
  const strokeDashOffset = strokeDashArray - (strokeDashArray * aiPercentage) / 100;

  const maxBarValue = stats ? Math.max(...stats.daily_activity.map(d => d.count), 5) : 5;

  // ==========================================
  // KALKULASI REUSABLE PAGINASI DATA
  // ==========================================
  const paginate = <T,>(items: T[], currentPage: number, rowsPerPage: number) => {
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    return {
      currentRows: items.slice(indexOfFirstRow, indexOfLastRow),
      totalPages: Math.ceil(items.length / rowsPerPage),
      indexOfFirstRow,
      indexOfLastRow
    };
  };

  // 1. Data Dataset Terpaginasi
  const paginatedDatasets = paginate(datasets, datasetPage, ROWS_PER_PAGE);
  // 2. Data Model Terpaginasi
  const paginatedModels = paginate(models, modelPage, ROWS_PER_PAGE);
  // 3. Data Feedback Terpaginasi
  const paginatedFeedbacks = paginate(feedbacks, feedbackPage, ROWS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800">Panel Kontrol Administrator</h1>
        <p className="text-xs text-slate-400 mt-1">Konfigurasi database, kelola data latih, dan pantau grafik aktivitas sistem secara real-time.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto whitespace-nowrap pb-1">
        <button onClick={() => setActiveTab("dashboard")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "dashboard" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>📊 Ringkasan Dashboard</button>
        <button onClick={() => setActiveTab("training")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "training" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>📁 Dataset & Training</button>
        <button onClick={() => setActiveTab("models")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "models" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>🎯 Model Registry</button>
        <button onClick={() => setActiveTab("feedback")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "feedback" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>⚠️ Audit Umpan Balik</button>
      </div>

      {/* ========================================== */}
      {/* 1. TAB DASHBOARD */}
      {/* ========================================== */}
      {activeTab === "dashboard" && stats && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Pengguna" value={`${stats.total_users} Akun`} icon="👤" />
            <StatCard title="Total Prediksi" value={`${stats.total_predictions} Kali`} icon="⏳" />
            <StatCard title="Akurasi Model Aktif" value={stats.active_accuracy} icon="🎯" />
            <StatCard title="Umpan Balik User" value={`${stats.total_feedback} Koreksi`} icon="⚠️" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                        className="w-full bg-gradient-to-t from-indigo-500 to-blue-500 rounded-t-lg group-hover:from-indigo-600 group-hover:to-blue-600 transition-all duration-500"
                        style={{ height: `${(item.count / maxBarValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 py-3">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

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
                    <svg width="150" height="150" className="rotate-[-90deg]">
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
      )}

      {/* ========================================== */}
      {/* 2. TAB DATASET & TRAINING (DENGAN PAGINASI) */}
      {/* ========================================== */}
      {activeTab === "training" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800">Unggah Dataset</h3>
              <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              <button onClick={handleUpload} disabled={uploading || !file} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase disabled:bg-slate-100 disabled:text-slate-400 transition-all">{uploading ? "Mengunggah..." : "Simpan Berkas"}</button>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800">Latih Model</h3>
              <select value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white outline-none">
                <option value="">-- Pilih Dataset Pengujian --</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.filename} ({d.row_count} data)</option>
                ))}
              </select>
              <button onClick={handleRetrain} disabled={training || !selectedDatasetId} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase disabled:bg-slate-100 disabled:text-slate-400 transition-all">
                {training ? "Melatih Model Baru..." : "Mulai Retraining"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-6">Berkas Dataset di Server</h3>
              {datasets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">Belum ada berkas dataset yang diunggah.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider pb-2">
                        <th className="pb-3">Tanggal Unggah</th>
                        <th className="pb-3">Nama Berkas</th>
                        <th className="pb-3 text-right">Jumlah Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDatasets.currentRows.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="py-4 text-xs font-medium text-slate-400">{d.upload_date}</td>
                          <td className="py-4 font-bold text-slate-700">{d.filename}</td>
                          <td className="py-4 text-right font-semibold text-slate-800">{d.row_count} baris</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Paginasi Dataset */}
            {datasets.length > ROWS_PER_PAGE && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs">
                <span className="text-slate-400">
                  Menampilkan {paginatedDatasets.indexOfFirstRow + 1} - {Math.min(paginatedDatasets.indexOfLastRow, datasets.length)} dari {datasets.length} data
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDatasetPage(prev => Math.max(prev - 1, 1))} 
                    disabled={datasetPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 font-bold transition-all disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button 
                    onClick={() => setDatasetPage(prev => Math.min(prev + 1, paginatedDatasets.totalPages))} 
                    disabled={datasetPage === paginatedDatasets.totalPages}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. TAB MODEL REGISTRY (DENGAN PAGINASI) */}
      {/* ========================================== */}
      {activeTab === "models" && (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm animate-fade-in flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-6">Manajemen Versi Model (Rollback System)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 min-w-[650px]">
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
                  {paginatedModels.currentRows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-4 text-xs font-medium text-slate-400">{item.trained_at}</td>
                      <td className="py-4 font-bold text-slate-700">{item.version_name}</td>
                      <td className="py-4 font-semibold text-indigo-600">{item.accuracy}</td>
                      <td className="py-4 font-semibold text-slate-800">{item.f1_score}</td>
                      <td className="py-4 text-right">
                        {item.is_active ? (
                          <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase">Active</span>
                        ) : (
                          <button onClick={() => handleActivateModel(item.id, item.version_name)} className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all">Aktifkan</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginasi Model */}
          {models.length > ROWS_PER_PAGE && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-xs">
              <span className="text-slate-400">
                Menampilkan {paginatedModels.indexOfFirstRow + 1} - {Math.min(paginatedModels.indexOfLastRow, models.length)} dari {models.length} data
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
                  onClick={() => setModelPage(prev => Math.min(prev + 1, paginatedModels.totalPages))} 
                  disabled={modelPage === paginatedModels.totalPages}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 4. TAB AUDIT FEEDBACK (DENGAN PAGINASI) */}
      {/* ========================================== */}
      {activeTab === "feedback" && (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm animate-fade-in flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-6">Ulasan Koreksi Klasifikasi oleh Pengguna</h3>
            {feedbacks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Belum ada umpan balik koreksi yang dikirimkan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
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
                    {paginatedFeedbacks.currentRows.map((f) => (
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
                Menampilkan {paginatedFeedbacks.indexOfFirstRow + 1} - {Math.min(paginatedFeedbacks.indexOfLastRow, feedbacks.length)} dari {feedbacks.length} data
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
                  onClick={() => setFeedbackPage(prev => Math.min(prev + 1, paginatedFeedbacks.totalPages))} 
                  disabled={feedbackPage === paginatedFeedbacks.totalPages}
                  className="px-3 py-1.5 bg-slate-950 text-white rounded-lg font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
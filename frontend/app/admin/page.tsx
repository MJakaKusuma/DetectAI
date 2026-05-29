"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import { StatCard } from "../components/dashboardwidgets";
import { useToast } from "../components/toast";
import { useRouter } from "next/navigation";

interface AdminStats {
  total_users: number;
  total_predictions: number;
  active_accuracy: string;
  total_feedback: number;
}

interface ModelVersionItem {
  id: number;
  version_name: string;
  accuracy: string;
  f1_score: string;
  is_active: boolean;
  trained_at: string;
}

interface UploadResponse {
  dataset_id: number;
  row_count: number;
  status: string;
}

interface RetrainResponse {
  status: string;
  version: string;
  accuracy: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [models, setModels] = useState<ModelVersionItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(null);
  
  const { showToast } = useToast();
  const router = useRouter();

  // Validasi Role: Hanya Admin yang bisa masuk halaman ini
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      alert("Akses ditolak! Anda tidak memiliki otoritas Administrator.");
      router.push("/dashboard");
    } else {
      fetchAdminData();
    }
  }, []);

  const fetchAdminData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const statsData = await apiRequest<AdminStats>("/admin/stats", "GET", null, token);
      const modelsData = await apiRequest<ModelVersionItem[]>("/admin/models", "GET", null, token);
      setStats(statsData);
      setModels(modelsData);
    } catch (err: unknown) {
      showToast((err as { message: string }).message || "Gagal memuat data administrasi.", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // UPLOAD DATASET (Menggunakan Fetch Multipart Form-Data khusus upload file)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast("Pilih file CSV terlebih dahulu!", "error");
      return;
    }

    setUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/admin/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Gagal mengunggah file dataset.");
      }

      const data: UploadResponse = await response.json();
      setActiveDatasetId(data.dataset_id);
      showToast(`Dataset berhasil diunggah! Terbaca ${data.row_count} baris data.`, "success");
      setFile(null);
    } catch (err: unknown) {
      showToast((err as { message: string }).message || "Terjadi kesalahan saat mengunggah.", "error");
    } finally {
      setUploading(false);
    }
  };

  // RETRAIN MODEL (MEMICU PROSES TRAINING ULANG)
  const handleRetrain = async () => {
    if (!activeDatasetId) {
      showToast("Silakan unggah dataset baru terlebih dahulu sebelum melatih model!", "error");
      return;
    }

    setTraining(true);
    const token = localStorage.getItem("token");

    try {
      const data = await apiRequest<RetrainResponse>(`/admin/retrain/${activeDatasetId}`, "POST", null, token);
      showToast(`Sukses! Model baru versi ${data.version} aktif dengan akurasi ${data.accuracy}`, "success");
      setActiveDatasetId(null);
      fetchAdminData(); // Refresh statistik & tabel versi model
    } catch (err: unknown) {
      showToast((err as { message: string }).message || "Gagal melatih ulang model.", "error");
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800">Panel Kontrol Administrator</h1>
        <p className="text-xs text-slate-400 mt-1">Kelola database, perbarui data latih, dan lakukan retraining model klasifikasi.</p>
      </div>

      {/* Grid Stats (Menggunakan StatCard) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Pengguna" value={`${stats.total_users} Akun`} icon="👤" />
          <StatCard title="Total Prediksi" value={`${stats.total_predictions} Kali`} icon="⏳" />
          <StatCard title="Akurasi Model Aktif" value={stats.active_accuracy} icon="🎯" />
          <StatCard title="Umpan Balik User" value={`${stats.total_feedback} Koreksi`} icon="⚠️" />
        </div>
      )}

      {/* Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Card 1: Upload Dataset */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800">1. Unggah Dataset Baru</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Dataset harus berformat .csv dan memiliki struktur kolom &quot;text&quot; dan &quot;label&quot;.</p>
          
          <form onSubmit={handleUpload} className="space-y-4 pt-2">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button 
              type="submit"
              disabled={uploading || !file}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:bg-slate-100 disabled:text-slate-400 transition-all"
            >
              {uploading ? "Mengunggah..." : "Unggah File"}
            </button>
          </form>
        </div>

        {/* Card 2: Retraining System */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">2. Retraining System</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Latih ulang model klasifikasi Regresi Logistik dan ekstraktor TF-IDF menggunakan berkas dataset yang baru saja diunggah ke server.
            </p>
            {activeDatasetId && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-800 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Dataset siap dilatih (ID: {activeDatasetId})
              </div>
            )}
          </div>

          <button 
            onClick={handleRetrain}
            disabled={training || !activeDatasetId}
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            {training ? "Sedang Melatih Model..." : "Mulai Retraining Model"}
          </button>
        </div>

        {/* Card 3: Catatan Metodologi */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800">Catatan Metodologis</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Proses retraining otomatis ini menerapkan pipeline yang sama persis dengan modul pemrosesan utama:
          </p>
          <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
            <li>Pembersihan teks (case folding, pembuangan URL).</li>
            <li>Ekstraksi 3 fitur stilometrik kustom.</li>
            <li>Ekstraksi bobot matriks TF-IDF (1000 fitur).</li>
            <li>Metode evaluasi: 80% Train, 20% Test Split.</li>
          </ul>
        </div>

      </div>

      {/* Model Version History Table */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-6">Riwayat Versi Model Klasifikasi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider pb-3">
                <th className="pb-3">Tanggal Latih</th>
                <th className="pb-3">Nama Versi</th>
                <th className="pb-3">Akurasi Uji</th>
                <th className="pb-3">F1-Score</th>
                <th className="pb-3">Status Produksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-4 text-xs font-medium text-slate-400">{item.trained_at}</td>
                  <td className="py-4 font-bold text-slate-700">{item.version_name}</td>
                  <td className="py-4 font-semibold text-indigo-600">{item.accuracy}</td>
                  <td className="py-4 font-semibold text-slate-800">{item.f1_score}</td>
                  <td className="py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      item.is_active 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100"
                    }`}>
                      {item.is_active ? "● Aktif Produksi" : "Arsip"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
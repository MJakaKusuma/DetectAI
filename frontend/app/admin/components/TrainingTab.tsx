"use client";

import { useState } from "react";
import { DatasetItem, UploadResponse } from "../types";
import DatasetMerger from "../../components/datasetmerger";
import { useToast } from "../../components/toast";
import { apiRequest } from "../../lib/api";
import { FileText, Shuffle, Edit3, Trash2 } from "react-feather";

interface TrainingTabProps {
  datasets: DatasetItem[];
  fetchAdminData: () => Promise<void>;
  setDatasets: React.Dispatch<React.SetStateAction<DatasetItem[]>>;
  handleTabChange: (tab: "dashboard" | "training" | "models" | "feedback") => void;
}

export default function TrainingTab({ datasets, fetchAdminData, setDatasets, handleTabChange }: TrainingTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [uploadMethod, setUploadMethod] = useState<"single" | "merge">("single");

  const ROWS_PER_PAGE = 10;
  const [datasetPage, setDatasetPage] = useState(1);
  const { showToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiRequest<UploadResponse>("/admin/upload", "POST", formData, token);

      setSelectedDatasetId(data.dataset_id.toString());
      showToast(`Dataset master berhasil diunggah! Terbaca ${data.row_count} data.`, "success");
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
      handleTabChange("models"); 
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal melatih ulang model.", "error");
    } finally {
      setTraining(false);
    }
  };

  const handleRenameDataset = async (datasetId: number, currentFilename: string) => {
    const newName = window.prompt("Masukkan nama file baru berekstensi .csv:", currentFilename);
    if (!newName || newName.trim() === "" || newName === currentFilename) return;

    const token = localStorage.getItem("token");
    try {
      await apiRequest(`/admin/datasets/${datasetId}`, "PUT", { new_filename: newName }, token);
      showToast(`Nama berkas berhasil diubah menjadi ${newName}`, "success");
      fetchAdminData();
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal mengubah nama berkas.", "error");
    }
  };

  const handleDeleteDataset = async (datasetId: number, filename: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus dataset "${filename}" secara permanen dari server?`);
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");
    try {
      await apiRequest(`/admin/datasets/${datasetId}`, "DELETE", null, token);
      showToast("Dataset berhasil dihapus secara permanen!", "success");
      fetchAdminData();
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal menghapus dataset.", "error");
    }
  };

  const indexOfLastRow = datasetPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentRows = datasets.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(datasets.length / ROWS_PER_PAGE);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Metode Unggah</h3>
          <div className="flex gap-2 text-xs font-bold">
            <button 
              type="button"
              onClick={() => setUploadMethod("single")}
              className={`flex-1 py-2 rounded-lg border transition-all ${
                uploadMethod === "single" 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              <FileText className="inline-block w-4 h-4 mr-2" /> Single CSV
            </button>
            <button 
              type="button"
              onClick={() => setUploadMethod("merge")}
              className={`flex-1 py-2 rounded-lg border transition-all ${
                uploadMethod === "merge" 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              <Shuffle className="inline-block w-4 h-4 mr-2" /> Merge Tool
            </button>
          </div>
        </div>

        {uploadMethod === "single" ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-800">Unggah Single CSV</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unggah file satu kesatuan berformat `.csv` yang sudah memiliki kolom &quot;text&quot; dan &quot;label&quot;.
            </p>
            <form onSubmit={handleUploadSingle} className="space-y-4 pt-2">
              <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              <button type="submit" disabled={uploading || !file} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase disabled:bg-slate-100 disabled:text-slate-400 transition-all">{uploading ? "Mengunggah..." : "Simpan Berkas"}</button>
            </form>
          </div>
        ) : (
          <DatasetMerger 
            onUploadSuccess={(datasetId) => {
              setSelectedDatasetId(datasetId.toString());
              const token = localStorage.getItem("token");
              if (token) {
                apiRequest<DatasetItem[]>("/admin/datasets", "GET", null, token).then(data => setDatasets(data));
              }
            }} 
          />
        )}

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

      <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-112.5">
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-6">Berkas Dataset di Server</h3>
          {datasets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">Belum ada berkas dataset yang diunggah.</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-sm text-slate-600 min-w-175">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider pb-2">
                    <th className="pb-3">Tanggal Unggah</th>
                    <th className="pb-3">Nama Berkas</th>
                    <th className="pb-3 text-right">Jumlah Data</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRows.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-4 text-xs font-medium text-slate-400">{d.upload_date}</td>
                      <td className="py-4 font-bold text-slate-700 max-w-xs truncate" title={d.filename}>
                        {d.filename}
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-800">{d.row_count} baris</td>
                      <td className="py-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => handleRenameDataset(d.id, d.filename)}
                          className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-md transition-all"
                        >
                          <Edit3 className="inline-block w-3 h-3 mr-1" /> Rename
                        </button>
                        <button 
                          onClick={() => handleDeleteDataset(d.id, d.filename)}
                          className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-md transition-all"
                        >
                          <Trash2 className="inline-block w-3 h-3 mr-1" /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {datasets.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs">
            <span className="text-slate-400">
              Menampilkan {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, datasets.length)} dari {datasets.length} data
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
                onClick={() => setDatasetPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={datasetPage === totalPages}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
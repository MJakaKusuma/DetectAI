"use client";
import { useState } from "react";
import { useToast } from "../components/toast";
import { AlertTriangle, CheckCircle } from "react-feather";

interface DatasetMergerProps {
  onUploadSuccess: (datasetId: number, rowCount: number) => void;
}

export default function DatasetMerger({ onUploadSuccess }: DatasetMergerProps) {
  const [humanFile, setHumanFile] = useState<File | null>(null);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [humanCount, setHumanCount] = useState<number>(0);
  const [aiCount, setAiCount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  
  const { showToast } = useToast();

  // ==============================================================================
  // ALGORITMA CERDAS: MENGHITUNG BARIS CSV
  // ==============================================================================
  const countCsvRows = (text: string): number => {
    let rowCount = 0;
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === '\n' && !insideQuote) {
        rowCount++;
      }
    }
    
    if (text.length > 0 && text[text.length - 1] !== '\n') {
      rowCount++;
    }
    
    return rowCount - 1; // Kurangi 1 untuk baris Header
  };

  // ==============================================================================
  // ALGORITMA CERDAS: MEMECAH BARIS CSV SECARA PRESISI
  // ==============================================================================
  const splitCsvRows = (text: string): string[] => {
    const rows: string[] = [];
    let currentRow = "";
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuote = !insideQuote;
        currentRow += char;
      } else if (char === '\n' && !insideQuote) {
        rows.push(currentRow);
        currentRow = "";
      } else {
        currentRow += char;
      }
    }
    
    if (currentRow.trim() !== "") {
      rows.push(currentRow);
    }
    
    return rows;
  };

  // ==============================================================================
  // EVENT HANDLERS (Membaca file secara asinkron saat user memilih file)
  // ==============================================================================
  const handleHumanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setHumanFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = countCsvRows(text);
        setHumanCount(rows < 0 ? 0 : rows);
      };
      reader.readAsText(selectedFile);
    } else {
      setHumanCount(0); // Aman karena dipanggil dari event handler, bukan useEffect
    }
  };

  const handleAiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setAiFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = countCsvRows(text);
        setAiCount(rows < 0 ? 0 : rows);
      };
      reader.readAsText(selectedFile);
    } else {
      setAiCount(0); // Aman!
    }
  };

  const isBalanced = humanCount > 0 && aiCount > 0 && humanCount === aiCount;

  // PROSES PENGGABUNGAN & UNGGAH KE SERVER FASTAPI
  const handleMergeAndUpload = async () => {
    if (!isBalanced) return;
    setProcessing(true);

    try {
      const token = localStorage.getItem("token");
      
      const humanText = await humanFile!.text();
      const aiText = await aiFile!.text();

      const humanRows = splitCsvRows(humanText).slice(1);
      const aiRows = splitCsvRows(aiText).slice(1);

      let csvContent = "text,label\n";
      
      humanRows.forEach(row => {
        const cleanedRow = row.trim();
        if (cleanedRow) {
          csvContent += `${cleanedRow},0\n`;
        }
      });

      aiRows.forEach(row => {
        const cleanedRow = row.trim();
        if (cleanedRow) {
          csvContent += `${cleanedRow},1\n`;
        }
      });

      const combinedBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const combinedFile = new File([combinedBlob], "combined_dataset.csv", { type: "text/csv" });

      const formData = new FormData();
      formData.append("file", combinedFile);

      const response = await fetch("http://127.0.0.1:8000/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Gagal mengunggah file hasil gabungan ke server.");
      }

      const data = await response.json();
      showToast("Dataset berhasil divalidasi, digabungkan, dan diunggah!", "success");
      
      onUploadSuccess(data.dataset_id, data.row_count);
      
      setHumanFile(null);
      setAiFile(null);
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal memproses penggabungan.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      
      <div>
        <h3 className="text-base font-bold text-slate-800">Dataset Merger & Validator</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">Sistem ini memvalidasi keseimbangan data secara real-time sebelum digabungkan untuk menghindari bias model.</p>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom Human */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">1. Dataset Human (.csv)</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleHumanChange} // Gunakan handler asinkron baru
            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700" 
          />
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Jumlah Baris Data:</span>
            <span className="font-bold text-slate-700">{humanCount}</span>
          </div>
        </div>

        {/* Kolom AI */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">2. Dataset AI (.csv)</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleAiChange} // Gunakan handler asinkron baru
            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700" 
          />
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Jumlah Baris Data:</span>
            <span className="font-bold text-slate-700">{aiCount}</span>
          </div>
        </div>
      </div>

      {/* RULES / WARNING CARD */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aturan Penggabungan (Rules):</h4>
        
        {humanFile && aiFile && !isBalanced ? (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex gap-3 text-xs animate-fade-in">
            <span className="text-lg"><AlertTriangle className="w-5 h-5 text-rose-500" /></span>
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-rose-950 mb-0.5">Penggabungan Ditolak</p>
              <p className="leading-relaxed text-rose-900">Jumlah baris data tidak seimbang (Human: {humanCount} vs AI: {aiCount}). Sistem menolak proses penggabungan guna mencegah bias klasifikasi (*Class Imbalance*).</p>
            </div>
          </div>
        ) : isBalanced ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex gap-3 text-xs animate-fade-in">
            <span className="text-lg"><CheckCircle className="w-5 h-5 text-emerald-500" /></span>
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-950 mb-0.5">Validasi Lolos</p>
              <p className="leading-relaxed text-emerald-900">Jumlah data seimbang (masing-masing memiliki {humanCount} baris). Tombol penggabungan dan unggah sekarang aktif.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 text-slate-600 rounded-xl text-xs leading-relaxed">
            Harap unggah kedua file CSV di atas untuk memulai analisis validasi keseimbangan data otomatis.
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleMergeAndUpload}
        disabled={processing || !isBalanced}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
      >
        {processing ? "Sedang Menggabungkan & Mengunggah..." : "Gabungkan & Upload ke Server"}
      </button>

    </div>
  );
}
"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import { useRouter } from "next/navigation";
import { StatCard, AlertCallout, ScannerLoader } from "../components/dashboardwidgets";
import { useToast } from "../components/toast";
import { Link } from "react-feather";

interface StylometryData {
  avg_sent_len: string;
  lex_div: string;
  punct_dens: string;
}

interface PredictionResponse {
  status: string;
  prediction: string;
  confidence: string;
  prediction_id: number;
  stylometry: StylometryData;
}

interface HistoryItem {
  id: number;
  input_text: string;
  prediction_result: string;
  confidence: string;
  created_at: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "history" | "stats">("analyzer");
  const [text, setText] = useState("");
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // State untuk modul Feedback
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [correctLabel, setCorrectLabel] = useState("Human");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const { showToast } = useToast();
  const router = useRouter();

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

  const handleLogout = () => {
    localStorage.clear();
    showToast("Anda telah keluar dari akun.", "info");
    router.push("/");
  };

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  const handleDetect = async () => {
    if (wordCount < 20) {
      showToast("Teks terlalu pendek untuk analisis stilometri.", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    setShowFeedbackForm(false);

    const token = localStorage.getItem("token");

    try {
      const data = await apiRequest<PredictionResponse>("/predict", "POST", { text }, token);
      setResult(data);
      showToast("Analisis teks selesai!", "success");
    } catch (error: unknown) {
      showToast((error as { message: string }).message || "Gagal menghubungi server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // PENGIRIMAN FEEDBACK KE DATABASE MYSQL
  const handleSubmitFeedback = async () => {
    if (!result) return;
    setFeedbackLoading(true);

    try {
      await apiRequest("/feedback", "POST", {
        prediction_id: result.prediction_id,
        correct_label: correctLabel,
        comment: feedbackComment
      });
      showToast("Terima kasih atas kontribusi Anda!", "success");
      setShowFeedbackForm(false);
      setFeedbackComment("");
    } catch (error: unknown) {
      showToast((error as { message: string }).message || "Gagal menyimpan masukan.", "error");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const totalScans = history.length;
  const aiScans = history.filter(h => h.prediction_result === "AI").length;
  const humanScans = totalScans - aiScans;
  const aiRatio = totalScans > 0 ? ((aiScans / totalScans) * 100).toFixed(1) + "%" : "0%";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      
      {/* Header Panel (Sangat Responsif) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-extrabold text-lg uppercase shadow-md shadow-indigo-100">
            {username ? username[0] : "G"}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">Halo, {username ? username : "Guest User"}!</h2>
            <p className="text-xs text-slate-400">{username ? "Status: Pengguna Terdaftar" : "Silakan Login untuk menyimpan riwayat deteksi secara permanen."}</p>
          </div>
        </div>
        <div className="w-full sm:w-auto flex justify-end">
          {username ? (
            <button onClick={handleLogout} className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all">
              Keluar Akun
            </button>
          ) : (
            <Link href="/login" className="w-full sm:w-auto text-center px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md">
              Login Akun
            </Link>
          )}
        </div>
      </div>

      {/* Tab Navigation (Responsive Horisontal Scroll) */}
      <div className="flex border-b border-slate-200 mb-8 gap-6 overflow-x-auto scrollbar-none whitespace-nowrap">
        <button onClick={() => setActiveTab("analyzer")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "analyzer" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>📝 Text Analyzer</button>
        {username && (
          <>
            <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>⏳ Riwayat Pengujian</button>
            <button onClick={() => setActiveTab("stats")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "stats" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>📊 Statistik Akun</button>
          </>
        )}
      </div>

      {/* 1. TAB ANALYZER (Sangat Responsif Grid-cols-1 ke lg:grid-cols-3) */}
      {activeTab === "analyzer" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Kolom Kiri */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-sm">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ketik atau tempel artikel Anda di sini..."
                className="w-full h-80 p-4 border border-slate-200 rounded-xl outline-none resize-none text-sm text-slate-700 leading-relaxed transition-all"
              />
              <button
                onClick={handleDetect}
                disabled={loading}
                className="w-full mt-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {loading ? "Sedang Menganalisis..." : "Eksekusi Pengujian"}
              </button>
            </div>
            <AlertCallout message="Analisis ini mengevaluasi struktur kebahasaan Anda. Semakin panjang naskah, semakin akurat pembacaan grafik stilometrik model." />
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
              {loading ? (
                <ScannerLoader />
              ) : result ? (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Tampilan Hasil Utama */}
                  <div className="text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      result.prediction === "AI" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {result.prediction === "AI" ? "Mesin" : "Manusia"}
                    </span>
                    <h3 className={`text-3xl font-black mt-4 ${result.prediction === "AI" ? "text-rose-600" : "text-emerald-600"}`}>
                      {result.prediction === "AI" ? "🤖 AI Generated" : "👤 Human Written"}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Tingkat Keyakinan</span>
                      <span className="font-bold text-slate-700">{result.confidence}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${result.prediction === "AI" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: result.confidence }} />
                    </div>
                  </div>

                  {/* ----------------- FITUR BREAKDOWN STILOMETRI ----------------- */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metrik Stilometrik Teks:</h4>
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                      <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                        <span>Panjang Kalimat</span>
                        <span className="font-bold text-slate-800">{result.stylometry.avg_sent_len}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                        <span>Keragaman Kosakata</span>
                        <span className="font-bold text-slate-800">{result.stylometry.lex_div}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                        <span>Kerapatan Tanda Baca</span>
                        <span className="font-bold text-slate-800">{result.stylometry.punct_dens}</span>
                      </div>
                    </div>
                  </div>

                  {/* ----------------- FITUR SYSTEM FEEDBACK (MYSQL) ----------------- */}
                  <div className="pt-4 border-t border-slate-100">
                    {!showFeedbackForm ? (
                      <button 
                        onClick={() => setShowFeedbackForm(true)} 
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50/50 transition-all"
                      >
                        ⚠️ Salah klasifikasi? Berikan Koreksi
                      </button>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3.5 animate-fade-in text-xs">
                        <h5 className="font-bold text-slate-700">Koreksi Label Prediksi</h5>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setCorrectLabel("Human")}
                            className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                              correctLabel === "Human" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-500"
                            }`}
                          >
                            👤 Manusia
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setCorrectLabel("AI")}
                            className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                              correctLabel === "AI" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-200 text-slate-500"
                            }`}
                          >
                            🤖 AI
                          </button>
                        </div>
                        <textarea
                          placeholder="Tulis alasan atau komentar (opsional)..."
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white text-xs h-16 resize-none transition-all"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setShowFeedbackForm(false)} className="flex-1 py-2 border border-slate-200 text-slate-500 font-bold rounded-lg">Batal</button>
                          <button onClick={handleSubmitFeedback} disabled={feedbackLoading} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:bg-slate-300">
                            {feedbackLoading ? "Mengirim..." : "Kirim"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-xs">Hasil pengujian statistik teks akan ditampilkan di panel ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB HISTORY (Tabel Responsif) */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm overflow-hidden animate-fade-in">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Riwayat Klasifikasi Teks</h3>
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Belum ada riwayat pengujian yang tercatat.</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3">Tanggal</th>
                    <th className="pb-3">Cuplikan Teks</th>
                    <th className="pb-3">Hasil Prediksi</th>
                    <th className="pb-3">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-4 text-xs font-medium text-slate-400">{item.created_at}</td>
                      <td className="py-4 font-medium text-slate-700 max-w-xs truncate">{item.input_text}</td>
                      <td className="py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.prediction_result === "AI" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {item.prediction_result === "AI" ? "🤖 AI" : "👤 Human"}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-slate-800">{item.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB STATISTICS (Grid Responsif) */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          <StatCard 
            title="Total Pengujian" 
            value={totalScans} 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} 
          />
          <StatCard 
            title="Deteksi AI" 
            value={`${aiScans} Dokumen`} 
            trend={aiRatio}
            isPositive={false}
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} 
          />
          <StatCard 
            title="Deteksi Manusia" 
            value={`${humanScans} Dokumen`} 
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
          />
        </div>
      )}

    </div>
  );
}
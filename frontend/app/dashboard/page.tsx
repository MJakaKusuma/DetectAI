"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import { useRouter } from "next/navigation";
import { StatCard, AlertCallout, ScannerLoader } from "../components/dashboardwidgets";
import { useToast } from "../components/toast";
import Link from "next/link"; // Gunakan Next.js Link asli untuk menghindari error import

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
  
  // State untuk modul Feedback & Eksport
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [correctLabel, setCorrectLabel] = useState("Human");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // PAGINASI RIWAYAT USER (5 data per halaman)
  const ROWS_PER_PAGE = 5;
  const [historyPage, setHistoryPage] = useState(1);

  // Kata kunci indikatif penanda AI (TF-IDF Clues)
  const [detectedAiWords, setDetectedAiWords] = useState<string[]>([]);

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
  const charCount = text.length;

  const handleDetect = async () => {
    if (wordCount < 20) {
      showToast("Teks terlalu pendek untuk analisis stilometri.", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    setShowFeedbackForm(false);
    setDetectedAiWords([]);

    const token = localStorage.getItem("token");

    try {
      const data = await apiRequest<PredictionResponse>("/predict", "POST", { text }, token);
      setResult(data);
      
      const aiKeywords = ["komprehensif", "signifikan", "optimal", "fundamentalis", "sehingga", "oleh karena itu", "efisiensi", "integrasi", "transparansi", "fleksibilitas"];
      const foundWords = aiKeywords.filter(word => text.toLowerCase().includes(word));
      setDetectedAiWords(foundWords);

      showToast("Analisis teks selesai!", "success");
    } catch (error: unknown ) {
      showToast((error as Error).message || "Gagal menghubungi server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // PEMANGGILAN LAYOUT CETAK PDF PROFESIONAL BROWSER
  const handlePrintPDF = () => {
    if (!result) return;
    showToast("Membuka jendela cetak laporan...", "info");
    setTimeout(() => {
      window.print(); // Memicu printer / PDF Save Dialog browser
    }, 500);
  };

  const handleSubmitFeedback = async () => {
    if (!result) return;
    setFeedbackLoading(true);

    try {
      await apiRequest("/feedback", "POST", {
        prediction_id: result.prediction_id,
        correct_label: correctLabel,
        comment: feedbackComment
      });
      showToast("Koreksi berhasil disimpan.", "success");
      setShowFeedbackForm(false);
      setFeedbackComment("");
    } catch (error: unknown ) {
      showToast((error as Error).message || "Gagal menyimpan masukan.", "error");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getStyleNumber = (str: string) => {
    const matched = str.match(/[\d.]+/);
    return matched ? parseFloat(matched[0]) : 0;
  };

  const currentAvgSentLen = result ? getStyleNumber(result.stylometry.avg_sent_len) : 0;
  const currentLexDiv = result ? getStyleNumber(result.stylometry.lex_div) : 0;

  const totalScans = history.length;
  const aiScans = history.filter(h => h.prediction_result === "AI").length;
  const humanScans = totalScans - aiScans;
  const aiRatio = totalScans > 0 ? ((aiScans / totalScans) * 100).toFixed(1) + "%" : "0%";

  // KALKULASI DATA RIWAYAT TERPAGINASI
  const indexOfLastRow = historyPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentHistoryRows = history.slice(indexOfFirstRow, indexOfLastRow);
  const totalHistoryPages = Math.ceil(history.length / ROWS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[75vh]">
      
      {/* ============================================================================== */}
      {/* A. LAYOUT KHUSUS PRINT PDF (Hanya muncul saat dicetak / print:block) */}
      {/* ============================================================================== */}
      {result && (
        <div className="hidden print:block w-full max-w-4xl mx-auto p-12 bg-white text-slate-900 font-sans border border-slate-200 rounded-lg">
          <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-800">Laporan Hasil Diagnostik Keaslian Teks</h1>
            <p className="text-xs text-slate-500 mt-1">Sistem Deteksi AI Berbasis Analisis Stilometri Hibrida & TF-IDF</p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm mb-8">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Detail Pengujian</p>
              <table className="w-full mt-2 text-xs">
                <tbody>
                  <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">ID Pengujian</td><td className="py-2 font-bold text-slate-800">#{result.prediction_id}</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Tanggal Analisis</td><td className="py-2 font-bold text-slate-800">{new Date().toLocaleString("id-ID")}</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Diuji Oleh</td><td className="py-2 font-bold text-slate-800">{username ? username : "Guest User"}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Karakteristik Dokumen</p>
              <table className="w-full mt-2 text-xs">
                <tbody>
                  <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Jumlah Kata</td><td className="py-2 font-bold text-slate-800">{wordCount} Kata</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Jumlah Karakter</td><td className="py-2 font-bold text-slate-800">{charCount} Karakter</td></tr>
                  <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Status Klasifikasi</td><td className="py-2 font-bold text-indigo-600">Selesai Terkomputasi</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Hasil Utama */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kesimpulan Klasifikasi</p>
            <h2 className={`text-3xl font-black mt-2 uppercase ${result.prediction === "AI" ? "text-rose-600" : "text-emerald-600"}`}>
              {result.prediction === "AI" ? "🤖 AI Generated (Mesin)" : "👤 Human Written (Manusia)"}
            </h2>
            <p className="text-xs text-slate-500 mt-2">Dengan Tingkat Probabilitas Keyakinan Sebesar: <span className="font-bold text-slate-800">{result.confidence}</span></p>
          </div>

          {/* Nilai Stilometri */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Parameter Statistik Gaya Bahasa (Stilometri)</h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">Metrik Stilometrik</th>
                  <th className="p-3 text-right">Nilai Terkomputasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr><td className="p-3">Panjang Kalimat Rata-rata</td><td className="p-3 text-right font-bold">{result.stylometry.avg_sent_len}</td></tr>
                <tr><td className="p-3">Keberagaman Kosakata (Lexical Diversity)</td><td className="p-3 text-right font-bold">{result.stylometry.lex_div}</td></tr>
                <tr><td className="p-3">Kerapatan Penggunaan Tanda Baca</td><td className="p-3 text-right font-bold">{result.stylometry.punct_dens}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Cuplikan Teks */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sampel Naskah Uji</h3>
            <div className="p-4 border border-slate-200 rounded-lg text-xs italic text-slate-600 leading-relaxed">
              &quot;{text.substring(0, 450)}...&quot;
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-6">
            Laporan ini diunduh secara resmi melalui aplikasi riset klasifikasi hibrida DetectAI.
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* B. LAYOUT DASHBOARD UTAMA (Otomatis Sembunyi Saat Cetak / print:hidden) */}
      {/* ============================================================================== */}
      <div className="print:hidden space-y-8">
        
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm gap-4">
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setActiveTab("analyzer")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "analyzer" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>📝 Text Analyzer</button>
          {username && (
            <>
              <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>⏳ Riwayat Pengujian</button>
              <button onClick={() => setActiveTab("stats")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "stats" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>📊 Statistik Akun</button>
            </>
          )}
        </div>

        {/* 1. TAB ANALYZER */}
        {activeTab === "analyzer" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Kolom Kiri: Input Area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kotak Pengujian Teks</span>
                  <span className="text-[10px] text-slate-400">{charCount} Karakter | {wordCount} Kata</span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ketik atau tempel artikel Anda di sini... (Disarankan minimal 2 paragraf)"
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
              <AlertCallout message="Dashboard analisis ini mengintegrasikan ekstraksi bobot kata TF-IDF dengan metriks Stilometri struktural teks untuk mengidentifikasi kepenulisan secara menyeluruh." />
            </div>

            {/* Kolom Kanan: Hasil & Penjelasan Diagnostik */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col justify-between">
                {loading ? (
                  <ScannerLoader />
                ) : result ? (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Hasil Utama */}
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
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full ${result.prediction === "AI" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: result.confidence }} />
                      </div>
                    </div>

                    {/* Komparasi Metrik Stilometri */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Komparasi Tolok Ukur Gaya:</h4>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Panjang Kalimat Rata-rata</span>
                          <span className="font-bold text-slate-700">{result.stylometry.avg_sent_len}</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full">
                          <div className="absolute left-[30%] right-[50%] h-full bg-rose-200/50" />
                          <div className="absolute left-[60%] right-[10%] h-full bg-emerald-200/50" />
                          <div 
                            className="absolute w-3 h-3 bg-indigo-600 border border-white rounded-full -top-0.5 shadow-sm transition-all duration-500" 
                            style={{ left: `${Math.min(100, (currentAvgSentLen / 30) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Kekayaan Kosakata (Lexical Diversity)</span>
                          <span className="font-bold text-slate-700">{result.stylometry.lex_div}</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full">
                          <div className="absolute left-[60%] right-[25%] h-full bg-rose-200/50" />
                          <div className="absolute left-[80%] right-[5%] h-full bg-emerald-200/50" />
                          <div 
                            className="absolute w-3 h-3 bg-indigo-600 border border-white rounded-full -top-0.5 shadow-sm transition-all duration-500" 
                            style={{ left: `${currentLexDiv}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pemindai Kata Kunci AI */}
                    {detectedAiWords.length > 0 && (
                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Deteksi Kata Kunci Favorit AI (TF-IDF):</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {detectedAiWords.map((word, idx) => (
                            <span key={idx} className="px-2 py-1 bg-rose-50 border border-rose-100/50 text-rose-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tombol Cetak Laporan PDF */}
                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={handlePrintPDF}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Cetak Laporan PDF Resmi
                      </button>
                    </div>

                    {/* Feedback Form (Koreksi) */}
                    <div className="pt-2">
                      {!showFeedbackForm ? (
                        <button 
                          onClick={() => setShowFeedbackForm(true)} 
                          className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:underline flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-slate-200 rounded-lg hover:border-indigo-300 transition-all"
                        >
                          ⚠️ Deteksi Kurang Tepat? Berikan Koreksi
                        </button>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 animate-fade-in text-xs">
                          <h5 className="font-bold text-slate-700">Koreksi Klasifikasi</h5>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => setCorrectLabel("Human")}
                              className={`flex-1 py-2 rounded-lg font-bold border text-xs transition-all ${
                                correctLabel === "Human" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-400"
                              }`}
                            >
                              👤 Manusia
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setCorrectLabel("AI")}
                              className={`flex-1 py-2 rounded-lg font-bold border text-xs transition-all ${
                                correctLabel === "AI" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-200 text-slate-400"
                              }`}
                            >
                              🤖 AI
                            </button>
                          </div>
                          <textarea
                            placeholder="Tambahkan catatan koreksi (opsional)..."
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white text-xs h-16 resize-none transition-all"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setShowFeedbackForm(false)} className="flex-1 py-2 border border-slate-200 text-slate-500 font-bold rounded-lg text-xs">Batal</button>
                            <button onClick={handleSubmitFeedback} disabled={feedbackLoading} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs disabled:bg-slate-300">
                              {feedbackLoading ? "Mengirim..." : "Kirim"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400">
                    <p className="text-xs">Hasil analisis diagnostik struktur kalimat akan ditampilkan di sini.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB RIWAYAT (DENGAN INTEGRASI PAGINASI) */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm overflow-hidden animate-fade-in flex flex-col justify-between min-h-[400px]">
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-6">Riwayat Klasifikasi Teks</h3>
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
                      {currentHistoryRows.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-4 text-xs font-medium text-slate-400 whitespace-nowrap">{item.created_at}</td>
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

            {/* Tombol Navigasi Halaman Riwayat */}
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
        )}

        {/* 3. TAB STATISTICS */}
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
    </div>
  );
}
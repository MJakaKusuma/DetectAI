"use client";

import { useState } from "react";
import { apiRequest } from "../../lib/api";
import { AlertCallout, ScannerLoader } from "../../components/dashboardwidgets";
import { useToast } from "../../components/toast";
import { PredictionResponse, AiKeyword } from "../types";
import { RefreshCw, BarChart2, Edit3, Search, Cpu, User, AlertTriangle, Target } from "react-feather";

interface AnalyzerTabProps {
  username: string | null;
}

export default function AnalyzerTab({ username }: AnalyzerTabProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultTab, setResultTab] = useState<"overview" | "stylometry" | "tfidf">("overview");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [correctLabel, setCorrectLabel] = useState("Human");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [enableHighlight, setEnableHighlight] = useState(true);
  const [detectedAiWords, setDetectedAiWords] = useState<AiKeyword[]>([]);

  const { showToast } = useToast();

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
    setShowDetails(false);
    setResultTab("overview");
    setDetectedAiWords([]);

    const token = localStorage.getItem("token");

    try {
      const data = await apiRequest<PredictionResponse>("/predict", "POST", { text }, token);
      setResult(data);
      
      const aiKeywords = data.ai_keywords;
      const foundWords = aiKeywords.filter(kw => text.toLowerCase().includes(kw.word));
      setDetectedAiWords(foundWords);

      showToast("Analisis teks selesai!", "success");
    } catch (error: unknown) {
      showToast((error as Error).message || "Gagal menghubungi server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = () => {
    if (!result) return;
    showToast("Membuka jendela cetak laporan...", "info");
    setTimeout(() => {
      window.print();
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
  const currentPunctDens = result ? getStyleNumber(result.stylometry.punct_dens) : 0;
  
  const currentSentLenVar = result ? getStyleNumber(result.stylometry.sent_len_var) : 0;
  const currentNounDens = result ? getStyleNumber(result.stylometry.noun_dens) : 0;
  const currentVerbDens = result ? getStyleNumber(result.stylometry.verb_dens) : 0;
  const currentAdjDens = result ? getStyleNumber(result.stylometry.adj_dens) : 0;

  const sentLenDiag = currentAvgSentLen >= 18 
    ? "Gaya Manusia (Dinamis): Kalimat Anda panjang dan mengalir alami." 
    : "Gaya AI (Monoton): Struktur kalimat cenderung pendek dan seragam.";

  const lexDivDiag = currentLexDiv >= 75 
    ? "Gaya Manusia (Kaya): Kosakata bervariasi dan tidak repetitif." 
    : "Gaya AI (Terbatas): Banyak pengulangan istilah yang sama secara konsisten.";

  const punctDensDiag = currentPunctDens >= 4.5 
    ? "Penggunaan tanda baca ekspresif dan bervariasi." 
    : "Penggunaan tanda baca sangat baku dan kaku.";

  const sentVarDiag = currentSentLenVar >= 5.0
    ? "Gaya Manusia (Burstiness Tinggi): Variasi panjang antar kalimat sangat dinamis dan alami."
    : "Gaya AI (Monoton): Selisih panjang antar kalimat sangat kaku dan seragam.";

  const getDynamicExplanation = () => {
    if (!result) return "";
    
    const isAI = result.prediction === "AI";
    const isSentLenHuman = currentAvgSentLen >= 18;
    const isLexDivHuman = currentLexDiv >= 75;
    const isPunctHuman = currentPunctDens >= 4.5;
    const isBurstinessHuman = currentSentLenVar >= 5.0;

    const humanStyleScore = (isSentLenHuman ? 1 : 0) + (isLexDivHuman ? 1 : 0) + (isPunctHuman ? 1 : 0) + (isBurstinessHuman ? 1 : 0);
    if (isAI) {
      if (humanStyleScore >= 2) {
        return `Model mendeteksi teks ini sebagai buatan AI terutama didorong oleh pengaruh kuat pembobotan kata leksikal (TF-IDF). Meskipun struktur gaya bahasa Anda (seperti panjang kalimat dan kekayaan kata) secara statistik menunjukkan karakteristik alami manusia, penggunaan kata-kata kunci formal khas mesin tetap mengarahkan model pada klasifikasi AI.`;
      } else {
        return `Model mendeteksi teks ini sebagai buatan AI karena struktur kalimat yang sangat seragam (${result.stylometry.avg_sent_len}) dan keterbatasan variasi kosa kata (${result.stylometry.lex_div}). Pola monoton ini dikombinasikan dengan kemunculan kata kunci formal khas mesin.`;
      }
    } else {
      if (humanStyleScore <= 1) {
        return `Model mendeteksi teks ini sebagai tulisan manusia terutama didorong oleh tidak adanya pola kosa kata khas mesin pada fitur TF-IDF. Meskipun struktur gaya bahasa Anda secara statistik menyerupai pola monoton AI (kalimat cenderung pendek dan kosa kata berulang), kealamian pemilihan kata-kata tetap mengarahkan klasifikasi akhir pada manusia.`;
      } else {
        return `Model mendeteksi teks ini sebagai tulisan manusia karena didukung oleh dinamika struktur penulisan yang kaya. Panjang kalimat rata-rata berada pada rentang ideal manusia (${result.stylometry.avg_sent_len}) dengan struktur yang dinamis, menunjukkan variabilitas alami yang sulit ditiru mesin.`;
      }
    }
  };

  const getSentenceSuspicion = (sentence: string, aiKeywords: string[]) => {
    const trimmed = sentence.trim();
    if (!trimmed) return { score: 0, reason: "" };

    const words = trimmed.split(/\s+/);
    const wordCount = words.length;
    
    const foundKeywords = aiKeywords.filter(word => trimmed.toLowerCase().includes(word));
    let lexicalScore = 0;
    if (foundKeywords.length === 1) {
      lexicalScore = 35;
    } else if (foundKeywords.length > 1) {
      lexicalScore = 50;
    }

    const lengthScore = Math.max(0, 50 - Math.abs(wordCount - 13) * 5);
    const totalScore = lexicalScore + lengthScore;
    
    let reason = `Panjang kalimat: ${wordCount} kata.`;
    if (foundKeywords.length > 0) {
      reason += ` Mengandung kata kunci AI: [${foundKeywords.join(", ")}].`;
    }

    return {
      score: Math.min(100, totalScore),
      reason
    };
  };

  const renderHighlightedText = () => {
    if (!text) return null;
    
    const sentences = text.split(/(?<=[.!?])\s+/);
    const activeKeywords = result ? result.ai_keywords.map(kw => kw.word) : [];

    return sentences.map((sentence, idx) => {
      const trimmedSent = sentence.trim();
      if (!trimmedSent) return null;

      const { score, reason } = getSentenceSuspicion(trimmedSent, activeKeywords);
      
      let highlightClass = "text-slate-700";
      
      if (enableHighlight && score >= 35) {
        if (score >= 85) {
          highlightClass = "bg-rose-500/50 text-rose-950 font-bold border-b-2 border-rose-400/80";
        } else if (score >= 65) {
          highlightClass = "bg-rose-500/30 text-rose-900 border-b border-rose-300/60";
        } else if (score >= 45) {
          highlightClass = "bg-rose-500/15 text-slate-850 border-b border-rose-200/50";
        } else {
          highlightClass = "bg-rose-500/7 text-slate-700";
        }
      }

      return (
        <span 
          key={idx} 
          className={`transition-all duration-300 mr-1.5 leading-relaxed rounded px-0.5 ${highlightClass} ${
            enableHighlight && score >= 35 ? "cursor-help" : ""
          }`}
          title={enableHighlight && score >= 35 ? `Tingkat Kecurigaan: ${score.toFixed(0)}% (${reason})` : undefined}
        >
          {sentence}{" "}
        </span>
      );
    });
  };

  return (
    <>
      {/* ============================================================================== */}
      {/* A. LAYOUT KHUSUS PRINT PDF (Hanya Muncul Saat Dicetak) */}
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

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kesimpulan Klasifikasi</p>
            <h2 className={`text-3xl font-black mt-2 uppercase ${result.prediction === "AI" ? "text-rose-600" : "text-emerald-600"}`}>
              {result.prediction === "AI" ? <><Cpu className="inline-block w-8 h-8 mr-2" /> AI Generated (Mesin)</> : <><User className="inline-block w-8 h-8 mr-2" /> Human Written (Manusia)</>}
            </h2>
            <p className="text-xs text-slate-500 mt-2">Dengan Tingkat Probabilitas Keyakinan Sebesar: <span className="font-bold text-slate-800">{result.confidence}</span></p>
          </div>

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
      {/* 1. TAB ANALYZER */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Kolom Kiri: Input Area atau Document Highlight Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {result ? "Hasil Pemindaian Dokumen" : "Kotak Pengujian Teks"}
              </span>
              <span className="text-[10px] text-slate-400">{charCount} Karakter | {wordCount} Kata</span>
            </div>
            
            {/* DYNAMIC VIEW: Tampilkan Textarea atau Highlighted Viewer */}
            {!result ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ketik atau tempel artikel Anda di sini... (Disarankan minimal 2 paragraf)"
                className="w-full h-80 p-4 border border-slate-200 rounded-xl outline-none resize-none text-sm text-slate-700 leading-relaxed transition-all"
              />
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Panel Dokumen dengan Highlight */}
                <div className="w-full h-80 p-4 border border-slate-200 rounded-xl overflow-y-auto text-sm bg-[#fafafa] leading-relaxed select-text">
                  {renderHighlightedText()}
                </div>
                {/* Kontrol Toggle Highlight */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] text-slate-400">* Sentuh kalimat berwarna untuk melihat alasan indikasi mesin.</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                    <input 
                      type="checkbox" 
                      checked={enableHighlight}
                      onChange={() => setEnableHighlight(!enableHighlight)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    Highlight Indikasi AI
                  </label>
                </div>
              </div>
            )}

            {/* Tombol Kontrol: Eksekusi atau Uji Ulang */}
            {!result ? (
              <button
                onClick={handleDetect}
                disabled={loading}
                className="w-full mt-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {loading ? "Sedang Menganalisis..." : "Eksekusi Pengujian"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setResult(null);
                  setText("");
                  setShowFeedbackForm(false);
                }}
                className="w-full mt-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
              >
                <RefreshCw className="inline-block w-4 h-4 mr-2" /> Lakukan Uji Ulang Teks Baru
              </button>
            )}
          </div>
          <AlertCallout message="Dashboard analisis ini mengintegrasikan ekstraksi bobot kata TF-IDF dengan metriks Stilometri struktural teks untuk mengidentifikasi kepenulisan secara menyeluruh." />
        </div>

        {/* Kolom Kanan: Hasil & Penjelasan Diagnostik */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm min-h-[350px] flex flex-col justify-between">
            {loading ? (
              <ScannerLoader />
            ) : result ? (
              <div className="space-y-5 animate-fade-in">
                
                {/* Header Laporan */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Diagnostic Report #{result.prediction_id}</span>
                  <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Verified ML</span>
                </div>

                {/* SUB-TAB NAVIGATION INTERNAL */}
                <div className="flex bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                  <button 
                    type="button"
                    onClick={() => setResultTab("overview")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      resultTab === "overview" 
                        ? "bg-white text-slate-800 shadow-xs" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <BarChart2 className="inline-block w-3 h-3 mr-1" /> Overview
                  </button>
                  <button 
                    type="button"
                    onClick={() => setResultTab("stylometry")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      resultTab === "stylometry" 
                        ? "bg-white text-slate-800 shadow-xs" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Edit3 className="inline-block w-3 h-3 mr-1" /> Stilometri
                  </button>
                  <button 
                    type="button"
                    onClick={() => setResultTab("tfidf")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      resultTab === "tfidf" 
                        ? "bg-white text-slate-800 shadow-xs" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Search className="inline-block w-3 h-3 mr-1" /> Kosakata
                  </button>
                </div>

                {/* ========================== CONTENT SUB-TABS ========================== */}

                {/* TAB 1: OVERVIEW */}
                {resultTab === "overview" && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* ILUSTRASI VISUAL DETAIL (Robot untuk AI, Pena untuk Human) */}
                    <div className="flex justify-center pt-2">
                      {result.prediction === "AI" ? (
                        // Ilustrasi Kepala Robot Sirkuit Futuristik (Rose Theme)
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="animate-bounce [animation-duration:3s]">
                          <rect x="25" y="25" width="50" height="44" rx="12" fill="#fff1f2" stroke="#f43f5e" strokeWidth="4" />
                          <path d="M35,69 V77 M65,69 V77" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
                          <rect x="40" y="77" width="20" height="6" rx="3" fill="#f43f5e" />
                          <path d="M50,25 V13 M46,13 H54" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="50" cy="10" r="4" fill="#f43f5e" />
                          <circle cx="40" cy="42" r="5" fill="#f43f5e" className="animate-pulse" />
                          <circle cx="60" cy="42" r="5" fill="#f43f5e" className="animate-pulse" />
                          <path d="M42,56 Q50,62 58,56" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        // Ilustrasi Pena Bulu Klasik & Botol Tinta (Emerald Theme)
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="animate-bounce [animation-duration:3s]">
                          <rect x="25" y="55" width="24" height="24" rx="6" fill="#ecfdf5" stroke="#10b981" strokeWidth="4" />
                          <rect x="31" y="47" width="12" height="8" rx="2" fill="#10b981" />
                          <path d="M68,16 C68,16 63,32 50,45 C42,53 38,62 36,70" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                          <path d="M50,45 L32,63 L28,74 L39,70 L57,52 Z" fill="#ecfdf5" stroke="#10b981" strokeWidth="3.5" />
                          <line x1="56" y1="24" x2="62" y2="20" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="48" y1="32" x2="55" y2="27" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="41" y1="41" x2="48" y2="35" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>

                    {/* Hasil Utama */}
                    <div className="text-center py-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        result.prediction === "AI" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {result.prediction === "AI" ? "Mesin" : "Manusia"}
                      </span>
                      <h3 className={`text-2xl font-black mt-2 uppercase ${result.prediction === "AI" ? "text-rose-600" : "text-emerald-600"}`}>
                        {result.prediction === "AI" ? <><Cpu className="inline-block w-6 h-6 mr-2" /> AI Generated</> : <><User className="inline-block w-6 h-6 mr-2" /> Human Written</>}
                      </h3>
                    </div>

                    {/* Progress Keyakinan */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-400">Tingkat Keyakinan</span>
                        <span className={`font-bold ${result.prediction === "AI" ? "text-rose-600" : "text-emerald-600"}`}>{result.confidence}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />
                        <div className={`h-full ${result.prediction === "AI" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: result.confidence }} />
                      </div>
                    </div>

                    {/* Eksplanasi Logika (XAI) */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-[11px] leading-relaxed">
                      {getDynamicExplanation()}
                    </div>
                  </div>
                )}

                {/* TAB 2: STILOMETRI (4 SLIDER GAYA BAHASA + 3 KAPSUL POS DENSITY - ANTI-SCROLL) */}
                {resultTab === "stylometry" && (
                  <div className="space-y-4.5 animate-fade-in">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase pb-1 border-b border-slate-50">
                      <span>Metrik Stilometri (7 Fitur)</span>
                      <span>Acuan: AI [Merah] | Manusia [Hijau]</span>
                    </div>
                    
                    {/* Parameter 1: Panjang Kalimat */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Panjang Kalimat Rata-rata</span>
                        <span className="font-bold text-slate-700">{result.stylometry.avg_sent_len}</span>
                      </div>
                      <div className="relative w-full h-1 bg-slate-100 rounded-full">
                        <div className="absolute left-[30%] right-[50%] h-full bg-rose-200/50" />
                        <div className="absolute left-[60%] right-[10%] h-full bg-emerald-200/50" />
                        <div 
                          className="absolute w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full -top-0.5 shadow-sm transition-all" 
                          style={{ left: `${Math.min(100, (currentAvgSentLen / 30) * 100)}%` }}
                        />
                      </div>
                      <p className={`text-[9px] font-medium leading-tight ${currentAvgSentLen >= 18 ? "text-emerald-600" : "text-rose-500"}`}>
                        * {sentLenDiag}
                      </p>
                    </div>

                    {/* Parameter 2: Keberagaman Kosakata */}
                    <div className="space-y-1 text-xs pt-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Kekayaan Kosakata</span>
                        <span className="font-bold text-slate-700">{result.stylometry.lex_div}</span>
                      </div>
                      <div className="relative w-full h-1 bg-slate-100 rounded-full">
                        <div className="absolute left-[60%] right-[25%] h-full bg-rose-200/50" />
                        <div className="absolute left-[80%] right-[5%] h-full bg-emerald-200/50" />
                        <div 
                          className="absolute w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full -top-0.5 shadow-sm transition-all" 
                          style={{ left: `${currentLexDiv}%` }}
                        />
                      </div>
                      <p className={`text-[9px] font-medium leading-tight ${currentLexDiv >= 75 ? "text-emerald-600" : "text-rose-500"}`}>
                        * {lexDivDiag}
                      </p>
                    </div>

                    {/* Parameter 3: Kerapatan Tanda Baca */}
                    <div className="space-y-1 text-xs pt-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Kerapatan Tanda Baca</span>
                        <span className="font-bold text-slate-700">{result.stylometry.punct_dens}</span>
                      </div>
                      <div className="relative w-full h-1 bg-slate-100 rounded-full">
                        <div className="absolute left-[25%] right-[60%] h-full bg-rose-200/50" />
                        <div className="absolute left-[45%] right-[20%] h-full bg-emerald-200/50" />
                        <div 
                          className="absolute w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full -top-0.5 shadow-sm transition-all" 
                          style={{ left: `${Math.min(100, (currentPunctDens / 10) * 100)}%` }}
                        />
                      </div>
                      <p className={`text-[9px] font-medium leading-tight ${currentPunctDens >= 4.5 ? "text-emerald-600" : "text-rose-500"}`}>
                        * {punctDensDiag}
                      </p>
                    </div>

                    {/* Parameter 4: BURSTINESS / VARIABILITAS PANJANG KALIMAT */}
                    <div className="space-y-1 text-xs pt-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Variabilitas Kalimat (Burstiness)</span>
                        <span className="font-bold text-slate-700">{result.stylometry.sent_len_var}</span>
                      </div>
                      <div className="relative w-full h-1 bg-slate-100 rounded-full">
                        {/* Batasan Rata-rata AI (1.0 - 3.5 sd pada skala 10) */}
                        <div className="absolute left-[10%] right-[65%] h-full bg-rose-200/50" />
                        {/* Batasan Rata-rata Manusia (4.5 - 9.0 sd pada skala 10) */}
                        <div className="absolute left-[45%] right-[10%] h-full bg-emerald-200/50" />
                        <div 
                          className="absolute w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full -top-0.5 shadow-sm transition-all" 
                          style={{ left: `${Math.min(100, (currentSentLenVar / 10) * 100)}%` }} 
                        />
                      </div>
                      <p className={`text-[9px] font-medium leading-tight ${currentSentLenVar >= 5.0 ? "text-emerald-600" : "text-rose-500"}`}>
                        * {sentVarDiag}
                      </p>
                    </div>

                    {/* DISTRIBUSI KELAS KATA / POS DENSITY (NOMINA, VERBA, ADJEKTIVA) */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Komposisi Kelas Kata (POS Distribution):</h4>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        {/* Kapsul 1: Noun */}
                        <div className="p-2 bg-indigo-50/50 border border-indigo-100/60 rounded-xl space-y-0.5">
                          <span className="block font-semibold text-slate-400">NOMINA (Benda)</span>
                          <span className="block font-extrabold text-indigo-700 text-xs">{result.stylometry.noun_dens}</span>
                        </div>
                        {/* Kapsul 2: Verb */}
                        <div className="p-2 bg-emerald-50/50 border border-emerald-100/60 rounded-xl space-y-0.5">
                          <span className="block font-semibold text-slate-400">VERBA (Kerja)</span>
                          <span className="block font-extrabold text-emerald-700 text-xs">{result.stylometry.verb_dens}</span>
                        </div>
                        {/* Kapsul 3: Adj */}
                        <div className="p-2 bg-rose-50/50 border border-rose-100/60 rounded-xl space-y-0.5">
                          <span className="block font-semibold text-slate-400">ADJEKTIVA (Sifat)</span>
                          <span className="block font-extrabold text-rose-700 text-xs">{result.stylometry.adj_dens}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
                {/* TAB 3: KOSAKATA (TF-IDF CLUES & MATH EXPLANATION) */}
                {resultTab === "tfidf" && (
                  <div className="space-y-4 animate-fade-in">
                    {detectedAiWords.length > 0 ? (
                      <div className="space-y-3">
                        <div className="space-y-0.5 text-left">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Leksikal Analisis (TF-IDF Clues):</h4>
                          <p className="text-[9px] text-slate-400">Kosakata penanda mesin yang terdeteksi di dalam dokumen Anda:</p>
                        </div>
                        
                        {/* GRID 2 KOLOM (Bebas tabrakan karena disusun secara vertikal) */}
                        <div className="grid grid-cols-3 gap-3 pt-1">
                          {detectedAiWords.map((item, idx) => {
                            // Cari indeks asli untuk menentukan peringkat signifikansi
                            const originalIndex = result.ai_keywords.findIndex(kw => kw.word === item.word);
                            
                            let badgeText = "Low";
                            let shortBadgeText = "LOW";
                            let cardClass = "bg-slate-50/30 border-slate-200/40 hover:bg-slate-100/50";
                            let badgeTextClass = "text-slate-400";
                            let dotClass = "bg-slate-300";
                            let textClass = "text-slate-500";

                            if (originalIndex < 5) {
                              badgeText = "High TF-IDF (Sangat Kuat)";
                              shortBadgeText = "HIGH";
                              cardClass = "bg-rose-50/20 border-rose-100/40 hover:bg-rose-50/50";
                              badgeTextClass = "text-rose-500";
                              dotClass = "bg-rose-500";
                              textClass = "text-rose-700";
                            } else if (originalIndex < 10) {
                              badgeText = "Medium TF-IDF (Sedang)";
                              shortBadgeText = "MED";
                              cardClass = "bg-amber-50/20 border-amber-100/40 hover:bg-amber-50/50";
                              badgeTextClass = "text-amber-500";
                              dotClass = "bg-amber-500";
                              textClass = "text-amber-700";
                            } else {
                              badgeText = "Low TF-IDF (Ringan)";
                              shortBadgeText = "LOW";
                              cardClass = "bg-slate-50/30 border-slate-200/40 hover:bg-slate-100/50";
                              badgeTextClass = "text-slate-400";
                              dotClass = "bg-slate-300";
                              textClass = "text-slate-400";
                            }

                            return (
                              <div 
                                key={idx} 
                                className={`flex flex-col justify-between p-3 border border-l-4 rounded-r-xl rounded-l-md transition-all shadow-xs h-22 ${cardClass}`}
                                title={`Kata "${item.word}" memiliki nilai koefisien model sebesar ${item.weight.toFixed(4)}. (${badgeText})`}
                              >
                                {/* Baris Atas: Kata & Sensor Glow Bulat */}
                                <div className="flex justify-between items-center w-full">
                                  <span className={`text-xs font-black uppercase tracking-wider truncate max-w-[80px] sm:max-w-[100px] ${textClass}`}>
                                    {item.word}
                                  </span>
                                  {/* Titik sensor berdenyut */}
                                  <span className={`w-2 h-2 rounded-full ${dotClass} animate-pulse`} />
                                </div>

                                {/* Baris Bawah: Koefisien Asli & Label Singkat */}
                                <div className="flex justify-between items-center w-full pt-1.5 border-t border-slate-100/60 text-[9px] text-slate-400 font-bold">
                                  <span>Coeff: {item.weight.toFixed(2)}</span>
                                  <span className={`tracking-wider ${badgeTextClass}`}>
                                    {shortBadgeText}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-xs">Tidak ada kosakata khas mesin yang dominan terdeteksi.</div>
                    )}

                    {/* KOTAK EDUKASI TEORI TERPADU (SANGAT KOMPREHENSIF - DUAL INSIGHT) */}
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 leading-relaxed space-y-3 text-left">
                      
                      {/* Bagian 1: Teori Rumus TF-IDF */}
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <span><BarChart2 className="inline-block w-3 h-3 mr-1" /></span> Bagaimana TF-IDF Menilai Ini?
                        </p>
                        <p className="text-slate-500">
                          Sistem mengalikan frekuensi kata pada dokumen ini (Term Frequency) dengan tingkat kelangkaan kata tersebut pada basis data master (Inverse Document Frequency). Kata di atas disorot karena secara statistik merupakan kosakata favorit yang sering diekstrak oleh model Gemma 4 dibanding data pembanding manusia.
                        </p>
                      </div>
                      
                      {/* Garis Pemisah Perak Tipis */}
                      <div className="h-px bg-slate-200/60 w-full" />
                      
                      {/* Bagian 2: Teori Bobot Koefisien Model */}
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <span><Target className="inline-block w-3 h-3 mr-1" /></span> Kategori Tingkat Pembobotan:
                        </p>
                        <p className="text-slate-500">
                          Sistem membagi 15 kata kunci teratas menjadi 3 tingkatan: High (Bobot koefisien tinggi), Medium (Bobot koefisien sedang), dan Low (Bobot koefisien rendah) berdasarkan nilai statistik asli dari koefisien keputusan model Regresi Logistik.
                        </p>
                      </div>
                    </div>

                  </div>
                )}

                    

                {/* ========================== ACTIONS FOOTER ========================== */}

                {/* Tombol Cetak Laporan PDF */}
                <div className="pt-3 border-t border-slate-100">
                  <button 
                    onClick={handlePrintPDF}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Cetak Laporan PDF Resmi
                  </button>
                </div>

                {/* Feedback Form (Koreksi) */}
                <div className="pt-1">
                  {!showFeedbackForm ? (
                    <button 
                      onClick={() => setShowFeedbackForm(true)} 
                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:underline flex items-center justify-center gap-1.5 w-full py-1.5 border border-dashed border-slate-200 rounded-lg hover:border-indigo-300 transition-all"
                    >
                      <AlertTriangle className="inline-block w-3 h-3 mr-1" /> Deteksi Kurang Tepat? Berikan Koreksi
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
                          <User className="inline-block w-4 h-4 mr-2" /> Manusia
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCorrectLabel("AI")}
                          className={`flex-1 py-2 rounded-lg font-bold border text-xs transition-all ${
                            correctLabel === "AI" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-200 text-slate-400"
                          }`}
                        >
                          <Cpu className="inline-block w-4 h-4 mr-2" /> AI
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
              // SESUDAH (Mewujudkan Visualisasi Isometrik Scanner Machine Canggih)
              <div className="text-center py-10 text-slate-400 space-y-6 flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
                
                {/* ILUSTRASI VEKTOR ISOMETRIK SCANNER (100% NATIVE SVG) */}
                <svg width="200" height="180" viewBox="0 0 200 180" fill="none" className="mx-auto">
                  {/* Grid Network Latar Belakang */}
                  <path d="M20,90 L100,50 L180,90 L100,130 Z" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                  <path d="M40,90 L100,60 L160,90 L100,120 Z" stroke="#e2e8f0" strokeWidth="1" />
                  
                  {/* Dudukan Isometrik (Mesin Scanner) */}
                  <path d="M50,110 L100,85 L150,110 L100,135 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                  <path d="M50,110 V120 L100,145 V135 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                  <path d="M150,110 V120 L100,145 V135 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                  
                  {/* Dokumen yang Melayang (Melakukan Gerakan Memantul Lambat) */}
                  <g className="animate-bounce [animation-duration:4s]">
                    <path d="M70,80 L110,60 L140,75 L100,95 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
                    {/* Garis-Garis Tulisan di Kertas */}
                    <line x1="85" y1="75" x2="115" y2="60" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                    <line x1="90" y1="82" x2="125" y2="65" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                    <line x1="95" y1="89" x2="115" y2="79" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Sinar Laser Pemindai Holografik (Berdenyut/Pulse) */}
                  <g className="animate-pulse">
                    {/* Pancaran Sinar Kerucut */}
                    <path d="M100,35 L70,80 L100,95 Z" fill="url(#laser-cone-left)" opacity="0.15" />
                    <path d="M100,35 L140,75 L100,95 Z" fill="url(#laser-cone-right)" opacity="0.15" />
                    
                    {/* Garis Pancaran Utama */}
                    <path d="M100,35 L70,80" stroke="url(#laser-line)" strokeWidth="1.5" opacity="0.5" />
                    <path d="M100,35 L140,75" stroke="url(#laser-line)" strokeWidth="1.5" opacity="0.5" />
                    <path d="M100,35 L100,95" stroke="url(#laser-line)" strokeWidth="1.5" opacity="0.5" />
                    
                    {/* Pemancar Sinar Di Atas */}
                    <circle cx="100" cy="35" r="5" fill="#6366f1" />
                    <circle cx="100" cy="35" r="9" stroke="#6366f1" strokeWidth="1" className="animate-ping" />
                  </g>

                  {/* Gradasi Warna Laser */}
                  <defs>
                    <linearGradient id="laser-line" x1="100" y1="35" x2="100" y2="95">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="laser-cone-left" x1="100" y1="35" x2="70" y2="80">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="laser-cone-right" x1="100" y1="35" x2="140" y2="75">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detektor Siap Digunakan</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                    Tempel artikel Anda di kotak kiri, lalu klik eksekusi untuk memulai pemindaian stilometri.
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

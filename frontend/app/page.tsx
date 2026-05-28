"use client";
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ prediction: string; confidence: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDetect = async () => {
    if (!text) {
      alert("Silakan masukkan teks terlebih dahulu!");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungi server backend");
      }

      const data = await response.json();
      setResult({
        prediction: data.prediction,
        confidence: data.confidence,
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan koneksi ke Backend!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            AI Text Detector
          </h1>
          <p className="text-gray-500">
            Deteksi apakah teks ditulis oleh manusia atau AI (Gemma 4) menggunakan Stylometry & TF-IDF
          </p>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <textarea
            className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-700"
            placeholder="Paste teks Anda di sini (minimal 2 paragraf untuk hasil lebih akurat)..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <button
            onClick={handleDetect}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
          >
            {loading ? "Sedang Menganalisis..." : "Deteksi Sekarang"}
          </button>
        </div>

        {/* Result Area */}
        {result && (
          <div className={`mt-8 p-6 rounded-xl border-2 text-center transition-all ${
            result.prediction === "AI" 
            ? "bg-red-50 border-red-200" 
            : "bg-green-50 border-green-200"
          }`}>
            <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider">Hasil Prediksi</p>
            <h2 className={`text-4xl font-black mt-2 ${
              result.prediction === "AI" ? "text-red-600" : "text-green-600"
            }`}>
              {result.prediction === "AI" ? "🤖 AI GENERATED" : "👤 HUMAN WRITTEN"}
            </h2>
            <p className="text-gray-600 mt-2">
              Tingkat Keyakinan: <span className="font-bold">{result.confidence}</span>
            </p>
          </div>
        )}
      </div>

      <footer className="mt-12 text-gray-400 text-sm">
        &copy; 2026 - Skripsi Klasifikasi AI - Built with Next.js & FastAPI
      </footer>
    </main>
  );
}
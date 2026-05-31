"use client";
import { useState } from "react";

export default function DeveloperPage() {
  const [activeLang, setActiveLang] = useState<"curl" | "python" | "js">("curl");

  const codeSnippets = {
    curl: `curl -X 'POST' \\
  'http://localhost:8000/predict' \\
  -H 'accept: application/json' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "text": "Masukkan teks formal bahasa Indonesia yang ingin diuji di sini..."
}'`,
    python: `import requests

url = "http://localhost:8000/predict"
payload = {
    "text": "Masukkan teks formal bahasa Indonesia yang ingin diuji di sini..."
}

response = requests.post(url, json=payload)
data = response.json()

print(f"Prediksi: {data['prediction']}")
print(f"Confidence: {data['confidence']}")`,
    js: `const detectText = async () => {
  const response = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: "Masukkan teks formal bahasa Indonesia yang ingin diuji di sini..."
    })
  });

  const data = await response.json();
  console.log(\`Prediksi: \${data.prediction}\`);
  console.log(\`Confidence: \${data.confidence}\`);
};`
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Developer Center</span>
        <h1 className="text-3xl font-black text-slate-800 mt-4">Integrasi API Pengembang</h1>
        <p className="text-xs text-slate-400 mt-1">Gunakan endpoint API kami untuk mengintegrasikan sistem deteksi ke dalam platform e-learning atau CMS Anda secara instan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kolom Kiri: Spesifikasi API */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Endpoint Detail</h3>
            
            <div className="space-y-1">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded uppercase border border-emerald-100">POST</span>
              <p className="font-mono text-xs text-slate-700 pt-1.5 font-bold">/predict</p>
            </div>

            <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <p>Menerima payload teks mentah, melakukan pembersihan data, ekstraksi fitur komparatif, dan mengembalikan status klasifikasi.</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li>Format data: JSON</li>
                <li>Limitasi: Nilai latih minimum 20 kata</li>
                <li>Authentication: Opsional</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Dokumentasi & Contoh Kode */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            
            {/* Header Kode */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-slate-400">Contoh Implementasi Kode</span>
              <div className="flex gap-2 text-xs">
                <button 
                  onClick={() => setActiveLang("curl")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${activeLang === "curl" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  cURL
                </button>
                <button 
                  onClick={() => setActiveLang("python")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${activeLang === "python" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Python
                </button>
                <button 
                  onClick={() => setActiveLang("js")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${activeLang === "js" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  JavaScript
                </button>
              </div>
            </div>

            {/* Blok Tampilan Kode */}
            <pre className="bg-slate-950 p-5 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              <code>{codeSnippets[activeLang]}</code>
            </pre>

          </div>
        </div>

      </div>

      {/* JSON Schema Definition */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Struktur Respon API (JSON Response Schema)</h3>
        <pre className="bg-slate-50 p-5 rounded-xl font-mono text-xs text-slate-600 overflow-x-auto leading-relaxed border border-slate-150">
{`{
  "status": "success",
  "prediction": "AI",            // Nilai kembalian: 'AI' atau 'Human'
  "confidence": "96.84%",        // Persentase keyakinan keputusan model
  "prediction_id": 12,           // ID Log unik yang dicatat di database MySQL
  "stylometry": {
    "avg_sent_len": "15.2 kata/kalimat",
    "lex_div": "78.4% kosakata unik",
    "punct_dens": "4.2% kerapatan tanda baca"
  }
}`}
        </pre>
      </div>

    </div>
  );
}
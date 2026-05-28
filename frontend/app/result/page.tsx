// app/result/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Cpu, User, Zap } from 'react-feather';

// Type definitions (bisa dipindahkan ke file types/analysis.ts)
interface AnalysisResultItem {
  sentence: string;
  confidence: number;
  label: 'Human' | 'AI-Generated';
}

interface AnalysisResult {
  total_sentences: number;
  ai_count: number;
  results: AnalysisResultItem[];
}

export default function ResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('analysisResult');
      if (!stored) {
        setError('Tidak ada hasil analisis ditemukan. Silakan lakukan analisis terlebih dahulu.');
        return;
      }
      const data: AnalysisResult = JSON.parse(stored);
      setResult(data);
    } catch (err) {
      setError('Gagal membaca data hasil analisis.');
    }
  }, []);

  if (error) {
    return (
      <div className="analyze-box" style={{ textAlign: 'center', padding: '60px' }}>
        <AlertCircle size={40} color="var(--accent)" />
        <h2 style={{ marginTop: '20px' }}>Oops...</h2>
        <p style={{ color: '#747d8c', marginBottom: '30px' }}>{error}</p>
        <Link href="/" className="back-button" style={{ justifyContent: 'center' }}>
          <ArrowLeft size={18} /> Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="analyze-box" style={{ textAlign: 'center', padding: '60px' }}>
        <p>Memuat hasil analisis...</p>
      </div>
    );
  }

  const humanCount = result.total_sentences - result.ai_count;
  const aiPercentage = ((result.ai_count / result.total_sentences) * 100).toFixed(1);
  const humanPercentage = ((humanCount / result.total_sentences) * 100).toFixed(1);

  return (
    <>
      <Link href="/" className="back-button">
        <ArrowLeft size={18} /> Kembali ke Dashboard
      </Link>

      <div className="result-header">
        <h1>Hasil Analisis Forensik</h1>
        <p>Deteksi anomali penulisan berbasis AI selesai dilakukan.</p>
      </div>

      <div className="result-summary">
        <div className="summary-card total">
          <Zap size={24} color="var(--primary)" />
          <p className="label">Total Kalimat</p>
          <p className="value">{result.total_sentences}</p>
        </div>
        <div className="summary-card human">
          <User size={24} color="#2ed573" />
          <p className="label">Human Written</p>
          <p className="value">{humanCount}</p>
          <small style={{ color: '#2ed573' }}>{humanPercentage}%</small>
        </div>
        <div className="summary-card ai">
          <Cpu size={24} color="var(--accent)" />
          <p className="label">AI Generated</p>
          <p className="value">{result.ai_count}</p>
          <small style={{ color: 'var(--accent)' }}>{aiPercentage}%</small>
        </div>
      </div>

      <div className="analyze-box">
        <h3 style={{ marginBottom: '25px' }}>Detail per Kalimat</h3>
        <div className="sentence-list">
          {result.results.map((item, index) => (
            <div
              key={index}
              className={`sentence-item ${item.label === 'Human' ? 'human' : 'ai'}`}
            >
              <p className="sentence-text">&ldquo;{item.sentence}&rdquo;</p>
              <div className="sentence-meta">
                <span
                  className={`badge ${item.label === 'Human' ? 'badge-human' : 'badge-ai'}`}
                >
                  {item.label === 'Human' ? '🧑 Human' : '🤖 AI'}
                </span>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${Math.round(item.confidence * 100)}%` }}
                  />
                </div>
                <span className="confidence-value">
                  {Math.round(item.confidence * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Database, Shield, Info, AlertCircle, Play } from 'react-feather';

interface AnalysisResult {
  total_sentences: number;
  ai_count: number;
  results: Array<{
    sentence: string;
    confidence: number;
    label: 'Human' | 'AI-Generated';
  }>;
}

export default function Dashboard() {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json();
        setError(data.error || 'Gagal menganalisis dokumen');
        setLoading(false);
        return;
      }

      const result: AnalysisResult = await res.json();
      sessionStorage.setItem('analysisResult', JSON.stringify(result));
      router.push('/result');
    } catch (err) {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="header-content">
        <div className="welcome-text">
          <h1>Selamat Datang di Portal Forensik</h1>
          <p>Pantau integritas dokumen dengan analisis Stylometry & Machine Learning.</p>
        </div>
        <div className="date-now">{today}</div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Cpu /></div>
          <div>
            <p style={{ fontSize: 11, color: '#747d8c' }}>Status Model</p>
            <h4 style={{ fontSize: 16 }}>LR Active</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Database /></div>
          <div>
            <p style={{ fontSize: 11, color: '#747d8c' }}>Dataset Size</p>
            <h4 style={{ fontSize: 16 }}>Ready</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Shield /></div>
          <div>
            <p style={{ fontSize: 11, color: '#747d8c' }}>Akurasi Sistem</p>
            <h4 style={{ fontSize: 16 }}>~94.2%</h4>
          </div>
        </div>
      </section>

      <section className="analyze-box">
        <h3>Input Dokumen Analisis</h3>

        {error && (
          <div className="alert-info alert-error">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="alert-info">
          <Info size={18} />
          Sistem akan memecah teks per kalimat untuk mendeteksi anomali gaya penulisan AI.
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            name="text"
            placeholder="Tempelkan teks naskah, paper, atau esai di sini..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Menganalisis...' : 'Mulai Deteksi'} <Play size={18} />
          </button>
        </form>
      </section>
    </>
  );
}
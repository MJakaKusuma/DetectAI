import { NextResponse } from 'next/server';

interface AnalysisRequest {
  text: string;
}

interface AnalysisResultItem {
  sentence: string;
  confidence: number;
  label: 'Human' | 'AI-Generated';
}

interface AnalysisResponse {
  total_sentences: number;
  ai_count: number;
  results: AnalysisResultItem[];
}

export async function POST(request: Request) {
  const body: AnalysisRequest = await request.json();
  const { text } = body;

  if (!text || text.trim().length < 20) {
    return NextResponse.json(
      { error: 'Teks terlalu pendek. Minimal 20 karakter.' },
      { status: 400 }
    );
  }

  // Bagi teks menjadi kalimat
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
  const results: AnalysisResultItem[] = sentences.map((sentence) => ({
    sentence: sentence.trim(),
    confidence: Math.random(),
    label: Math.random() > 0.5 ? 'Human' : 'AI-Generated',
  }));

  // Simulasi delay pemrosesan
  await new Promise((r) => setTimeout(r, 500));

  const responseData: AnalysisResponse = {
    total_sentences: sentences.length,
    ai_count: results.filter((r) => r.label === 'AI-Generated').length,
    results,
  };

  return NextResponse.json(responseData);
}
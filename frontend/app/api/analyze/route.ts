// app/api/analyze/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch('http://localhost:5000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
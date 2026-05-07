// app/retrain/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RetrainPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/retrain', { method: 'POST' })
      .then(() => alert('Model sedang dilatih ulang...'))
      .catch(() => alert('Gagal melatih ulang model.'));
    router.push('/');
  }, [router]);

  return <p>Menginisialisasi pelatihan ulang...</p>;
}
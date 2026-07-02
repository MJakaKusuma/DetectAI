"use client";

import React from "react";

interface RadarChartProps {
  avgSentLen: number; // nilai skala 0-30
  sentLenVar: number; // nilai skala 0-15
  lexDiv: number;     // nilai skala 0-100 (%)
  punctDens: number;  // nilai skala 0-10 (%)
  nounDens: number;   // nilai skala 0-50 (%)
  verbDens: number;   // nilai skala 0-50 (%)
  adjDens: number;    // nilai skala 0-50 (%)
  conjDens: number;   // nilai skala 0-30 (%)
  prediction: "AI" | "Human";
}

export default function RadarChart({
  avgSentLen,
  sentLenVar,
  lexDiv,
  punctDens,
  nounDens,
  verbDens,
  adjDens,
  conjDens,
  prediction
}: RadarChartProps) {
  const width = 220;
  const height = 220;
  const cx = width / 2; // Pusat X: 110
  const cy = height / 2; // Pusat Y: 110
  const r = 80; // Radius Maksimal Web: 80px

  // Sumbu-sumbu Radar Chart (8 Dimensi Utama)
  const axes = [
    { label: "Kalimat", value: Math.min(1.0, avgSentLen / 30) },
    { label: "Burstiness", value: Math.min(1.0, sentLenVar / 15) },
    { label: "Kosakata", value: Math.min(1.0, lexDiv / 100) },
    { label: "Tanda Baca", value: Math.min(1.0, punctDens / 10) },
    { label: "Nomina", value: Math.min(1.0, nounDens / 50) },
    { label: "Verba", value: Math.min(1.0, verbDens / 50) },
    { label: "Adjektiva", value: Math.min(1.0, adjDens / 50) },
    { label: "Konjungsi", value: Math.min(1.0, conjDens / 30) },
  ];

  // Fungsi menghitung koordinat X dan Y berdasarkan sudut lingkaran
  const getCoordinates = (index: number, value: number) => {
    const angle = (index * (2 * Math.PI)) / 8 - Math.PI / 2; // Mulai dari atas (90 deg)
    const x = cx + r * value * Math.cos(angle);
    const y = cy + r * value * Math.sin(angle);
    return { x, y };
  };

  // 1. Gambar Sarang Laba-Laba (Grid Web Latar Belakang)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridLines = gridLevels.map((level, levelIdx) => {
    const points = axes.map((_, i) => {
      const { x, y } = getCoordinates(i, level);
      return `${x},${y}`;
    }).join(" ");
    return <polygon key={levelIdx} points={points} className="stroke-slate-200 fill-none" strokeWidth="0.5" />;
  });

  // 2. Gambar Garis Poros Sumbu (Axis Lines)
  const axisLines = axes.map((axis, i) => {
    const { x, y } = getCoordinates(i, 1.0);
    const labelPos = getCoordinates(i, 1.18); // Letakkan teks label sedikit di luar web
    return (
      <g key={i}>
        <line x1={cx} y1={cy} x2={x} y2={y} className="stroke-slate-200" strokeWidth="0.75" />
        <text 
          x={labelPos.x} 
          y={labelPos.y} 
          textAnchor="middle" 
          alignmentBaseline="middle" 
          className="fill-slate-400 font-bold text-[8px] uppercase tracking-wider"
        >
          {axis.label}
        </text>
      </g>
    );
  });

  // 3. Gambar Poligon Hasil Uji Teks (User's Text Polygon)
  const userPoints = axes.map((axis, i) => {
    const { x, y } = getCoordinates(i, axis.value);
    return `${x},${y}`;
  }).join(" ");

  // Tentukan warna tema poligon berdasarkan prediksi kesimpulan
  const polygonColor = prediction === "AI" ? "stroke-rose-500 fill-rose-500/20" : "stroke-emerald-500 fill-emerald-500/20";
  const dotColor = prediction === "AI" ? "fill-rose-500" : "fill-emerald-500";

  return (
    <div className="flex justify-center items-center p-2 bg-white rounded-2xl border border-slate-100 shadow-inner">
      <svg width={width} height={height} className="overflow-visible">
        {/* Sarang Laba-Laba Latar Belakang */}
        {gridLines}
        
        {/* Garis Sumbu & Label */}
        {axisLines}
        
        {/* Poligon Data Pengguna */}
        <polygon points={userPoints} className={`${polygonColor} transition-all duration-500`} strokeWidth="2.5" />
        
        {/* Titik Point Sumbu (Dots) */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(i, axis.value);
          return <circle key={i} cx={x} cy={y} r="3" className={`${dotColor} stroke-white`} strokeWidth="1" />;
        })}
      </svg>
    </div>
  );
}
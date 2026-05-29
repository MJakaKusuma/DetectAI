"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-100">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            Detect<span className="text-indigo-600">AI</span>
          </span>
        </Link>

        {/* MENU DESKTOP (Otomatis Tersembunyi di Layar HP - hidden md:flex) */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Analyzer</Link>
          <div className="h-4 w-px bg-slate-200" />
          <Link href="/login" className="px-4 py-2 text-slate-700 hover:text-indigo-600 transition-all rounded-lg">
            Login
          </Link>
          <Link href="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold uppercase tracking-wider">
            Daftar
          </Link>
        </div>

        {/* TOMBOL HAMBURGER (Hanya Muncul di Layar HP - md:hidden) */}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          type="button"
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-all focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

      </div>

      {/* MENU DROPDOWN SELULER (Hanya Muncul di HP saat tombol diklik) */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 animate-fade-in shadow-lg">
          <Link href="/" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 hover:text-indigo-600 py-1">
            Home
          </Link>
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 hover:text-indigo-600 py-1">
            Analyzer
          </Link>
          <div className="h-px bg-slate-100 w-full" />
          <Link href="/login" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 py-1">
            Login
          </Link>
          <Link href="/register" onClick={() => setIsOpen(false)} className="w-full text-center py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider">
            Daftar
          </Link>
        </div>
      )}
    </nav>
  );
}
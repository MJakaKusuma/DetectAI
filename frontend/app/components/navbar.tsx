"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "../components/toast";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isLoggedIn = Boolean(token && username);
  
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname(); // Untuk mendeteksi halaman aktif

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    setIsOpen(false);
    showToast("Anda telah keluar dari sistem.", "info");
    router.push("/");
  };

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-50 w-full print:hidden">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-linear-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            Detect<span className="text-indigo-600">AI</span>
          </span>
        </Link>

        {/* 1. MENU UTAMA DESKTOP */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link href="/" className={`transition-colors ${pathname === "/" ? "text-indigo-600" : "hover:text-indigo-600"}`}>Home</Link>
          <Link href="/dashboard" className={`transition-colors ${pathname === "/dashboard" ? "text-indigo-600" : "hover:text-indigo-600"}`}>Analyzer</Link>
                    <Link href="/about" className={`transition-colors ${pathname === "/about" ? "text-indigo-600 font-bold" : "hover:text-indigo-600"}`}>About</Link>
          {/* <Link href="/developer" className={`transition-colors ${pathname === "/developer" ? "text-indigo-600 font-bold" : "hover:text-indigo-600"}`}>🔌 API Doc</Link> */}
          
          {/* Menu Khusus Admin (Hanya muncul jika Role = admin) */}
          {isLoggedIn && role === "admin" && (
            <Link href="/admin" className={`transition-colors ${pathname === "/admin" ? "text-indigo-600 font-bold" : "hover:text-indigo-600"}`}>
              🛠️ Admin Panel
            </Link>
          )}
          
          <div className="h-4 w-px bg-slate-200" />

          {/* 2. TOMBOL AUTH / MENU PROFIL DINAMIS */}
          {!isLoggedIn ? (
            // TAMPILAN GUEST (BELUM LOGIN)
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-slate-700 hover:text-indigo-600 transition-all rounded-lg">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold uppercase tracking-wider">
                Daftar
              </Link>
            </div>
          ) : (
            // TAMPILAN JIKA SUDAH LOGIN (AVATAR PROFIL)
            <div className="flex items-center gap-4 animate-fade-in">
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                {/* Avatar Bulat */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase ${
                  role === "admin" ? "bg-slate-800" : "bg-indigo-600"
                }`}>
                  {username ? username[0] : "U"}
                </div>
                {/* Info Username & Badge Role */}
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-none">{username}</p>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    {role === "admin" ? "Admin" : "User"}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* TOMBOL HAMBURGER MOBILE */}
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

      {/* 3. MENU DROPDOWN MOBILE (RESPONSIF) */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 animate-fade-in shadow-lg">
          <Link href="/" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 hover:text-indigo-600 py-1">Home</Link>
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 hover:text-indigo-600 py-1">Analyzer</Link>
          <Link href="/about" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 hover:text-indigo-600 py-1">About</Link>
          {/* <Link href="/developer" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 hover:text-indigo-600 py-1">🔌 API Doc</Link> */}
          
          {isLoggedIn && role === "admin" && (
            <Link href="/admin" onClick={() => setIsOpen(false)} className="text-sm font-bold text-indigo-600 py-1">Admin Panel</Link>
          )}

          <div className="h-px bg-slate-100 w-full" />

          {!isLoggedIn ? (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={() => setIsOpen(false)} className="text-sm font-bold text-slate-700 py-2 text-center border border-slate-200 rounded-xl">Login</Link>
              <Link href="/register" onClick={() => setIsOpen(false)} className="w-full text-center py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider">Daftar</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold uppercase ${
                  role === "admin" ? "bg-slate-800" : "bg-indigo-600"
                }`}>
                  {username ? username[0] : "U"}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{username}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{role === "admin" ? "Administrator" : "User Biasa"}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full py-3 text-center border border-rose-200 text-rose-600 font-bold rounded-xl text-xs uppercase tracking-wider">Logout</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
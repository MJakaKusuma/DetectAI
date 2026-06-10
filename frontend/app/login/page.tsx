"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/toast";

interface MeResponse {
  username: string;
  role: string;
}

export default function LoginPage() {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const router = useRouter();

  const { showToast } =
    useToast();

  const handleLogin = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest(
        "/login",
        "POST",
        {
          username,
          password
        }
      );

      const me =
        await apiRequest<MeResponse>(
          "/me"
        );

      localStorage.setItem(
        "username",
        me.username
      );

      showToast(
        "Login berhasil! Selamat datang.",
        "success"
      );

      if (
        me.role === "admin"
      ) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }

    } catch (err: unknown) {

      showToast(
        (err as Error).message ||
        "Gagal masuk. Periksa kembali username dan password anda.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-linear-to-b from-indigo-50/20 to-transparent">
      <div className="max-w-md w-full bg-white border border-slate-100 shadow-2xl shadow-slate-200/80 rounded-2xl p-8 sm:p-10">

        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">
            Masuk ke Sistem
          </h2>

          <p className="text-xs text-slate-500 mt-1.5">
            Gunakan akun anda
            untuk melakukan
            analisis mendalam
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-6"
        >

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Username
            </label>

            <input
              type="text"
              required
              placeholder="Masukkan username anda"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>

            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all ${
              loading
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-100"
            }`}
          >
            {loading
              ? "Memproses..."
              : "Masuk"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Belum memiliki akun?{" "}

          <Link
            href="/register"
            className="text-indigo-600 font-bold hover:underline"
          >
            Daftar Sekarang
          </Link>
        </div>

      </div>
    </div>
  );
}
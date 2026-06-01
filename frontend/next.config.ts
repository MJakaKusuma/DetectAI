import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IZINKAN IP LOKAL ANDA UNTUK DEVELOPMENT DI JARINGAN
  allowedDevOrigins: ["192.168.1.2", "192.168.1.2:3000", "localhost:3000"],
  
  // Jika ada konfigurasi lama Anda di bawah ini, silakan biarkan saja
};

export default nextConfig;
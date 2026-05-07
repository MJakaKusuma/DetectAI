'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Crosshair,
  Grid,
  FileText,
  RefreshCw,
  LogOut,
} from 'react-feather';

interface UserData {
  name: string;
  role: string;
}

export default function Sidebar() {
  const pathname = usePathname();

  // Data user mock – nanti bisa dari context/auth
  const user: UserData = {
    name: 'Ahmad Fauzi',
    role: 'analyst',
  };

  const isActive = (href: string) => (pathname === href ? 'active' : '');

  return (
    <aside className="sidebar">
      <div className="logo">
        <Crosshair /> NeuralGuard<span>Pro</span>
      </div>

      <p className="menu-label">Main Menu</p>

      <ul className="nav-menu">
        <li className="nav-item">
          <Link href="/" className={`nav-link ${isActive('/')}`}>
            <Grid size={18} /> Dashboard
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/history" className={`nav-link ${isActive('/history')}`}>
            <FileText size={18} /> Riwayat Scan
          </Link>
        </li>
        <li className="nav-item">
          <Link
            href="/retrain"
            className={`nav-link ${isActive('/retrain')}`}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              if (!window.confirm('Latih ulang model sekarang?')) {
                e.preventDefault();
              }
            }}
          >
            <RefreshCw size={18} /> Retrain Model
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/logout" className="nav-link" style={{ color: 'var(--accent)' }}>
            <LogOut size={18} /> Keluar
          </Link>
        </li>
      </ul>

      <div className="user-profile">
        <div className="user-info">
          <h4>{user.name}</h4>
          <p>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
        </div>
      </div>
    </aside>
  );
}
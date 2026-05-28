import Sidebar from './components/sidebar';
import './globals.css';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'NeuralGuard Pro',
  description: 'Dashboard Forensik Stylometry',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={poppins.className}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <Sidebar />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
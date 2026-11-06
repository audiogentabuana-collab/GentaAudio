import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { siteUrl } from '@/shared/lib/site';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: 'Genta Buana',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={poppins.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

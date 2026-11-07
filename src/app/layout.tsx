import type { Metadata, Viewport } from 'next';
import { Familjen_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { siteUrl } from '@/shared/lib/site';
import './globals.css';

const familjen = Familjen_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-familjen',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: 'Genta Buana',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0f0f0e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${familjen.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

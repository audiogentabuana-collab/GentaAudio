import { ImageResponse } from 'next/og';
import { getPublicSnapshot } from '@/server/data/public';
import { formatRupiah } from '@/shared/lib/format';

export const alt = 'Genta Buana — Sewa Sound System';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

/** Gambar Open Graph (preview saat link dibagikan di WhatsApp/Facebook), dibuat otomatis dari data. */
export default async function OgImage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const min = snap.packages.length ? Math.min(...snap.packages.map((p) => p.price)) : 0;
  const tagline = (s.tagline || 'Sewa Sound System & Perlengkapan Acara').replace(/\s*\|\s*/g, ' ');
  const bars = [40, 70, 55, 90, 65, 100, 75, 50, 85, 60, 95, 45];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#0f0f0e',
          color: '#ece9e2',
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 36 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
            {[18, 32, 40, 26, 14].map((h, i) => (
              <div key={i} style={{ width: 6, height: h, background: '#ff6b1a', borderRadius: 3 }} />
            ))}
          </div>
          {s.business_name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, color: '#ff6b1a' }}>{tagline}</div>
          {min > 0 && <div style={{ display: 'flex', marginTop: 24, fontSize: 34, color: '#c2c2c2' }}>{`Paket mulai ${formatRupiah(min)}`}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 28, color: '#9b9b9b' }}>Hajatan · Pernikahan · Event · Sekolah · Kantor</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ width: 12, height: h * 0.9, background: i % 3 === 0 ? '#ece9e2' : '#ff6b1a', borderRadius: 4 }} />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

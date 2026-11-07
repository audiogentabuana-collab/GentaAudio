'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnalyticsSummary } from '@/features/content/types';
import { cn } from '@/shared/lib/format';

type Metric = 'views' | 'visitors' | 'wa_clicks';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'views', label: 'Kunjungan' },
  { key: 'visitors', label: 'Pengunjung' },
  { key: 'wa_clicks', label: 'Klik WhatsApp' },
];

const COLOR = '#ea5a0c'; // brand-500, lolos validasi kontras & lightness band di atas putih
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

const fmtDay = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'));
const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n);

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Grafik garis satu seri (satu sumbu) + crosshair & tooltip.
 * Ganti metrik lewat tab — bukan dua sumbu dalam satu grafik.
 */
export function AnalyticsChart({ series }: { series: AnalyticsSummary['series'] }) {
  const [metric, setMetric] = useState<Metric>('views');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Lebar mengikuti kontainer agar teks sumbu tetap berukuran asli (tidak ikut mengecil di HP)
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 200 : 260;

  const values = series.map((d) => d[metric]);
  const max = niceMax(Math.max(0, ...values));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `M${x(0)},${y(0)} L${pts.join(' L')} L${x(values.length - 1)},${y(0)} Z`;

  const ticks = [0, max / 2, max];
  const xLabels = series.length > 2 ? [0, Math.floor((series.length - 1) / 2), series.length - 1] : series.map((_, i) => i);
  const pct = (i: number) => `${(x(i) / W) * 100}%`;
  const total = values.reduce((a, b) => a + b, 0);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / innerW) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  }

  const h = hover !== null ? series[hover] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Pilih metrik" className="inline-flex rounded-lg bg-stone-100 p-1 text-sm">
          {METRICS.map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn('rounded-md px-3 py-1.5', metric === m.key ? 'bg-white font-medium text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900')}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone-500">
          Total <span className="font-semibold tabular-nums text-stone-900">{fmtNum(total)}</span>
        </p>
      </div>

      <div className="relative w-full min-w-0 overflow-hidden" ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block touch-none select-none"
          role="img"
          aria-label={`Grafik ${METRICS.find((m) => m.key === metric)!.label} per hari`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-stone-400 text-[11px]">
                {fmtNum(t)}
              </text>
            </g>
          ))}
          <path d={area} fill={COLOR} fillOpacity={0.08} />
          <path d={line} fill="none" stroke={COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {xLabels.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} className="fill-stone-400 text-[11px]">
              {fmtDay(series[i].date)}
            </text>
          ))}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#a8a29e" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(values[hover])} r={5} fill={COLOR} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-36 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md"
            style={{ left: `clamp(4.5rem, ${pct(hover)}, calc(100% - 4.5rem))` }}
          >
            <p className="text-xs text-stone-500">{fmtDay(h.date)}</p>
            {METRICS.map((m) => (
              <p key={m.key} className="flex items-center justify-between gap-4">
                <span className={cn('text-stone-500', m.key === metric && 'text-stone-900')}>{m.label}</span>
                <span className="font-semibold tabular-nums">{fmtNum(h[m.key])}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Data harian</caption>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Kunjungan</th>
            <th>Pengunjung</th>
            <th>Klik WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.views}</td>
              <td>{d.visitors}</td>
              <td>{d.wa_clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

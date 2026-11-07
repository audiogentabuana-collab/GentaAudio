import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Check, Circle, MousePointerClick, Eye, Percent, Users } from 'lucide-react';
import { adminAnalytics, adminList, adminSettings, tryLoad } from '@/server/data/admin';
import { LoadError } from '@/features/admin/components/LoadError';
import { GasError } from '@/server/gas/client';
import type { AnalyticsSummary } from '@/features/content/types';
import { Card, PageHeader } from '@/features/admin/components/ui';
import { RefreshCacheButton } from '@/features/admin/components/RefreshCacheButton';
import { AnalyticsChart } from '@/features/admin/components/AnalyticsChart';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { displayPhone } from '@/shared/lib/whatsapp';
import { cn } from '@/shared/lib/format';

export const metadata: Metadata = { title: 'Dashboard' };

const PERIODS = [7, 30, 90] as const;
const SEED_WA = '6281234567890';
const filled = (v: string) => Boolean(v) && !v.startsWith('[ISI');
const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const fmt1 = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const fmtDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'));

function Delta({ now, prev, suffix = '' }: { now: number; prev: number; suffix?: string }) {
  if (!prev) {
    return <span className="text-xs text-stone-400">{now ? 'Belum ada pembanding' : '—'}</span>;
  }
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
      <span className={cn('inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 font-medium', up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
        <Icon className="h-3 w-3" aria-hidden />
        <span className="sr-only">{up ? 'naik' : 'turun'}</span>
        {fmt1(Math.abs(pct))}%
      </span>
      <span className="hidden sm:inline">
        vs {suffix ? fmt1(prev) : fmt(prev)}
        {suffix} periode lalu
      </span>
    </span>
  );
}

function RankList({ rows, empty, label }: { rows: { name: string; count: number }[]; empty: string; label: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-stone-400">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="space-y-3" aria-label={label}>
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-stone-700">{r.name}</span>
            <span className="font-medium tabular-nums text-stone-900">{fmt(r.count)}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-stone-100">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const PAGE_NAMES: Record<string, string> = {
  '/': 'Beranda',
  '/pricelist': 'Daftar harga',
  '/galeri': 'Galeri',
  '/tentang': 'Tentang',
  '/faq': 'FAQ',
  '/kontak': 'Kontak',
};

const SOURCE_NAMES: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, 'Instagram'],
  [/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com)$/, 'Facebook'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp'],
  [/(^|\.)youtube\.com$/, 'YouTube'],
  [/(^|\.)bing\.com$/, 'Bing'],
];

function sourceName(host: string) {
  if (host === '(langsung)') return 'Langsung / tidak diketahui';
  return SOURCE_NAMES.find(([re]) => re.test(host))?.[1] ?? host;
}

/** Statistik kosong — dipakai bila analitik gagal dimuat agar dashboard tetap tampil. */
function emptySummary(days: number): AnalyticsSummary {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const base = Date.parse(today + 'T00:00:00Z');
  const series = Array.from({ length: days }, (_, i) => ({
    date: new Date(base - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
    views: 0,
    visitors: 0,
    wa_clicks: 0,
  }));
  const zero = { views: 0, visitors: 0, wa_clicks: 0 };
  return { range: { from: series[0].date, to: today, days }, series, totals: zero, previous: zero, pages: [], refs: [], devices: {}, packages: [] };
}

async function loadAnalytics(days: number): Promise<{ data: AnalyticsSummary; error: string | null }> {
  try {
    return { data: await adminAnalytics(days), error: null };
  } catch (err) {
    const code = err instanceof GasError ? err.code : 'ERROR';
    console.error('[dashboard] analitik gagal dimuat:', code, (err as Error).message);
    return { data: emptySummary(days), error: code };
  }
}

function AnalyticsNotice({ code }: { code: string }) {
  const msg =
    code === 'NOT_FOUND'
      ? 'Statistik belum aktif karena Apps Script yang online masih versi lama. Jalankan “npm run gas:push”, jalankan fungsi setup sekali di editor Apps Script, lalu Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan.'
      : code === 'CONFIG'
        ? 'Sheet statistik belum dibuat. Buka editor Apps Script, pilih fungsi setup, lalu klik Jalankan sekali.'
        : `Statistik gagal dimuat (kode ${code}). Konten lain tetap bisa dikelola. Coba muat ulang halaman beberapa saat lagi.`;
  return (
    <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Statistik website belum bisa ditampilkan</p>
      <p className="mt-1">{msg}</p>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<'/admin'>) {
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.hari) as (typeof PERIODS)[number]) ? Number(sp.hari) : 30;
  const res = await tryLoad(() => Promise.all([loadAnalytics(days), adminSettings(), adminList('packages'), adminList('gallery')]));
  if (!res.ok) return <LoadError message={res.message} title="Dashboard gagal dimuat" />;
  const [{ data: a, error: analyticsError }, s, packages, gallery] = res.data;

  const rate = a.totals.visitors ? (a.totals.wa_clicks / a.totals.visitors) * 100 : 0;
  const prevRate = a.previous.visitors ? (a.previous.wa_clicks / a.previous.visitors) * 100 : 0;
  const kpis = [
    { label: 'Kunjungan', value: fmt(a.totals.views), now: a.totals.views, prev: a.previous.views, icon: Eye, hint: 'Jumlah halaman dibuka' },
    { label: 'Pengunjung', value: fmt(a.totals.visitors), now: a.totals.visitors, prev: a.previous.visitors, icon: Users, hint: 'Pengunjung unik per hari, dijumlahkan' },
    { label: 'Klik WhatsApp', value: fmt(a.totals.wa_clicks), now: a.totals.wa_clicks, prev: a.previous.wa_clicks, icon: MousePointerClick, hint: 'Tombol WA ditekan (calon pemesan)' },
    { label: 'Rasio klik WA', value: `${fmt1(rate)}%`, now: rate, prev: prevRate, icon: Percent, hint: 'Klik WA ÷ pengunjung' },
  ];

  // Agregat sumber (gabungkan domain yang sama, mis. l.instagram.com + instagram.com)
  const sourceMap = new Map<string, number>();
  a.refs.forEach((r) => sourceMap.set(sourceName(r.key), (sourceMap.get(sourceName(r.key)) ?? 0) + r.count));
  const sources = [...sourceMap].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count).slice(0, 6);

  const pkgName = new Map(packages.map((p) => [p.slug, p.name]));
  const topPackages = a.packages.map((p) => ({ name: pkgName.get(p.key) ?? p.key, count: p.count }));
  const topPages = a.pages.map((p) => {
    const pkg = p.key.startsWith('/pricelist/') ? pkgName.get(p.key.slice('/pricelist/'.length)) : undefined;
    return { name: PAGE_NAMES[p.key] ?? (pkg ? `Paket: ${pkg}` : p.key), count: p.count };
  });
  const mobile = a.devices.mobile ?? 0;
  const desktop = a.devices.desktop ?? 0;
  const deviceTotal = mobile + desktop;
  const hasData = a.totals.views + a.totals.wa_clicks > 0;

  const pkgNoPhoto = packages.filter((p) => p.image_ids.length === 0).length;
  const galNoPhoto = gallery.filter((g) => g.image_ids.length === 0).length;
  const checklist = [
    { done: Boolean(s.whatsapp) && s.whatsapp !== SEED_WA, label: 'Nomor WhatsApp asli', note: s.whatsapp === SEED_WA ? 'Masih nomor contoh' : undefined, href: '/admin/pengaturan' },
    { done: filled(s.address), label: 'Alamat usaha', href: '/admin/pengaturan' },
    { done: filled(s.service_area), label: 'Area layanan', href: '/admin/pengaturan' },
    { done: Boolean(s.maps_url || s.maps_embed_url), label: 'Lokasi Google Maps', href: '/admin/pengaturan' },
    { done: Boolean(s.email) && !s.email.endsWith('.example'), label: 'Email usaha', href: '/admin/pengaturan' },
    { done: Boolean(s.logo_id), label: 'Logo', href: '/admin/pengaturan' },
    { done: Boolean(s.hero_image_id), label: 'Foto utama beranda', href: '/admin/pengaturan' },
    { done: packages.length > 0 && pkgNoPhoto === 0, label: 'Foto setiap paket', note: pkgNoPhoto ? `${pkgNoPhoto} dari ${packages.length} paket belum ada foto` : undefined, href: '/admin/paket' },
    { done: gallery.length > 0 && galNoPhoto === 0, label: 'Foto galeri', note: galNoPhoto ? `${galNoPhoto} dari ${gallery.length} album belum ada foto` : undefined, href: '/admin/galeri' },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Statistik website ${fmtDate(a.range.from)} – ${fmtDate(a.range.to)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Periode" className="inline-flex rounded-lg border border-stone-200 bg-white p-1 text-sm">
              {PERIODS.map((p) => (
                <Link
                  key={p}
                  href={p === 30 ? '/admin' : `/admin?hari=${p}`}
                  aria-current={days === p ? 'page' : undefined}
                  className={cn('rounded-md px-3 py-1.5', days === p ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900')}
                >
                  {p} hari
                </Link>
              ))}
            </nav>
            <RefreshCacheButton />
          </div>
        }
      />

      {analyticsError && <AnalyticsNotice code={analyticsError} />}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map(({ label, value, now, prev, icon: Icon, hint }) => (
          <Card key={label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-600" title={hint}>
                {label}
              </span>
              <Icon className="h-4 w-4 text-stone-400" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
            <div className="mt-2">
              <Delta now={now} prev={prev} suffix={label === 'Rasio klik WA' ? '%' : ''} />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Tren harian</h2>
          <AnalyticsChart series={a.series} />
          {!hasData && (
            <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-500">
              Belum ada data. Statistik mulai tercatat setelah website online dan dikunjungi. Data dirangkum otomatis setiap jam.
            </p>
          )}
        </Card>

        <div className="grid gap-4">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-semibold">Perangkat</h2>
            {deviceTotal ? (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`HP ${Math.round((mobile / deviceTotal) * 100)}%, komputer ${Math.round((desktop / deviceTotal) * 100)}%`}>
                  <div className="bg-brand-500" style={{ width: `${(mobile / deviceTotal) * 100}%` }} />
                  <div className="ml-0.5 bg-stone-400" style={{ width: `${(desktop / deviceTotal) * 100}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-stone-500">
                      <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden /> HP
                    </dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{Math.round((mobile / deviceTotal) * 100)}%</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-stone-500">
                      <span className="h-2 w-2 rounded-full bg-stone-400" aria-hidden /> Komputer
                    </dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{Math.round((desktop / deviceTotal) * 100)}%</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="py-4 text-center text-sm text-stone-400">Belum ada data</p>
            )}
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-semibold">Sumber pengunjung</h2>
            <RankList rows={sources} empty="Belum ada data" label="Sumber pengunjung" />
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Paket paling diminati</h2>
            <span className="text-xs text-stone-400">dari klik WhatsApp</span>
          </div>
          <RankList rows={topPackages} empty="Belum ada klik WhatsApp pada paket" label="Paket paling diminati" />
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Halaman terpopuler</h2>
            <span className="text-xs text-stone-400">kunjungan</span>
          </div>
          <RankList rows={topPages} empty="Belum ada data" label="Halaman terpopuler" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Kelengkapan website</h2>
            <span className="text-sm tabular-nums text-stone-500">
              {doneCount}/{checklist.length} lengkap
            </span>
          </div>
          <div className="mb-3 h-1.5 rounded-full bg-stone-100">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="group flex items-start gap-2.5 rounded-lg px-1 py-2 hover:bg-stone-50">
                  {c.done ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" aria-hidden />
                  )}
                  <span className="text-sm">
                    <span className={c.done ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-800 group-hover:text-brand-700'}>{c.label}</span>
                    <span className="sr-only">{c.done ? ' (sudah)' : ' (belum)'}</span>
                    {c.note && <span className="block text-xs text-stone-500">{c.note}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <WhatsAppIcon size={18} className="text-[#25D366]" /> Pemesanan via WhatsApp
          </h2>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{s.whatsapp ? displayPhone(s.whatsapp) : '—'}</p>
          <p className="mt-1 text-sm text-stone-500">Semua tombol pesan di website mengarah ke nomor ini.</p>
          <Link href="/admin/pengaturan" className="mt-4 inline-flex h-9 items-center rounded-lg border border-stone-300 px-3 text-sm font-medium hover:bg-stone-50">
            Ganti nomor
          </Link>
        </Card>
      </div>
    </div>
  );
}

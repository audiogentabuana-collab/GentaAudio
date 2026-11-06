'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ImageOff, Pencil, Plus, Search, Star } from 'lucide-react';
import type { Category, ResourceName } from '@/features/content/types';
import { resourceByName } from '../resources';
import { deleteResource, reorderResource, toggleResource } from '../actions';
import { Badge, Card, ConfirmDelete, PageHeader, Switch } from './ui';
import { useToast } from './Toast';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { formatDateId, formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';

type Row = Record<string, unknown> & { id: string; is_active: boolean };

function subtitle(resource: ResourceName, r: Row, catName: (id: string) => string) {
  switch (resource) {
    case 'packages':
      return `${catName(String(r.category_id))} · ${formatRupiah(Number(r.price))} ${PRICE_UNIT_LABEL[r.price_unit as 'per_acara'] ?? ''}`;
    case 'equipment':
      return `${formatRupiah(Number(r.price))} ${r.unit ?? ''}`;
    case 'gallery':
      return [r.event_type, r.event_date ? formatDateId(String(r.event_date)) : '', `${(r.image_ids as string[]).length} foto`].filter(Boolean).join(' · ');
    case 'testimonials':
      return `${'★'.repeat(Number(r.rating))} ${r.event ? '· ' + r.event : ''}`;
    case 'faqs':
      return String(r.answer).slice(0, 90);
    case 'categories':
      return String(r.description || '');
  }
}

export function ResourceList({ resource, rows: initialRows, categories = [] }: { resource: ResourceName; rows: Row[]; categories?: Category[] }) {
  const def = resourceByName(resource)!;
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState('');
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? 'Tanpa kategori';
  }, [categories]);

  const filtered = q ? rows.filter((r) => String(r[def.titleField]).toLowerCase().includes(q.toLowerCase())) : rows;

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    const prev = rows;
    setRows(next);
    startTransition(async () => {
      const res = await reorderResource(resource, next.map((r) => r.id));
      if (!res.ok) {
        setRows(prev);
        toast('error', res.message ?? 'Gagal menyimpan urutan.');
      }
    });
  }

  async function toggle(row: Row, value: boolean) {
    setBusyId(row.id);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: value } : r)));
    const res = await toggleResource(resource, row.id, value);
    setBusyId(null);
    if (!res.ok) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: !value } : r)));
      toast('error', res.message ?? 'Gagal mengubah status.');
    } else toast('success', res.message ?? 'Tersimpan.');
  }

  async function remove(row: Row) {
    const res = await deleteResource(resource, row.id);
    if (!res.ok) return toast('error', res.message ?? 'Gagal menghapus.');
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast('success', `${def.singular} dihapus.`);
    router.refresh();
  }

  const cover = (r: Row) => {
    if (!def.imageField) return null;
    const v = r[def.imageField];
    return Array.isArray(v) ? (v[0] as string | undefined) : (v as string | undefined);
  };

  return (
    <div>
      <PageHeader
        title={def.label}
        description={def.description}
        action={
          <Link href={`/admin/${def.slug}/baru`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" aria-hidden /> Tambah {def.singular.toLowerCase()}
          </Link>
        }
      />

      {rows.length > 6 && (
        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <span className="sr-only">Cari</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${def.singular.toLowerCase()}...`} className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base" />
        </label>
      )}

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <def.icon className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-semibold text-slate-800">Belum ada {def.singular.toLowerCase()}</p>
          <Link href={`/admin/${def.slug}/baru`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" aria-hidden /> Tambah sekarang
          </Link>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const index = rows.findIndex((x) => x.id === r.id);
              const img = cover(r);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
                  {!q && (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Naikkan urutan" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-25">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label="Turunkan urutan" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-25">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {def.imageField && (
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {img ? (
                        <Image src={driveImageUrl(img, 200)} alt="" fill sizes="64px" unoptimized className="object-cover" />
                      ) : (
                        <ImageOff className="absolute inset-0 m-auto h-5 w-5 text-slate-300" aria-label="Belum ada foto" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/${def.slug}/${r.id}`} className="truncate font-semibold text-slate-900 hover:underline">
                        {String(r[def.titleField])}
                      </Link>
                      {Boolean(r.is_featured) && (
                        <Badge tone="amber">
                          <Star className="h-3 w-3" fill="currentColor" aria-hidden /> Unggulan
                        </Badge>
                      )}
                      {!r.is_active && <Badge>Disembunyikan</Badge>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{subtitle(resource, r, catName)}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 sm:gap-2">
                    <label className="flex items-center gap-2 px-1 text-xs font-medium text-slate-500">
                      <span className="hidden sm:inline">{r.is_active ? 'Tampil' : 'Sembunyi'}</span>
                      <Switch checked={r.is_active} disabled={busyId === r.id} onChange={(v) => toggle(r, v)} label={`Tampilkan ${String(r[def.titleField])} di website`} />
                    </label>
                    <Link href={`/admin/${def.slug}/${r.id}`} aria-label="Ubah" title="Ubah" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <ConfirmDelete compact onConfirm={() => remove(r)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <p className="mt-3 text-xs text-slate-500">Gunakan panah untuk mengatur urutan tampil di website. Urutan langsung tersimpan.</p>
    </div>
  );
}

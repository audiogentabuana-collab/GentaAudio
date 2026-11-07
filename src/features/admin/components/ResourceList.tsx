'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Category, ResourceName } from '@/features/content/types';
import { resourceByName } from '../resources';
import { deleteResource, reorderResource, toggleResource } from '../actions';
import { ConfirmDelete, PageHeader, Switch } from './ui';
import { useToast } from './Toast';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { formatDateId, formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';

type Row = Record<string, unknown> & { id: string; is_active: boolean };

function detail(resource: ResourceName, r: Row, catName: (id: string) => string) {
  switch (resource) {
    case 'packages':
      return catName(String(r.category_id));
    case 'equipment':
      return String(r.description || '');
    case 'gallery':
      return [r.event_type, r.event_date ? formatDateId(String(r.event_date)) : ''].filter(Boolean).join(' · ');
    case 'testimonials':
      return String(r.event || '');
    case 'faqs':
      return String(r.answer).slice(0, 100);
    case 'categories':
      return String(r.description || '');
  }
}

/** Kolom angka di kanan (harga / jumlah foto / rating). */
function figure(resource: ResourceName, r: Row) {
  switch (resource) {
    case 'packages':
      return `${formatRupiah(Number(r.price))} ${PRICE_UNIT_LABEL[r.price_unit as 'per_acara'] ?? ''}`;
    case 'equipment':
      return `${formatRupiah(Number(r.price))} ${r.unit ?? ''}`;
    case 'gallery':
      return `${(r.image_ids as string[]).length} foto`;
    case 'testimonials':
      return `${Number(r.rating)}/5`;
    default:
      return '';
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

  const addHref = `/admin/${def.slug}/baru`;

  return (
    <div>
      <PageHeader
        title={def.label}
        description={def.description}
        action={
          <Link href={addHref} className="inline-flex h-10 items-center justify-center rounded-[3px] bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700">
            + Tambah {def.singular.toLowerCase()}
          </Link>
        }
      />

      {rows.length > 6 && (
        <label className="mb-5 block max-w-sm">
          <span className="sr-only">Cari</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Cari ${def.singular.toLowerCase()}…`}
            className="h-10 w-full rounded-[3px] border border-stone-300 bg-white px-3 text-base focus:border-stone-900 focus:outline-none"
          />
        </label>
      )}

      {rows.length === 0 ? (
        <div className="border-y border-dashed border-stone-300 py-12">
          <p className="text-lg">Belum ada {def.singular.toLowerCase()}.</p>
          <Link href={addHref} className="mt-3 inline-block underline underline-offset-4">
            Tambah yang pertama →
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[4.5rem_1fr_10rem_6rem_7rem] gap-4 border-b border-stone-300 pb-2 md:grid">
            <span className="label-mono text-stone-500">Urutan</span>
            <span className="label-mono text-stone-500">Nama</span>
            <span className="label-mono text-right text-stone-500">{resource === 'faqs' || resource === 'categories' ? '' : 'Info'}</span>
            <span className="label-mono text-stone-500">Tampil</span>
            <span />
          </div>
          <ul>
            {filtered.map((r) => {
              const index = rows.findIndex((x) => x.id === r.id);
              const img = cover(r);
              const fig = figure(resource, r);
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 border-b border-stone-200 py-3 md:grid-cols-[4.5rem_1fr_13rem_6rem_7rem]"
                >
                  <div className="flex items-center gap-1">
                    {!q ? (
                      <>
                        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Naikkan urutan" className="flex h-8 w-8 items-center justify-center rounded-[3px] text-stone-500 hover:bg-stone-200 disabled:opacity-25">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label="Turunkan urutan" className="flex h-8 w-8 items-center justify-center rounded-[3px] text-stone-500 hover:bg-stone-200 disabled:opacity-25">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="w-[4.25rem]" />
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    {def.imageField &&
                      (img ? (
                        <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-[2px] bg-stone-200">
                          <Image src={driveImageUrl(img, 200)} alt="" fill sizes="56px" unoptimized className="object-cover" />
                        </span>
                      ) : (
                        <span className="label-mono flex h-10 w-14 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-stone-300 text-[10px] text-stone-400" title="Belum ada foto">
                          foto
                        </span>
                      ))}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link href={`/admin/${def.slug}/${r.id}`} className="truncate font-medium text-stone-900 hover:underline">
                          {String(r[def.titleField])}
                        </Link>
                        {Boolean(r.is_featured) && <span className="label-mono text-brand-600">Unggulan</span>}
                      </div>
                      <p className="line-clamp-1 text-sm text-stone-500">{detail(resource, r, catName)}</p>
                    </div>
                  </div>

                  <span className="col-start-2 whitespace-nowrap font-mono text-sm text-stone-700 md:col-start-auto md:text-right">{fig}</span>

                  <div className="col-start-2 flex items-center justify-between gap-3 md:contents">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={r.is_active} disabled={busyId === r.id} onChange={(v) => toggle(r, v)} label={`Tampilkan ${String(r[def.titleField])} di website`} />
                      <span className={r.is_active ? 'text-stone-900' : 'text-stone-500'}>{r.is_active ? 'Tampil' : 'Sembunyi'}</span>
                    </label>
                    <div className="flex items-center gap-3 md:justify-end">
                      <Link href={`/admin/${def.slug}/${r.id}`} className="text-sm text-stone-900 underline-offset-4 hover:underline">
                        Ubah
                      </Link>
                      <ConfirmDelete compact onConfirm={() => remove(r)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[13px] text-stone-500">Panah mengatur urutan tampil di website dan langsung tersimpan. “Sembunyi” menyembunyikan dari website tanpa menghapus.</p>
        </>
      )}
    </div>
  );
}

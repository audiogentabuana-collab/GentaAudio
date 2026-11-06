'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star, X } from 'lucide-react';
import { discardUploadedImage, uploadImage } from '@/shared/lib/compress-image';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { cn } from '@/shared/lib/format';
import { useToast } from './Toast';

interface Pending {
  key: string;
  name: string;
}

/**
 * Upload multi-gambar: kompres di browser → /api/admin/upload → Drive.
 * Upload dilakukan berurutan (1 request per gambar) agar tidak melewati batas payload.
 */
export function ImagesField({
  value,
  onChange,
  max = 12,
  single,
  keepPng,
  error,
  id,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  single?: boolean;
  keepPng?: boolean;
  error?: string;
  id: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const toast = useToast();
  const limit = single ? 1 : max;
  const current = useRef(value);
  useEffect(() => {
    current.current = value;
  }, [value]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = single ? 1 : limit - value.length;
    const list = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > list.length) toast('error', `Maksimal ${limit} foto.`);
    for (const file of list) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setPending((p) => [...p, { key, name: file.name }]);
      try {
        const { fileId, previewUrl } = await uploadImage(file, { keepPng });
        setPreviews((p) => ({ ...p, [fileId]: previewUrl }));
        setFresh((s) => new Set(s).add(fileId));
        if (single) {
          const old = current.current[0];
          if (old && fresh.has(old)) void discardUploadedImage(old);
          current.current = [fileId];
          onChange([fileId]);
        } else {
          current.current = [...current.current, fileId];
          onChange(current.current);
        }
      } catch (e) {
        toast('error', `${file.name}: ${(e as Error).message}`);
      } finally {
        setPending((p) => p.filter((x) => x.key !== key));
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  const remove = (fid: string) => {
    onChange(value.filter((v) => v !== fid));
    // Foto yang baru di-upload & belum tersimpan langsung dibuang dari Drive.
    // Foto lama baru dipindah ke trash setelah data disimpan (oleh Apps Script).
    if (fresh.has(fid)) void discardUploadedImage(fid);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const canAdd = single ? true : value.length + pending.length < limit;

  return (
    <div>
      <ul className={cn('grid gap-3', single ? 'grid-cols-1 sm:max-w-xs' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
        {value.map((fid, i) => (
          <li key={fid} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <div className="relative aspect-[4/3]">
              <Image src={previews[fid] ?? driveImageUrl(fid, 600)} alt={`Foto ${i + 1}`} fill sizes="200px" unoptimized className="object-cover" />
            </div>
            {!single && i === 0 && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-400 px-2 py-0.5 text-[11px] font-bold text-slate-950">
                <Star className="h-3 w-3" fill="currentColor" aria-hidden /> Utama
              </span>
            )}
            <div className="flex items-center justify-between gap-1 border-t border-slate-200 bg-white p-1">
              {!single ? (
                <div className="flex">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Geser ke kiri" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Geser ke kanan" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
                </div>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => remove(fid)} aria-label="Hapus foto" className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                <X className="h-4 w-4" aria-hidden /> Hapus
              </button>
            </div>
          </li>
        ))}
        {pending.map((p) => (
          <li key={p.key} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-2 text-center text-xs text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
            <span className="line-clamp-2">Mengunggah {p.name}</span>
          </li>
        ))}
        {canAdd && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending.length > 0 && !!single}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:border-brand-500 hover:text-brand-700"
            >
              <ImagePlus className="h-7 w-7" aria-hidden />
              {single && value.length ? 'Ganti foto' : 'Tambah foto'}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple={!single}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-2 text-xs text-slate-500">
        JPG/PNG/WEBP. Foto otomatis dikecilkan (maks lebar 1600px, ±1MB) sebelum diunggah.{!single && ` Maks ${limit} foto.`}
      </p>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

'use client';

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { Spec } from '@/features/content/types';
import { inputCls } from './ui';

const QUICK = ['Speaker', 'Subwoofer', 'Mixer', 'Mic', 'Monitor', 'Lighting', 'Operator', 'Genset'];

export function SpecsField({ value, onChange, error }: { value: Spec[]; onChange: (v: Spec[]) => void; error?: string }) {
  const update = (i: number, patch: Partial<Spec>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((s, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-[3px] border border-stone-200 bg-stone-50 p-2 sm:flex-row sm:items-center">
              <input aria-label={`Nama item ${i + 1}`} value={s.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Item (mis. Speaker)" maxLength={60} className={`${inputCls} sm:w-44`} />
              <input aria-label={`Keterangan item ${i + 1}`} value={s.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="Keterangan (mis. 4x 15 inch)" maxLength={200} className={`${inputCls} flex-1`} />
              <div className="flex shrink-0 justify-end gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naikkan" className="flex h-10 w-10 items-center justify-center rounded-[3px] text-stone-500 hover:bg-white disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Turunkan" className="flex h-10 w-10 items-center justify-center rounded-[3px] text-stone-500 hover:bg-white disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Hapus item" className="flex h-10 w-10 items-center justify-center rounded-[3px] text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onChange([...value, { label: '', value: '' }])} className="inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-dashed border-stone-400 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
          <Plus className="h-4 w-4" aria-hidden /> Tambah item
        </button>
        <span className="text-xs text-stone-500">Cepat:</span>
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => onChange([...value, { label: q, value: '' }])} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-brand-100">
            + {q}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

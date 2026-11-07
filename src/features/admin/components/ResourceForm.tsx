'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import type { Category, ResourceName, Spec } from '@/features/content/types';
import { fieldErrors, resourceSchemas } from '@/features/content/schemas';
import { resourceByName, type FieldDef } from '../resources';
import { saveResource } from '../actions';
import { AdminButton, Card, ConfirmDelete, FieldWrap, inputCls, Switch } from './ui';
import { ImagesField } from './ImagesField';
import { SpecsField } from './SpecsField';
import { useToast } from './Toast';
import { deleteResource } from '../actions';
import { cn, omit } from '@/shared/lib/format';

type Values = Record<string, unknown>;

function PriceInput({ id, value, onChange, invalid }: { id: string; value: number; onChange: (n: number) => void; invalid?: boolean }) {
  const display = value ? new Intl.NumberFormat('id-ID').format(value) : '';
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">Rp</span>
      <input
        id={id}
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, 10)) || 0)}
        className={cn(inputCls, 'pl-10', invalid && 'border-red-500')}
        placeholder="0"
        aria-invalid={invalid}
      />
    </div>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} bintang`} onClick={() => onChange(n)} className="rounded-lg p-1.5 hover:bg-brand-50">
          <Star className={cn('h-7 w-7', n <= value ? 'text-brand-400' : 'text-stone-300')} fill="currentColor" aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function ResourceForm({
  resource,
  initial,
  id,
  categories = [],
}: {
  resource: ResourceName;
  initial?: Values;
  id?: string;
  categories?: Category[];
}) {
  const def = resourceByName(resource)!;
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() => ({ ...def.defaults, ...(initial ?? {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const listHref = `/admin/${def.slug}`;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = (name: string, v: unknown) => {
    setValues((s) => ({ ...s, [name]: v }));
    setDirty(true);
    if (errors[name]) setErrors((prev) => omit(prev, name));
  };

  const fieldsMain = useMemo(() => def.fields.filter((f) => f.type !== 'switch'), [def]);
  const fieldsSwitch = useMemo(() => def.fields.filter((f) => f.type === 'switch'), [def]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Values = {};
    def.fields.forEach((f) => (payload[f.name] = values[f.name]));
    if (resource === 'packages') {
      payload.specs = ((values.specs as Spec[]) ?? []).filter((s) => s.label.trim() || s.value.trim());
    }
    const parsed = resourceSchemas[resource].safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast('error', 'Periksa kembali isian yang ditandai merah.');
      return;
    }
    startSaving(async () => {
      const res = await saveResource(resource, id ?? null, parsed.data);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        toast('error', res.message ?? 'Gagal menyimpan.');
        return;
      }
      setDirty(false);
      toast('success', `${def.singular} tersimpan.`);
      router.push(listHref);
      router.refresh();
    });
  }

  function renderField(f: FieldDef) {
    const fid = `f-${f.name}`;
    const err = errors[f.name] ?? Object.entries(errors).find(([k]) => k.startsWith(f.name + '.'))?.[1];
    const common = { 'aria-invalid': !!err || undefined, 'aria-describedby': err ? `${fid}-error` : undefined };
    const v = values[f.name];
    let control: React.ReactNode;
    switch (f.type) {
      case 'text':
        control = <input id={fid} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} maxLength={f.maxLength} placeholder={f.placeholder} className={cn(inputCls, err && 'border-red-500')} {...common} />;
        break;
      case 'textarea':
        control = <textarea id={fid} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} maxLength={f.maxLength} placeholder={f.placeholder} rows={f.name === 'answer' || f.name === 'description' ? 5 : 3} className={cn(inputCls, err && 'border-red-500')} {...common} />;
        break;
      case 'price':
        control = <PriceInput id={fid} value={Number(v ?? 0)} onChange={(n) => set(f.name, n)} invalid={!!err} />;
        break;
      case 'date':
        control = <input id={fid} type="date" value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} className={cn(inputCls, err && 'border-red-500')} {...common} />;
        break;
      case 'select':
        control = (
          <select id={fid} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} className={inputCls}>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
        break;
      case 'category':
        control = categories.length ? (
          <select id={fid} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} className={cn(inputCls, err && 'border-red-500')} {...common}>
            <option value="">— Pilih kategori —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (nonaktif)'}</option>
            ))}
          </select>
        ) : (
          <p className="rounded-lg border border-brand-300 bg-brand-50 p-3 text-sm text-stone-900">
            Belum ada kategori. <Link href="/admin/kategori/baru" className="underline">Buat kategori dulu</Link>.
          </p>
        );
        break;
      case 'rating':
        control = <RatingInput value={Number(v ?? 5)} onChange={(n) => set(f.name, n)} />;
        break;
      case 'specs':
        return (
          <fieldset key={f.name} className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium text-stone-900">{f.label}</legend>
            {f.help && <p className="mb-2 text-xs text-stone-500">{f.help}</p>}
            <SpecsField value={(v as Spec[]) ?? []} onChange={(s) => set(f.name, s)} error={err} />
          </fieldset>
        );
      case 'images':
      case 'image': {
        const ids = f.type === 'image' ? (v ? [String(v)] : []) : ((v as string[]) ?? []);
        return (
          <fieldset key={f.name} className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium text-stone-900">{f.label}</legend>
            {f.help && <p className="mb-2 text-xs text-stone-500">{f.help}</p>}
            <ImagesField id={fid} value={ids} single={f.type === 'image'} max={f.maxImages} error={err} onChange={(next) => set(f.name, f.type === 'image' ? next[0] ?? '' : next)} />
          </fieldset>
        );
      }
      default:
        return null;
    }
    return (
      <FieldWrap key={f.name} id={fid} label={f.label} required={f.required} help={f.help} error={err} className={f.full ? 'sm:col-span-2' : undefined}>
        {control}
      </FieldWrap>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="pb-24">
      <Link href={listHref} className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-900">
        ← Kembali ke {def.label.toLowerCase()}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900">{id ? `Ubah ${def.singular.toLowerCase()}` : `Tambah ${def.singular.toLowerCase()}`}</h1>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">{fieldsMain.map(renderField)}</div>
      </Card>

      {fieldsSwitch.length > 0 && (
        <Card className="mt-4 divide-y divide-stone-100">
          {fieldsSwitch.map((f) => (
            <label key={f.name} htmlFor={`f-${f.name}`} className="flex cursor-pointer items-center justify-between gap-4 p-4 sm:px-6">
              <span className="text-sm font-medium text-stone-900">{f.label}</span>
              <Switch id={`f-${f.name}`} checked={Boolean(values[f.name])} onChange={(b) => set(f.name, b)} label={f.label} />
            </label>
          ))}
        </Card>
      )}

      {/* Bar simpan menempel di bawah agar mudah dijangkau di HP */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 p-3 backdrop-blur-sm lg:left-60">
        <div className="mx-auto flex max-w-6xl px-1 sm:px-5 items-center justify-between gap-3">
          <div>
            {id && (
              <ConfirmDelete
                onConfirm={async () => {
                  const res = await deleteResource(resource, id);
                  if (!res.ok) return toast('error', res.message ?? 'Gagal menghapus.');
                  setDirty(false);
                  toast('success', `${def.singular} dihapus.`);
                  router.push(listHref);
                  router.refresh();
                }}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Link href={listHref} className="inline-flex h-11 items-center rounded-lg px-4 text-sm text-stone-600 hover:text-stone-900">
              Batal
            </Link>
            <AdminButton type="submit" loading={saving} className="min-w-32">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </AdminButton>
          </div>
        </div>
      </div>
    </form>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib/format';

/*
 * Komponen dasar panel admin. Gaya: kertas hangat, garis tipis, sudut tajam,
 * hitam untuk aksi utama. Sengaja polos agar mudah dipakai pemilik usaha.
 */

export const inputCls =
  'block w-full rounded-[3px] border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none disabled:bg-stone-100';

export function FieldWrap({
  id,
  label,
  required,
  help,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-900">
        {label} {required && <span className="text-red-700">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : help ? (
        <p className="mt-1.5 text-[13px] text-stone-500">{help}</p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-stone-900 bg-stone-900' : 'border-stone-300 bg-stone-200',
      )}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-[1.1rem]' : 'translate-x-0.5')} />
    </button>
  );
}

/** Blok konten: putih dengan garis tipis, tanpa bayangan. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[3px] border border-stone-200 bg-white', className)}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-stone-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminButton({
  variant = 'primary',
  loading,
  children,
  className,
  ...props
}: React.ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean }) {
  const styles = {
    primary: 'bg-stone-900 text-white hover:bg-stone-700',
    secondary: 'border border-stone-300 bg-white text-stone-900 hover:border-stone-900',
    danger: 'bg-red-700 text-white hover:bg-red-600',
    ghost: 'text-stone-600 hover:text-stone-900',
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-[3px] px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        styles,
        className,
      )}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Tombol hapus dengan konfirmasi dua langkah (tanpa dialog browser). */
export function ConfirmDelete({
  onConfirm,
  label = 'Hapus',
  confirmText = 'Yakin hapus?',
  compact,
}: {
  onConfirm: () => Promise<void> | void;
  label?: string;
  confirmText?: string;
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={cn('text-sm text-red-700 underline-offset-4 hover:underline', compact ? 'px-1 py-1' : 'px-2 py-2')}
        aria-label={label}
        title={label}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="px-1 text-red-700">{confirmText}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
        className="inline-flex h-8 items-center gap-1 rounded-[3px] bg-red-700 px-2.5 text-white disabled:opacity-60"
      >
        {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />} Ya
      </button>
      <button type="button" onClick={() => setAsking(false)} className="h-8 px-2 text-stone-600 hover:text-stone-900">
        Batal
      </button>
    </span>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'amber' | 'green' | 'red' | 'blue' }) {
  const tones = {
    slate: 'text-stone-500',
    amber: 'text-brand-600',
    green: 'text-emerald-700',
    red: 'text-red-700',
    blue: 'text-sky-700',
  };
  return <span className={cn('label-mono inline-flex items-center gap-1', tones[tone])}>{children}</span>;
}

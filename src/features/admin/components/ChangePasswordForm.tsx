'use client';

import { useState, useTransition } from 'react';
import { KeyRound } from 'lucide-react';
import { changePassword } from '../actions';
import { AdminButton, Card, FieldWrap, inputCls } from './ui';
import { useToast } from './Toast';

export function ChangePasswordForm() {
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const field = (k: keyof typeof v, label: string, auto: string) => (
    <FieldWrap id={`pw-${k}`} label={label} error={errors[k]}>
      <input id={`pw-${k}`} type="password" autoComplete={auto} value={v[k]} onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))} className={inputCls} />
    </FieldWrap>
  );
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900">
        <KeyRound className="h-5 w-5 text-slate-400" aria-hidden /> Ganti password
      </h2>
      <p className="mb-4 text-sm text-slate-500">Minimal 8 karakter. Gunakan kombinasi yang tidak mudah ditebak.</p>
      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await changePassword(v);
            setErrors(res.errors ?? {});
            toast(res.ok ? 'success' : 'error', res.message ?? '');
            if (res.ok) setV({ current: '', next: '', confirm: '' });
          });
        }}
      >
        {field('current', 'Password lama', 'current-password')}
        {field('next', 'Password baru', 'new-password')}
        {field('confirm', 'Ulangi password baru', 'new-password')}
        <div className="sm:col-span-3">
          <AdminButton type="submit" variant="secondary" loading={pending}>Ganti password</AdminButton>
        </div>
      </form>
    </Card>
  );
}

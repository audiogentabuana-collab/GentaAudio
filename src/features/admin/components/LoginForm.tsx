'use client';

import { useActionState, useState } from 'react';
import { CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { login, type LoginState } from '../actions';
import { inputCls } from './ui';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && (
        <p role="alert" className="flex gap-2 border-l-2 border-red-700 bg-white p-3 text-sm text-red-700">
          <CircleAlert className="h-5 w-5 shrink-0" aria-hidden /> {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next ?? ''} />
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-stone-900">Username</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" defaultValue={state.username} required className={inputCls} aria-invalid={!!state.errors?.username} />
        {state.errors?.username && <p className="mt-1 text-sm text-red-600">{state.errors.username}</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-900">Password</label>
        <div className="relative">
          <input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required className={`${inputCls} pr-12`} aria-invalid={!!state.errors?.password} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-stone-500">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {state.errors?.password && <p className="mt-1 text-sm text-red-600">{state.errors.password}</p>}
      </div>
      <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 font-medium text-white hover:bg-brand-600 disabled:opacity-60">
        {pending && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />}
        {pending ? 'Memeriksa...' : 'Masuk'}
      </button>
    </form>
  );
}

'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshSiteCache } from '../actions';
import { useToast } from './Toast';

export function RefreshCacheButton() {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await refreshSiteCache();
          toast(res.ok ? 'success' : 'error', res.message ?? '');
        })
      }
      className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900 hover:border-stone-900 disabled:opacity-60"
    >
      <RefreshCw className={pending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden /> Muat ulang data website
    </button>
  );
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Pelacak ringan tanpa cookie:
 * - 1 event "view" per halaman yang dibuka
 * - 1 event "wa_click" setiap tautan wa.me diklik (dengan slug paket bila ada data-track-pkg)
 * "Pengunjung" dihitung dari penanda di localStorage per hari (bukan identitas).
 */
const DAY_KEY = 'gb_seen_day';

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/t', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/t', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch {
    /* analitik tidak boleh mengganggu pengunjung */
  }
}

function device() {
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

function isNewVisitorToday() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  try {
    if (localStorage.getItem(DAY_KEY) === today) return false;
    localStorage.setItem(DAY_KEY, today);
  } catch {
    /* mode privat: anggap pengunjung baru */
  }
  return true;
}

function externalReferrer() {
  try {
    if (!document.referrer) return '';
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
    return host === location.hostname.replace(/^www\./, '') ? '' : host;
  } catch {
    return '';
  }
}

let firstView = true;

export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    send({
      type: 'view',
      path: pathname,
      ref: firstView ? externalReferrer() : '',
      device: device(),
      nv: isNewVisitorToday(),
    });
    firstView = false;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="https://wa.me/"]');
      if (!a) return;
      send({ type: 'wa_click', path: location.pathname, pkg: a.getAttribute('data-track-pkg') ?? '' });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}

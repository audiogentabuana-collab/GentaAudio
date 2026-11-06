'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import type { SettingKey, Settings } from '@/features/content/types';
import { extractEmbedSrc, fieldErrors, settingsSchema } from '@/features/content/schemas';
import { saveSettings } from '../actions';
import { AdminButton, Card, FieldWrap, inputCls } from './ui';
import { ImagesField } from './ImagesField';
import { useToast } from './Toast';
import { cn, omit } from '@/shared/lib/format';

type F = { key: SettingKey; label: string; type?: 'text' | 'textarea' | 'image'; help?: string; placeholder?: string; full?: boolean; required?: boolean };

const GROUPS: { title: string; description?: string; fields: F[] }[] = [
  {
    title: 'Profil usaha',
    fields: [
      { key: 'business_name', label: 'Nama usaha', required: true },
      { key: 'tagline', label: 'Tagline / judul utama', help: 'Tampil besar di beranda. Separuh awal berwarna oranye; atur sendiri dengan tanda |, mis. "Sewa Sound System | untuk Setiap Acara".' },
      { key: 'description', label: 'Deskripsi singkat', type: 'textarea', full: true, help: 'Tampil di beranda dan hasil pencarian Google (±150 karakter ideal).' },
      { key: 'about', label: 'Tentang kami', type: 'textarea', full: true, help: 'Isi halaman Tentang. Tekan Enter dua kali untuk paragraf baru.' },
    ],
  },
  {
    title: 'Kontak',
    fields: [
      { key: 'whatsapp', label: 'Nomor WhatsApp', required: true, placeholder: '0812xxxxxxx', help: 'Semua tombol WhatsApp di website mengarah ke nomor ini.' },
      { key: 'phone', label: 'Nomor telepon (opsional)', placeholder: '0812xxxxxxx' },
      { key: 'email', label: 'Email', placeholder: 'nama@email.com' },
      { key: 'opening_hours', label: 'Jam operasional', placeholder: 'Setiap hari, 08.00 - 21.00 WIB' },
      { key: 'wa_default_message', label: 'Pesan WhatsApp otomatis', type: 'textarea', full: true, help: 'Teks awal saat pengunjung klik tombol WhatsApp umum.' },
    ],
  },
  {
    title: 'Lokasi',
    fields: [
      { key: 'address', label: 'Alamat', type: 'textarea', full: true },
      { key: 'service_area', label: 'Area layanan', full: true, placeholder: 'Mis. Kota Bandung & sekitarnya' },
      { key: 'maps_url', label: 'Link Google Maps', full: true, placeholder: 'https://maps.app.goo.gl/...', help: 'Google Maps > Bagikan > Salin link.' },
      { key: 'maps_embed_url', label: 'Kode sematan peta', type: 'textarea', full: true, help: 'Google Maps > Bagikan > Sematkan peta > Salin HTML, lalu tempel di sini (boleh seluruh kode <iframe>).' },
    ],
  },
  {
    title: 'Media sosial',
    fields: [
      { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/akun' },
      { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/halaman' },
      { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@akun' },
      { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@kanal' },
    ],
  },
  {
    title: 'Tampilan',
    fields: [
      { key: 'logo_id', label: 'Logo', type: 'image', help: 'Sebaiknya PNG persegi dengan latar transparan.' },
      { key: 'hero_image_id', label: 'Foto utama beranda', type: 'image', help: 'Foto acara/peralatan terbaik Anda (posisi tegak/persegi lebih bagus).' },
      { key: 'price_note', label: 'Catatan di bawah pricelist', type: 'textarea', full: true },
    ],
  },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const [values, setValues] = useState<Settings>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const set = (k: SettingKey, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((prev) => omit(prev, k));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const prepared = { ...values, maps_embed_url: extractEmbedSrc(values.maps_embed_url) };
    const parsed = settingsSchema.safeParse(prepared);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast('error', 'Periksa kembali isian yang ditandai merah.');
      return;
    }
    start(async () => {
      const res = await saveSettings(prepared);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        toast('error', res.message ?? 'Gagal menyimpan.');
        return;
      }
      setValues(prepared);
      toast('success', 'Pengaturan disimpan. Website sudah diperbarui.');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 pb-24">
      {GROUPS.map((g) => (
        <Card key={g.title} className="p-5 sm:p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900">{g.title}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {g.fields.map((f) => {
              const id = `s-${f.key}`;
              if (f.type === 'image') {
                return (
                  <fieldset key={f.key}>
                    <legend className="mb-1.5 text-sm font-semibold text-slate-800">{f.label}</legend>
                    {f.help && <p className="mb-2 text-xs text-slate-500">{f.help}</p>}
                    <ImagesField id={id} single keepPng={f.key === 'logo_id'} value={values[f.key] ? [values[f.key]] : []} onChange={(ids) => set(f.key, ids[0] ?? '')} error={errors[f.key]} />
                  </fieldset>
                );
              }
              const common = {
                id,
                value: values[f.key],
                placeholder: f.placeholder,
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(f.key, e.target.value),
                className: cn(inputCls, errors[f.key] && 'border-red-500'),
                'aria-invalid': !!errors[f.key] || undefined,
              };
              return (
                <FieldWrap key={f.key} id={id} label={f.label} required={f.required} help={f.help} error={errors[f.key]} className={f.full ? 'sm:col-span-2' : undefined}>
                  {f.type === 'textarea' ? <textarea rows={f.key === 'about' ? 6 : 3} {...common} /> : <input {...common} />}
                </FieldWrap>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end">
          <AdminButton type="submit" loading={saving} className="min-w-40">
            {!saving && <Save className="h-4 w-4" aria-hidden />} {saving ? 'Menyimpan...' : 'Simpan pengaturan'}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}

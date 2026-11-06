/**
 * Kompres & resize gambar di browser sebelum upload (maks lebar 1600px, target ≤1MB).
 * Mengurangi waktu upload dari HP dan menghindari batas payload Apps Script / Vercel.
 */
export const MAX_WIDTH = 1600;
export const TARGET_BYTES = 1024 * 1024;

export interface CompressedImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
  fileName: string;
  bytes: number;
  previewUrl: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses gambar'))), type, quality),
  );
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fallback ke <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File, opts: { keepPng?: boolean } = {}): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.');
  if (file.size > 30 * 1024 * 1024) throw new Error('Gambar terlalu besar (maks 30MB sebelum kompres).');

  const src = await loadBitmap(file);
  const w0 = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h0 = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, MAX_WIDTH / w0);
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'gambar';
  let blob: Blob;
  let mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg';

  // PNG (mis. logo transparan) dipertahankan bila hasilnya masih kecil.
  if (opts.keepPng && file.type === 'image/png') {
    ctx.drawImage(src, 0, 0, w, h);
    blob = await canvasToBlob(canvas, 'image/png');
    if (blob.size <= TARGET_BYTES) {
      mimeType = 'image/png';
      return { base64: await blobToBase64(blob), mimeType, fileName: baseName + '.png', bytes: blob.size, previewUrl: URL.createObjectURL(blob) };
    }
  }

  // JPEG: latar putih untuk area transparan, turunkan kualitas sampai ≤ target.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  if ('close' in src) src.close();

  let quality = 0.85;
  blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  while (blob.size > TARGET_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }
  if (blob.size > TARGET_BYTES * 1.4) throw new Error('Gambar tidak bisa dikompres di bawah 1,4MB. Coba gambar lain.');

  return {
    base64: await blobToBase64(blob),
    mimeType,
    fileName: baseName + '.jpg',
    bytes: blob.size,
    previewUrl: URL.createObjectURL(blob),
  };
}

export async function uploadImage(file: File, opts: { keepPng?: boolean } = {}) {
  const img = await compressImage(file, opts);
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: img.fileName, mimeType: img.mimeType, base64: img.base64 }),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; fileId?: string; message?: string };
  if (!res.ok || !json.ok || !json.fileId) {
    URL.revokeObjectURL(img.previewUrl);
    throw new Error(json.message || `Upload gagal (HTTP ${res.status}).`);
  }
  return { fileId: json.fileId, previewUrl: img.previewUrl };
}

export async function discardUploadedImage(fileId: string) {
  await fetch(`/api/admin/upload?fileId=${encodeURIComponent(fileId)}`, { method: 'DELETE' }).catch(() => undefined);
}

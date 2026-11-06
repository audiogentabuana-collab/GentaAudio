/**
 * URL gambar dari Google Drive file id.
 * Di mode mock, file id diawali "mock" dan dilayani oleh /api/dev/mock-image.
 */
export function driveImageUrl(fileId: string, width = 1600): string {
  if (!fileId) return '';
  if (fileId.startsWith('mock')) return `/api/dev/mock-image/${encodeURIComponent(fileId)}`;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

export function isMockImage(fileId: string) {
  return fileId.startsWith('mock');
}

import { AudioLines, Music, Music2, Speaker } from 'lucide-react';
import { DriveImage } from '@/shared/components/DriveImage';

/**
 * Komposisi visual hero: bidang gelap miring + blob oranye + foto terpotong miring,
 * dengan aksen bulat hijau & not musik. Foto diambil dari Pengaturan > Foto utama beranda.
 */
export function HeroVisual({ imageId, alt }: { imageId?: string; alt: string }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px] select-none" aria-hidden={!imageId}>
      <div className="absolute left-[2%] top-[8%] h-[58%] w-[96%] -rotate-[14deg] rounded-[2.75rem] bg-ink-800" />
      <svg viewBox="0 0 200 200" className="absolute inset-[6%] text-brand-400" aria-hidden>
        <path
          fill="currentColor"
          d="M38 34c26-20 70-6 102-18 30-11 54 10 46 40-6 22-24 30-16 52 9 25 26 44 6 64-21 21-52 2-78 10-28 9-58 12-72-14-12-22 8-40 2-62-6-24-14-52 10-72Z"
        />
      </svg>
      <div
        className="absolute bottom-[6%] left-[22%] right-[10%] top-[20%] overflow-hidden bg-ink-850"
        style={{ clipPath: 'polygon(8% 4%, 100% 0, 94% 62%, 100% 100%, 22% 96%, 0 70%)' }}
      >
        {imageId ? (
          <DriveImage fileId={imageId} alt={alt} sizes="(min-width: 1024px) 420px, 80vw" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950">
            <Speaker className="h-1/2 w-1/2 text-ink-300" strokeWidth={0.9} aria-hidden />
          </div>
        )}
      </div>
      <span className="absolute bottom-[16%] left-[6%] flex h-[19%] w-[19%] items-center justify-center rounded-full bg-lime-accent text-ink-950 shadow-lg">
        <AudioLines className="h-1/2 w-1/2" strokeWidth={2.25} aria-hidden />
      </span>
      <Music2 className="absolute left-[9%] top-[40%] h-[8%] w-[8%] text-ink-300" aria-hidden />
      <Music className="absolute bottom-[2%] right-[2%] h-[8%] w-[8%] text-ink-300" aria-hidden />
    </div>
  );
}

/** Bagi tagline: bagian pertama oranye. Pemilik bisa mengatur dengan pemisah "|". */
export function splitTagline(tagline: string): [string, string] {
  const t = tagline.trim();
  if (t.includes('|')) {
    const [a, ...rest] = t.split('|');
    return [a.trim(), rest.join(' ').trim()];
  }
  const words = t.split(/\s+/);
  const n = Math.ceil(words.length / 2);
  return [words.slice(0, n).join(' '), words.slice(n).join(' ')];
}

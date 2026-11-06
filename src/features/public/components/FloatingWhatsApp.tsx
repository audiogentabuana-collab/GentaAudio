import { WhatsAppIcon } from '@/shared/components/BrandIcons';

export function FloatingWhatsApp({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      className="floating-wa fixed bottom-5 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-[#25D366] pl-4 pr-5 font-bold text-[#062e16] shadow-[0_10px_30px_-5px_rgba(37,211,102,0.55)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]" aria-hidden />
      <WhatsAppIcon size={26} />
      <span className="text-sm">Chat Kami</span>
    </a>
  );
}

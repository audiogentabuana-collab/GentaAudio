import { WhatsAppIcon } from '@/shared/components/BrandIcons';

export function FloatingWhatsApp({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      title="Chat via WhatsApp"
      className="floating-wa fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-[#06331a] shadow-lg shadow-black/50 transition-transform hover:scale-105 active:scale-95"
    >
      <WhatsAppIcon size={28} />
    </a>
  );
}

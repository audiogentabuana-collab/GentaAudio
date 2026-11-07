import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/format';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[3px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-400 text-ink-950 hover:bg-brand-300 active:bg-brand-500',
  secondary: 'bg-ink-850 text-ink-100 hover:bg-ink-800 border border-ink-700',
  outline: 'border border-ink-600 text-ink-100 bg-transparent hover:border-ink-300',
  ghost: 'bg-transparent hover:bg-black/5',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  whatsapp: 'bg-[#25D366] text-[#062e16] hover:bg-[#3ee07a]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-12 px-5 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  external,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  external?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<'a'>, 'href'>) {
  const cls = buttonClass(variant, size, className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

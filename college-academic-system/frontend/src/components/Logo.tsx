import { cn } from '@/lib/utils';

/**
 * CAMS mark — a graduation cap over an open book, drawn inline so it scales
 * cleanly and needs no asset request.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('h-9 w-9', className)}
      role="img"
      aria-label="College Academic Management System"
    >
      <rect width="40" height="40" rx="11" fill="url(#cams-gradient)" />
      <path d="M20 11 8.5 16.2 20 21.4l11.5-5.2L20 11Z" fill="#fff" />
      <path
        d="M13 19.4v5.1c0 .5.25.95.66 1.2 1.9 1.15 4.1 1.8 6.34 1.8s4.44-.65 6.34-1.8c.41-.25.66-.7.66-1.2v-5.1L20 23l-7-3.6Z"
        fill="#fff"
        fillOpacity="0.82"
      />
      <path
        d="M30.4 17.2v6.4"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        fillOpacity="0.9"
      />
      <circle cx="30.4" cy="24.6" r="1.5" fill="#fff" />
      <defs>
        <linearGradient id="cams-gradient" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoLockup({
  collegeName,
  className,
}: {
  collegeName?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-white">CAMS</p>
        <p className="truncate text-[11px] leading-tight text-sidebar-muted">
          {collegeName ?? 'College Academic Management System'}
        </p>
      </div>
    </div>
  );
}

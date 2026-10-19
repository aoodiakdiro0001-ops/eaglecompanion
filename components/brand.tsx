import Link from "next/link";

interface BrandProps {
  compact?: boolean;
  href?: string;
}

export function Brand({ compact = false, href = "/" }: BrandProps) {
  const content = (
    <span className="flex items-center gap-3">
      <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 ring-1 ring-brand/30">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-brand"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l7 3v5c0 4.6-2.9 8.3-7 10-4.1-1.7-7-5.4-7-10V6l7-3z" />
          <path d="M8.5 12c1-1.4 2.2-2.1 3.5-2.1S14.5 10.6 15.5 12c-1 1.4-2.2 2.1-3.5 2.1S9.5 13.4 8.5 12z" />
          <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-ink">Eagle Companion</span>
          <span className="text-xs text-muted">رفيق النسر</span>
        </span>
      ) : null}
    </span>
  );

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Eagle Companion">
      {content}
    </Link>
  );
}

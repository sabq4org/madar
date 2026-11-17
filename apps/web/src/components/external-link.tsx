import type { ReactNode } from 'react';
import { externalHref } from '@/lib/api';

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const safeHref = externalHref(href);
  if (!safeHref) return <span className="meta">الرابط غير متاح</span>;
  return (
    <a className="link" href={safeHref} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

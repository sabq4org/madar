import type { Metadata } from 'next';
import localFont from 'next/font/local';
import DesignExperience from './design-experience';

// خط «عام الحرف اليدوية» للشعار والعناوين فقط؛ بقية النصوص بخط IBM Plex Sans Arabic.
// المصدر والترخيص في fonts/FONT-SOURCE.md.
const handicrafts = localFont({
  src: [
    { path: './fonts/year-of-handicrafts-bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/year-of-handicrafts-black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-handicrafts',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'مدار | نموذج التصميم',
  description: 'نموذج تصميم تفاعلي تجريبي لمدار بمحتوى افتراضي.',
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return (
    <div className={handicrafts.variable}>
      <DesignExperience />
    </div>
  );
}

import type { Metadata } from 'next';
import DesignExperience from './design-experience';

export const metadata: Metadata = {
  title: 'مدار | نموذج التصميم الأول (أرشيف)',
  description: 'النسخة الأولى من نموذج تصميم مدار التجريبي بمحتوى افتراضي، محفوظة للمقارنة.',
  robots: { index: false, follow: false },
};

export default function DesignV1Page() {
  return <DesignExperience />;
}

import type { Metadata } from 'next';
import DesignExperience from './design-experience';

export const metadata: Metadata = {
  title: 'مدار | نموذج التصميم',
  description: 'نموذج تصميم تفاعلي تجريبي لمدار بمحتوى افتراضي.',
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignExperience />;
}

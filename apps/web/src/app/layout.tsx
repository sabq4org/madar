import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const arabic = localFont({
  src: '../../public/ibm-plex-sans-arabic.ttf',
  variable: '--font-arabic',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'مدار | متابعة المواد المنشورة',
  description: 'قراءة المواد من مصادرها الأصلية.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={arabic.variable}>{children}</body>
    </html>
  );
}

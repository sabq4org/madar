import type { NextConfig } from 'next';

// أصول تطوير إضافية اختيارية (مفصولة بفواصل) عند تشغيل Next خلف وكيل معاينة.
// فارغة افتراضيًا، ولا تؤثر في الإنتاج: Next يتجاهلها خارج وضع التطوير.
const devOrigins = (process.env.MADAR_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: `${process.cwd()}/../..`,
  allowedDevOrigins: devOrigins,
};
export default nextConfig;

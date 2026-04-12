import type { Metadata } from 'next';

const BASE = 'https://omidzanganeh.com';

export const metadata: Metadata = {
  title: 'PDF Merge, Compress, Split, Image Resize, ICO BMP AVIF | Free Online | Omid Zanganeh',
  description:
    'Merge, compress, and split PDFs; convert images (PNG, JPEG, WebP, AVIF, BMP, ICO); resize photos; combine images into one PDF; export PDF pages as JPEG — free in your browser.',
  keywords: [
    'merge PDF online',
    'compress PDF',
    'split PDF',
    'resize image',
    'ICO converter',
    'BMP converter',
    'AVIF converter',
    'image converter PNG JPEG WebP',
    'JPG to PDF',
    'PDF to JPEG',
    'browser PDF tools',
  ],
  alternates: { canonical: '/tools/pdf-image-tools' },
  openGraph: {
    title: 'PDF & Image Tools — Merge, Convert, JPG ↔ PDF | Omid Zanganeh',
    description: 'Merge, compress, and split PDFs; convert and resize images; build PDFs from images; export PDF pages as JPEG.',
    url: `${BASE}/tools/pdf-image-tools`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF & Image Tools | Omid Zanganeh',
    description: 'Merge PDFs, convert images, JPG to PDF, PDF to JPEG — free in the browser.',
  },
};

export default function PdfImageToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

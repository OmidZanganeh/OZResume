import type { Metadata } from 'next';

const BASE = 'https://omidzanganeh.com';

export const metadata: Metadata = {
  title: 'PDF Merge, Image Converter, JPG to PDF, PDF to JPEG | Free Online | Omid Zanganeh',
  description:
    'Merge PDFs, convert images between PNG, JPEG, and WebP, combine images into one PDF, and export PDF pages as JPEG — free, in your browser, no upload.',
  keywords: [
    'merge PDF online',
    'PDF merge free',
    'image converter PNG JPEG WebP',
    'JPG to PDF',
    'images to PDF',
    'PDF to JPEG',
    'PDF to JPG',
    'browser PDF tools',
  ],
  alternates: { canonical: '/tools/pdf-image-tools' },
  openGraph: {
    title: 'PDF & Image Tools — Merge, Convert, JPG ↔ PDF | Omid Zanganeh',
    description: 'Merge PDFs, convert image formats, build PDFs from images, export PDF pages as JPEG. Runs in your browser.',
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

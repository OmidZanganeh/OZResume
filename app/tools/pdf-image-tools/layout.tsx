import type { Metadata } from 'next';

const BASE = 'https://omidzanganeh.com';
const PATH = '/tools/pdf-image-tools';
const URL = `${BASE}${PATH}`;

const title =
  'Free PDF Merge, Compress & Split + Image Converter (JPG, PNG, ICO, BMP, AVIF) | Omid Zanganeh';

const description =
  'Free online PDF merge, PDF split, and PDF compress (repack or rasterize). Convert images to PNG, JPEG, WebP, AVIF, BMP, or ICO; resize photos; JPG to PDF; PDF to JPEG — all in your browser, no account, files stay on your device.';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'merge PDF online free',
    'combine PDF files',
    'split PDF into pages',
    'PDF splitter online',
    'compress PDF online free',
    'reduce PDF file size',
    'PDF to JPG',
    'PDF to JPEG',
    'JPG to PDF',
    'images to PDF',
    'PNG to ICO',
    'image to ICO',
    'BMP converter online',
    'AVIF converter',
    'WebP to PNG',
    'resize image online',
    'free image resizer',
    'browser PDF tools',
    'client side PDF merge',
    'no upload PDF merge',
    'PDF compressor without upload',
    'extract PDF pages as files',
    'convert PDF pages to images',
    'free PDF tools',
    'online image format converter',
  ],
  alternates: { canonical: PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Free PDF merge, compress, split & image tools — no upload',
    description,
    url: URL,
    type: 'website',
    siteName: 'Omid Zanganeh',
    locale: 'en_US',
    images: [
      {
        url: `${PATH}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'PDF merge, compress, split and image converter — free browser tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free PDF merge, compress, split + image converter',
    description:
      'Merge & split PDFs, compress PDFs, convert & resize images (PNG, JPEG, WebP, AVIF, BMP, ICO). Runs in your browser.',
    images: [`${PATH}/opengraph-image`],
  },
};

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PDF & Image Tools — merge, compress, split, convert',
  url: URL,
  description,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  browserRequirements: 'Requires JavaScript. PDF rendering uses a CDN worker for PDF-to-image.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: {
    '@type': 'Person',
    name: 'Omid Zanganeh',
    url: BASE,
  },
  featureList: [
    'Merge multiple PDFs into one with reorderable file list',
    'Compress PDF via repack (object streams) or rasterize pages as JPEG',
    'Split PDF into one file per page (ZIP download)',
    'Convert images between PNG, JPEG, WebP, AVIF (when supported), 24-bit BMP, and multi-size ICO',
    'Resize images by max width, max height, exact width or height, or percentage',
    'Build one PDF from multiple images (JPG, PNG, WebP, etc.)',
    'Export PDF pages as JPEG images (ZIP for multi-page)',
    'No login; processing runs locally in the browser',
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: `${BASE}/tools` },
    { '@type': 'ListItem', position: 3, name: 'PDF & Image Tools', item: URL },
  ],
};

export default function PdfImageToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free CSV to GeoJSON Converter & EXIF Metadata Reader | Omid Zanganeh',
  description:
    'Convert CSV files with latitude/longitude columns to GeoJSON in one click. Also extracts EXIF metadata from photos — GPS coordinates, camera model, date taken, and more. Free, private, runs entirely in your browser.',
  keywords: [
    'CSV to GeoJSON converter',
    'convert CSV to GeoJSON online',
    'CSV GeoJSON free tool',
    'EXIF metadata reader online',
    'photo GPS data extractor',
    'image metadata viewer',
    'latitude longitude CSV to GeoJSON',
    'GIS data converter',
    'GeoJSON maker',
    'spatial data converter',
  ],
  alternates: { canonical: '/tools/image-tools' },
  openGraph: {
    title: 'CSV to GeoJSON Converter & EXIF Reader | Omid Zanganeh',
    description:
      'Convert a CSV with lat/lon columns to GeoJSON instantly. Also reads EXIF GPS data from photos. Free, private — nothing leaves your browser.',
    url: 'https://omidzanganeh.com/tools/image-tools',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CSV to GeoJSON Converter & EXIF Reader – Free Online Tool',
    description: 'Convert CSV to GeoJSON, read EXIF photo metadata — no upload, fully private.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'CSV to GeoJSON Converter & EXIF Metadata Reader',
  url: 'https://omidzanganeh.com/tools/image-tools',
  description:
    'Converts CSV files with latitude/longitude columns to GeoJSON format. Also extracts EXIF metadata from photos including GPS coordinates and camera information.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omid Zanganeh', url: 'https://omidzanganeh.com' },
  featureList: [
    'CSV to GeoJSON conversion',
    'Auto-detect lat/lon column names',
    'EXIF metadata extraction from photos',
    'GPS coordinate reader from images',
    'Privacy-first — no file upload',
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}

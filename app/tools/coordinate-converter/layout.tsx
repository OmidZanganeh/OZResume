import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Online Coordinate Converter – DD, DMS, DDM | Omid Zanganeh',
  description:
    'Instantly convert geographic coordinates between Decimal Degrees (DD), Degrees Minutes Seconds (DMS), and Degrees Decimal Minutes (DDM). Click the map to pick a point. Free, no login, runs entirely in your browser.',
  keywords: [
    'coordinate converter online',
    'decimal degrees to DMS',
    'DD to DMS converter',
    'latitude longitude converter',
    'DMS to decimal degrees',
    'DDM converter',
    'GIS coordinate format converter',
    'convert coordinates free',
  ],
  alternates: { canonical: '/tools/coordinate-converter' },
  openGraph: {
    title: 'Free Coordinate Converter – DD ↔ DMS ↔ DDM | Omid Zanganeh',
    description:
      'Convert latitude/longitude between Decimal Degrees, DMS, and DDM. Click any point on the map. Free and instant.',
    url: 'https://omidzanganeh.com/tools/coordinate-converter',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Coordinate Converter – DD ↔ DMS ↔ DDM',
    description: 'Instantly convert coordinates between DD, DMS, and DDM. Click the map to pick a location.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Online Coordinate Converter – DD, DMS, DDM',
  url: 'https://omidzanganeh.com/tools/coordinate-converter',
  description:
    'Convert geographic coordinates between Decimal Degrees (DD), Degrees Minutes Seconds (DMS), and Degrees Decimal Minutes (DDM). Interactive map picker included.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omid Zanganeh', url: 'https://omidzanganeh.com' },
  featureList: [
    'Convert DD to DMS',
    'Convert DMS to Decimal Degrees',
    'Convert DDM format',
    'Interactive map point picker',
    'Copy to clipboard',
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

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Geocoder & Reverse Geocoder – Address ↔ Coordinates | Omid Zanganeh',
  description:
    'Batch geocode a CSV list of addresses to coordinates, or reverse geocode coordinates to addresses. Powered by OpenStreetMap Nominatim. Free, no login, up to 200 rows.',
  keywords: [
    'geocoder online free',
    'reverse geocoder',
    'batch geocoding CSV',
    'address to coordinates',
    'coordinates to address',
    'lat lon to address',
    'Nominatim geocoder',
    'OpenStreetMap geocoding',
    'GIS geocoding tool',
    'free geocoding tool',
  ],
  alternates: { canonical: '/tools/geocoder' },
  openGraph: {
    title: 'Free Geocoder & Reverse Geocoder – Address ↔ Coordinates | Omid Zanganeh',
    description:
      'Batch geocode addresses to lat/lon or reverse geocode coordinates to addresses. Paste a CSV, see results on a map, and download. Powered by OpenStreetMap.',
    url: 'https://omidzanganeh.com/tools/geocoder',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Batch Geocoder & Reverse Geocoder',
    description: 'Convert addresses to coordinates or vice versa. Upload CSV, map results, download. Free, no login.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Geocoder & Reverse Geocoder – Address ↔ Coordinates',
  url: 'https://omidzanganeh.com/tools/geocoder',
  description:
    'Batch geocode addresses to coordinates or reverse geocode coordinates to addresses. Powered by OpenStreetMap Nominatim. Free, no login required.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function GeocoderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}

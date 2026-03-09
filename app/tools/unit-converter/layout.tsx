import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Spatial Unit Converter – Meters, Feet, Acres, Hectares & More | Omid Zanganeh',
  description:
    'Convert between distance, area, and angle units used in GIS and surveying: meters, kilometers, feet, miles, acres, hectares, square meters, radians, and more. Free, instant, no login.',
  keywords: [
    'spatial unit converter',
    'GIS unit converter',
    'convert hectares to acres',
    'meters to feet converter',
    'square kilometers to acres',
    'surveying unit converter',
    'area unit conversion',
    'distance unit converter online',
    'GIS distance converter',
    'geographic unit calculator',
  ],
  alternates: { canonical: '/tools/unit-converter' },
  openGraph: {
    title: 'Free Spatial Unit Converter – GIS & Surveying Units | Omid Zanganeh',
    description:
      'Convert distance, area, and angle units for GIS and surveying. Meters, feet, acres, hectares, and more — instant, free.',
    url: 'https://omidzanganeh.com/tools/unit-converter',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Spatial Unit Converter – Meters, Feet, Acres, Hectares',
    description: 'Instant GIS unit conversions: distance, area, and angles. Free, no login.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Spatial Unit Converter for GIS and Surveying',
  url: 'https://omidzanganeh.com/tools/unit-converter',
  description:
    'Convert between distance (m, km, ft, mi), area (m², km², acres, hectares), and angle (deg, rad, grad) units used in GIS and surveying.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omid Zanganeh', url: 'https://omidzanganeh.com' },
  featureList: [
    'Distance unit conversion (m, km, ft, mi, nm)',
    'Area unit conversion (m², km², acres, hectares)',
    'Angle unit conversion (degrees, radians, gradians)',
    'Instant real-time results',
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

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Elevation Profile Tool – USGS 3DEP Terrain Data | Omid Zanganeh',
  description:
    'Draw a path on the map and generate a real elevation profile using USGS 3DEP data (1-meter resolution, National Elevation Dataset). Choose point intervals, download as CSV or SVG chart. Free, no login.',
  keywords: [
    'elevation profile tool online',
    'terrain cross section tool',
    'USGS 3DEP elevation profile',
    'elevation chart from path',
    'draw elevation profile map',
    'terrain elevation tool free',
    'National Elevation Dataset tool',
    'GIS elevation profile',
    'topographic profile tool',
    'elevation gain calculator',
  ],
  alternates: { canonical: '/tools/elevation-profile' },
  openGraph: {
    title: 'Free Elevation Profile Tool – USGS 3DEP | Omid Zanganeh',
    description:
      'Draw any path on the map and get a real elevation profile from USGS 3DEP (1-meter resolution). Download as CSV or SVG. Free, no login.',
    url: 'https://omidzanganeh.com/tools/elevation-profile',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Elevation Profile Tool – USGS 3DEP Terrain Data',
    description: 'Draw a path, get a real elevation profile from USGS 3DEP. Download CSV or SVG. Free.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Elevation Profile Tool – USGS 3DEP National Elevation Dataset',
  url: 'https://omidzanganeh.com/tools/elevation-profile',
  description:
    'Draw a path on an interactive map and generate an elevation profile using USGS 3DEP 1-meter resolution elevation data. Supports configurable point intervals (5–100 ft), downloads as CSV and SVG chart.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omid Zanganeh', url: 'https://omidzanganeh.com' },
  featureList: [
    'Draw custom path on interactive map',
    'USGS 3DEP 1-meter resolution elevation data',
    'Configurable point intervals (5, 10, 25, 50, 100 ft)',
    'Live progress streaming',
    'Elevation gain and loss statistics',
    'Download elevation profile as CSV',
    'Download elevation chart as SVG',
    'Feet and meters unit toggle',
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

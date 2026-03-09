import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Isochrone Map Generator – Drive Time & Travel Zones | Omid Zanganeh',
  description:
    'Generate isochrone maps showing how far you can travel by car, foot, or bike in a given time. Set any origin on the map and visualize reachability zones in 10–60 minutes. Powered by OpenStreetMap. Free, no login.',
  keywords: [
    'isochrone map generator',
    'drive time map online',
    'travel time zone map',
    'reachability map tool',
    'walking distance map',
    'isochrone tool free',
    'OpenStreetMap isochrone',
    'service area map',
    'catchment area map',
    'isochrone GIS tool',
  ],
  alternates: { canonical: '/tools/isochrone' },
  openGraph: {
    title: 'Free Isochrone Map Generator – Drive, Walk, Bike Zones | Omid Zanganeh',
    description:
      'Visualize travel-time reachability zones for any location. Car, foot, or bike — choose your contour times and download as GeoJSON. Powered by OpenStreetMap.',
    url: 'https://omidzanganeh.com/tools/isochrone',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Isochrone Map Generator – Travel Time Zones',
    description: 'Generate drive-time / walk-time zones for any location. Free, powered by OpenStreetMap.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Isochrone Map Generator – Drive Time & Reachability Zones',
  url: 'https://omidzanganeh.com/tools/isochrone',
  description:
    'Generate isochrone maps that show areas reachable within a given travel time by car, foot, or bicycle. Uses Valhalla routing on OpenStreetMap data.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omid Zanganeh', url: 'https://omidzanganeh.com' },
  featureList: [
    'Drive time isochrone maps',
    'Walk time isochrone maps',
    'Cycling isochrone maps',
    'Configurable time rings (10–60 min)',
    'Download GeoJSON output',
    'Powered by OpenStreetMap & Valhalla',
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

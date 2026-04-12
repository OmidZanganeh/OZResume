import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free GIS Data Downloader – Download OSM, Census & FEMA Data | Omid Zanganeh',
  description:
    'Download free GIS data for any location on Earth. Pick an area on the map and export OpenStreetMap layers (buildings, roads, parks, land use), US Census TIGER data, FEMA flood zones, GBIF species observations, USGS earthquakes, and more — as GeoJSON, Shapefile, CSV, or KML. No account required.',
  keywords: [
    'free GIS data download',
    'download GIS data online',
    'OpenStreetMap data download',
    'download shapefile free',
    'OSM to shapefile',
    'OSM to GeoJSON',
    'download buildings shapefile',
    'download roads GIS data',
    'FEMA flood zone download',
    'census TIGER data download',
    'download census shapefile',
    'free geospatial data',
    'GIS data explorer',
    'download GeoJSON online',
    'USGS earthquake data download',
    'GBIF species data download',
    'download land use GIS',
    'free shapefile downloader',
    'OSM data export tool',
    'GIS data by area',
  ],
  alternates: { canonical: '/tools/gis-downloader' },
  openGraph: {
    title: 'Free GIS Data Downloader – OSM, Census, FEMA & More',
    description:
      'Pick any area on the map and download free GIS data: buildings, roads, flood zones, census tracts, species observations, and more. Export as Shapefile, GeoJSON, CSV, or KML.',
    url: 'https://omidzanganeh.com/tools/gis-downloader',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free GIS Data Downloader – OSM, Census, FEMA & More',
    description:
      'Pick any area on the map and instantly download free GIS data as Shapefile, GeoJSON, CSV, or KML. No login required.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Free GIS Data Downloader',
  url: 'https://omidzanganeh.com/tools/gis-downloader',
  description:
    'Select any area on an interactive map and download free GIS data from OpenStreetMap, US Census TIGER, FEMA, USGS, GBIF, and Wikipedia. Supports Shapefile, GeoJSON, CSV, and KML export formats. No account or API key needed.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (browser-based)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omid Zanganeh', url: 'https://omidzanganeh.com' },
  featureList: [
    'Interactive map with viewport and draw-rectangle area selection',
    'Scan area for available data layers before downloading',
    'OpenStreetMap layers: buildings, roads, railways, parks, land use, POIs, and more',
    'US Census TIGER: counties, census tracts, ZIP code areas, school districts, congressional districts',
    'FEMA National Flood Hazard Layer (100-yr flood zones)',
    'USGS earthquake catalog (past year, M2.0+)',
    'GBIF species occurrence records',
    'USGS stream gauges',
    'Wikipedia geotagged places',
    'Export as Shapefile (.zip), GeoJSON, CSV, or KML',
    'Bundle all selected layers into a single ZIP file',
    'No login or API key required',
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

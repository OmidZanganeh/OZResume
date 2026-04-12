import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Free Online GIS Tools – Coordinate Converter, Elevation Profile, Isochrone Map & More | Omid Zanganeh',
  description:
    'Free browser-based GIS tools built by a GIS Developer: convert coordinates (DD, DMS, DDM), generate isochrone travel-time maps, plot elevation profiles with USGS 3DEP data, convert CSV to GeoJSON, and more. No login, no upload.',
  keywords: [
    'free GIS tools online',
    'coordinate converter DD DMS DDM',
    'isochrone map generator',
    'elevation profile tool',
    'CSV to GeoJSON converter',
    'spatial unit converter',
    'EXIF metadata reader',
    'USGS 3DEP elevation',
    'GIS developer tools',
    'geospatial tools browser',
  ],
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Free Online GIS Tools | Omid Zanganeh',
    description:
      'Coordinate converter, isochrone mapper, elevation profile (USGS 3DEP), CSV→GeoJSON, spatial unit converter — all free, all in-browser, no login.',
    url: 'https://omidzanganeh.com/tools',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Online GIS Tools | Omid Zanganeh',
    description: 'Coordinate converter, isochrone mapper, elevation profile — free, no login, runs in your browser.',
  },
};

const BASE = 'https://omidzanganeh.com';

const toolsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Free Online GIS Tools by Omid Zanganeh',
  description: 'A collection of free, browser-based GIS and geospatial tools.',
  url: `${BASE}/tools`,
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Coordinate Converter',   url: `${BASE}/tools/coordinate-converter` },
    { '@type': 'ListItem', position: 2, name: 'Spatial Unit Converter', url: `${BASE}/tools/unit-converter` },
    { '@type': 'ListItem', position: 3, name: 'File Tools (CSV to GeoJSON + EXIF Reader)', url: `${BASE}/tools/image-tools` },
    { '@type': 'ListItem', position: 4, name: 'Isochrone Mapper',       url: `${BASE}/tools/isochrone` },
    { '@type': 'ListItem', position: 5, name: 'Elevation Profile Tool', url: `${BASE}/tools/elevation-profile` },
    { '@type': 'ListItem', position: 6, name: 'Geocoder & Reverse Geocoder', url: `${BASE}/tools/geocoder` },
    { '@type': 'ListItem', position: 7, name: 'US Census Demographics Lookup', url: `${BASE}/tools/census` },
    { '@type': 'ListItem', position: 8, name: 'GIS Data Downloader',           url: `${BASE}/tools/gis-downloader` },
    { '@type': 'ListItem', position: 9, name: 'PDF and Image Tools',           url: `${BASE}/tools/pdf-image-tools` },
  ],
};

const TOOLS = [
  {
    href: '/tools/gis-downloader',
    emoji: '📥',
    title: 'GIS Data Downloader',
    desc: 'Select any area on the map and download free GIS data — buildings, roads, flood zones, census tracts, species observations, and more. Export as Shapefile, GeoJSON, CSV, or KML.',
    tags: ['OSM', 'USGS', 'FEMA', 'Census'],
  },
  {
    href: '/tools/coordinate-converter',
    emoji: '📍',
    title: 'Coordinate Converter',
    desc: 'Convert between Decimal Degrees, Degrees Minutes Seconds, and Degrees Decimal Minutes. Click the map to pick any point.',
    tags: ['GIS', 'Instant'],
  },
  {
    href: '/tools/isochrone',
    emoji: '🗺',
    title: 'Isochrone Mapper',
    desc: 'Generate travel-time reachability zones for any location — by car, foot, or bike — in 10 to 60 minute intervals.',
    tags: ['GIS', 'OpenStreetMap', 'Interactive'],
  },
  {
    href: '/tools/elevation-profile',
    emoji: '📈',
    title: 'Elevation Profile',
    desc: 'Draw a path on the map and get a real elevation profile from global terrain data. Download as CSV or SVG.',
    tags: ['GIS', 'Terrain', 'USGS'],
  },
  {
    href: '/tools/geocoder',
    emoji: '🌐',
    title: 'Geocoder & Reverse Geocoder',
    desc: 'Batch geocode up to 200 addresses to coordinates, or coordinates to addresses. Results shown on a live map with CSV download.',
    tags: ['GIS', 'Batch', 'OpenStreetMap'],
  },
  {
    href: '/tools/census',
    emoji: '🏡',
    title: 'US Census Demographics',
    desc: 'Click any US location to see census tract data: population, income, home value, age, and unemployment from the ACS.',
    tags: ['Demographics', 'Census Bureau'],
  },
  {
    href: '/tools/unit-converter',
    emoji: '📏',
    title: 'Spatial Unit Converter',
    desc: 'Convert distance, area, and angle units used in GIS and surveying — meters, feet, acres, hectares, degrees, and more.',
    tags: ['GIS', 'Surveying', 'Instant'],
  },
  {
    href: '/tools/image-tools',
    emoji: '🗂️',
    title: 'File Tools',
    desc: 'Convert CSV coordinates to GeoJSON in one click. Extract GPS and camera metadata from photo EXIF data. Nothing leaves your browser.',
    tags: ['GIS', 'Privacy-first'],
  },
  {
    href: '/tools/pdf-image-tools',
    emoji: '📎',
    title: 'PDF & Image Tools',
    desc: 'Merge, compress, and split PDFs; convert or resize images (PNG, JPEG, WebP, AVIF, BMP, ICO); images to PDF; PDF pages to JPEG.',
    tags: ['PDF', 'Privacy-first'],
  },
];

export default function ToolsPage() {
  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsJsonLd) }}
      />
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.back}>← Back to Resume</Link>
        </div>

        <header className={styles.header}>
          <div className={styles.headerMeta}>
            <span className={styles.badge}>Free</span>
            <span className={styles.badgeDot}>Browser-based · No account needed</span>
          </div>
          <h1 className={styles.title}>GIS Tools</h1>
          <p className={styles.subtitle}>
            Practical tools for GIS professionals, cartographers, and spatial analysts.
          </p>
        </header>

        <div className={styles.grid}>
          {TOOLS.map((tool, i) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={styles.card}
            >
              <div className={styles.cardHead}>
                <span className={styles.cardNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.cardIcon}>{tool.emoji}</span>
              </div>
              <h2 className={styles.cardTitle}>{tool.title}</h2>
              <p className={styles.cardDesc}>{tool.desc}</p>
              <div className={styles.cardFoot}>
                <span className={styles.cardTags}>{tool.tags.join(' · ')}</span>
                <span className={styles.cardArrow}>Launch →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

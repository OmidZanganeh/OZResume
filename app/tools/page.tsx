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
  ],
};

const TOOLS = [
  {
    href: '/tools/coordinate-converter',
    emoji: '📍',
    title: 'Coordinate Converter',
    desc: 'Convert between Decimal Degrees (DD), Degrees Minutes Seconds (DMS), and Degrees Decimal Minutes (DDM). Instant, copy-to-clipboard.',
    tags: ['GIS', 'No signup', 'Instant'],
    accent: 'blue',
  },
  {
    href: '/tools/unit-converter',
    emoji: '📏',
    title: 'Spatial Unit Converter',
    desc: 'Convert between distance, area, and angle units used in GIS and surveying — meters, kilometers, feet, acres, hectares, and more.',
    tags: ['GIS', 'Surveying', 'Instant'],
    accent: 'orange',
  },
  {
    href: '/tools/image-tools',
    emoji: '🗂️',
    title: 'File Tools',
    desc: 'Convert CSV files with coordinates to GeoJSON in one click. Also reads EXIF metadata from photos: GPS, camera model, and more.',
    tags: ['GIS', 'Privacy-first', 'No upload'],
    accent: 'green',
  },
  {
    href: '/tools/isochrone',
    emoji: '🗺',
    title: 'Isochrone Mapper',
    desc: 'Set any origin on the map and generate reachability zones — see how far you can travel by car, foot, or bike in 10–60 minutes.',
    tags: ['GIS', 'OpenStreetMap', 'Interactive'],
    accent: 'blue',
  },
  {
    href: '/tools/elevation-profile',
    emoji: '📈',
    title: 'Elevation Profile',
    desc: 'Draw a path on the map and instantly get a real elevation profile from global terrain data. Download as CSV or SVG chart.',
    tags: ['GIS', 'Terrain', 'Download'],
    accent: 'green',
  },
  {
    href: '/tools/geocoder',
    emoji: '🌐',
    title: 'Geocoder & Reverse Geocoder',
    desc: 'Paste a list of addresses to get coordinates, or coordinates to get addresses. Batch up to 200 rows, see results on a live map, download CSV.',
    tags: ['GIS', 'OpenStreetMap', 'Batch'],
    accent: 'orange',
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
          <p className={styles.eyebrow}>// free · browser-based · no account needed</p>
          <h1 className={styles.title}>GIS Tools</h1>
          <p className={styles.subtitle}>
            A small collection of useful tools for GIS professionals, cartographers, and spatial thinkers.
            Everything runs in your browser — nothing is uploaded to a server.
          </p>
        </header>

        <div className={styles.grid}>
          {TOOLS.map(tool => (
            <Link key={tool.href} href={tool.href} className={`${styles.card} ${styles[`accent${tool.accent.charAt(0).toUpperCase() + tool.accent.slice(1)}`]}`}>
              <div className={styles.cardTop}>
                <span className={styles.cardEmoji}>{tool.emoji}</span>
                <span className={styles.cardArrow}>→</span>
              </div>
              <h2 className={styles.cardTitle}>{tool.title}</h2>
              <p className={styles.cardDesc}>{tool.desc}</p>
              <div className={styles.cardTags}>
                {tool.tags.map(tag => (
                  <span key={tag} className={styles.cardTag}>{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

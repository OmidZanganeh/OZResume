import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Free GIS Tools | Omid Zanganeh',
  description: 'Free online GIS and geospatial tools: coordinate converter, spatial unit converter, background remover, and image metadata reader. All run in your browser.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Free GIS Tools | Omid Zanganeh',
    description: 'Coordinate converter, spatial unit converter, background remover, EXIF reader — all free, all in-browser.',
    url: 'https://omidzanganeh.com/tools',
  },
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
    emoji: '🖼️',
    title: 'Image Tools',
    desc: 'Remove image backgrounds (AI-powered, runs entirely in your browser) and read EXIF metadata including GPS, camera model, and timestamps.',
    tags: ['AI', 'Privacy-first', 'No upload'],
    accent: 'green',
  },
];

export default function ToolsPage() {
  return (
    <div className={styles.page}>
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

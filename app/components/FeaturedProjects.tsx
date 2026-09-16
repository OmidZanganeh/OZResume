'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { projects, slugify } from '../projects/projectsData';
import styles from '../page.module.css';

// ─── Category icons (consistent 18px outline style) ────────────────────────
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2l2.09 6.26L20.5 10l-6.41 2.09L12 18l-2.09-5.91L3.5 10l6.41-1.74L12 2z" />
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const RouteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H15a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3H9a3 3 0 0 1-3-3V5.5" />
  </svg>
);

const CloudDownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
    <path d="M12 12v9M9 18l3 3 3-3" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M10 22v-4h4v4" />
  </svg>
);

const AntennaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8a8 8 0 0 1 16 0M7 11a4 4 0 0 1 10 0" />
    <circle cx="12" cy="13" r="1.5" /><path d="M12 14.5V22" />
  </svg>
);

const WaveformIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12h3l2-7 3 14 3-11 2 4h3M20 12h2" />
  </svg>
);

const ScanIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

type Tone = 'blue' | 'orange' | 'cyan' | 'green';

interface FeaturedProject {
  title: string;
  icon: ReactElement;
  tone: Tone;
  tag: string;
  desc: string;
  impact: string;
}

// Short, punchy blurbs distinct from the full case-study copy on /projects.
const FEATURED: FeaturedProject[] = [
  {
    title: 'RFP Radar',
    icon: <SparkleIcon />,
    tone: 'blue',
    tag: 'Azure OpenAI',
    desc: 'Applies Azure OpenAI to search, classify, and match RFPs to company capabilities.',
    impact: 'Months of sourcing → hours',
  },
  {
    title: 'Fiber Automatic Expansion',
    icon: <GridIcon />,
    tone: 'orange',
    tag: 'ArcGIS Pro',
    desc: 'Grids study areas and flood-fills viable fiber build zones by density and PPM thresholds.',
    impact: 'Used across multiple clients',
  },
  {
    title: 'FTTH Network Designer',
    icon: <RouteIcon />,
    tone: 'cyan',
    tag: 'Kruskal MST',
    desc: 'Places shafts, connects homes, and builds an optimal trunk/branch fiber backbone.',
    impact: 'Days → minutes',
  },
  {
    title: 'GIS Data Downloader',
    icon: <CloudDownloadIcon />,
    tone: 'green',
    tag: 'ArcGIS Pro',
    desc: 'Pulls OSM, USGS, FEMA, Census, and BSL data directly into ArcGIS Pro projects.',
    impact: 'Adopted firm-wide',
  },
  {
    title: 'Street View in ArcGIS Pro',
    icon: <EyeIcon />,
    tone: 'blue',
    tag: 'Google API',
    desc: 'Opens the Google Street View API right inside ArcGIS Pro for one-click pole verification.',
    impact: 'No browser context-switch',
  },
  {
    title: 'Parcel Owner Classifier',
    icon: <BuildingIcon />,
    tone: 'orange',
    tag: 'Azure OpenAI',
    desc: 'Uses Azure OpenAI to flag development and investment firms across large parcel datasets.',
    impact: 'Applied Azure AI at scale',
  },
  {
    title: 'RF Network Planning',
    icon: <AntennaIcon />,
    tone: 'cyan',
    tag: 'ArcGIS Pro',
    desc: 'Coverage prediction, PCI/RSI planning, interference analysis, and tower placement in one panel.',
    impact: 'Hours of RF work → clicks',
  },
  {
    title: 'Bore Profile Automation',
    icon: <WaveformIcon />,
    tone: 'green',
    tag: 'ArcGIS Pro',
    desc: 'Reads waypoints and elevation models to generate 2D/3D directional-drilling bore profiles.',
    impact: 'Days → minutes',
  },
  {
    title: 'Aerial AI Object Detection',
    icon: <ScanIcon />,
    tone: 'blue',
    tag: 'YOLO',
    desc: 'Runs a custom YOLO model on aerial tiles to detect and geolocate utility infrastructure.',
    impact: 'Automated remote inventory',
  },
];

const ICON_CLASS: Record<Tone, string> = {
  blue: styles.iconBlue,
  orange: styles.iconOrange,
  cyan: styles.iconCyan,
  green: styles.iconGreen,
};

const TAG_CLASS: Record<Tone, string> = {
  blue: styles.tagBlue,
  orange: styles.tagOrange,
  cyan: styles.tagCyan,
  green: styles.tagGreen,
};

export default function FeaturedProjects() {
  // Validate against the single source of truth so a renamed/removed project
  // in projectsData.ts can't silently produce a dead link on the homepage.
  const featured = FEATURED.filter(f => projects.some(p => p.title === f.title));

  return (
    <div className={styles.projectsGrid}>
      {featured.map(p => (
        <Link key={p.title} href={`/projects#${slugify(p.title)}`} className={styles.projectCard}>
          <div className={styles.projectTop}>
            <span className={`${styles.projectIcon} ${ICON_CLASS[p.tone]}`}>{p.icon}</span>
            <span className={`${styles.projectTag} ${TAG_CLASS[p.tone]}`}>{p.tag}</span>
          </div>
          <h3 className={styles.projectTitle}>{p.title}</h3>
          <p className={styles.projectDesc}>{p.desc}</p>
          <p className={styles.projectImpact}>{p.impact}</p>
        </Link>
      ))}
    </div>
  );
}

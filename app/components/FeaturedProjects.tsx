'use client';

import Link from 'next/link';
import { projects, slugify } from '../projects/projectsData';
import styles from '../page.module.css';

interface FeaturedProject {
  /** Must match a title in projectsData.ts — used for the /projects deep link. */
  title: string;
  subtitle: string;
  tech: string;
  blurb: string;
}

// Written the same way as the "Selected Projects" section of the resume:
// name — subtitle, a tech line, then one short line of impact.
const FEATURED: FeaturedProject[] = [
  {
    title: 'RFP Radar',
    subtitle: 'Applied AI for RFP Sourcing (Azure)',
    tech: 'Azure OpenAI · Azure AI Foundry · Python/C# · Playwright',
    blurb: 'Applies Azure OpenAI to search, classify, and match RFPs to company capabilities. Months of sourcing → hours.',
  },
  {
    title: 'Bore Profile Automation',
    subtitle: 'Directional Drilling Profile Generator',
    tech: 'Python · C# · ArcGIS Pro · SQL Server · Matplotlib',
    blurb: 'Reads spatial waypoints and elevation models; generates 2D/3D bore profiles. Days → minutes.',
  },
  {
    title: 'Fiber Automatic Expansion',
    subtitle: 'Density Grouping & Fiber Build-Area Planning',
    tech: 'C# · .NET · ArcGIS Pro SDK · WPF · Spatial Analysis',
    blurb: 'Grids the study area for density analysis and flood-fills viable build zones by PPM thresholds. Used across multiple clients; days/weeks → minutes.',
  },
  {
    title: 'FTTH Network Designer',
    subtitle: 'Automated Fiber Optic Network Planning',
    tech: 'C# · .NET 8 · ArcGIS Pro SDK · WPF · Kruskal MST',
    blurb: 'Places shafts, connects homes, and builds an optimal Main Trunk / Terminal Branch backbone. Days → minutes.',
  },
  {
    title: 'GIS Data Downloader',
    subtitle: 'Multi-Source GIS Data Acquisition',
    tech: 'C# · .NET 8 · ArcGIS Pro SDK · WPF · REST APIs',
    blurb: 'Downloads OSM, USGS, FEMA, Census/TIGER, and BSL layers into ArcGIS Pro. Adopted firm-wide across projects and teams.',
  },
  {
    title: 'Street View in ArcGIS Pro',
    subtitle: 'In-App Pole & Asset Verification',
    tech: 'C# · .NET 8 · ArcGIS Pro SDK · WPF · Google Street View API',
    blurb: 'One-click Google Street View API panoramas inside ArcGIS Pro so analysts can verify poles and equipment without leaving the map.',
  },
  {
    title: 'Parcel Owner Classifier',
    subtitle: 'Applied AI for Fiber Expansion (Azure)',
    tech: 'Python · Azure OpenAI · Azure AI Foundry · SQL Server',
    blurb: 'Applies Azure OpenAI to classify parcel owners as development/investment firms — finding where growth is happening for fiber expansion.',
  },
  {
    title: 'RF Network Planning',
    subtitle: '8-Tool Wireless Planning Panel',
    tech: 'C# · ArcGIS Pro SDK · Python',
    blurb: 'Coverage prediction, PCI/RSI planner, tilt/azimuth optimizers, interference analysis, and tower placement — all as map layers.',
  },
  {
    title: 'Aerial AI Object Detection',
    subtitle: 'YOLO Utility Infrastructure Detection',
    tech: 'Python · YOLO · OpenCV · Aerial/Street Imagery APIs',
    blurb: 'Detects and classifies utility assets from aerial and street-level imagery; exports georeferenced results to ArcGIS.',
  },
];

export default function FeaturedProjects() {
  // Validate against the single source of truth so a renamed/removed project
  // in projectsData.ts can't silently produce a dead link on the homepage.
  const featured = FEATURED.filter(f => projects.some(p => p.title === f.title));

  return (
    <div className={styles.projectsList}>
      {featured.map(p => (
        <Link key={p.title} href={`/projects#${slugify(p.title)}`} className={styles.projectRow}>
          <div className={styles.projectRowHead}>
            <span className={styles.projectName}>{p.title}</span>
            <span className={styles.projectSubtitle}>— {p.subtitle}</span>
          </div>
          <p className={styles.projectTechLine}>{p.tech}</p>
          <p className={styles.projectBlurb}>{p.blurb}</p>
        </Link>
      ))}
    </div>
  );
}

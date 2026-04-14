import Link from 'next/link';
import styles from './ToolsHoverCard.module.css';

// ─── Inline SVG Icons (matches tools listing page) ───────────────────────────
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconMapPin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconTrendingUp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconRuler = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>
  </svg>
);
const IconFolder = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconLayers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const IconWrench = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const TOOLS = [
  { icon: <IconDownload />, label: 'GIS Data Downloader',       href: '/tools/gis-downloader' },
  { icon: <IconMapPin />,   label: 'Coordinate Converter',      href: '/tools/coordinate-converter' },
  { icon: <IconClock />,    label: 'Isochrone Mapper',          href: '/tools/isochrone' },
  { icon: <IconTrendingUp />, label: 'Elevation Profile',       href: '/tools/elevation-profile' },
  { icon: <IconSearch />,   label: 'Geocoder & Reverse Geocoder', href: '/tools/geocoder' },
  { icon: <IconUsers />,    label: 'US Census Demographics',    href: '/tools/census' },
  { icon: <IconRuler />,    label: 'Spatial Unit Converter',    href: '/tools/unit-converter' },
  { icon: <IconFolder />,   label: 'File Tools',                href: '/tools/image-tools' },
  { icon: <IconLayers />,   label: 'PDF & Image Tools',         href: '/tools/pdf-image-tools' },
];

export default function ToolsHoverCard() {
  return (
    <div className={styles.wrapper}>
      <Link href="/tools" className={styles.trigger}>
        <IconWrench /> Tools
      </Link>

      <div className={styles.popover}>
        <div className={styles.popoverHead}>
          <span className={styles.popoverTitle}>GIS Tools</span>
          <span className={styles.popoverCount}>{TOOLS.length} tools</span>
        </div>

        <ul className={styles.list}>
          {TOOLS.map(t => (
            <li key={t.href}>
              <Link href={t.href} className={styles.item}>
                <span className={styles.itemIcon}>{t.icon}</span>
                <span className={styles.itemLabel}>{t.label}</span>
                <span className={styles.itemArrow}>→</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/tools" className={styles.popoverFooter}>
          Browse all tools →
        </Link>
      </div>
    </div>
  );
}

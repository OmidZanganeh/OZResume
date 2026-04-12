import Link from 'next/link';
import styles from './ToolsHoverCard.module.css';

const TOOLS = [
  { emoji: '📥', label: 'GIS Data Downloader',      href: '/tools/gis-downloader' },
  { emoji: '📍', label: 'Coordinate Converter',      href: '/tools/coordinate-converter' },
  { emoji: '🗺',  label: 'Isochrone Mapper',          href: '/tools/isochrone' },
  { emoji: '📈', label: 'Elevation Profile',          href: '/tools/elevation-profile' },
  { emoji: '🌐', label: 'Geocoder & Reverse Geocoder',href: '/tools/geocoder' },
  { emoji: '🏡', label: 'US Census Demographics',     href: '/tools/census' },
  { emoji: '📏', label: 'Spatial Unit Converter',     href: '/tools/unit-converter' },
  { emoji: '🗂️', label: 'File Tools',                 href: '/tools/image-tools' },
  { emoji: '📎', label: 'PDF & Image Tools',          href: '/tools/pdf-image-tools' },
];

export default function ToolsHoverCard() {
  return (
    <div className={styles.wrapper}>
      <Link href="/tools" className={styles.trigger}>
        🛠 Tools
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
                <span className={styles.itemIcon}>{t.emoji}</span>
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

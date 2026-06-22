import Link from 'next/link';
import styles from './ToolsHoverCard.module.css'; // reuses the same popover stylesheet

// ─── App icons ────────────────────────────────────────────────────────────────
const IconGym = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 5v14"/><path d="M18 5v14"/><path d="M2 9h4"/><path d="M18 9h4"/><path d="M2 15h4"/><path d="M18 15h4"/><path d="M6 9h12"/><path d="M6 15h12"/>
  </svg>
);
const IconDiscover = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);
const IconAppWindow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18"/><path d="M2 9h6"/>
  </svg>
);

const APPS = [
  { icon: <IconGym />,      label: 'Gym Flow',                href: '/gym-flow/' },
  { icon: <IconDiscover />, label: 'Discover — Trip Explorer', href: '/tools/trip-explorer' },
];

type Props = { suppressPopover?: boolean };

export default function WebAppsHoverCard({ suppressPopover = false }: Props) {
  return (
    <div className={`${styles.wrapper}${suppressPopover ? ` ${styles.suppressPopover}` : ''}`}>
      <Link href="/web-apps" className={styles.trigger}>
        <IconAppWindow /> Web apps
      </Link>

      <div className={styles.popover}>
        <div className={styles.popoverHead}>
          <span className={styles.popoverTitle}>Web Apps</span>
          <span className={styles.popoverCount}>{APPS.length} apps</span>
        </div>

        <ul className={styles.list}>
          {APPS.map(app => (
            <li key={app.href}>
              <Link href={app.href} className={styles.item}>
                <span className={styles.itemIcon}>{app.icon}</span>
                <span className={styles.itemLabel}>{app.label}</span>
                <span className={styles.itemArrow}>→</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/web-apps" className={styles.popoverFooter}>
          Browse all apps →
        </Link>
      </div>
    </div>
  );
}

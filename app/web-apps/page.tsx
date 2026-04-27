import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Web Apps | Omid Zanganeh – GIS Developer",
  description:
    "Installable web apps and PWAs by Omid Zanganeh — including Gym Flow, an offline-first gym planner. Add to your home screen for a native-like experience.",
  alternates: { canonical: "/web-apps" },
  openGraph: {
    title: "Web Apps | Omid Zanganeh",
    description: "Progressive web apps you can install on phone or desktop.",
    url: "https://omidzanganeh.com/web-apps",
  },
};

/** Same deployment as this site — static app under /gym-flow/ */
const GYM_FLOW_PATH = "/gym-flow/";

const apps = [
  {
    icon: "🏋️",
    title: "Gym Flow",
    subtitle: "Offline-first gym planner & progress tracker",
    description:
      "Plan workouts, browse exercises, and track progress in the browser. Works as a standalone app once installed — handy at the gym without hunting for the tab.",
    tech: ["React", "Vite", "PWA", "TypeScript"],
    url: GYM_FLOW_PATH,
  },
];

export default function WebAppsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Back to Resume
        </Link>
        <h1 className={styles.title}>Web apps</h1>
        <p className={styles.subtitle}>
          Small, installable sites you can keep on your phone or desktop like a native app. Separate from my{" "}
          <Link href="/tools">GIS tools</Link> — these are everyday utilities and side projects.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="install-guide">
        <h2 id="install-guide" className={styles.sectionTitle}>
          Add to your home screen (PWA)
        </h2>
        <p className={styles.guideIntro}>
          These apps ship a web manifest and can run in <strong>standalone</strong> mode after installation — full screen,
          no browser chrome, and they open from your launcher like any other app.
        </p>

        <div className={styles.platform}>
          <h3 className={styles.platformTitle}>iPhone &amp; iPad (Safari)</h3>
          <ol className={styles.steps}>
            <li>
              On this site, open <strong>Gym Flow</strong> at <code>/gym-flow/</code> in <strong>Safari</strong> (install
              prompts from Chrome or other browsers on iOS are limited).
            </li>
            <li>Tap the <strong>Share</strong> button (square with arrow).</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>, then confirm.</li>
          </ol>
          <p className={styles.note}>
            After that, launch it from your home screen icon. Updates apply the next time you open the app with a network
            connection (service worker permitting).
          </p>
        </div>

        <div className={styles.platform}>
          <h3 className={styles.platformTitle}>Android (Chrome)</h3>
          <ol className={styles.steps}>
            <li>Open the app in <strong>Chrome</strong>.</li>
            <li>Tap the menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, or use the install banner when it appears.</li>
            <li>Confirm — the icon appears in your app drawer / home screen.</li>
          </ol>
        </div>

        <div className={styles.platform}>
          <h3 className={styles.platformTitle}>Desktop (Chrome, Edge, Brave)</h3>
          <ol className={styles.steps}>
            <li>Open the app in the browser.</li>
            <li>Look for the <strong>install</strong> icon in the address bar, or use the menu → <strong>Install …</strong>.</li>
            <li>Launch from your applications list or taskbar shortcut.</li>
          </ol>
          <p className={styles.note}>
            Exact wording varies slightly by browser version; “Install” or “Create shortcut” (with window option) achieves the
            same goal.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="apps-list">
        <h2 id="apps-list" className={styles.sectionTitle}>
          Apps
        </h2>
        <div className={styles.appList}>
          {apps.map((app) => (
            <article key={app.title} className={styles.appCard}>
              <div className={styles.appTop}>
                <div className={styles.appTitleRow}>
                  <span className={styles.appIcon} aria-hidden="true">
                    {app.icon}
                  </span>
                  <div>
                    <h3 className={styles.appTitle}>{app.title}</h3>
                    <p className={styles.appTagline}>{app.subtitle}</p>
                  </div>
                </div>
                <div className={styles.techRow}>
                  {app.tech.map((t) => (
                    <span key={t} className={styles.techTag}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <p className={styles.appDesc}>{app.description}</p>
              <div className={styles.actions}>
                <a className={styles.primaryBtn} href={app.url}>
                  Open {app.title} →
                </a>
                <Link href="/web-apps#install-guide" className={styles.back} style={{ marginBottom: 0 }}>
                  Install instructions ↑
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Questions or ideas for another web app?{" "}
          <a href="mailto:ozanganeh@unomaha.edu">ozanganeh@unomaha.edu</a>
        </p>
      </footer>
    </div>
  );
}

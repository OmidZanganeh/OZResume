import type { Metadata } from 'next';
import Link from 'next/link';
import DarkModeToggle from '../components/DarkModeToggle';
import ProjectMediaGallery from './ProjectMediaGallery';
import type { ProjectTag } from './projectsData';
import { projects } from './projectsData';
import styles from './page.module.css';

function ProjectTags({ tags, variant }: { tags: ProjectTag[]; variant: 'overlay' | 'inline' }) {
  const rowClass = variant === 'overlay' ? styles.tagOverlay : styles.tagInline;
  return (
    <div className={rowClass}>
      {tags.map(tag => (
        <span
          key={tag.label}
          className={`${styles.overlayTag} ${styles[`tone_${tag.tone}`]}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

export const metadata: Metadata = {
  title: 'GIS Projects | Omid Zanganeh – GIS Developer',
  description:
    'Explore GIS and geospatial projects by Omid Zanganeh: AI-powered tools, ArcGIS automation, fiber network design, remote sensing analysis, and more.',
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'GIS Projects | Omid Zanganeh',
    description:
      'AI-powered GIS tools, ArcGIS automation, fiber network design, remote sensing, and spatial analysis projects.',
    url: 'https://omidzanganeh.com/projects',
  },
};

export default function ProjectsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn}>
          ← Back
        </Link>
        <div className={styles.headerCenter}>
          <h1 className={styles.pageTitle}>Projects</h1>
          <p className={styles.pageSubtitle}>
            Production tools and research — problems solved, stack, and impact
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.countBadge}>{projects.length} projects</span>
          <DarkModeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.list}>
          {projects.map(p => (
            <article key={p.title} className={styles.card}>
              {p.images.length > 0 ? (
                <ProjectMediaGallery
                  images={p.images}
                  title={p.title}
                  tagsOverlay={<ProjectTags tags={p.tags} variant="overlay" />}
                />
              ) : (
                <div className={styles.mediaPlaceholder}>
                  <ProjectTags tags={p.tags} variant="overlay" />
                </div>
              )}

              <div className={styles.cardBody}>
                <header className={styles.cardHeader}>
                  <div className={styles.cardTitles}>
                    {p.images.length === 0 && <ProjectTags tags={p.tags} variant="inline" />}
                    <h2 className={styles.cardTitle}>{p.title}</h2>
                    <p className={styles.cardSubtitle}>{p.subtitle}</p>
                  </div>
                  <div className={styles.techTags}>
                    {p.tech.map(t => (
                      <span key={t} className={styles.techTag}>
                        {t}
                      </span>
                    ))}
                  </div>
                </header>

                <div className={styles.detailGrid}>
                  <section className={styles.block}>
                    <h3 className={styles.blockLabel}>Problem</h3>
                    <p className={styles.blockText}>{p.problem}</p>
                  </section>
                  <section className={styles.block}>
                    <h3 className={styles.blockLabel}>Solution</h3>
                    <p className={styles.blockText}>{p.solution}</p>
                  </section>
                  <section className={styles.block}>
                    <h3 className={styles.blockLabel}>Impact</h3>
                    <ul className={styles.impactList}>
                      {p.impact.map(item => (
                        <li key={item} className={styles.impactItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.backBtn}>
          ← Back to resume
        </Link>
        <p>
          Want to collaborate?{' '}
          <a href="mailto:ozanganeh@unomaha.edu" className={styles.footerLink}>
            ozanganeh@unomaha.edu
          </a>
        </p>
      </footer>
    </div>
  );
}

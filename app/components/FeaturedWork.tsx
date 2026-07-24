'use client';

import Image from 'next/image';
import Link from 'next/link';
import { projects } from '../projects/projectsData';
import styles from './FeaturedWork.module.css';

const FEATURED_TITLES = [
  'Bore Profile Automation',
  'RFP Radar',
  'Aerial AI Object Detection',
] as const;

const FEATURED = FEATURED_TITLES.map((title) =>
  projects.find((p) => p.title === title)
).filter((p): p is NonNullable<typeof p> => Boolean(p));

export default function FeaturedWork() {
  return (
    <section className={styles.section} id="work" aria-labelledby="featured-heading">
      <div className={styles.head}>
        <h2 id="featured-heading" className={styles.title}>
          Featured work
        </h2>
        <p className={styles.lead}>
          Production tools with measurable impact — not portfolio fluff.
        </p>
      </div>

      <div className={styles.list}>
        {FEATURED.map((project, i) => {
          const image = project.images[0];
          return (
            <article
              key={project.title}
              className={`${styles.item} ${i % 2 === 1 ? styles.itemFlip : ''}`}
            >
              <div className={styles.media}>
                {image ? (
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={960}
                    height={600}
                    className={styles.image}
                    sizes="(max-width: 768px) 100vw, 52vw"
                  />
                ) : (
                  <div className={styles.mediaFallback} aria-hidden />
                )}
              </div>
              <div className={styles.body}>
                <p className={styles.kicker}>{project.subtitle}</p>
                <h3 className={styles.itemTitle}>{project.title}</h3>
                <p className={styles.impact}>{project.impact[0]}</p>
                <p className={styles.blurb}>{project.problem}</p>
                <div className={styles.tech}>
                  {project.tech.slice(0, 4).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Link href="/projects" className={styles.allLink}>
          See all projects →
        </Link>
      </div>
    </section>
  );
}

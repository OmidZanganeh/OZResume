'use client';

import { useEffect, useRef, useState } from 'react';
import type { LinkedInPostRef } from '../data/linkedinPosts';
import styles from './LinkedInPosts.module.css';

/**
 * Every embedded post renders at this height regardless of how tall LinkedIn
 * says the content actually is — posts vary wildly (one line vs. a full
 * write-up with images), and a fixed height keeps the grid uniform. Content
 * past this height scrolls inside the iframe itself; LinkedIn's embed page
 * allows internal scroll on its own, so nothing extra is needed for that.
 */
export const LINKEDIN_POST_HEIGHT = 640;

/**
 * Renders one embedded LinkedIn post.
 *
 * LinkedIn's embed iframe pulls in its own JS/CSS, so mounting several at once
 * on page load is wasteful — this only creates the iframe once the card
 * scrolls near the viewport, and shows a shimmer placeholder until then and
 * while it loads.
 */
export default function LinkedInEmbed({ urn, type, collapsed }: LinkedInPostRef) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const embedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:${type}:${urn}${collapsed ? '?collapsed=1' : ''}`;

  return (
    <div ref={ref} className={styles.postWrap}>
      <div className={styles.frameBox}>
        {!loaded && <div className={styles.skeleton} aria-hidden="true" />}
        {inView && (
          <iframe
            src={embedUrl}
            height={LINKEDIN_POST_HEIGHT}
            width={504}
            style={{ display: loaded ? 'block' : 'none' }}
            className={styles.iframe}
            title="Embedded LinkedIn post"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        )}
        {loaded && <div className={styles.scrollFade} aria-hidden="true" />}
      </div>
      <a
        href={embedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.fallbackLink}
      >
        View post on LinkedIn ↗
      </a>
    </div>
  );
}

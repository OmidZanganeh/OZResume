'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import type { ProjectImage } from './projectsData';
import styles from './page.module.css';

interface Props {
  images: ProjectImage[];
  title: string;
  tagsOverlay: ReactNode;
}

export default function ProjectMediaGallery({ images, title, tagsOverlay }: Props) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const count = images.length;
  const current = images[index];
  const hasMultiple = count > 1;

  const goPrev = useCallback(() => {
    setIndex(i => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setIndex(i => (i + 1) % count);
  }, [count]);

  const openLightbox = () => setLightboxOpen(true);
  const closeLightbox = () => setLightboxOpen(false);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft' && hasMultiple) goPrev();
      else if (e.key === 'ArrowRight' && hasMultiple) goNext();
    };

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, hasMultiple, goPrev, goNext]);

  return (
    <>
      <div className={styles.media}>
        <button
          type="button"
          className={styles.mediaClickArea}
          onClick={openLightbox}
          aria-label={`View full image for ${title}`}
        >
          <Image
            src={current.src}
            alt={current.alt}
            width={1200}
            height={680}
            className={styles.mediaImg}
            priority={index === 0}
          />
        </button>

        <button
          type="button"
          className={styles.mediaExpandBtn}
          onClick={openLightbox}
          aria-label="Expand image"
          title="Expand"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 2H2v4M10 2h4v4M10 14h4v-4M6 14H2v-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              className={`${styles.mediaNavBtn} ${styles.mediaNavPrev}`}
              onClick={e => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.mediaNavBtn} ${styles.mediaNavNext}`}
              onClick={e => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next image"
            >
              ›
            </button>
            <div className={styles.mediaDots} role="tablist" aria-label={`${title} images`}>
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Image ${i + 1} of ${count}`}
                  className={`${styles.mediaDot} ${i === index ? styles.mediaDotActive : ''}`}
                  onClick={e => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                />
              ))}
            </div>
            <span className={styles.mediaCounter} aria-hidden="true">
              {index + 1}/{count}
            </span>
          </>
        )}

        {tagsOverlay}
      </div>

      {lightboxOpen && (
        <div
          className={styles.lightboxOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — full image view`}
          onClick={closeLightbox}
        >
          <div className={styles.lightboxInner} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label="Close"
            >
              ×
            </button>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`}
                  onClick={goPrev}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`}
                  onClick={goNext}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={current.alt} className={styles.lightboxImg} />

            {hasMultiple && (
              <p className={styles.lightboxCaption}>
                {index + 1} / {count}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

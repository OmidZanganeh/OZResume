'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import styles from './BusinessCard.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SITE_URL = 'https://omidzanganeh.com';

const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

export default function BusinessCard({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    QRCode.toDataURL(SITE_URL, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#f8fafc' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'Omid-Zanganeh-Card.png';
      a.click();
    } catch { /* silent */ }
    finally { setDownloading(false); }
  }, [downloading]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div className={styles.wrapper}>

        {/* top bar */}
        <div className={styles.topBar}>
          <span className={styles.topBarLabel}>Business Card</span>
          <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close"><XIcon /></button>
        </div>

        {/* ── THE CARD ── */}
        <div ref={cardRef} className={styles.card}>

          {/* Aurora glow layers */}
          <div className={styles.glowA} aria-hidden="true" />
          <div className={styles.glowB} aria-hidden="true" />

          {/* Top gradient border line */}
          <div className={styles.topLine} aria-hidden="true" />

          {/* Content */}
          <div className={styles.cardInner}>

            {/* Left — identity */}
            <div className={styles.identityCol}>
              <div className={styles.nameLockup}>
                <p className={styles.nameFirst}>Omid</p>
                <p className={styles.nameLast}>Zanganeh</p>
              </div>

              <div className={styles.titleBlock}>
                <span className={styles.jobTitle}>GIS Developer</span>
                <span className={styles.jobSub}>Telecom Engineering &amp; AI/ML Integration</span>
              </div>

              <span className={styles.awardBadge}>
                ✦ Edison Award Nominee 2025
              </span>

              {/* Contact row */}
              <div className={styles.contactRow}>
                <a href="mailto:ozanganeh@unomaha.edu" className={styles.contactItem}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  ozanganeh@unomaha.edu
                </a>
                <span className={styles.dot}>·</span>
                <a href="tel:+15312296873" className={styles.contactItem}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  +1 (531) 229-6873
                </a>
                <span className={styles.dot}>·</span>
                <a href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </a>
                <span className={styles.dot}>·</span>
                <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  omidzanganeh.com
                </a>
              </div>
            </div>

            {/* Right — QR */}
            <div className={styles.qrCol}>
              {qrDataUrl && (
                <div className={styles.qrFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR code — omidzanganeh.com" className={styles.qrImg} />
                </div>
              )}
              <span className={styles.qrHint}>Scan to visit</span>
            </div>

          </div>

          {/* Bottom location strip */}
          <div className={styles.locationStrip}>
            <span className={styles.locationText}>📍 Lincoln, Nebraska</span>
            <span className={styles.locationText}>MS Geography · GIS&amp;T · GPA 4.0</span>
          </div>

        </div>

        {/* actions */}
        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={handleDownload} disabled={downloading}>
            <DownloadIcon /> {downloading ? 'Saving…' : 'Save as PNG'}
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>
            <PrintIcon /> Print
          </button>
        </div>

      </div>
    </div>
  );
}

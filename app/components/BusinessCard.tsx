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

  // Generate QR code on mount
  useEffect(() => {
    QRCode.toDataURL(SITE_URL, {
      width: 160,
      margin: 1,
      color: { dark: '#4f8ef7', light: '#0d0d1a' },
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
    } catch {
      // fallback: do nothing silently
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <span className={styles.headerLabel}>Digital Business Card</span>
          <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close"><XIcon /></button>
        </div>

        {/* ── THE CARD ── */}
        <div className={styles.scene}>
          <div ref={cardRef} className={styles.card}>

            {/* Topographic SVG background accent */}
            <svg className={styles.bgAccent} viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <ellipse cx="320" cy="120" rx="180" ry="130" fill="none" stroke="rgba(79,142,247,0.07)" strokeWidth="1"/>
              <ellipse cx="320" cy="120" rx="140" ry="100" fill="none" stroke="rgba(79,142,247,0.07)" strokeWidth="1"/>
              <ellipse cx="320" cy="120" rx="100" ry="70"  fill="none" stroke="rgba(79,142,247,0.08)" strokeWidth="1"/>
              <ellipse cx="320" cy="120" rx="62"  ry="42"  fill="none" stroke="rgba(79,142,247,0.10)" strokeWidth="1"/>
              <ellipse cx="320" cy="120" rx="32"  ry="20"  fill="none" stroke="rgba(79,142,247,0.13)" strokeWidth="1"/>
            </svg>

            {/* Left: identity */}
            <div className={styles.cardLeft}>
              <div className={styles.cardName}>Omid Zanganeh</div>
              <div className={styles.cardTitle}>GIS Developer</div>
              <div className={styles.cardSubtitle}>Telecom Engineering &amp; AI/ML Integration</div>
              <div className={styles.cardDivider} />
              <ul className={styles.cardContacts}>
                <li>
                  <span className={styles.contactIcon}>✉</span>
                  <a href="mailto:ozanganeh@unomaha.edu" className={styles.contactLink}>ozanganeh@unomaha.edu</a>
                </li>
                <li>
                  <span className={styles.contactIcon}>☎</span>
                  <a href="tel:+15312296873" className={styles.contactLink}>+1 (531) 229-6873</a>
                </li>
                <li>
                  <span className={styles.contactIcon}>in</span>
                  <a href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>linkedin.com/in/omidzanganeh</a>
                </li>
                <li>
                  <span className={styles.contactIcon}>⌖</span>
                  <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>omidzanganeh.com</a>
                </li>
              </ul>
              <div className={styles.cardLocation}>📍 Lincoln, Nebraska</div>
            </div>

            {/* Right: QR */}
            <div className={styles.cardRight}>
              {qrDataUrl && (
                <div className={styles.qrWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR code linking to omidzanganeh.com" className={styles.qrImg} />
                </div>
              )}
              <span className={styles.qrLabel}>Scan to visit</span>
              <span className={styles.qrSite}>omidzanganeh.com</span>
            </div>

          </div>
        </div>

        {/* ── actions ── */}
        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={handleDownload} disabled={downloading}>
            <DownloadIcon /> {downloading ? 'Saving…' : 'Save as PNG'}
          </button>
          <button type="button" className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handlePrint}>
            <PrintIcon /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

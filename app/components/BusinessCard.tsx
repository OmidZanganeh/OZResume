'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import styles from './BusinessCard.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SITE_URL = 'https://omidzanganeh.com';
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/* ── icon components ── */
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

/* contact badge icon SVGs */
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.87a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);

function IconBadge({ children }: { children: React.ReactNode }) {
  return <span className={styles.iconBadge}>{children}</span>;
}

export default function BusinessCard({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    QRCode.toDataURL(SITE_URL, {
      width: 180,
      margin: 1,
      color: { dark: '#ffffff', light: '#1e1e1e' },
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
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
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

        {/* ══ THE CARD ══ */}
        <div ref={cardRef} className={styles.card}>

          {/* Horizontal stripe texture overlay */}
          <div className={styles.stripeTexture} aria-hidden="true" />

          {/* World map ghost — background */}
          <div className={styles.mapBg} aria-hidden="true">
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={{ scale: 140, center: [10, 5] }}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="rgba(255,255,255,0.09)"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth={0.5}
                      style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                    />
                  ))
                }
              </Geographies>
            </ComposableMap>
          </div>

          {/* Card content */}
          <div className={styles.cardContent}>

            {/* LEFT: name + contacts + QR */}
            <div className={styles.leftCol}>
              <div className={styles.nameBlock}>
                <p className={styles.name}>OMID ZANGANEH</p>
                <p className={styles.jobTitle}>GIS Developer</p>
                <p className={styles.jobSub}>Telecom Engineering &amp; AI/ML Integration</p>
              </div>

              <div className={styles.contactList}>
                <div className={styles.contactRow}>
                  <span className={styles.contactText}>Lincoln, Nebraska</span>
                </div>
                <div className={styles.contactRow}>
                  <span className={styles.contactText}>ozanganeh@unomaha.edu</span>
                </div>
                <div className={styles.contactRow}>
                  <span className={styles.contactText}>+1 (531) 229-6873</span>
                </div>
                <div className={styles.contactRow}>
                  <span className={styles.contactText}>omidzanganeh.com</span>
                </div>
                <div className={styles.contactRow}>
                  <span className={styles.contactText}>linkedin.com/in/omidzanganeh</span>
                </div>
              </div>

              {qrDataUrl && (
                <div className={styles.qrWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR code — omidzanganeh.com" className={styles.qrImg} />
                </div>
              )}
            </div>

            {/* RIGHT: photo + icon badges */}
            <div className={styles.rightCol}>
              <div className={styles.photoCircle}>
                <Image src="/Omid.png" alt="Omid Zanganeh" fill sizes="80px" className={styles.photoImg} />
              </div>

              <div className={styles.badgeList}>
                <IconBadge><IconPin /></IconBadge>
                <IconBadge><IconMail /></IconBadge>
                <IconBadge><IconPhone /></IconBadge>
                <IconBadge><IconGlobe /></IconBadge>
                <IconBadge><IconLinkedIn /></IconBadge>
              </div>
            </div>

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

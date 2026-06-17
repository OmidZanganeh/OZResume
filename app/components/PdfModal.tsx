'use client';

import { useEffect, useCallback } from 'react';
import styles from './PdfModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName?: string;
}

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function PdfModal({ open, onClose, pdfUrl, fileName = 'resume.pdf' }: Props) {
  const close = useCallback(() => onClose(), [onClose]);

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

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Resume PDF viewer">
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close">
          <XIcon />
        </button>
        <div className={styles.viewer}>
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className={styles.iframe}
            title="Résumé PDF"
          />
        </div>
        <div className={styles.footer}>
          <span className={styles.footerTitle}>Omid Zanganeh — Résumé</span>
          <a href={pdfUrl} download={fileName} className={styles.downloadBtn}>
            <DownloadIcon /> Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}

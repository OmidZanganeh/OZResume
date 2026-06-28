'use client';

import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './StockScreener.module.css';

interface Props {
  label: string;
  explanation: string;
}

export default function ColumnHeaderInfo({ label, explanation }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <span className={styles.colInfoWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.colInfoBtn}
        aria-label={`About ${label}`}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
      >
        <Info size={11} aria-hidden />
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={[styles.colInfoTip, open ? styles.colInfoTipOpen : ''].join(' ')}
      >
        {explanation}
      </span>
    </span>
  );
}

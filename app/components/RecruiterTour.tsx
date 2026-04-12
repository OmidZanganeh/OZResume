'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Orbitron, Inter } from 'next/font/google';
import { RECRUITER_TOUR_STEPS } from './recruiterTourData';
import type { DialogueSeg } from './recruiterTourData';
import styles from './RecruiterTour.module.css';

const RecruiterTourWorld = dynamic(() => import('./RecruiterTourWorld'), {
  ssr: false,
  loading: () => <div className={styles.worldLoading}>Loading briefing deck…</div>,
});

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '800'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] });

const STEPS = RECRUITER_TOUR_STEPS;

export type { DialogueSeg };

function dialogueCharCount(segments: DialogueSeg[]): number {
  return segments.reduce((a, x) => a + x.s.length, 0);
}

function renderDialogue(segments: DialogueSeg[], n: number): ReactNode {
  let remaining = n;
  const out: ReactNode[] = [];
  let k = 0;
  for (const seg of segments) {
    const len = seg.s.length;
    const take = Math.min(remaining, len);
    if (take <= 0) break;
    const chunk = seg.s.slice(0, take);
    remaining -= take;
    const lines = chunk.split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (li > 0) out.push(<br key={`br-${k++}`} />);
      const line = lines[li];
      if (line.length > 0) {
        out.push(
          seg.strong ? (
            <strong key={`t-${k++}`}>{line}</strong>
          ) : (
            <span key={`t-${k++}`}>{line}</span>
          ),
        );
      }
    }
  }
  return <>{out}</>;
}

function useDialogueTypewriter(segments: DialogueSeg[], stepKey: number, msPerChar: number) {
  const total = useMemo(() => dialogueCharCount(segments), [segments]);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset typewriter when tour step changes
    setRevealed(0);
  }, [stepKey, segments]);

  useEffect(() => {
    if (revealed >= total) return;
    const id = window.setTimeout(() => setRevealed(r => r + 1), msPerChar);
    return () => clearTimeout(id);
  }, [revealed, total, msPerChar]);

  const skipLine = useCallback(() => setRevealed(total), [total]);
  const isComplete = revealed >= total;

  return { revealed, total, isComplete, skipLine };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RecruiterTour({ open, onClose }: Props) {
  const [arrivedAt, setArrivedAt] = useState(0);
  const [walkTarget, setWalkTarget] = useState(0);

  const inTransit = walkTarget !== arrivedAt;
  const s = STEPS[arrivedAt];
  const dest = STEPS[walkTarget];

  const { revealed, isComplete, skipLine } = useDialogueTypewriter(s.dialogue, arrivedAt, 22);
  const talking = !inTransit && !isComplete;

  const boardTabs = useMemo(() => STEPS.map(st => st.tab), []);

  const handleBotArrived = useCallback((i: number) => {
    setArrivedAt(i);
  }, []);

  const selectStation = useCallback((i: number) => {
    setWalkTarget(i);
  }, []);

  const close = useCallback(() => {
    onClose();
    setArrivedAt(0);
    setWalkTarget(0);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const last = arrivedAt === STEPS.length - 1;

  const onPrimary = () => {
    if (inTransit) return;
    if (!isComplete) {
      skipLine();
      return;
    }
    if (last) close();
    else selectStation(arrivedAt + 1);
  };

  const onBack = () => {
    if (inTransit) {
      selectStation(arrivedAt);
      return;
    }
    if (arrivedAt <= 0) return;
    selectStation(arrivedAt - 1);
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div className={`${styles.modal} ${orbitron.className}`} role="dialog" aria-modal="true" aria-labelledby="recruiter-tour-title">
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close tour">
          ✕
        </button>

        <div className={styles.header}>
          <p className={styles.kicker}>3D briefing deck · walk Geo-Bot to each board</p>
          <h2 id="recruiter-tour-title" className={styles.title}>
            Recruiter tour
          </h2>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Tour steps">
          {STEPS.map((st, i) => (
            <button
              key={st.tab}
              type="button"
              role="tab"
              aria-selected={walkTarget === i}
              className={`${styles.tab} ${walkTarget === i ? styles.tabActive : ''}`}
              onClick={() => selectStation(i)}
            >
              {st.tab}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          <RecruiterTourWorld
            className={styles.worldWrap}
            walkTarget={walkTarget}
            arrivedAt={arrivedAt}
            boardTabs={boardTabs}
            onStationPick={selectStation}
            onBotArrived={handleBotArrived}
          />

          <div className={styles.stage}>
            <div className={`${styles.speech} ${inter.className}`}>
              <div className={styles.speechTop}>
                <h3 className={`${styles.stepTitle} ${orbitron.className}`}>
                  {inTransit ? dest.title : s.title}
                </h3>
                {inTransit && <span className={styles.transitBadge}>En route</span>}
                {talking && <span className={styles.liveBadge}>Speaking</span>}
              </div>
              {inTransit ? (
                <p className={`${styles.copy} ${styles.dialogueBox} ${styles.transitCopy}`}>
                  Walking to the <strong>{dest.tab}</strong> station — watch the deck. I will read that board when I arrive.
                </p>
              ) : (
                <p className={`${styles.copy} ${styles.dialogueBox}`} aria-live="polite">
                  {renderDialogue(s.dialogue, revealed)}
                  {talking && <span className={styles.caret} aria-hidden />}
                </p>
              )}
              {!inTransit && isComplete && s.links && s.links.length > 0 && (
                <div className={`${styles.links} ${styles.linksReveal}`}>
                  {s.links.map(l =>
                    l.external ? (
                      <a
                        key={l.href}
                        href={l.href}
                        className={`${styles.linkChip} ${inter.className}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {l.label} ↗
                      </a>
                    ) : l.download ? (
                      <a key={l.href} href={l.href} download className={`${styles.linkChip} ${inter.className}`}>
                        {l.label} ⬇
                      </a>
                    ) : (
                      <Link key={l.href} href={l.href} className={`${styles.linkChip} ${inter.className}`}>
                        {l.label} →
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${styles.footer} ${inter.className}`}>
          <span className={styles.progress}>
            Stop {arrivedAt + 1} / {STEPS.length}
            {inTransit && <span className={styles.progressHint}> · Geo-Bot moving</span>}
            {talking && (
              <span className={styles.progressHint}>
                {' '}
                · {Math.min(100, Math.round((revealed / Math.max(1, dialogueCharCount(s.dialogue))) * 100))}%
              </span>
            )}
          </span>
          {!inTransit && !isComplete && (
            <button type="button" className={styles.skipBtn} onClick={skipLine}>
              Skip line
            </button>
          )}
          <button type="button" className={styles.navBtn} disabled={arrivedAt === 0 && !inTransit} onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnPrimary} ${orbitron.className}`}
            onClick={onPrimary}
            disabled={inTransit}
          >
            {inTransit ? 'En route' : !isComplete ? 'Finish line' : last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Orbitron, Inter } from 'next/font/google';
import styles from './RecruiterTour.module.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '800'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] });

/** One typed segment; optional emphasis. Use \n for line breaks inside dialogue. */
export type DialogueSeg = { s: string; strong?: boolean };

type Step = {
  tab: string;
  title: string;
  dialogue: DialogueSeg[];
  links?: { href: string; label: string; external?: boolean; download?: boolean }[];
};

const STEPS: Step[] = [
  {
    tab: 'Start',
    title: 'Welcome, recruiter!',
    dialogue: [
      { s: "I'm " },
      { s: 'Geo-Bot', strong: true },
      {
        s: " — your live guide on this site.\n\nOmid built me so you get the pitch in under a minute: who he is, what he ships, where to click — without scrolling a wall of text first.",
      },
      { s: '\n\n' },
      { s: 'Use the neon tabs up top, or tap ' },
      { s: 'Next', strong: true },
      { s: ' when my line finishes. Ready?' },
    ],
  },
  {
    tab: 'Who',
    title: 'Who is Omid?',
    dialogue: [
      { s: "He's a " },
      { s: 'GIS Developer', strong: true },
      { s: ' at Olsson — telecom engineering & design — based in ' },
      { s: 'Lincoln, Nebraska', strong: true },
      { s: '.' },
      { s: '\n\n' },
      {
        s: 'MS Geography / GIS&T from UNO with a 4.0. Former grad instructor (150+ students), GIS tech on the Omaha Spatial Justice Project, and earlier photogrammetry work overseas.',
      },
    ],
  },
  {
    tab: 'Impact',
    title: 'What he ships',
    dialogue: [
      {
        s: 'Python, SQL, ArcGIS Pro, and serious automation: bore profiles, fiber workflows, AI-assisted RFP pipelines on Azure and Google — toolboxes that replace days of manual work.',
      },
      { s: '\n\n' },
      { s: 'He cares about ' },
      { s: 'clarity', strong: true },
      { s: ', ' },
      { s: 'speed', strong: true },
      { s: ', and ' },
      { s: 'mentoring', strong: true },
      { s: ' — not just pretty maps.' },
    ],
  },
  {
    tab: 'Explore',
    title: 'Dig deeper',
    dialogue: [
      {
        s: "This isn't a PDF-only résumé. There's a Projects page, a full Tools hub — GIS downloader, converters, demos — and yes, a games lobby if you need a break.",
      },
      { s: '\n\n' },
      { s: 'Grab the PDF from the header anytime. When you are done here, I will point you to contact options.' },
    ],
    links: [
      { href: '/projects', label: 'Projects' },
      { href: '/tools', label: 'Tools hub' },
      { href: '/Omid-Zanganeh-Resume.pdf', label: 'Résumé PDF', download: true },
    ],
  },
  {
    tab: 'Hello',
    title: 'Say hello',
    dialogue: [
      { s: 'If the role fits, Omid would love a conversation. ' },
      { s: 'LinkedIn', strong: true },
      { s: ', ' },
      { s: 'email', strong: true },
      { s: ', or the ' },
      { s: 'contact form', strong: true },
      { s: ' at the bottom of this page — all fair game.' },
      { s: '\n\n' },
      {
        s: 'On request, he can provide ',
      },
      { s: 'recommendation letters', strong: true },
      {
        s: ' from supervisors and managers who have worked with him directly — so your decision can be grounded in more than a résumé scan.',
      },
      { s: '\n\n' },
      { s: 'Count on someone who ' },
      { s: 'gets the job done', strong: true },
      {
        s: ': dependable execution, clear communication, and deliverables that hold up when it matters. Stakeholders who have backed him have been ',
      },
      { s: 'proud of that decision', strong: true },
      {
        s: ' — and he works so they never need to regret it. That bar is what he holds himself to on every assignment.',
      },
      { s: '\n\n' },
      { s: 'Thanks for giving a GIS hire a real read. ' },
      { s: '🗺️', strong: true },
    ],
    links: [
      { href: 'https://www.linkedin.com/in/omidzanganeh/', label: 'LinkedIn', external: true },
      { href: 'mailto:ozanganeh@unomaha.edu', label: 'Email', external: true },
    ],
  },
];

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

function useDialogueTypewriter(segments: DialogueSeg[], step: number, msPerChar: number) {
  const total = useMemo(() => dialogueCharCount(segments), [segments]);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
  }, [step, segments]);

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
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const { revealed, isComplete, skipLine } = useDialogueTypewriter(s.dialogue, step, 22);
  const talking = !isComplete;

  const close = useCallback(() => {
    onClose();
    setStep(0);
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

  const last = step === STEPS.length - 1;

  const onPrimary = () => {
    if (!isComplete) {
      skipLine();
      return;
    }
    if (last) close();
    else setStep(i => i + 1);
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div className={`${styles.modal} ${orbitron.className}`} role="dialog" aria-modal="true" aria-labelledby="recruiter-tour-title">
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close tour">
          ✕
        </button>

        <div className={styles.header}>
          <p className={styles.kicker}>Live dialogue · NPC-style briefing</p>
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
              aria-selected={step === i}
              className={`${styles.tab} ${step === i ? styles.tabActive : ''}`}
              onClick={() => setStep(i)}
            >
              {st.tab}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          <div className={styles.stage}>
            <div className={`${styles.speech} ${inter.className}`}>
              <div className={styles.speechTop}>
                <h3 className={`${styles.stepTitle} ${orbitron.className}`}>{s.title}</h3>
                {talking && <span className={styles.liveBadge}>Speaking</span>}
              </div>
              <p className={`${styles.copy} ${styles.dialogueBox}`} aria-live="polite">
                {renderDialogue(s.dialogue, revealed)}
                {talking && <span className={styles.caret} aria-hidden />}
              </p>
              {isComplete && s.links && s.links.length > 0 && (
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

            <div className={styles.mascotCol}>
              <div
                className={`${styles.mascotRig} ${talking ? styles.mascotRigTalking : ''}`}
                data-step={String(step)}
                aria-hidden
              >
                <div className={styles.antenna}>
                  <span className={styles.antennaPulse} />
                </div>
                <div className={styles.mascotBody}>
                  <div className={styles.mascotHead}>
                    <div className={`${styles.eyeRow} ${talking ? styles.eyesLook : ''}`}>
                      <span className={styles.eye}>
                        <span className={styles.pupil} />
                      </span>
                      <span className={styles.eye}>
                        <span className={styles.pupil} />
                      </span>
                    </div>
                    <div className={`${styles.mouth} ${talking ? styles.mouthTalking : ''}`} />
                  </div>
                  <div className={styles.torso}>
                    <span className={`${styles.arm} ${styles.armL} ${talking ? styles.armWave : ''}`} />
                    <span className={`${styles.arm} ${styles.armR} ${talking ? styles.armWaveR : ''}`} />
                    <div className={styles.chestGlow} />
                  </div>
                  <div className={styles.mapBadge}>🗺️</div>
                </div>
              </div>
              <div className={`${styles.nameplate} ${orbitron.className}`}>
                <span className={styles.nameplateName}>Geo-Bot</span>
                <span className={styles.nameplateRole}>Tour host</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.footer} ${inter.className}`}>
          <span className={styles.progress}>
            Step {step + 1} / {STEPS.length}
            {talking && (
              <span className={styles.progressHint}>
                {' '}
                · {Math.min(100, Math.round((revealed / Math.max(1, dialogueCharCount(s.dialogue))) * 100))}%
              </span>
            )}
          </span>
          {!isComplete && (
            <button type="button" className={styles.skipBtn} onClick={skipLine}>
              Skip line
            </button>
          )}
          <button type="button" className={styles.navBtn} disabled={step === 0} onClick={() => setStep(i => Math.max(0, i - 1))}>
            Back
          </button>
          <button type="button" className={`${styles.navBtn} ${styles.navBtnPrimary} ${orbitron.className}`} onClick={onPrimary}>
            {!isComplete ? 'Finish line' : last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

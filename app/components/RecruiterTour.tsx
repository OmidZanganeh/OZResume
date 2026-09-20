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
  /** Mascot badge emoji for this step — defaults to 🗺️ if omitted. */
  badge?: string;
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
        s: " — Omid's live guide on this site.\n\nHe built me so you get the pitch in under a minute: who he is, what he ships, and why you can trust him to deliver — without scrolling a wall of text first.",
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
    badge: '🎓',
    dialogue: [
      { s: "He's a " },
      { s: 'Senior GIS Developer and Analyst', strong: true },
      { s: ' at Olsson, based in ' },
      { s: 'Lincoln, Nebraska', strong: true },
      { s: '.' },
      { s: '\n\n' },
      {
        s: 'MS Geography / GIS&T from UNO — 4.0 GPA, GRACA Project Award. Former grad instructor of record for 150+ students, and GIS tech on the Omaha Spatial Justice Project.',
      },
      { s: '\n\n' },
      { s: '2025 Edison Award Nominee and 2026 Edison Award Winner', strong: true },
      { s: ' at Olsson for demonstrating superior technical ability.' },
    ],
  },
  {
    tab: 'Ships',
    title: 'What he ships',
    badge: '🛠️',
    dialogue: [
      {
        s: 'ArcGIS Pro add-ins and Python/C# desktop apps that eliminate days of manual work: bore profile automation, FTTH network design, a Street View add-in for one-click field verification, and a density-based fiber expansion tool now running across ',
      },
      { s: 'multiple client engagements', strong: true },
      { s: '.' },
      { s: ' His GIS Data Downloader is adopted ' },
      { s: 'firm-wide', strong: true },
      { s: '.' },
      { s: '\n\n' },
      { s: 'Applied AI, built on Azure OpenAI: ' },
      { s: 'RFP Radar', strong: true },
      { s: ' compresses months of contract sourcing into hours, and a parcel-owner classifier flags development activity for fiber expansion — plus YOLO-based utility detection from aerial and street-level imagery.' },
      { s: '\n\n' },
      { s: 'He cares about ' },
      { s: 'clarity', strong: true },
      { s: ', ' },
      { s: 'speed', strong: true },
      { s: ', and ' },
      { s: 'real-world impact', strong: true },
      { s: ' — not just pretty maps.' },
    ],
  },
  {
    tab: 'Reliable',
    title: 'He gets the job done.',
    badge: '✅',
    dialogue: [
      { s: "Here's the thing recruiters actually need to know: " },
      { s: 'when Omid commits to a deliverable, it ships.', strong: true },
      { s: ' Not as a slogan — as a track record.' },
      { s: '\n\n' },
      { s: "His tools aren't demoed once and forgotten. They're adopted " },
      { s: 'firm-wide', strong: true },
      { s: ', or running across ' },
      { s: 'multiple client engagements', strong: true },
      { s: ' — which only happens when something is built to be depended on.' },
      { s: '\n\n' },
      { s: 'The ' },
      { s: '2026 Edison Award', strong: true },
      {
        s: " wasn't for one clever script. It was for a full year of production work that shipped, held up under real use, and kept saving the team real hours.",
      },
      { s: '\n\n' },
      { s: 'Bring him a hard problem, and expect it solved — on time, without drama, and without you needing to check in.' },
    ],
  },
  {
    tab: 'Explore',
    title: 'Dig deeper',
    badge: '🧭',
    dialogue: [
      {
        s: "This isn't a PDF-only résumé. Scroll the homepage for a Selected Projects rail and real LinkedIn posts about the work, or check out the Projects page, a full Tools hub, and yes — a games lobby if you need a break.",
      },
      { s: '\n\n' },
      { s: 'Grab the PDF from the header anytime. When you are done here, I will point you to contact options.' },
    ],
    links: [
      { href: '/projects', label: 'Projects' },
      { href: '/tools', label: 'Tools hub' },
      { href: '/Omid-Zanganeh-Resume.pdf', label: 'Résumé PDF', external: true },
    ],
  },
  {
    tab: 'Hello',
    title: 'Say hello',
    badge: '👋',
    dialogue: [
      { s: "If the role fits, Omid would love a conversation — " },
      { s: 'LinkedIn', strong: true },
      { s: ', ' },
      { s: 'email', strong: true },
      { s: ', or the ' },
      { s: 'contact form', strong: true },
      { s: ' at the bottom of this page all work.' },
      { s: '\n\n' },
      { s: 'On request, he can share ' },
      { s: 'recommendation letters', strong: true },
      {
        s: ' from supervisors and managers who have worked with him directly — so your decision can be grounded in more than a résumé scan.',
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
                  <div className={styles.mapBadge}>{s.badge ?? '🗺️'}</div>
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

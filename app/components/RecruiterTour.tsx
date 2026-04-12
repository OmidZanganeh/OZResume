'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Orbitron, Inter } from 'next/font/google';
import styles from './RecruiterTour.module.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '800'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] });

type Step = {
  tab: string;
  title: string;
  body: ReactNode;
  links?: { href: string; label: string; external?: boolean; download?: boolean }[];
};

const STEPS: Step[] = [
  {
    tab: 'Start',
    title: 'Welcome, recruiter!',
    body: (
      <>
        I&apos;m <strong>Geo-Bot</strong>, your quick tour guide on this site. Omid built me to say hi — and to show you why he&apos;s worth talking to — without making you scroll the whole resume first.
        <br />
        <br />
        Use the neon tabs up top or <strong>Next</strong> below. Takes about a minute. Let&apos;s go!
      </>
    ),
  },
  {
    tab: 'Who',
    title: 'Who is Omid?',
    body: (
      <>
        <strong>GIS Developer</strong> at Olsson (Telecom Engineering &amp; Design), based in <strong>Lincoln, Nebraska</strong>.
        <br />
        <br />
        MS Geography / GIS&amp;T from <strong>UNO — 4.0 GPA</strong>. Former grad instructor (150+ students), GIS tech on the Omaha Spatial Justice Project, and prior photogrammetry / mapping work overseas.
      </>
    ),
  },
  {
    tab: 'Impact',
    title: 'What he ships',
    body: (
      <>
        Heavy on <strong>Python</strong>, <strong>SQL</strong>, <strong>ArcGIS Pro</strong>, and automation: bore-profile tooling, fiber design workflows, AI-assisted RFP pipelines (Azure / Google), and production toolboxes that cut manual work dramatically.
        <br />
        <br />
        He cares about <strong>clarity</strong>, <strong>speed</strong>, and <strong>mentoring</strong> — not just maps on a screen.
      </>
    ),
  },
  {
    tab: 'Explore',
    title: 'Dig deeper here',
    body: (
      <>
        This site isn&apos;t only a PDF: there&apos;s a <strong>Projects</strong> page, a full <strong>Tools</strong> hub (GIS data downloader, coordinate tools, demos), and even a games lobby if you need a brain break.
        <br />
        <br />
        Grab the résumé PDF anytime from the header — or keep clicking through; I&apos;ll get you to contact options next.
      </>
    ),
    links: [
      { href: '/projects', label: 'Projects' },
      { href: '/tools', label: 'Tools hub' },
      { href: '/Omid-Zanganeh-Resume.pdf', label: 'Résumé PDF', download: true },
    ],
  },
  {
    tab: 'Hello',
    title: 'Say hello',
    body: (
      <>
        If the fit looks right, Omid would love a conversation. <strong>LinkedIn</strong>, <strong>email</strong>, or the <strong>contact form</strong> at the bottom of the homepage all work.
        <br />
        <br />
        Thanks for stopping by — and thanks for giving GIS folks a real read. 🗺️
      </>
    ),
    links: [
      { href: 'https://www.linkedin.com/in/omidzanganeh/', label: 'LinkedIn', external: true },
      { href: 'mailto:ozanganeh@unomaha.edu', label: 'Email', external: true },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RecruiterTour({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

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

  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div className={`${styles.modal} ${orbitron.className}`} role="dialog" aria-modal="true" aria-labelledby="recruiter-tour-title">
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close tour">
          ✕
        </button>

        <div className={styles.header}>
          <p className={styles.kicker}>Interactive briefing</p>
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
              <h3 className={`${styles.stepTitle} ${orbitron.className}`}>{s.title}</h3>
              <div key={step} className={`${styles.copy} ${styles.stepEnter}`}>
                {s.body}
              </div>
              {s.links && s.links.length > 0 && (
                <div className={styles.links}>
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
              <div className={styles.mascotWrap} data-step={String(step)}>
                <div className={styles.antenna} aria-hidden />
                <div className={styles.mascot} aria-hidden>
                  <div className={styles.eyeRow}>
                    <span className={styles.eye} />
                    <span className={styles.eye} />
                  </div>
                  <div className={styles.mouth} />
                  <div className={styles.mapBadge} title="GIS">
                    🗺️
                  </div>
                </div>
              </div>
              <div className={`${styles.nameplate} ${orbitron.className}`}>Geo-Bot</div>
            </div>
          </div>
        </div>

        <div className={`${styles.footer} ${inter.className}`}>
          <span className={styles.progress}>
            Step {step + 1} / {STEPS.length}
          </span>
          <button type="button" className={styles.navBtn} disabled={step === 0} onClick={() => setStep(i => Math.max(0, i - 1))}>
            Back
          </button>
          {last ? (
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrimary} ${orbitron.className}`} onClick={close}>
              Done
            </button>
          ) : (
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrimary} ${orbitron.className}`} onClick={() => setStep(i => Math.min(STEPS.length - 1, i + 1))}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

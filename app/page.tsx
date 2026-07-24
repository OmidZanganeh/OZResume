'use client';
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import TypeWriter from "./components/TypeWriter";
import CountUp from "./components/CountUp";
import DarkModeToggle from "./components/DarkModeToggle";
import JourneySection from "./components/JourneySection";
import ContactForm from "./components/ContactForm";
import GameHub from "./components/GameHub";
import RecruiterTour from "./components/RecruiterTour";
import VisitorCounter from "./components/VisitorCounter";
import HobbiesSection from "./components/HobbiesSection";
import ScrollFadeIn from "./components/ScrollFadeIn";
import LandsatNameSidebars from "./components/LandsatNameSidebars";
import PdfModal from "./components/PdfModal";
import BusinessCard from "./components/BusinessCard";
import FeaturedWork from "./components/FeaturedWork";
import LiveGeocodeDemo from "./components/LiveGeocodeDemo";
import EvidenceSkills from "./components/EvidenceSkills";

const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const EnvelopeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const DocumentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2l2.09 6.26L20.5 10l-6.41 2.09L12 18l-2.09-5.91L3.5 10l6.41-1.74L12 2z"/>
    <path d="M5 17l1 3 3-1-1 3-3-1 1-4zM19 3l1 3-3 1 1-3 1-1z"/>
  </svg>
);

const GamepadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
    <line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/>
    <rect width="20" height="12" x="2" y="6" rx="2"/>
  </svg>
);

const CardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

const AVATARS = ['/Omid.png', '/Omid2.png'] as const;

export default function Resume() {
  const [gameOpen, setGameOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<typeof AVATARS[number]>(AVATARS[0]);
  const [typeName, setTypeName] = useState(false);

  useEffect(() => {
    setAvatarSrc(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    try {
      const seen = sessionStorage.getItem('oz-name-typed');
      if (!seen) {
        setTypeName(true);
        sessionStorage.setItem('oz-name-typed', '1');
      }
    } catch {
      setTypeName(true);
    }
  }, []);

  return (
    <>
      <div className={styles.page}>
        {/* Top chrome — explore IA, not CTA pile */}
        <div className={styles.topChrome}>
          <nav className={styles.exploreNav} aria-label="Site">
            <a href="#work" className={styles.exploreLink}>Work</a>
            <a href="#build" className={styles.exploreLink}>Build</a>
            <a href="#experience" className={styles.exploreLink}>Experience</a>
            <Link href="/news" className={styles.exploreLink}>Notes</Link>
            <Link href="/tools" className={styles.exploreLink}>Tools</Link>
            <Link href="/web-apps" className={styles.exploreLink}>Apps</Link>
          </nav>
          <div className={styles.chromeActions}>
            <DarkModeToggle />
            <button type="button" className={styles.ghostBtn} onClick={() => setTourOpen(true)}>
              <SparklesIcon /> Tour
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setGameOpen(true)}>
              <GamepadIcon /> Bored?
            </button>
          </div>
        </div>

        {/* HERO — one composition */}
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.availableBadge}>
              <span className={styles.pulse} />
              Open to opportunities
            </div>

            <h1 className={styles.name}>
              {typeName ? (
                <TypeWriter text="Omid Zanganeh" speed={70} />
              ) : (
                'Omid Zanganeh'
              )}
            </h1>

            <p className={styles.headline}>
              I build production GIS and AI tools that cut fiber engineering from days to minutes.
            </p>
            <p className={styles.support}>
              GIS Developer at Olsson · 2026 Edison Award · Lincoln, Nebraska
            </p>

            <div className={styles.heroCtas}>
              <a href="#work" className={styles.primaryBtn}>
                See the work
              </a>
              <button type="button" onClick={() => setPdfOpen(true)} className={styles.secondaryBtn}>
                <DocumentIcon /> Resume
              </button>
            </div>

            <div className={styles.contactRow}>
              <a className={styles.contactItem} href="mailto:ozanganeh@unomaha.edu"><EnvelopeIcon /> Email</a>
              <a className={styles.contactItem} href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer"><LinkedInIcon /> LinkedIn</a>
              <a className={styles.contactItem} href="tel:+15312296873"><PhoneIcon /> Call</a>
              <button type="button" className={styles.contactItemBtn} onClick={() => setCardOpen(true)}>
                <CardIcon /> Card
              </button>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <Image
              src="/Bore-Profile-Automation.png"
              alt="Bore Profile Automation — production GIS tool screenshot"
              width={1200}
              height={800}
              className={styles.heroImage}
              priority
              sizes="(max-width: 900px) 100vw, 54vw"
            />
            <div className={styles.heroCaption}>
              <Image
                src={avatarSrc}
                alt="Omid Zanganeh"
                width={48}
                height={48}
                className={styles.heroAvatar}
              />
              <div>
                <p className={styles.heroCaptionTitle}>Bore Profile Automation</p>
                <p className={styles.heroCaptionMeta}>Directional drilling profiles · days → minutes</p>
              </div>
            </div>
          </div>
        </header>

        {/* Impact metrics — not cards of fluff */}
        <ScrollFadeIn delay={40}>
          <section className={styles.metrics} aria-label="Impact highlights">
            <div className={styles.metric}>
              <p className={styles.metricValue}><CountUp end={90} suffix="%" /></p>
              <p className={styles.metricLabel}>Fewer manual GIS steps on fiber design</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricValue}>Days → min</p>
              <p className={styles.metricLabel}>Bore profile generation at Olsson</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricValue}>Months → hrs</p>
              <p className={styles.metricLabel}>RFP sourcing with Azure AI</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricValue}>2026</p>
              <p className={styles.metricLabel}>Edison Award — superior technical ability</p>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Short about */}
        <ScrollFadeIn delay={60}>
          <section className={styles.aboutSection} aria-labelledby="about-heading">
            <h2 id="about-heading" className={styles.sectionTitlePlain}>About</h2>
            <div className={styles.aboutBody}>
              <p>
                I&apos;m a GIS Developer at Olsson specializing in telecom engineering, fiber network design,
                and enterprise workflow automation. I turn manual spatial work into production pipelines —
                Python and C# apps, ArcGIS Pro add-ins, and AI classifiers — that save design time and build cost.
              </p>
              <p>
                MS Geography (GIS&amp;T), University of Nebraska at Omaha, 4.0 GPA. Always open to connecting
                with people who care about geospatial craft and practical AI.
              </p>
            </div>
          </section>
        </ScrollFadeIn>

        <ScrollFadeIn delay={80}>
          <FeaturedWork />
        </ScrollFadeIn>

        <ScrollFadeIn delay={80}>
          <LiveGeocodeDemo />
        </ScrollFadeIn>

        {/* Experience + sidebar */}
        <div className={styles.grid} id="experience">
          <ScrollFadeIn delay={100} className={styles.gridFadeMain}>
            <main className={styles.mainCol}>
              <section className={styles.contentBlock}>
                <h2 className={styles.sectionTitlePlain}>Experience</h2>
                <div className={styles.jobList}>
                  <div className={styles.job}>
                    <div className={styles.jobMeta}>
                      <span className={styles.company}>Olsson</span>
                      <span className={styles.datePill}>Mar 2025 – Present</span>
                    </div>
                    <p className={styles.jobTitle}>
                      GIS Developer – Telecom Engineering &amp; Design{' '}
                      <span className={styles.awardBadge}>2026 Edison Award Winner</span>
                    </p>
                    <p className={styles.location}>Lincoln, Nebraska</p>
                    <ul className={styles.bullets}>
                      <li>Production Python/C# apps for fiber engineering — bore profiles cut from <strong>days to minutes</strong>.</li>
                      <li>ArcGIS Automation Suite — pocketing, conduit, centerlines, cost/routing — <CountUp end={90} suffix="%" /> fewer manual GIS steps.</li>
                      <li>ArcGIS Pro add-ins: multi-source data downloader, RF analysis, FTTH design, Street View tools.</li>
                      <li>Azure AI Foundry / OpenAI RFP Radar — sourcing timelines from <strong>months to hours</strong>.</li>
                      <li>YOLO aerial &amp; street-level detection for utility infrastructure inventory.</li>
                    </ul>
                  </div>

                  <div className={styles.job}>
                    <div className={styles.jobMeta}>
                      <span className={styles.company}>University of Nebraska at Omaha</span>
                      <span className={styles.datePill}>Jan 2024 – Aug 2025</span>
                    </div>
                    <p className={styles.jobTitle}>Graduate Teaching Assistant – Instructor of Record</p>
                    <p className={styles.location}>Omaha, Nebraska</p>
                    <ul className={styles.bullets}>
                      <li>Human-Environment Geography labs for <CountUp end={150} suffix="+ students" /> as sole instructor of record.</li>
                    </ul>
                  </div>

                  <div className={styles.job}>
                    <div className={styles.jobMeta}>
                      <span className={styles.company}>University of Nebraska at Omaha</span>
                      <span className={styles.datePill}>Jun 2024 – Aug 2025</span>
                    </div>
                    <p className={styles.jobTitle}>GIS Technician – Omaha Spatial Justice Project</p>
                    <p className={styles.location}>Omaha, Nebraska</p>
                    <ul className={styles.bullets}>
                      <li>Digitized historical parcels and mapped racially restrictive covenants in Douglas County.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className={styles.contentBlock}>
                <h2 className={styles.sectionTitlePlain}>Education</h2>
                <div className={styles.eduCard}>
                  <p className={styles.degree}>
                    M.S. Geography – GIS&amp;T
                    <span className={styles.gpaBadge}>GPA 4.00</span>
                    <span className={styles.awardBadge}>GRACA Award</span>
                  </p>
                  <p className={styles.school}>University of Nebraska at Omaha · August 2025</p>
                  <p className={styles.eduNote}>
                    Thesis: spatiotemporal NOx emissions from U.S. cement plants using TROPOMI data.
                  </p>
                </div>
                <div className={styles.eduCard}>
                  <p className={styles.degree}>B.S. Geomatics (Surveying) Engineering</p>
                  <p className={styles.school}>GCNCC, Tehran · August 2016</p>
                </div>
              </section>

              <JourneySection />
            </main>
          </ScrollFadeIn>

          <ScrollFadeIn direction="right" delay={120} className={styles.gridFadeSidebar}>
            <aside className={styles.sidebar}>
              <EvidenceSkills />

              <section>
                <h2 className={styles.sectionTitlePlain}>Hobbies</h2>
                <HobbiesSection compact />
              </section>

              <section>
                <h2 className={styles.sectionTitlePlain}>Languages</h2>
                <div className={styles.tags}>
                  <span className={`${styles.tag} ${styles.tagGreen}`}>English — Fluent</span>
                  <span className={`${styles.tag} ${styles.tagGreen}`}>Persian — Native</span>
                </div>
              </section>

              <section className={styles.buildLinks}>
                <h2 className={styles.sectionTitlePlain}>Shipped</h2>
                <Link href="/projects" className={styles.shipLink}>Projects gallery</Link>
                <Link href="/tools" className={styles.shipLink}>Free GIS tools</Link>
                <Link href="/web-apps" className={styles.shipLink}>Web apps &amp; PWAs</Link>
              </section>
            </aside>
          </ScrollFadeIn>

          <ScrollFadeIn delay={100} className={styles.gridFadeContact}>
            <div className={styles.contactCol} id="contact">
              <ContactForm />
            </div>
          </ScrollFadeIn>
        </div>

        {gameOpen && <GameHub onClose={() => setGameOpen(false)} />}
        <RecruiterTour open={tourOpen} onClose={() => setTourOpen(false)} />
        <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} pdfUrl="/Omid-Zanganeh-Resume.pdf" fileName="Omid-Zanganeh-Resume.pdf" />
        <BusinessCard open={cardOpen} onClose={() => setCardOpen(false)} />

        <ScrollFadeIn delay={50}>
          <footer className={styles.footer}>
            <LandsatNameSidebars />
            <div className={styles.footerBottom}>
              <p>GIS Developer · Lincoln, Nebraska</p>
              <p>
                <a href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                {' · '}
                <a href="mailto:ozanganeh@unomaha.edu">ozanganeh@unomaha.edu</a>
                {' · '}
                <VisitorCounter />
              </p>
            </div>
          </footer>
        </ScrollFadeIn>
      </div>
    </>
  );
}

'use client';
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import TypeWriter from "./components/TypeWriter";
import CountUp from "./components/CountUp";
import DarkModeToggle from "./components/DarkModeToggle";
import SkillBar from "./components/SkillBar";
import JourneySection from "./components/JourneySection";
import ContactForm from "./components/ContactForm";
import GameHub from "./components/GameHub";
import RecruiterTour from "./components/RecruiterTour";
import VisitorCounter from "./components/VisitorCounter";
import ToolsHoverCard from "./components/ToolsHoverCard";
import SkillRadar from "./components/SkillRadar";
import HobbiesSection from "./components/HobbiesSection";
import ScrollFadeIn from "./components/ScrollFadeIn";
import LandsatNameSidebars from "./components/LandsatNameSidebars";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────
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

const GlobeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const MapPinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
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

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const SignalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>
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

const AppWindowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2"/>
    <path d="M3 9h18"/>
  </svg>
);

const CogIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const CpuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
    <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
    <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
    <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
    <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
  </svg>
);

const NetworkIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
    <path d="M12 8v3.5m0 0L5 16m7-4.5L19 16"/>
  </svg>
);

const AVATARS = ['/Omid.png', '/Omid2.png'] as const;

export default function Resume() {
  const [gameOpen, setGameOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<typeof AVATARS[number]>(AVATARS[0]);

  useEffect(() => {
    setAvatarSrc(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  }, []);

  return (
    <>
      <div className={styles.container}>

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <DarkModeToggle />
          <button type="button" className={styles.tourBtn} onClick={() => setTourOpen(true)}>
            <SparklesIcon /> Recruiter tour
          </button>
          <button type="button" className={styles.boredBtn} onClick={() => setGameOpen(true)}>
            <GamepadIcon /> Bored?
          </button>
        </div>

        <div className={styles.headerMain}>
          <div className={styles.headerLeft}>
            {/* Available badge */}
            <div className={styles.availableBadge}>
              <span className={styles.pulse} />
              Open to Opportunities
            </div>

            <h1 className={styles.name}>
              <TypeWriter text="Omid Zanganeh" speed={80} />
            </h1>
            <p className={styles.tagline}>GIS Developer</p>

            <div className={styles.contact}>
              <a className={styles.contactItem} href="tel:+15312296873"><PhoneIcon /> +1 (531) 229-6873</a>
              <a className={styles.contactItem} href="mailto:ozanganeh@unomaha.edu"><EnvelopeIcon /> ozanganeh@unomaha.edu</a>
              <a className={styles.contactItem} href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer"><LinkedInIcon /> LinkedIn</a>
              <a className={styles.contactItem} href="https://arcg.is/1n1C4r" target="_blank" rel="noopener noreferrer"><GlobeIcon /> StoryMap</a>
              <span className={styles.contactItem}><MapPinIcon /> Lincoln, Nebraska</span>
            </div>

            <div className={styles.headerActions}>
              <a href="/Omid-Zanganeh-Resume.pdf" download className={styles.downloadBtn}>
                <DocumentIcon /> Resume
              </a>
              <Link href="/projects" className={styles.projectsBtn}>
                <FolderIcon /> Projects
              </Link>
              <Link href="/web-apps" className={styles.projectsBtn}>
                <AppWindowIcon /> Web apps
              </Link>
              <ToolsHoverCard suppressPopover={gameOpen} />
              <Link href="/news" className={styles.projectsBtn}>
                <SignalIcon /> AI News
              </Link>
            </div>
          </div>

          <div className={styles.avatarWrap}>
            <Image
              src={avatarSrc}
              alt="Omid Zanganeh"
              width={130}
              height={130}
              className={styles.avatar}
              priority
            />
          </div>
        </div>
      </header>


      {/* ══════════════════════════════════════
          ABOUT ME
      ══════════════════════════════════════ */}
      <ScrollFadeIn delay={50}>
      <section className={styles.aboutSection}>
        <h2 className={styles.sectionTitle}>About Me</h2>
        <div className={styles.aboutBody}>
          <p>
            I&apos;m a GIS Developer at Olsson, specializing in workflow automation, geospatial analysis,
            and application development to solve complex spatial challenges. I work extensively with ArcGIS Pro,
            Python, SQL, and remote sensing platforms to build high-performance tools for automating spatial
            workflows and supporting fiber-network market analysis and design.
          </p>
          <p>
            I hold a Master&apos;s in Geography with a concentration in GIS&amp;T from the University of Nebraska
            at Omaha, graduating with a <strong>4.0 GPA</strong>. My research earned the{' '}
            <strong>GRACA Project Award</strong> for spatiotemporal analysis of NOx emissions using TROPOMI
            satellite data. I also taught over <strong>150 students</strong> in Human-Environment Geography labs
            at UNO, emphasizing hands-on learning, inclusivity, and real-world applications.
          </p>
          <p>
            I contributed to the <strong>Omaha Spatial Justice Project</strong> as a GIS Technician —
            digitizing historical land parcels, reviewing legal documents, and building a geodatabase
            identifying homes with racially restrictive covenants in Douglas County. This work deepened
            my commitment to using GIS as a tool for social equity.
          </p>
          <p>
            With a proven record of delivering scalable GIS solutions, I&apos;m passionate about bridging
            technical expertise with practical impact — and always open to connecting with professionals
            who share my enthusiasm for solving spatial problems.
          </p>
        </div>
      </section>
      </ScrollFadeIn>

      {/* ══════════════════════════════════════
          CURRENTLY WORKING ON
      ══════════════════════════════════════ */}
      <ScrollFadeIn delay={80}>
      <section className={styles.nowSection}>
        <h2 className={styles.sectionTitle}>Currently Working On</h2>
        <div className={styles.nowGrid}>
          <div className={styles.nowCard}>
            <span className={styles.nowIcon}><CogIcon /></span>
            <div>
              <p className={styles.nowCardTitle}>Workflow Automation</p>
              <p className={styles.nowCardDesc}>
                Building Python and C# tools that eliminate repetitive GIS tasks — turning multi-day
                manual processes into fully automated pipelines.
              </p>
            </div>
          </div>
          <div className={styles.nowCard}>
            <span className={styles.nowIcon}><CpuIcon /></span>
            <div>
              <p className={styles.nowCardTitle}>AI-Powered Spatial Solutions</p>
              <p className={styles.nowCardDesc}>
                Developing AI agents using Azure AI Foundry and Google AI Studio for intelligent
                data classification, RFP sourcing, and web grounding at scale.
              </p>
            </div>
          </div>
          <div className={styles.nowCard}>
            <span className={styles.nowIcon}><NetworkIcon /></span>
            <div>
              <p className={styles.nowCardTitle}>Fiber Network Design Tools</p>
              <p className={styles.nowCardDesc}>
                Creating custom ArcGIS geoprocessing toolboxes to accelerate fiber network routing,
                cost estimation, and strategic market analysis for telecom expansion.
              </p>
            </div>
          </div>
        </div>
      </section>
      </ScrollFadeIn>

      {/* ══════════════════════════════════════
          MAIN GRID
      ══════════════════════════════════════ */}
      <div className={styles.grid}>

        {/* ── LEFT: Work Experience ── */}
        <ScrollFadeIn delay={100} className={styles.gridFadeMain}>
        <main className={styles.mainCol}>
          <section className={styles.contentCard}>
            <h2 className={styles.sectionTitle}>Work Experience</h2>
            <div className={styles.jobList}>

              <div className={styles.job}>
                <div className={styles.jobMeta}>
                  <span className={styles.company}>Olsson</span>
                  <span className={styles.datePill}>Mar 2025 – Present</span>
                </div>
                <p className={styles.jobTitle}>GIS Developer – Telecom Engineering &amp; Design <span className={styles.awardBadge}>Edison Award Nominee</span></p>
                <p className={styles.location}>Lincoln, Nebraska</p>
                <ul className={styles.bullets}>
                  <li>Developed Python and C# desktop applications for deep learning-based object detection, data parsing, and SQL Server management — improving efficiency across multiple workflows.</li>
                  <li>Built a fully automated bore profile generation app, cutting processing time from <strong>days to minutes</strong>.</li>
                  <li>Automated complex ArcGIS Pro workflows with custom Python geoprocessing toolboxes, reducing manual steps by <CountUp end={90} suffix="%" /> and accelerating fiber network design.</li>
                  <li>Designed fiber optic network layouts in ArcGIS to optimize routing, reduce build costs, and ensure full coverage.</li>
                  <li>Built AI-powered tools using Google AI Studio and Azure AI Foundry for RFP data classification — cutting sourcing time from <strong>months to hours</strong>.</li>
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
                  <li>Taught lab sections of Human-Environment Geography to over <CountUp end={150} suffix=" students" /> across three semesters as sole instructor of record.</li>
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
                  <li>Digitized historical land parcels to support urban spatial analysis, revealing patterns of racial exclusion. Reviewed legal documents to ensure accurate mapping and data integrity.</li>
                </ul>
              </div>

              <div className={styles.job}>
                <div className={styles.jobMeta}>
                  <span className={styles.company}>Geomatics College of National Cartographic Center</span>
                  <span className={styles.datePill}>2014 – 2016</span>
                </div>
                <p className={styles.jobTitle}>GIS Technician</p>
                <p className={styles.location}>Tehran, Iran</p>
                <ul className={styles.bullets}>
                  <li>Generated detailed urban maps from photogrammetric photos for city planning. Helped manage a database covering <CountUp end={60} suffix=" years" /> of aerial photography.</li>
                </ul>
              </div>

            </div>
          </section>

          {/* Education */}
          <section className={styles.contentCard}>
            <h2 className={styles.sectionTitle}>Education</h2>

            <div className={styles.eduCard}>
              <p className={styles.degree}>
                Master of Science: Geography – Geographic Information Science and Technology
                <span className={styles.gpaBadge}>GPA 4.00</span>
                <span className={styles.awardBadge}>GRACA Award</span>
              </p>
              <p className={styles.school}>University of Nebraska at Omaha, Nebraska</p>
              <p className={styles.eduDate}>August 2025</p>
              <p className={styles.eduCourseworkLabel}>Relevant Coursework:</p>
              <ul className={styles.bullets}>
                <li><strong>Geographic Information Systems I:</strong> ArcGIS Desktop &amp; Pro, Spatial Analysis, Georeferencing, Map Projections, Selections &amp; Queries, Data Editing, Buffering, Overlay &amp; Raster Analysis, Spatial Joins, Summarize, Statistics, Symbology &amp; Labels, Layout Design, Digitizing &amp; Snapping.</li>
                <li><strong>Geographic Information Systems II:</strong> ArcGIS Pro &amp; Enterprise, SQL, GIS Web Services, Web System Architecture, AWS Cloud, Spatial Data Management, GeoEvent, Web Mapping (ArcGIS Online).</li>
                <li><strong>Thesis:</strong> Spatiotemporal Analysis of NOx Emissions from U.S. Cement Plants Using TROPOMI Data – Remote Sensing, Temporal &amp; Hotspot Analysis, Environmental Visualization, Population Exposure &amp; Environmental Justice Analysis.</li>
              </ul>
            </div>

            <div className={styles.eduCard}>
              <p className={styles.degree}>Bachelor of Science: Geomatics (Surveying) Engineering</p>
              <p className={styles.school}>Geomatics College of National Cartographic Center (GCNCC), Tehran</p>
              <p className={styles.eduDate}>August 2016</p>
              <p className={styles.eduCourseworkLabel}>Relevant Coursework:</p>
              <ul className={styles.bullets}>
                <li>GIS, Applications of GIS, Numerical Mapping and AutoCAD, Fundamentals of Urbanization and Urban Planning, Fundamentals of Remote Sensing, Image Digital Processing, Advanced Software Packages and Applications.</li>
              </ul>
            </div>
          </section>

          {/* Journey Map */}
          <JourneySection />
        </main>
        </ScrollFadeIn>

        {/* ── RIGHT SIDEBAR (fly in from right) ── */}
        <ScrollFadeIn direction="right" delay={120} className={styles.gridFadeSidebar}>
        <aside className={styles.sidebar}>

          {/* Tools & Platforms — grouped by category */}
          <section>
            <h2 className={styles.sectionTitle}>Tools & Platforms</h2>
            <div className={styles.toolGroups}>
              <div className={styles.toolGroup}>
                <span className={styles.toolGroupLabel}>GIS & mapping</span>
                <div className={styles.toolTags}>
                  {["ArcGIS Pro", "ArcGIS Online", "ArcGIS Enterprise", "ArcGIS Experience Builder", "ArcGIS StoryMaps", "ArcGIS Survey123", "ArcGIS Field Maps", "ArcGIS Model Builder", "QGIS", "Web Mapping", "Google Earth", "Google Earth Engine Code Editor"].map(s => (
                    <span key={s} className={styles.toolTag}>{s}</span>
                  ))}
                </div>
              </div>
              <div className={styles.toolGroup}>
                <span className={styles.toolGroupLabel}>Data & dev</span>
                <div className={styles.toolTags}>
                  {["SQL Server Management Studio", "Tableau", "GitHub Copilot"].map(s => (
                    <span key={s} className={styles.toolTag}>{s}</span>
                  ))}
                </div>
              </div>
              <div className={styles.toolGroup}>
                <span className={styles.toolGroupLabel}>Imagery & design</span>
                <div className={styles.toolTags}>
                  {["SNAP", "AutoCAD", "ENVI", "Photomod", "Adobe Photoshop", "Adobe Illustrator"].map(s => (
                    <span key={s} className={styles.toolTag}>{s}</span>
                  ))}
                </div>
              </div>
              <div className={styles.toolGroup}>
                <span className={styles.toolGroupLabel}>Cloud & AI</span>
                <div className={styles.toolTags}>
                  {["Microsoft Azure", "Microsoft Azure AI Foundry", "Google Cloud Services", "Google AI Studio"].map(s => (
                    <span key={s} className={styles.toolTag}>{s}</span>
                  ))}
                </div>
              </div>
              <div className={styles.toolGroup}>
                <span className={styles.toolGroupLabel}>Productivity</span>
                <div className={styles.toolTags}>
                  {["Microsoft 365", "Smartsheet", "Slack", "Microsoft Teams", "Notion", "OneNote", "OneDrive", "SharePoint"].map(s => (
                    <span key={s} className={styles.toolTag}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Skills at a Glance (spider web only) */}
          <section>
            <h2 className={styles.sectionTitle}>Skills at a Glance</h2>
            <SkillRadar compact />
          </section>

          {/* Skill Bars */}
          <section>
            <h2 className={styles.sectionTitle}>Coding Skills</h2>
            <SkillBar label="Python" level={95} />
            <SkillBar label="SQL" level={85} />
            <SkillBar label="C#" level={80} />
            <SkillBar label="JavaScript" level={75} />
            <SkillBar label="AI/ML" level={70} />
            <SkillBar label="Arcade" level={50} />
          </section>

          {/* Hobbies & Life Balance */}
          <section>
            <h2 className={styles.sectionTitle}>Hobbies</h2>
            <HobbiesSection compact />
          </section>

          {/* Languages */}
          <section>
            <h2 className={styles.sectionTitle}>Languages</h2>
            <div className={styles.tags}>
              <span className={`${styles.tag} ${styles.tagGreen}`}>English — Fluent</span>
              <span className={`${styles.tag} ${styles.tagGreen}`}>Persian — Native</span>
            </div>
          </section>

        </aside>
        </ScrollFadeIn>

        {/* Contact Form: same column as main on desktop, last on mobile */}
        <ScrollFadeIn delay={100} className={styles.gridFadeContact}>
        <div className={styles.contactCol}>
          <ContactForm />
        </div>
        </ScrollFadeIn>
      </div>

      {/* ══════════════════════════════════════
          GAME MODAL
      ══════════════════════════════════════ */}
      {gameOpen && <GameHub onClose={() => setGameOpen(false)} />}
      <RecruiterTour open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <ScrollFadeIn delay={50}>
      <footer className={styles.footer}>
        <LandsatNameSidebars />
        <div className={styles.footerBottom}>
          <p>GIS Developer · Lincoln, Nebraska</p>
          <p>
            <a href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            {' · '}
            <a href="https://arcg.is/1n1C4r" target="_blank" rel="noopener noreferrer">StoryMap</a>
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

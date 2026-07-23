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
import WebAppsHoverCard from "./components/WebAppsHoverCard";
import SkillRadar from "./components/SkillRadar";
import HobbiesSection from "./components/HobbiesSection";
import ScrollFadeIn from "./components/ScrollFadeIn";
import LandsatNameSidebars from "./components/LandsatNameSidebars";
import PdfModal from "./components/PdfModal";
import BusinessCard from "./components/BusinessCard";

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

const CardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
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
  const [pdfOpen, setPdfOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
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
            <p className={styles.tagline}>GIS Developer · Telecom Engineering &amp; AI/ML Integration</p>

            <div className={styles.contact}>
              <a className={styles.contactItem} href="tel:+15312296873"><PhoneIcon /> +1 (531) 229-6873</a>
              <a className={styles.contactItem} href="mailto:ozanganeh@unomaha.edu"><EnvelopeIcon /> ozanganeh@unomaha.edu</a>
              <a className={styles.contactItem} href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer"><LinkedInIcon /> LinkedIn</a>
              <a className={styles.contactItem} href="https://arcg.is/1n1C4r" target="_blank" rel="noopener noreferrer"><GlobeIcon /> StoryMap</a>
              <span className={styles.contactItem}><MapPinIcon /> Lincoln, Nebraska</span>
            </div>

            <div className={styles.headerActions}>
              <button type="button" onClick={() => setPdfOpen(true)} className={styles.downloadBtn}>
                <DocumentIcon /> Resume
              </button>
              <button type="button" onClick={() => setCardOpen(true)} className={styles.downloadBtn}>
                <CardIcon /> Card
              </button>
              <Link href="/projects" className={styles.projectsBtn}>
                <FolderIcon /> Projects
              </Link>
              <WebAppsHoverCard suppressPopover={gameOpen} />
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
            I&apos;m a GIS Developer at Olsson specializing in telecom engineering, fiber network design,
            and enterprise workflow automation. I turn manual, time-intensive spatial work into
            production-grade pipelines — Python and C# desktop apps, ArcGIS Pro add-ins, Python
            geoprocessing toolboxes, and SQL Server integrations — that deliver measurable savings
            in design time, build cost, and market analysis.
          </p>
          <p>
            At Olsson, I build end-to-end tools across the fiber lifecycle: automated bore profile
            generation (<strong>days to minutes</strong>), a suite of ArcGIS automation tools for
            pocketing, conduit drawing, centerlines, and cable consolidation (~<strong>90% reduction</strong>{' '}
            in manual GIS steps), FTTH network design add-ins, and RF planning panels for wireless
            coverage, interference, and tower optimization. I also ship custom ArcGIS Pro add-ins
            that pull multi-source GIS data (OSM, USGS, FEMA, Census, BSL) directly into project geodatabases.
          </p>
          <p>
            A major thread of my work is applied AI for real engineering bottlenecks. Using Microsoft
            Azure AI Foundry, Azure OpenAI, and Google AI Studio, I built RFP Radar for intelligent
            contract sourcing and classification (<strong>months to hours</strong>), batch SQL-integrated
            classifiers for property and tabular enrichment, and YOLO-based object detection for remote
            utility infrastructure inventory via aerial and street-level imagery. I won
            Olsson&apos;s <strong>2026 Edison Award</strong> for these automation contributions.
          </p>
          <p>
            Beyond enterprise GIS, I build full-stack web products: a Next.js portfolio site with
            browser-based GIS tools (geocoder, isochrone, elevation profile, census, coordinate
            conversion, PDF/image utilities) and an offline-first Gym Flow fitness PWA with nutrition
            logging and cloud sync.
          </p>
          <p>
            I hold a Master&apos;s in Geography (GIS&amp;T) from the University of Nebraska at Omaha
            (<strong>4.0 GPA</strong>). My thesis on spatiotemporal NOx emissions from U.S. cement
            plants using TROPOMI data earned the <strong>GRACA Project Award</strong>. I taught
            Human-Environment Geography labs to <strong>150+ students</strong> as instructor of record
            and contributed GIS work to the <strong>Omaha Spatial Justice Project</strong>, digitizing
            historical parcels and mapping racially restrictive covenants in Douglas County.
          </p>
          <p>
            I&apos;m passionate about bridging geospatial science, software engineering, and applied AI
            to solve complex spatial problems with practical impact — and always open to connecting
            with others who share that focus.
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
                <p className={styles.jobTitle}>GIS Developer – Telecom Engineering &amp; Design <span className={styles.awardBadge}>2026 Edison Award Winner</span></p>
                <p className={styles.location}>Lincoln, Nebraska</p>
                <ul className={styles.bullets}>
                  <li>Architected production Python and C# desktop applications for fiber telecom engineering, including automated bore profile generation that cut processing time from <strong>days to minutes</strong>.</li>
                  <li>Built an ArcGIS Automation Suite of custom Python geoprocessing toolboxes — pocketing, conduit drawing, centerline generation, cable route consolidation, cost/routing — reducing manual GIS steps by <CountUp end={90} suffix="%" /> and accelerating fiber network design timelines.</li>
                  <li>Developed ArcGIS Pro add-ins (.NET/C#/WPF): multi-source GIS Data Downloader (OSM, USGS, FEMA, Census/TIGER, BSL), RF Analysis panel (coverage prediction, PCI/RSI planning, interference analysis, tower placement), Street View map tool, and FTTH network design dock pane.</li>
                  <li>Engineered AI-powered tools using Azure AI Foundry, Azure OpenAI, and Google AI Studio — including RFP Radar for intelligent web-grounded contract search and classification — cutting strategic sourcing timelines from <strong>months to hours</strong>.</li>
                  <li>Built YOLO-based aerial and street-level object detection apps for remote inventory of utility poles, streetlights, and telecom infrastructure with georeferenced ArcGIS export.</li>
                  <li>Created GeoPipe: a GUI ETL application for importing large geospatial/tabular datasets into SQL Server with schema auto-detection, spatial type support, and connection-loss recovery.</li>
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
                  <li>Digitized historical land parcels from archival documents and aerial photography; reviewed legal records to build an accurate geodatabase of racially restrictive covenants in Douglas County, supporting urban spatial justice research.</li>
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
      <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} pdfUrl="/Omid-Zanganeh-Resume.pdf" fileName="Omid-Zanganeh-Resume.pdf" />
      <BusinessCard open={cardOpen} onClose={() => setCardOpen(false)} />

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

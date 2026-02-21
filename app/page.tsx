'use client';
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";
import TypeWriter from "./components/TypeWriter";
import CountUp from "./components/CountUp";
import DarkModeToggle from "./components/DarkModeToggle";
import SkillBar from "./components/SkillBar";
import JourneySection from "./components/JourneySection";
import ContactForm from "./components/ContactForm";
import GameHub from "./components/GameHub";
import GithubHeatmap from "./components/GithubHeatmap";
import VisitorCounter from "./components/VisitorCounter";
import SkillRadar from "./components/SkillRadar";
import HobbiesSection from "./components/HobbiesSection";

export default function Resume() {
  const [gameOpen, setGameOpen] = useState(false);
  return (
    <div className={styles.container}>

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <DarkModeToggle />
          <button className={styles.boredBtn} onClick={() => setGameOpen(true)}>
            🎮 Bored?
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
            <p className={styles.tagline}>GIS Associate Technician &amp; Developer</p>

            <div className={styles.contact}>
              <a className={styles.contactItem} href="tel:+15312296873">📞 +1 (531) 229-6873</a>
              <a className={styles.contactItem} href="mailto:ozanganeh@unomaha.edu">✉ ozanganeh@unomaha.edu</a>
              <a className={styles.contactItem} href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer">🔗 LinkedIn</a>
              <a className={styles.contactItem} href="https://arcg.is/1n1C4r" target="_blank" rel="noopener noreferrer">🌐 StoryMap</a>
              <span className={styles.contactItem}>📍 Lincoln, Nebraska</span>
            </div>

            <div className={styles.headerActions}>
              <a href="/Omid-Zanganeh-Resume.pdf" download className={styles.downloadBtn}>
                [ ↓ Download Resume ]
              </a>
              <Link href="/projects" className={styles.projectsBtn}>
                [ View Projects → ]
              </Link>
            </div>
          </div>

          <Image
            src="/Omid.png"
            alt="Omid Zanganeh"
            width={130}
            height={130}
            className={styles.avatar}
            priority
          />
        </div>
      </header>

      {/* ══════════════════════════════════════
          IMPACT NUMBERS
      ══════════════════════════════════════ */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statNum}><CountUp end={90} suffix="%" /></div>
          <div className={styles.statLabel}>Reduction in Manual Steps</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}><CountUp end={150} suffix="+" /></div>
          <div className={styles.statLabel}>Students Taught</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}><CountUp end={60} suffix=" yrs" /></div>
          <div className={styles.statLabel}>of Aerial Data Managed</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}><CountUp end={4} suffix="+" /></div>
          <div className={styles.statLabel}>AI Apps Built</div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ABOUT ME
      ══════════════════════════════════════ */}
      <section className={styles.aboutSection}>
        <h2 className={styles.sectionTitle}>About Me</h2>
        <div className={styles.aboutBody}>
          <p>
            I&apos;m a GIS Associate Technician at Olsson, specializing in workflow automation, geospatial analysis,
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

      {/* ══════════════════════════════════════
          CURRENTLY WORKING ON
      ══════════════════════════════════════ */}
      <section className={styles.nowSection}>
        <h2 className={styles.sectionTitle}>Currently Working On</h2>
        <div className={styles.nowGrid}>
          <div className={styles.nowCard}>
            <span className={styles.nowIcon}>⚙️</span>
            <div>
              <p className={styles.nowCardTitle}>Workflow Automation</p>
              <p className={styles.nowCardDesc}>
                Building Python and C# tools that eliminate repetitive GIS tasks — turning multi-day
                manual processes into fully automated pipelines.
              </p>
            </div>
          </div>
          <div className={styles.nowCard}>
            <span className={styles.nowIcon}>🤖</span>
            <div>
              <p className={styles.nowCardTitle}>AI-Powered Spatial Solutions</p>
              <p className={styles.nowCardDesc}>
                Developing AI agents using Azure AI Foundry and Google AI Studio for intelligent
                data classification, RFP sourcing, and web grounding at scale.
              </p>
            </div>
          </div>
          <div className={styles.nowCard}>
            <span className={styles.nowIcon}>🌐</span>
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

      {/* ══════════════════════════════════════
          MAIN GRID
      ══════════════════════════════════════ */}
      <div className={styles.grid}>

        {/* ── LEFT: Work Experience ── */}
        <main className={styles.mainCol}>
          <section>
            <h2 className={styles.sectionTitle}>Work Experience</h2>
            <div className={styles.jobList}>

              <div className={styles.job}>
                <div className={styles.jobMeta}>
                  <span className={styles.company}>Olsson</span>
                  <span className={styles.datePill}>Mar 2025 – Present</span>
                </div>
                <p className={styles.jobTitle}>GIS Associate Technician – Telecom Engineering &amp; Design</p>
                <p className={styles.location}>Lincoln, Nebraska</p>
                <ul className={styles.bullets}>
                  <li>Developed Python and C# desktop applications for deep learning-based object detection, data parsing, and SQL Server management — improving efficiency across multiple workflows.</li>
                  <li>Built a fully automated bore profile generation app, cutting processing time from <strong>days to minutes</strong>.</li>
                  <li>Automated complex ArcGIS Pro workflows with custom Python geoprocessing toolboxes, reducing manual steps by <CountUp end={90} suffix="%" /> and accelerating fiber network design.</li>
                  <li>Designed fiber optic network layouts in ArcGIS to optimize routing, reduce build costs, and ensure full coverage.</li>
                  <li>Built AI-powered tools using Google AI Studio and Azure AI Foundry for RFP data classification — cutting sourcing time from <strong>months to hours</strong>.</li>
                  <li>Nominated for the <strong>2025 Edison Award</strong> at Olsson for innovative contributions to workflow automation.</li>
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

          {/* Journey Map */}
          <JourneySection />

          {/* Contact Form */}
          <ContactForm />
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className={styles.sidebar}>

          {/* Education */}
          <section>
            <h2 className={styles.sectionTitle}>Education</h2>

            <div className={styles.eduCard}>
              <p className={styles.degree}>
                M.S. Geography – GIS &amp; Technology
                <span className={styles.gpaBadge}>GPA 4.00</span>
              </p>
              <p className={styles.school}>University of Nebraska at Omaha</p>
              <p className={styles.eduDate}>August 2025</p>
              <ul className={styles.bullets}>
                <li>Thesis: Spatiotemporal Analysis of NOx Emissions from U.S. Cement Plants using TROPOMI</li>
                <li>ArcGIS Pro · SQL · AWS · Remote Sensing</li>
              </ul>
            </div>

            <div className={styles.eduCard}>
              <p className={styles.degree}>B.S. Geomatics (Surveying) Engineering</p>
              <p className={styles.school}>Geomatics College of NCC, Tehran</p>
              <p className={styles.eduDate}>August 2016</p>
              <ul className={styles.bullets}>
                <li>GIS · Remote Sensing · AutoCAD · Image Processing</li>
              </ul>
            </div>
          </section>

          {/* Tool Tags */}
          <section>
            <h2 className={styles.sectionTitle}>Tools & Platforms</h2>
            <div className={styles.tags}>
              {["ArcGIS Pro", "ArcGIS Online", "ArcGIS Enterprise", "QGIS", "Google Earth Engine",
                "Azure AI Foundry", "Google AI Studio", "SQL Server", "Tableau",
                "AutoCAD", "GitHub Copilot", "Microsoft Azure"].map(s => (
                <span key={s} className={styles.tag}>{s}</span>
              ))}
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
      </div>

      {/* ══════════════════════════════════════
          GAME MODAL
      ══════════════════════════════════════ */}
      {gameOpen && <GameHub onClose={() => setGameOpen(false)} />}

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className={styles.footer}>
        <div className={styles.footerBottom}>
          <p><strong>Omid Zanganeh</strong> · GIS Associate Technician &amp; Developer · Lincoln, Nebraska</p>
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

    </div>
  );
}

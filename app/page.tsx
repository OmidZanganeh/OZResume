import Image from "next/image";
import styles from "./page.module.css";

export default function Resume() {
  return (
    <div className={styles.container}>

      {/* ══════════════════════════════
          HEADER
      ══════════════════════════════ */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.name}>Omid Zanganeh</h1>
          <p className={styles.tagline}>GIS Associate Technician &amp; Software Developer</p>
          <div className={styles.contact}>
            <span className={styles.contactItem}>📍 Lincoln, Nebraska</span>
            <a className={styles.contactItem} href="tel:+15312296873">📞 +1 (531) 229-6873</a>
            <a className={styles.contactItem} href="mailto:ozanganeh@unomaha.edu">✉ ozanganeh@unomaha.edu</a>
            <a className={styles.contactItem} href="https://www.linkedin.com/in/omidzanganeh/" target="_blank" rel="noopener noreferrer">🔗 LinkedIn</a>
            <a className={styles.contactItem} href="https://arcg.is/1n1C4r" target="_blank" rel="noopener noreferrer">🌐 StoryMap</a>
          </div>
        </div>
        <Image
          src="/Omid.png"
          alt="Omid Zanganeh"
          width={120}
          height={120}
          className={styles.avatar}
          priority
        />
      </header>

      {/* ══════════════════════════════
          MAIN GRID
      ══════════════════════════════ */}
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
                  <li>Automated complex ArcGIS Pro workflows with custom Python geoprocessing toolboxes, reducing manual steps by <strong>90%</strong> and accelerating fiber network design and cost estimation.</li>
                  <li>Designed fiber optic network layouts in ArcGIS to optimize routing, reduce build costs, and ensure full coverage.</li>
                  <li>Built AI-powered tools using Google AI Studio and Microsoft Azure AI Foundry for RFP data classification and web grounding — cutting sourcing time from <strong>months to hours</strong>.</li>
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
                  <li>Taught lab sections of Human-Environment Geography to over <strong>150 students</strong> across three semesters as sole instructor of record.</li>
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
                  <li>Digitized historical land parcels to support urban spatial analysis, revealing patterns of racial exclusion. Reviewed legal documents to extract and organize data, ensuring mapping accuracy and integrity.</li>
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
                  <li>Generated detailed urban maps from photogrammetric photos to support city planning. Contributed to maintaining a database covering <strong>60 years</strong> of aerial photography.</li>
                </ul>
              </div>

            </div>
          </section>
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className={styles.sidebar}>

          {/* Education */}
          <section>
            <h2 className={styles.sectionTitle}>Education</h2>
            <div className={styles.eduList}>

              <div className={styles.eduCard}>
                <p className={styles.degree}>
                  M.S. Geography – GIS &amp; Technology
                  <span className={styles.gpaBadge}>GPA 4.00</span>
                </p>
                <p className={styles.school}>University of Nebraska at Omaha</p>
                <p className={styles.eduDate}>August 2025</p>
                <ul className={styles.bullets}>
                  <li>Thesis: Spatiotemporal Analysis of NOx Emissions from U.S. Cement Plants Using TROPOMI Data</li>
                  <li>ArcGIS Pro &amp; Enterprise · SQL · AWS · Remote Sensing</li>
                </ul>
              </div>

              <div className={styles.eduCard}>
                <p className={styles.degree}>B.S. Geomatics (Surveying) Engineering</p>
                <p className={styles.school}>Geomatics College of National Cartographic Center, Tehran</p>
                <p className={styles.eduDate}>August 2016</p>
                <ul className={styles.bullets}>
                  <li>GIS · Remote Sensing · AutoCAD · Image Processing</li>
                </ul>
              </div>

            </div>
          </section>

          {/* Skills */}
          <section>
            <h2 className={styles.sectionTitle}>Skills</h2>

            <div className={styles.skillGroup}>
              <p className={styles.skillGroupLabel}>Coding</p>
              <div className={styles.tags}>
                {["Python", "C#", "SQL", "HTML & JS", "Machine Learning", "API Integration", "Automation"].map(s => (
                  <span key={s} className={styles.tag}>{s}</span>
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <p className={styles.skillGroupLabel}>Software & Platforms</p>
              <div className={styles.tags}>
                {["ArcGIS Pro", "ArcGIS Online", "ArcGIS Enterprise", "QGIS", "Google Earth Engine", "Azure AI Foundry", "Google AI Studio", "SQL Server", "Tableau", "AutoCAD", "GitHub Copilot"].map(s => (
                  <span key={s} className={styles.tag}>{s}</span>
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <p className={styles.skillGroupLabel}>Professional</p>
              <div className={styles.tags}>
                {["Problem Solving", "Agile", "Project Management", "Research & Analysis", "Strategic Planning"].map(s => (
                  <span key={s} className={styles.tag}>{s}</span>
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <p className={styles.skillGroupLabel}>Languages</p>
              <div className={styles.tags}>
                <span className={`${styles.tag} ${styles.tagGreen}`}>English — Fluent</span>
                <span className={`${styles.tag} ${styles.tagGreen}`}>Persian — Native</span>
              </div>
            </div>
          </section>

        </aside>
      </div>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <p><strong>Omid Zanganeh</strong> · GIS Associate Technician &amp; Software Developer · Lincoln, Nebraska</p>
        <p>For detailed projects, training &amp; certifications — <a href="https://arcg.is/1n1C4r" target="_blank" rel="noopener noreferrer">visit my StoryMap</a></p>
      </footer>

    </div>
  );
}

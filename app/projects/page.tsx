import Link from "next/link";
import styles from "./page.module.css";

const projects = [
  {
    icon: "🤖",
    title: "RFP Radar",
    subtitle: "AI-Powered RFP Sourcing Tool",
    problem: "Manual RFP searching required analysts to spend months reviewing thousands of government contracts to find relevant opportunities.",
    solution: "Built an AI-powered pipeline using Azure AI Foundry and Google AI Studio to automate data classification, web grounding, and intelligent matching of RFPs to company capabilities.",
    impact: ["Processing time reduced from months to hours", "Automated classification of thousands of contracts", "Deployed as a production tool at Olsson"],
    tech: ["Python", "Azure AI Foundry", "Google AI Studio", "ArcGIS", "SQL Server"],
    color: "var(--accent-blue)",
  },
  {
    icon: "⚙️",
    title: "Bore Profile Generator",
    subtitle: "Automated Boring Profile Application",
    problem: "Generating bore profiles for fiber network directional drilling required days of manual drafting, creating bottlenecks in project timelines.",
    solution: "Developed a fully automated desktop application in Python and C# that reads spatial data, processes elevation models, and generates production-ready bore profile drawings automatically.",
    impact: ["Processing time cut from days to minutes", "Eliminated manual drafting errors", "Deployed across telecom engineering team at Olsson"],
    tech: ["Python", "C#", "ArcGIS Pro", "SQL Server", ".NET"],
    color: "var(--accent-orange)",
  },
  {
    icon: "🛠️",
    title: "ArcGIS Automation Suite",
    subtitle: "Custom Python Geoprocessing Toolboxes",
    problem: "Complex fiber network design workflows required repetitive manual GIS operations, slowing down engineers and creating inconsistencies.",
    solution: "Developed a suite of custom Python geoprocessing toolboxes for ArcGIS Pro that automate routing analysis, cost estimation, and network design workflows.",
    impact: ["90% reduction in manual processing steps", "Accelerated fiber network design timelines", "Improved cost estimation accuracy"],
    tech: ["Python", "ArcGIS Pro", "Geoprocessing", "Spatial Analysis", "NetworkX"],
    color: "var(--accent-cyan, #06B6D4)",
  },
  {
    icon: "🗺️",
    title: "NOx Emissions Analysis",
    subtitle: "MS Thesis — Spatiotemporal Remote Sensing",
    problem: "Limited understanding of spatiotemporal patterns of NOx emissions from U.S. cement plants and their environmental justice implications.",
    solution: "Used TROPOMI satellite data to perform spatiotemporal hotspot analysis of NOx emissions, correlating emission patterns with population demographics and environmental justice indicators.",
    impact: ["Full MS thesis — GPA 4.00", "Remote sensing analysis of all U.S. cement plants", "Environmental justice exposure analysis for affected populations"],
    tech: ["Python", "TROPOMI / Sentinel-5P", "Google Earth Engine", "SNAP", "Spatial Statistics"],
    color: "var(--accent-green)",
  },
  {
    icon: "⚖️",
    title: "Omaha Spatial Justice Project",
    subtitle: "Historical GIS & Urban Analysis",
    problem: "Historical patterns of racial exclusion in Omaha real estate were undocumented spatially, making it difficult to understand the geographic scope of discriminatory practices.",
    solution: "Digitized historical land parcels from archival documents and aerial photography, georeferenced historical maps, and built a spatial database revealing redlining and racial covenant patterns.",
    impact: ["Revealed spatial patterns of racial exclusion", "Contributed to urban spatial justice research", "Accurate historical parcel database for Omaha"],
    tech: ["ArcGIS Pro", "Georeferencing", "Digitizing", "Historical GIS", "Python"],
    color: "var(--accent-orange)",
  },
];

export default function Projects() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Back to Resume</Link>
        <h1 className={styles.title}>Projects</h1>
        <p className={styles.subtitle}>A deeper look at what I&apos;ve built — problems solved, tools used, and impact delivered.</p>
      </header>

      <div className={styles.list}>
        {projects.map((p, i) => (
          <article key={i} className={styles.card} style={{ borderLeftColor: p.color }}>
            <div className={styles.cardHeader}>
              <div className={styles.cardLeft}>
                <span className={styles.icon}>{p.icon}</span>
                <div>
                  <h2 className={styles.cardTitle}>{p.title}</h2>
                  <p className={styles.cardSubtitle}>{p.subtitle}</p>
                </div>
              </div>
              <div className={styles.techTags}>
                {p.tech.map(t => (
                  <span key={t} className={styles.techTag}>{t}</span>
                ))}
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.block}>
                <h3 className={styles.blockLabel}>Problem</h3>
                <p className={styles.blockText}>{p.problem}</p>
              </div>
              <div className={styles.block}>
                <h3 className={styles.blockLabel}>Solution</h3>
                <p className={styles.blockText}>{p.solution}</p>
              </div>
              <div className={styles.block}>
                <h3 className={styles.blockLabel}>Impact</h3>
                <ul className={styles.impactList}>
                  {p.impact.map((item, j) => (
                    <li key={j} className={styles.impactItem}>
                      <span className={styles.impactDot} style={{ background: p.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className={styles.footer}>
        <Link href="/" className={styles.back}>← Back to Resume</Link>
        <p>Want to collaborate? <a href="mailto:ozanganeh@unomaha.edu">ozanganeh@unomaha.edu</a></p>
      </footer>
    </div>
  );
}

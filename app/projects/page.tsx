import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

const projects = [
  {
    icon: "🤖",
    title: "RFP Radar",
    subtitle: "AI-Powered RFP Sourcing Tool",
    image: "/RFP.png",
    problem: "Manual RFP searching required analysts to spend months reviewing thousands of government contracts to find relevant fiber and telecom opportunities.",
    solution: "Built a production desktop application using Azure OpenAI (GPT-5.1) and Google AI Studio to automate web grounding, intelligent classification, and matching of RFPs to company capabilities. Features batch search, URL validation, and CSV export.",
    impact: ["Processing time reduced from months to hours", "Automated classification of thousands of contracts", "Deployed as a production tool at Olsson"],
    tech: ["Python", "Azure OpenAI", "Google AI Studio", "ArcGIS", "SQL Server"],
    color: "var(--accent-blue)",
  },
  {
    icon: "🛩️",
    title: "Aerial AI Object Detection",
    subtitle: "YOLO-Based Utility Infrastructure Detection from Aerial Imagery",
    image: "/Aerial-AI-Object-Detection.png",
    problem: "Identifying utility poles, streetlights, and telecom infrastructure in aerial imagery required expensive manual inspection across large geographic areas.",
    solution: "Built a desktop application that fetches high-resolution aerial tiles by coordinate, runs a custom-trained YOLO model to detect utility assets, and exports georeferenced results to ArcGIS. Supports single-point, grid, and area scanning modes with tile navigation controls.",
    impact: ["Automated detection of utility poles and streetlights from aerial tiles", "Georeferenced export to GIS-ready formats", "Custom YOLO model trained on telecom infrastructure classes"],
    tech: ["Python", "YOLO", "Aerial Imagery API", "ArcGIS", "OpenCV"],
    color: "var(--accent-cyan, #06B6D4)",
  },
  {
    icon: "🚶",
    title: "Streetview AI Object Detection",
    subtitle: "YOLO-Based Infrastructure Detection Along Street Routes",
    image: "/Streetview-AI-Object-Detection.png",
    problem: "Field surveys for utility poles and telecom equipment require costly in-person visits, and traditional GIS methods cannot identify specific physical assets from ground level.",
    solution: "Built a desktop application that traverses streets using street-level imagery, running a custom YOLO model to detect and classify utility infrastructure. Supports line traversal, panoramic capture, and area buffering with step-by-step navigation controls.",
    impact: ["Remote field survey capability without site visits", "Automated inventory of streetside utility assets", "Configurable traversal distance and panoramic heading coverage"],
    tech: ["Python", "YOLO", "Street-Level Imagery API", "ArcGIS", "OpenCV"],
    color: "var(--accent-green)",
  },
  {
    icon: "⚙️",
    title: "Bore Profile Automation",
    subtitle: "Automated Directional Drilling Profile Generator",
    image: "/Bore-Profile-Automation.png",
    problem: "Generating bore profiles for fiber network directional drilling required days of manual drafting, creating bottlenecks in project timelines and introducing human error.",
    solution: "Developed a fully automated desktop application that reads spatial waypoints from an interactive map, processes elevation models, calculates bore depth and slope, and generates production-ready 2D and 3D elevation profiles with configurable running lines and break points.",
    impact: ["Processing time cut from days to minutes", "Eliminated manual drafting errors", "Deployed across the telecom engineering team at Olsson"],
    tech: ["Python", "C#", "ArcGIS Pro", "SQL Server", ".NET"],
    color: "var(--accent-orange)",
  },
  {
    icon: "🛠️",
    title: "ArcGIS Automation Suite",
    subtitle: "Custom Python Geoprocessing Toolboxes",
    image: null,
    problem: "Complex fiber network design workflows required repetitive manual GIS operations, slowing down engineers and creating inconsistencies across projects.",
    solution: "Developed a suite of custom Python geoprocessing toolboxes for ArcGIS Pro that automate routing analysis, cost estimation, and network design workflows.",
    impact: ["90% reduction in manual processing steps", "Accelerated fiber network design timelines", "Improved cost estimation accuracy"],
    tech: ["Python", "ArcGIS Pro", "Geoprocessing", "Spatial Analysis", "NetworkX"],
    color: "var(--accent-blue)",
  },
  {
    icon: "🗺️",
    title: "NOx Emissions Analysis",
    subtitle: "MS Thesis — Spatiotemporal Remote Sensing",
    image: null,
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
    image: null,
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

            {p.image && (
              <div className={styles.screenshotWrap}>
                <Image
                  src={p.image}
                  alt={`${p.title} screenshot`}
                  width={1200}
                  height={700}
                  className={styles.screenshot}
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                />
                <div className={styles.screenshotBar}>
                  <span className={styles.screenshotDot} />
                  <span className={styles.screenshotDot} />
                  <span className={styles.screenshotDot} />
                  <span className={styles.screenshotLabel}>{p.title}</span>
                </div>
              </div>
            )}

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

import Link from 'next/link';
import styles from './EvidenceSkills.module.css';

const EVIDENCE = [
  {
    skill: 'Python',
    proof: 'Bore profiles, ArcGIS toolboxes, YOLO pipelines',
    href: '/projects',
  },
  {
    skill: 'C# / ArcGIS Pro SDK',
    proof: 'FTTH designer, RF planning, data downloader add-ins',
    href: '/projects',
  },
  {
    skill: 'Azure AI / OpenAI',
    proof: 'RFP Radar — months of sourcing → hours',
    href: '/projects',
  },
  {
    skill: 'SQL Server',
    proof: 'GeoPipe ETL + statewide parcel streaming',
    href: '/projects',
  },
  {
    skill: 'Computer vision',
    proof: 'Aerial & street-level utility detection',
    href: '/projects',
  },
  {
    skill: 'Web GIS',
    proof: 'Browser tools: geocoder, isochrone, elevation',
    href: '/tools',
  },
] as const;

const SIGNATURE_TOOLS = [
  'ArcGIS Pro',
  'Python',
  'C# / .NET',
  'SQL Server',
  'Azure AI Foundry',
  'YOLO',
  'Next.js',
  'QGIS',
] as const;

export default function EvidenceSkills() {
  return (
    <section className={styles.section} aria-labelledby="skills-heading">
      <h2 id="skills-heading" className={styles.title}>
        Skills with proof
      </h2>
      <p className={styles.lead}>Each skill links to shipped work — not a self-score.</p>

      <ul className={styles.list}>
        {EVIDENCE.map((row) => (
          <li key={row.skill}>
            <Link href={row.href} className={styles.row}>
              <span className={styles.skill}>{row.skill}</span>
              <span className={styles.proof}>{row.proof}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.toolsBlock}>
        <p className={styles.toolsLabel}>Signature stack</p>
        <div className={styles.tools}>
          {SIGNATURE_TOOLS.map((t) => (
            <span key={t} className={styles.tool}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

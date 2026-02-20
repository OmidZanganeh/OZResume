import styles from './JourneySection.module.css';

const stops = [
  {
    city: 'Tehran',
    country: 'Iran',
    years: '2014 – 2016',
    role: 'GIS Technician',
    org: 'Geomatics College of NCC',
    color: 'var(--accent-orange)',
  },
  {
    city: 'Omaha',
    country: 'Nebraska, USA',
    years: '2023 – 2025',
    role: 'Graduate Researcher & Instructor',
    org: 'University of Nebraska Omaha',
    color: 'var(--accent-blue)',
  },
  {
    city: 'Lincoln',
    country: 'Nebraska, USA',
    years: '2025 – Present',
    role: 'GIS Associate Technician',
    org: 'Olsson',
    color: 'var(--accent-green)',
  },
];

export default function JourneySection() {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>My Journey</h2>
      <div className={styles.track}>
        {stops.map((stop, i) => (
          <div key={stop.city} className={styles.stop}>
            <div className={styles.pin} style={{ borderColor: stop.color }}>
              <div className={styles.pinDot} style={{ background: stop.color }} />
            </div>
            {i < stops.length - 1 && (
              <div className={styles.line}>
                <svg viewBox="0 0 120 8" preserveAspectRatio="none">
                  <path
                    d="M0,4 Q30,1 60,4 T120,4"
                    stroke="var(--border-dark)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    fill="none"
                  />
                </svg>
                <span className={styles.arrow}>✈</span>
              </div>
            )}
            <div className={styles.info}>
              <span className={styles.city}>{stop.city}</span>
              <span className={styles.country}>{stop.country}</span>
              <span className={styles.years}>{stop.years}</span>
              <span className={styles.role}>{stop.role}</span>
              <span className={styles.org}>{stop.org}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

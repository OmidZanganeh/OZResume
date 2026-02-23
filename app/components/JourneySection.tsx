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
    role: 'GIS Developer',
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
          <div key={stop.city} className={`${styles.stop} ${i < stops.length - 1 ? styles.stopWithLine : ''}`}>
            {/* Pin row */}
            <div className={styles.pinRow}>
              <div className={styles.pin} style={{ borderColor: stop.color }}>
                <div className={styles.pinDot} style={{ background: stop.color }} />
              </div>
              {i < stops.length - 1 && (
                <div className={styles.line}>
                  <svg viewBox="0 0 100 8" preserveAspectRatio="none" width="100%" height="100%">
                    <path
                      d="M0,4 Q25,1 50,4 T100,4"
                      stroke="var(--border-dark)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      fill="none"
                    />
                  </svg>
                  <span className={styles.plane}>✈</span>
                </div>
              )}
            </div>

            {/* Info below pin — normal flow */}
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

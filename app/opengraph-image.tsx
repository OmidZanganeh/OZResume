import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Omid Zanganeh – GIS & Developer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#f5f2eb',
          display: 'flex', flexDirection: 'column',
          padding: '60px 72px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#3b82f6', display: 'flex' }} />

        {/* OZ monogram */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#3b82f6', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 28, fontWeight: 700,
          marginBottom: 28,
        }}>
          OZ
        </div>

        {/* Name */}
        <div style={{ fontSize: 72, fontWeight: 700, color: '#2c2a25', lineHeight: 1, marginBottom: 16, display: 'flex' }}>
          Omid Zanganeh
        </div>

        {/* Title */}
        <div style={{ fontSize: 32, color: '#6b6760', marginBottom: 40, display: 'flex' }}>
          GIS Associate Technician &amp; Developer
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
          {['🗺️ GIS & Spatial', '🤖 AI Automation', '🐍 Python', '🛰️ Remote Sensing', '🔌 Fiber Networks'].map(tag => (
            <div key={tag} style={{
              background: '#e8e4db', border: '1px solid #c8c4bc',
              borderRadius: 8, padding: '8px 16px',
              fontSize: 20, color: '#4a4845', display: 'flex',
            }}>
              {tag}
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 48, marginTop: 'auto' }}>
          {[
            { value: '4.0', label: 'MS GPA' },
            { value: '3+', label: 'Years at Olsson' },
            { value: '150+', label: 'Students Taught' },
            { value: '5+', label: 'Production Tools Built' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: '#3b82f6', display: 'flex' }}>{s.value}</div>
              <div style={{ fontSize: 18, color: '#8a8680', display: 'flex' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', bottom: 36, right: 72,
          fontSize: 22, color: '#a39f92', display: 'flex',
        }}>
          omidzanganeh.com
        </div>
      </div>
    ),
    { ...size }
  );
}

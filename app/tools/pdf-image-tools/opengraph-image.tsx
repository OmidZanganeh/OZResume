import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Free PDF merge, compress, split and image converter — runs in your browser';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 50%, #1e3a5f 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            PDF
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 22, color: '#94a3b8', fontWeight: 600 }}>Free online tools</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
              PDF &amp; image tools
            </div>
          </div>
        </div>

        <div style={{ fontSize: 26, color: '#cbd5e1', lineHeight: 1.45, marginBottom: 36, maxWidth: 920 }}>
          Merge &amp; split PDFs · compress PDFs · JPG ↔ PDF · convert PNG, WebP, AVIF, BMP, ICO · resize images — no upload, runs in your browser.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 'auto' }}>
          {['Merge PDF', 'Compress', 'Split', 'Image convert', 'Resize', 'ICO / BMP'].map(label => (
            <div
              key={label}
              style={{
                background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(59,130,246,0.45)',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 20,
                color: '#e2e8f0',
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 64,
            fontSize: 22,
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          omidzanganeh.com/tools/pdf-image-tools
        </div>
      </div>
    ),
    { ...size },
  );
}

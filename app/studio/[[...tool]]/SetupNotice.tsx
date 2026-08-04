const steps = [
  ['Create a free project', 'Go to sanity.io/manage and create a project. Name it anything.'],
  ['Copy the Project ID', 'It is on the project overview page — a short string like "abc12xyz".'],
  [
    'Add it to Vercel',
    'Project → Settings → Environment Variables. Add NEXT_PUBLIC_SANITY_PROJECT_ID with that value, and NEXT_PUBLIC_SANITY_DATASET set to "production". Apply to all environments.',
  ],
  [
    'Allow this site to talk to Sanity',
    'In sanity.io/manage → API → CORS origins, add https://omidzanganeh.com and http://localhost:3000, both with "Allow credentials" checked.',
  ],
  ['Redeploy', 'Push any commit, or hit Redeploy in Vercel. Then come back to /studio and sign in.'],
];

export default function SetupNotice() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: '1.75rem', margin: '0 0 .5rem', color: '#fff' }}>
          Studio is installed — one step left
        </h1>
        <p style={{ margin: '0 0 2rem', lineHeight: 1.6, color: '#94a3b8' }}>
          The editor code is deployed, but it needs a Sanity project to connect to. This takes about
          five minutes and only has to be done once. Until then the site keeps serving its built-in
          content, so nothing is broken.
        </p>

        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {steps.map(([title, detail], i) => (
            <li key={title} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <span
                style={{
                  flex: '0 0 1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: '#0d7a8a',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '.875rem',
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <div>
                <p style={{ margin: '.25rem 0 .25rem', fontWeight: 600, color: '#fff' }}>{title}</p>
                <p style={{ margin: 0, lineHeight: 1.6, color: '#94a3b8', fontSize: '.9375rem' }}>
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p style={{ marginTop: '2rem', fontSize: '.875rem', color: '#64748b' }}>
          Full walkthrough: <code style={{ color: '#0d7a8a' }}>docs/CMS-SETUP.md</code> in the repo.
        </p>
      </div>
    </main>
  );
}

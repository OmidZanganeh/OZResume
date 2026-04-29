'use client';

import { useEffect, useRef } from 'react';

export default function GymFlowOauthClosePage() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const origin = window.location.origin;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'gym-flow-oauth-success' }, origin);
      }
    } finally {
      window.close();
      window.setTimeout(() => {
        if (!window.closed) {
          window.location.replace('/gym-flow/');
        }
      }, 400);
    }
  }, []);

  return (
    <p
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '1.5rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.95rem',
      }}
    >
      Signed in. This window should close automatically.
    </p>
  );
}

'use client';

import { useEffect, useRef } from 'react';

function resolveParentOriginForPostMessage(): string {
  if (typeof window === 'undefined') return '';
  const raw = new URLSearchParams(window.location.search).get('parentOrigin');
  if (!raw) return window.location.origin;
  try {
    const u = new URL(raw);
    if (u.hostname !== window.location.hostname) return window.location.origin;
    return u.origin;
  } catch {
    return window.location.origin;
  }
}

export default function GymFlowOauthClosePage() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const targetOrigin = resolveParentOriginForPostMessage();
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'gym-flow-oauth-success' }, targetOrigin);
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

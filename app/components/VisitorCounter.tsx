'use client';
import { useEffect, useState } from 'react';

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const SESSION_KEY = 'oz_visited';
    const alreadyCounted = sessionStorage.getItem(SESSION_KEY);

    if (alreadyCounted) {
      fetch('/api/visitors').then(r => r.json()).then(d => setCount(d.count));
    } else {
      sessionStorage.setItem(SESSION_KEY, '1');
      fetch('/api/visitors', { method: 'POST' })
        .then(r => r.json())
        .then(d => setCount(d.count));
    }
  }, []);

  if (!count) return null;

  return (
    <span style={{
      fontSize: '0.78em',
      color: 'var(--text-muted)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
    }}>
      👁 {count.toLocaleString()} {count === 1 ? 'visit' : 'visits'}
    </span>
  );
}

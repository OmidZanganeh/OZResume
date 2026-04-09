'use client';
import { useEffect, useRef } from 'react';
import styles from './FlappyBird.module.css';

interface Props {
  playerName: string;
  leaders: { name: string; score: number }[];
  onFinish: (score: number) => void;
}

const FLAPPY_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyP', 'Escape'];

export default function FlappyBird({ onFinish }: Props) {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Forward relevant key events from the parent page into the iframe,
    // because the iframe only receives keyboard input when it has focus
    // (which only happens after a click inside it).
    const forwardKey = (e: KeyboardEvent) => {
      if (!FLAPPY_KEYS.includes(e.code)) return;
      // Prevent the parent page from scrolling on Space / ArrowUp
      e.preventDefault();
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'flappy-keydown', code: e.code },
        '*',
      );
    };
    window.addEventListener('keydown', forwardKey);

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'flappy-gameover') {
        onFinishRef.current(e.data.score as number);
      }
    };
    window.addEventListener('message', handler);

    return () => {
      window.removeEventListener('keydown', forwardKey);
      window.removeEventListener('message', handler);
    };
  }, []);

  return (
    <div className={styles.container}>
      <iframe
        ref={iframeRef}
        src="/games/flappy/index.html"
        className={styles.iframe}
        title="Flappy SPLAT!"
        scrolling="no"
        allow="autoplay"
      />
    </div>
  );
}

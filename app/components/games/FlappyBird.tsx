'use client';
import { useEffect, useRef } from 'react';
import styles from './FlappyBird.module.css';

interface Props {
  playerName: string;
  leaders: { name: string; score: number }[];
  onFinish: (score: number) => void;
}

export default function FlappyBird({ onFinish }: Props) {
  // Keep ref so the handler always sees the latest onFinish
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'flappy-gameover') {
        onFinishRef.current(e.data.score as number);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div className={styles.container}>
      <iframe
        src="/games/flappy/index.html"
        className={styles.iframe}
        title="Flappy SPLAT!"
        scrolling="no"
        allow="autoplay"
      />
    </div>
  );
}

'use client';
import { useTheme } from '../context/ThemeContext';
import styles from './DarkModeToggle.module.css';

export default function DarkModeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={styles.toggle}
      aria-label="Toggle dark mode"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { NewsArticle } from '../api/ai-news/route';
import styles from './page.module.css';

const REFRESH_SECS = 900; // 15 minutes

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function PlaceholderThumb({ section }: { section: string }) {
  return (
    <div className={styles.thumbPlaceholder}>
      <span className={styles.thumbSection}>{section}</span>
    </div>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <div className={styles.cardThumb}>
        {article.thumbnail && !imgErr ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            className={styles.cardImg}
            onError={() => setImgErr(true)}
          />
        ) : (
          <PlaceholderThumb section={article.section} />
        )}
        <span className={styles.sectionBadge}>{article.section}</span>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardMeta}>{timeAgo(article.date)}</p>
        <h3 className={styles.cardTitle}>{article.title}</h3>
        {article.trail && (
          <p className={styles.cardTrail}>{article.trail}</p>
        )}
        <span className={styles.readLink}>Read full article →</span>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skeletonThumb} ${styles.shimmer}`} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine} ${styles.skeletonShort} ${styles.shimmer}`} />
        <div className={`${styles.skeletonLine} ${styles.shimmer}`} />
        <div className={`${styles.skeletonLine} ${styles.shimmer}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonMed} ${styles.shimmer}`} />
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [articles, setArticles]     = useState<NewsArticle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [fetchedAt, setFetchedAt]   = useState<string | null>(null);
  const [countdown, setCountdown]   = useState(REFRESH_SECS);
  const [refreshing, setRefreshing] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/ai-news?cat=ai', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setArticles(data.articles ?? []);
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
      setCountdown(REFRESH_SECS);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Auto-refresh countdown
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { fetchNews(); return REFRESH_SECS; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [fetchNews]);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn}>← Back</Link>
        <div className={styles.headerCenter}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleGlow}>AI News Feed</span>
          </h1>
          <p className={styles.pageSubtitle}>Latest artificial intelligence headlines — auto-refreshes every 15 min</p>
        </div>
        <div className={styles.refreshBar}>
          {fetchedAt && (
            <span className={styles.lastUpdated}>Updated {timeAgo(fetchedAt)}</span>
          )}
          <button
            className={`${styles.refreshBtn} ${refreshing ? styles.refreshBtnSpin : ''}`}
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            title="Refresh now"
          >
            ↻
          </button>
          <span className={styles.countdown}>{formatCountdown(countdown)}</span>
        </div>
      </header>

      {/* ── Content ── */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <p className={styles.errorIcon}>⚠️</p>
            <p className={styles.errorMsg}>Couldn&apos;t load the news feed.</p>
            <button className={styles.retryBtn} onClick={() => fetchNews()}>Try again</button>
          </div>
        ) : articles.length === 0 ? (
          <div className={styles.errorState}>
            <p className={styles.errorMsg}>No articles found right now. Try refreshing.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {articles.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        Powered by{' '}
        <a
          href="https://open-platform.theguardian.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          The Guardian Open Platform
        </a>
      </footer>
    </div>
  );
}

'use client';

import type { Stock, StockMetrics } from './types';
import { CARD_METRICS, type MetricTone } from './metricStyles';
import styles from './StockScreener.module.css';

interface Props {
  stock: Stock;
  metrics: StockMetrics;
  visible: boolean;
  isHistorical: boolean;
  returnToTodayPct: number;
  priceThen: number;
  rsiPeriod: number;
}

function toneClass(tone: MetricTone): string {
  switch (tone) {
    case 'good': return styles.metricGood;
    case 'warn': return styles.metricWarn;
    case 'bad': return styles.metricBad;
    default: return styles.metricNeutral;
  }
}

function fmtReturn(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function StockCard({
  stock, metrics, visible, isHistorical, returnToTodayPct, priceThen, rsiPeriod,
}: Props) {
  return (
    <article
      className={`${styles.card} ${visible ? styles.cardVisible : styles.cardHidden}`}
      aria-hidden={!visible}
    >
      <header className={styles.cardHeader}>
        <div>
          <span className={styles.ticker}>{stock.ticker}</span>
          <h3 className={styles.companyName}>{stock.companyName}</h3>
        </div>
        <span className={styles.sectorBadge}>{stock.sector}</span>
      </header>

      {isHistorical && (
        <div className={styles.growthRow}>
          <span className={styles.growthLabel}>Return to today</span>
          <span className={
            returnToTodayPct > 0 ? styles.growthUp
              : returnToTodayPct < 0 ? styles.growthDown
                : styles.growthFlat
          }>
            {fmtReturn(returnToTodayPct)}
          </span>
          <span className={styles.growthPrice}>
            ${priceThen.toFixed(2)} → ${stock.price.toFixed(2)}
          </span>
        </div>
      )}

      <dl className={styles.metricGrid}>
        {CARD_METRICS.map(({ key, label, format, tone }) => (
          <div key={key} className={styles.metricItem}>
            <dt>{key === 'rsi' ? `RSI (${rsiPeriod})` : label}</dt>
            <dd className={tone ? toneClass(tone(metrics[key])) : styles.metricNeutral}>
              {format(metrics[key], rsiPeriod)}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

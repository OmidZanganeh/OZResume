'use client';

import type { Stock, StockMetrics } from './types';
import { peTone, epsTone, debtTone, rsiTone } from './metricStyles';
import type { MetricTone } from './metricStyles';
import styles from './StockScreener.module.css';

interface Props {
  stock: Stock;
  metrics: StockMetrics;
  visible: boolean;
  isHistorical: boolean;
  returnToTodayPct: number;
  priceThen: number;
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
  stock, metrics, visible, isHistorical, returnToTodayPct, priceThen,
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
        <div className={styles.metricItem}>
          <dt>P/E{isHistorical ? ' then' : ''}</dt>
          <dd className={toneClass(peTone(metrics.peRatio))}>{metrics.peRatio.toFixed(1)}</dd>
        </div>
        <div className={styles.metricItem}>
          <dt>EPS Gr.</dt>
          <dd className={toneClass(epsTone(metrics.epsGrowth))}>
            {metrics.epsGrowth > 0 ? '+' : ''}{metrics.epsGrowth.toFixed(1)}%
          </dd>
        </div>
        <div className={styles.metricItem}>
          <dt>D/E</dt>
          <dd className={toneClass(debtTone(metrics.debtToEquity))}>{metrics.debtToEquity.toFixed(2)}</dd>
        </div>
        <div className={styles.metricItem}>
          <dt>RSI</dt>
          <dd className={toneClass(rsiTone(metrics.rsi))}>{metrics.rsi.toFixed(0)}</dd>
        </div>
      </dl>

      {isHistorical && (
        <div className={styles.todayPeek}>
          <span className={styles.todayPeekLabel}>Today</span>
          <span className={styles.todayPeekMetrics}>
            P/E {stock.peRatio.toFixed(0)} · EPS {stock.epsGrowth > 0 ? '+' : ''}{stock.epsGrowth.toFixed(0)}% · ${stock.price.toFixed(0)}
          </span>
        </div>
      )}
    </article>
  );
}

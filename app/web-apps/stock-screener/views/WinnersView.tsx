'use client';

import { useMemo } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import type { Stock } from '../types';
import type { WinnerScanResult } from '../winnerScan';
import {
  WINNER_LOOKBACK_OPTIONS,
  WINNER_RETURN_THRESHOLDS,
} from '../winnerScan';
import { yahooQuoteUrl } from '../yahooFinanceUrl';
import chartStyles from '../charts/Charts.module.css';

interface Props {
  scan: WinnerScanResult | null;
  loading: boolean;
  lookbackDays: number;
  minReturnPct: number;
  maxWinners: number;
  stocks: Stock[];
  onLookbackChange: (days: number) => void;
  onMinReturnChange: (pct: number) => void;
  onMaxWinnersChange: (n: number) => void;
  onSelectTicker: (ticker: string) => void;
  onAnalyzeInTable: (winnerTickers: string[], lookbackDays: number) => void;
  onAnalyzeMatchesInTable: (matchTickers: string[], winnerTickers: string[], lookbackDays: number) => void;
}

function fmtReturn(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function WinnersView({
  scan,
  loading,
  lookbackDays,
  minReturnPct,
  maxWinners,
  stocks,
  onLookbackChange,
  onMinReturnChange,
  onMaxWinnersChange,
  onSelectTicker,
  onAnalyzeInTable,
  onAnalyzeMatchesInTable,
}: Props) {
  const stockByTicker = useMemo(
    () => new Map(stocks.map(s => [s.ticker, s])),
    [stocks],
  );

  const winnerTickers = scan?.winners.map(w => w.ticker) ?? [];
  const matchTickers = scan?.todayMatches.map(m => m.ticker) ?? [];

  return (
    <div className={chartStyles.winnersLayout}>
      <div className={chartStyles.winnersIntro}>
        <Trophy size={18} aria-hidden />
        <div>
          <h2 className={chartStyles.winnersTitle}>Historical winners → today&apos;s matches</h2>
          <p className={chartStyles.winnersSub}>
            Scans past returns from a lookback date, builds a blended pattern from the biggest
            winners, then ranks today&apos;s universe by weekly momentum + fundamentals similarity.
            Use the actions below to continue in Table, Charts, or Compare.
          </p>
        </div>
      </div>

      <div className={chartStyles.winnersControls}>
        <div className={chartStyles.winnersControlGroup}>
          <span className={chartStyles.winnersControlLabel}>Lookback</span>
          <div className={chartStyles.winnersChipRow}>
            {WINNER_LOOKBACK_OPTIONS.map(opt => (
              <button
                key={opt.days}
                type="button"
                className={`${chartStyles.winnersChip} ${lookbackDays === opt.days ? chartStyles.winnersChipActive : ''}`}
                onClick={() => onLookbackChange(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={chartStyles.winnersControlGroup}>
          <span className={chartStyles.winnersControlLabel}>Min return → today</span>
          <div className={chartStyles.winnersChipRow}>
            {WINNER_RETURN_THRESHOLDS.map(th => (
              <button
                key={th}
                type="button"
                className={`${chartStyles.winnersChip} ${minReturnPct === th ? chartStyles.winnersChipActive : ''}`}
                onClick={() => onMinReturnChange(th)}
              >
                +{th}%
              </button>
            ))}
          </div>
        </div>

        <div className={chartStyles.winnersControlGroup}>
          <span className={chartStyles.winnersControlLabel}>Max winners</span>
          <div className={chartStyles.winnersChipRow}>
            {[8, 12, 16].map(n => (
              <button
                key={n}
                type="button"
                className={`${chartStyles.winnersChip} ${maxWinners === n ? chartStyles.winnersChipActive : ''}`}
                onClick={() => onMaxWinnersChange(n)}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <p className={chartStyles.viewEmpty}>
          <Loader2 size={16} className={chartStyles.winnersSpinner} aria-hidden />
          Building historical snapshots…
        </p>
      )}

      {!loading && scan && scan.winners.length === 0 && (
        <p className={chartStyles.viewEmpty}>
          No stocks met +{minReturnPct}% from {scan.asOfLabel} to today.
          Try a lower return threshold or a different lookback.
        </p>
      )}

      {!loading && scan && scan.winners.length > 0 && (
        <>
          <div className={chartStyles.winnersSectionHead}>
            <div>
              <h3 className={chartStyles.winnersSectionTitle}>
                <TrendingUp size={16} aria-hidden />
                Winners at {scan.asOfLabel}
              </h3>
              <p className={chartStyles.winnersSectionSub}>
                {scan.winners.length} stocks with ≥ +{scan.minReturnPct}% return to today
              </p>
            </div>
            <button
              type="button"
              className={chartStyles.winnersActionBtn}
              onClick={() => onAnalyzeInTable(winnerTickers, lookbackDays)}
            >
              Open winners in Table
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>

          <div className={chartStyles.winnersTableWrap}>
            <table className={chartStyles.winnersTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ticker</th>
                  <th>Sector</th>
                  <th>Return → today</th>
                  <th>Price then</th>
                </tr>
              </thead>
              <tbody>
                {scan.winners.map((w, i) => (
                  <tr key={w.ticker}>
                    <td>{i + 1}</td>
                    <td>
                      <button
                        type="button"
                        className={chartStyles.winnersTickerBtn}
                        onClick={() => onSelectTicker(w.ticker)}
                      >
                        {w.ticker}
                      </button>
                      <a
                        href={yahooQuoteUrl(w.ticker)}
                        className={chartStyles.winnersExternal}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Yahoo Finance"
                      >
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    </td>
                    <td>{w.sector}</td>
                    <td className={chartStyles.winnersRetUp}>{fmtReturn(w.returnToTodayPct)}</td>
                    <td>${w.priceThen.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={chartStyles.winnersSectionHead}>
            <div>
              <h3 className={chartStyles.winnersSectionTitle}>
                <Sparkles size={16} aria-hidden />
                Similar patterns today
              </h3>
              <p className={chartStyles.winnersSectionSub}>
                Closest weekly momentum + fundamentals to the blended winner profile
              </p>
            </div>
            {scan.todayMatches.length > 0 && (
              <button
                type="button"
                className={chartStyles.winnersActionBtn}
                onClick={() => onAnalyzeMatchesInTable(matchTickers, winnerTickers, lookbackDays)}
              >
                Analyze matches in Table
                <ArrowRight size={14} aria-hidden />
              </button>
            )}
          </div>

          {scan.todayMatches.length === 0 ? (
            <p className={chartStyles.viewEmpty}>No similarity matches found.</p>
          ) : (
            <div className={chartStyles.winnersTableWrap}>
              <table className={chartStyles.winnersTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ticker</th>
                    <th>Sector</th>
                    <th>Match</th>
                    <th>52W</th>
                    <th>PE</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.todayMatches.slice(0, 24).map((m, i) => {
                    const stock = stockByTicker.get(m.ticker);
                    return (
                      <tr key={m.ticker}>
                        <td>{i + 1}</td>
                        <td>
                          <button
                            type="button"
                            className={chartStyles.winnersTickerBtn}
                            onClick={() => onSelectTicker(m.ticker)}
                          >
                            {m.ticker}
                          </button>
                        </td>
                        <td>{stock?.sector ?? '—'}</td>
                        <td className={chartStyles.winnersMatchScore}>
                          {Number.isFinite(m.score) ? `${m.score.toFixed(0)}%` : '—'}
                        </td>
                        <td>{stock ? fmtReturn(stock.priceChange52w) : '—'}</td>
                        <td>{stock?.peRatio ? stock.peRatio.toFixed(1) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className={chartStyles.winnersFoot}>
            Not investment advice. Past winners do not predict future returns — use this tab to
            explore patterns, then verify in Table or Code filters before acting.
          </p>
        </>
      )}
    </div>
  );
}

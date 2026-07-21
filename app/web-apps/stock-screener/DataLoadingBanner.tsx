'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import styles from './StockScreener.module.css';

type BannerType = 'loading' | 'warning' | 'success' | 'info';

interface DataLoadingBannerProps {
  isLoading: boolean;
  warning: string | null;
  totalSymbols?: number;
  loadedSymbols?: number;
  universeLabel: string;
  cacheLabel?: string | null;
  dataSource: 'finnhub' | 'fmp' | 'mock' | 'loading';
  onRetry?: () => void;
}

function parseWarningMessage(warning: string): { 
  type: BannerType; 
  message: string; 
  progress?: number;
  isDataIncomplete: boolean;
} {
  // Parse "Partial universe: 450/503 symbols loaded"
  const partialMatch = warning.match(/(\d+)\/(\d+) symbols loaded/);
  if (partialMatch) {
    const [, loaded, total] = partialMatch;
    const progress = (parseInt(loaded) / parseInt(total)) * 100;
    return {
      type: 'info',
      message: `Loading market data: ${loaded} of ${total} stocks`,
      progress,
      isDataIncomplete: true,
    };
  }

  // Parse "Weekly history loading: 503 symbols"
  if (warning.includes('Weekly history loading')) {
    const match = warning.match(/(\d+) symbols/);
    return {
      type: 'info',
      message: match 
        ? `Loading historical price data for ${match[1]} stocks...`
        : 'Loading historical price data...',
      isDataIncomplete: true,
    };
  }

  // Parse fundamentals message
  if (warning.includes('Building historical fundamentals') || warning.includes('Historical fundamentals loading')) {
    return {
      type: 'info',
      message: 'Loading fundamental data (earnings, revenue, ratios)...',
      isDataIncomplete: true,
    };
  }

  // Generic building/loading
  if (warning.includes('Building') || warning.includes('loading')) {
    return {
      type: 'info',
      message: warning.replace(/run npm run.*?if this persists\.?/i, '').trim(),
      isDataIncomplete: true,
    };
  }

  // Error or API issues
  if (warning.toLowerCase().includes('error') || warning.toLowerCase().includes('failed')) {
    return {
      type: 'warning',
      message: warning,
      isDataIncomplete: false,
    };
  }

  return {
    type: 'info',
    message: warning,
    isDataIncomplete: warning.includes('refresh'),
  };
}

export default function DataLoadingBanner({
  isLoading,
  warning,
  totalSymbols,
  loadedSymbols,
  universeLabel,
  cacheLabel,
  dataSource,
  onRetry,
}: DataLoadingBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number | null>(null);

  const parsedWarning = warning ? parseWarningMessage(warning) : null;
  const showAutoRefresh = parsedWarning?.isDataIncomplete && !isLoading;

  // Auto-refresh countdown for incomplete data
  useEffect(() => {
    if (!showAutoRefresh || dismissed) {
      setAutoRefreshCountdown(null);
      return;
    }

    // Start 30 second countdown
    setAutoRefreshCountdown(30);
    const interval = setInterval(() => {
      setAutoRefreshCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (onRetry) onRetry();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showAutoRefresh, dismissed, onRetry]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setAutoRefreshCountdown(null);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setDismissed(false);
    setAutoRefreshCountdown(null);
    if (onRetry) onRetry();
  }, [onRetry]);

  if (dismissed) return null;

  // Show nothing if no warning and not loading
  if (!isLoading && !warning) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.dataBanner} role="status" aria-live="polite">
        <span className={styles.dataBannerLoading}>
          <Loader2 size={14} className={styles.spinIcon} aria-hidden />
          Loading {universeLabel} market data...
        </span>
      </div>
    );
  }

  // Warning/Info state
  if (parsedWarning) {
    const Icon = parsedWarning.type === 'warning' ? AlertTriangle : Loader2;
    const iconClass = parsedWarning.type === 'warning' ? styles.dataBannerWarn : styles.dataBannerInfo;

    return (
      <div className={styles.dataBanner} role="status" aria-live="polite">
        <div className={styles.dataBannerContent}>
          <span className={iconClass}>
            <Icon size={14} className={parsedWarning.isDataIncomplete ? styles.spinIcon : undefined} aria-hidden />
            <span className={styles.dataBannerText}>
              {parsedWarning.message}
              {parsedWarning.progress && (
                <span className={styles.dataBannerProgress}>
                  {' '}({Math.round(parsedWarning.progress)}%)
                </span>
              )}
            </span>
          </span>

          <div className={styles.dataBannerActions}>
            {showAutoRefresh && autoRefreshCountdown !== null && (
              <button
                type="button"
                className={styles.dataBannerRefreshBtn}
                onClick={handleManualRefresh}
                title="Refresh now"
              >
                <RefreshCw size={13} aria-hidden />
                Auto-refresh in {autoRefreshCountdown}s
              </button>
            )}
            
            {showAutoRefresh && autoRefreshCountdown === null && onRetry && (
              <button
                type="button"
                className={styles.dataBannerRefreshBtn}
                onClick={handleManualRefresh}
                title="Refresh data"
              >
                <RefreshCw size={13} aria-hidden />
                Refresh
              </button>
            )}

            <button
              type="button"
              className={styles.dataBannerDismiss}
              onClick={handleDismiss}
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state (data loaded successfully)
  if (dataSource !== 'mock' && !warning && totalSymbols) {
    return (
      <div className={styles.dataBanner} role="status">
        <div className={styles.dataBannerContent}>
          <span className={styles.dataBannerOk}>
            <CheckCircle2 size={14} aria-hidden />
            <span className={styles.dataBannerText}>
              Live Finnhub data · {loadedSymbols || totalSymbols} {universeLabel} stocks loaded
              {cacheLabel && ` · ${cacheLabel}`}
            </span>
          </span>
          
          <button
            type="button"
            className={styles.dataBannerDismiss}
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

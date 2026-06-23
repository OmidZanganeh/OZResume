import type { Metadata } from 'next';
import StockScreener from './StockScreener';

export const metadata: Metadata = {
  title: 'Stock Screener Dashboard | Omid Zanganeh',
  description:
    'Screen S&P 500 stocks with real-time filters for P/E ratio, EPS growth, debt-to-equity, RSI, and 40+ fundamental and technical metrics.',
  alternates: { canonical: '/tools/stock-screener' },
};

export default function StockScreenerPage() {
  return <StockScreener />;
}

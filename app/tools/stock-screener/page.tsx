import type { Metadata } from 'next';
import StockScreener from './StockScreener';

export const metadata: Metadata = {
  title: 'Stock Screener Dashboard | Omid Zanganeh',
  description:
    'Interactive stock screener with real-time filters for P/E ratio, EPS growth, debt-to-equity, and RSI. Dark-mode financial dashboard with mock data.',
  alternates: { canonical: '/tools/stock-screener' },
};

export default function StockScreenerPage() {
  return <StockScreener />;
}

import type { Metadata } from 'next';
import StockScreener from './StockScreener';

export const metadata: Metadata = {
  title: 'Stock Screener Dashboard | Omid Zanganeh',
  description:
    'Screen S&P 500, NASDAQ 100, and S&P 400 MidCap stocks with real-time filters for P/E ratio, EPS growth, debt-to-equity, and 40+ fundamental and technical metrics.',
  alternates: { canonical: '/web-apps/stock-screener' },
};

export default function StockScreenerPage() {
  return <StockScreener />;
}

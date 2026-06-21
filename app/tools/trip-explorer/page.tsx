import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Discover — Find Interesting Places | Omid Zanganeh',
  description: 'Explore any destination on an interactive map and discover interesting nearby places powered by Wikipedia. Search, browse, and learn — no login required.',
  alternates: { canonical: '/tools/trip-explorer' },
};

const TripExplorer = dynamic(() => import('./TripExplorer'), { ssr: false });

export default function Page() {
  return <TripExplorer />;
}

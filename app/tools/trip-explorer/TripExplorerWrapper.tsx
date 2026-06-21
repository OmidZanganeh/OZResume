'use client';

import dynamic from 'next/dynamic';

const TripExplorer = dynamic(() => import('./TripExplorer'), { ssr: false });

export default function TripExplorerWrapper() {
  return <TripExplorer />;
}

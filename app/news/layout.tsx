import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI News – Latest Artificial Intelligence Headlines | Omid Zanganeh',
  description:
    'Stay up to date with the latest AI and artificial intelligence news, curated from The Guardian. Updated automatically every 15 minutes.',
  keywords: [
    'AI news',
    'artificial intelligence news',
    'latest AI headlines',
    'machine learning news',
    'AI technology news',
    'deep learning news',
    'generative AI news',
    'LLM news',
  ],
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'AI News – Latest Artificial Intelligence Headlines',
    description:
      'Curated AI and machine learning news from The Guardian, refreshed every 15 minutes.',
    url: 'https://omidzanganeh.com/news',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI News – Latest Artificial Intelligence Headlines',
    description:
      'Curated AI and machine learning news from The Guardian, refreshed every 15 minutes.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

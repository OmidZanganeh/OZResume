import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'US Census Demographics Lookup – Population, Income & Housing by Tract | Omid Zanganeh',
  description:
    'Click any US location to see census tract demographics: population, median age, household income, home value, homeownership rate, and unemployment. Powered by the US Census Bureau ACS 5-Year data. Free, no login.',
  keywords: [
    'US census demographics lookup',
    'census tract data',
    'population by location',
    'median household income map',
    'median home value by area',
    'ACS 5-year estimates',
    'census bureau API tool',
    'demographic data tool',
    'homeownership rate map',
    'unemployment rate by tract',
  ],
  alternates: { canonical: '/tools/census' },
  openGraph: {
    title: 'US Census Demographics Lookup – Click Any US Location | Omid Zanganeh',
    description:
      'Click a US location on the map to instantly see census tract demographics: population, income, home value, homeownership, and unemployment. Powered by the US Census Bureau.',
    url: 'https://omidzanganeh.com/tools/census',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'US Census Demographics Lookup',
    description: 'Click any US location → population, median income, home value, and more from ACS 5-year data.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'US Census Demographics Lookup',
  url: 'https://omidzanganeh.com/tools/census',
  description:
    'Click any US location to retrieve census tract demographics from the US Census Bureau ACS 5-Year Estimates: population, median age, household income, home value, homeownership rate, and unemployment rate.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function CensusLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}

export const siteUrl = "https://omidzanganeh.com";
export const webAppsPath = "/web-apps";

/** Public path under this deployment (see Vite `base` in Gym Webapp). */
export const gymFlowPublicPath = "/gym-flow/";

export type WebAppListing = {
  /** Identifies which SVG icon to render — resolved in page.tsx */
  iconId: string;
  title: string;
  subtitle: string;
  description: string;
  tech: string[];
  /** Path on this site, e.g. /gym-flow/ */
  href: string;
  /** Full URL for JSON-LD */
  urlAbsolute: string;
  /** https://schema.org applicationCategory */
  schemaCategory?: string;
};

export const apps: WebAppListing[] = [
  {
    iconId: "gym",
    title: "Gym Flow",
    subtitle: "Offline-first gym planner & progress tracker",
    description:
      "Plan workouts, browse exercises, and track progress in the browser. Works as a standalone app once installed — handy at the gym without hunting for the tab.",
    tech: ["React", "Vite", "PWA", "TypeScript"],
    href: gymFlowPublicPath,
    urlAbsolute: `${siteUrl}${gymFlowPublicPath}`,
    schemaCategory: "HealthApplication",
  },
  {
    iconId: "discover",
    title: "Discover",
    subtitle: "Interactive travel & place discovery map",
    description:
      "Explore any city on a dark interactive map and instantly surface interesting nearby places — museums, historic sites, parks, and more — powered by Wikipedia. Read summaries and full articles without leaving the page.",
    tech: ["Next.js", "Leaflet", "Wikipedia API", "TypeScript"],
    href: "/tools/trip-explorer",
    urlAbsolute: `${siteUrl}/tools/trip-explorer`,
    schemaCategory: "TravelApplication",
  },
  {
    iconId: "stocks",
    title: "Stock Screener",
    subtitle: "S&P 500 fundamental & technical screener",
    description:
      "Screen all S&P 500 stocks with 40+ filters — P/E, EPS growth, debt ratios, RSI, margins, and more. Live Finnhub data with weekly cache.",
    tech: ["Next.js", "Finnhub", "TypeScript"],
    href: "/web-apps/stock-screener",
    urlAbsolute: `${siteUrl}/web-apps/stock-screener`,
    schemaCategory: "FinanceApplication",
  },
];

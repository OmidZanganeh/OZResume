export const siteUrl = "https://omidzanganeh.com";
export const webAppsPath = "/web-apps";

/** Public path under this deployment (see Vite `base` in Gym Webapp). */
export const gymFlowPublicPath = "/gym-flow/";

export type WebAppListing = {
  icon: string;
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
    icon: "🏋️",
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
    icon: "🧭",
    title: "Discover",
    subtitle: "Interactive travel & place discovery map",
    description:
      "Explore any city on a dark interactive map and instantly surface interesting nearby places — museums, historic sites, parks, and more — powered by Wikipedia. Read summaries and full articles without leaving the page.",
    tech: ["Next.js", "Leaflet", "Wikipedia API", "TypeScript"],
    href: "/tools/trip-explorer",
    urlAbsolute: `${siteUrl}/tools/trip-explorer`,
    schemaCategory: "TravelApplication",
  },
];

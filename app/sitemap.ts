import type { MetadataRoute } from "next";

const BASE = "https://omidzanganeh.com";
const now  = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Core pages ──
    { url: BASE,               lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${BASE}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/web-apps`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/gym-flow/`, lastModified: now, changeFrequency: "monthly", priority: 0.72 },
    { url: `${BASE}/news`,     lastModified: now, changeFrequency: "daily",   priority: 0.7 },

    // ── Tools hub ──
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },

    // ── Individual tools — high priority: these are the pages people search for ──
    { url: `${BASE}/tools/gis-downloader`,       lastModified: now, changeFrequency: "monthly", priority: 0.95 },
    { url: `${BASE}/tools/coordinate-converter`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/unit-converter`,       lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/image-tools`,          lastModified: now, changeFrequency: "monthly", priority: 0.80 },
    { url: `${BASE}/tools/pdf-image-tools`,      lastModified: now, changeFrequency: "weekly",  priority: 0.92 },
    { url: `${BASE}/tools/isochrone`,            lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/elevation-profile`,    lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/geocoder`,             lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/census`,               lastModified: now, changeFrequency: "monthly", priority: 0.85 },
  ];
}

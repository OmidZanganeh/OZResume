import type { MetadataRoute } from "next";

const baseUrl = "https://omidzanganeh.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl,                                 lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/projects`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools`,                      lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools/coordinate-converter`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.7 },
    { url: `${baseUrl}/tools/unit-converter`,       lastModified: new Date(), changeFrequency: "yearly",  priority: 0.7 },
    { url: `${baseUrl}/tools/image-tools`,          lastModified: new Date(), changeFrequency: "yearly",  priority: 0.7 },
    { url: `${baseUrl}/tools/isochrone`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.7 },
    { url: `${baseUrl}/tools/elevation-profile`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.7 },
  ];
}

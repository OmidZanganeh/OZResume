import { apps, siteUrl, webAppsPath } from "./webAppsData";

/**
 * Schema.org graph for /web-apps — WebPage, breadcrumbs, and listed apps as SoftwareApplication.
 */
export function WebAppsJsonLd() {
  const webAppsUrl = `${siteUrl}${webAppsPath}`;

  const itemListElements = apps.map((app, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "SoftwareApplication",
      name: app.title,
      description: app.description,
      applicationCategory: app.schemaCategory ?? "LifestyleApplication",
      operatingSystem: "Web browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      url: app.urlAbsolute,
    },
  }));

  const graph = [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Omid Zanganeh",
    },
    {
      "@type": "WebPage",
      "@id": `${webAppsUrl}#webpage`,
      url: webAppsUrl,
      name: "Web apps — progressive web apps by Omid Zanganeh",
      description:
        "Installable web apps and PWAs, including Gym Flow — an offline-first gym workout planner and progress tracker. Add to home screen on phone or desktop.",
      isPartOf: { "@id": `${siteUrl}/#website` },
      breadcrumb: { "@id": `${webAppsUrl}#breadcrumb` },
      mainEntity: { "@id": `${webAppsUrl}#itemlist` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${webAppsUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Web apps",
          item: webAppsUrl,
        },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${webAppsUrl}#itemlist`,
      name: "Web apps catalog",
      numberOfItems: apps.length,
      itemListElement: itemListElements,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

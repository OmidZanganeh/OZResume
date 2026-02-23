import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "./context/ThemeContext";
import ParallaxBackground from "./components/ParallaxBackground";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://omidzanganeh.com'),
  title: "Omid Zanganeh – GIS Developer",
  description: "GIS Developer at Olsson. Specializing in Python, ArcGIS, AI-powered workflows, and fiber network automation.",
  openGraph: {
    title: "Omid Zanganeh – GIS Developer",
    description: "GIS Developer at Olsson. Python, ArcGIS, AI automation, remote sensing, fiber network design.",
    url: "https://omidzanganeh.com",
    siteName: "Omid Zanganeh",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omid Zanganeh – GIS Developer",
    description: "GIS Developer at Olsson. Python, ArcGIS, AI automation.",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Omid Zanganeh",
  jobTitle: "GIS Developer",
  worksFor: { "@type": "Organization", name: "Olsson" },
  url: "https://omidzanganeh.com",
  description: "GIS Developer at Olsson. Specializing in Python, ArcGIS, AI-powered workflows, and fiber network automation.",
  sameAs: [
    "https://www.linkedin.com/in/omidzanganeh/",
    "https://arcg.is/1n1C4r",
  ],
  email: "ozanganeh@unomaha.edu",
  address: { "@type": "PostalAddress", addressLocality: "Lincoln", addressRegion: "NE" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();`
        }} />
      </head>
      <body className={ibmPlexMono.variable}>
        <ThemeProvider>
          <ParallaxBackground />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

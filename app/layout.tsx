import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "./context/ThemeContext";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Omid Zanganeh – GIS & Developer",
  description: "Resume of Omid Zanganeh, GIS Associate Technician specializing in Python, ArcGIS, and AI-powered workflows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();`
        }} />
      </head>
      <body className={ibmPlexMono.variable}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

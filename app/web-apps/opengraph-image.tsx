import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Web apps — progressive web apps by Omid Zanganeh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f5f2eb",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #14b8a6 0%, #3b82f6 100%)",
            display: "flex",
          }}
        />

        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "#0d9488",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            marginBottom: 20,
            display: "flex",
          }}
        >
          Installable · Offline-ready
        </div>

        <div style={{ fontSize: 64, fontWeight: 700, color: "#2c2a25", lineHeight: 1.05, marginBottom: 16, display: "flex" }}>
          Web apps
        </div>

        <div style={{ fontSize: 28, color: "#6b6760", maxWidth: 920, lineHeight: 1.35, display: "flex" }}>
          Progressive web apps (PWAs) — add to home screen, run standalone. Includes Gym Flow workout planner.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" as const }}>
          {["PWA", "Gym Flow", "TypeScript", "React"].map((tag) => (
            <div
              key={tag}
              style={{
                background: "#e8e4db",
                border: "1px solid #c8c4bc",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 22,
                color: "#4a4845",
                display: "flex",
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 64,
            fontSize: 22,
            color: "#a39f92",
            display: "flex",
          }}
        >
          omidzanganeh.com/web-apps
        </div>
      </div>
    ),
    { ...size },
  );
}

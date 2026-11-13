import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Logo as a data URL for generated images (read from /public at build/request time). */
export async function logoDataUrl(): Promise<string> {
  const logo = await readFile(join(process.cwd(), "public", "images", "ghar-safar-logo.png"));
  return `data:image/png;base64,${logo.toString("base64")}`;
}

export const OG_SIZE = { width: 1200, height: 630 };

/** Branded 1200×630 share card (no fabricated data — brand name and tagline only). */
export async function brandShareImage({
  eyebrow,
  title,
  subtitle,
  background,
  accent,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  background: string;
  accent: string;
}) {
  const logo = await logoDataUrl();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundImage: background,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 104,
              height: 104,
              borderRadius: 24,
              background: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={88} height={85} alt="" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>Ghar Safar</div>
            <div style={{ fontSize: 22, color: accent, letterSpacing: 4, textTransform: "uppercase" }}>{eyebrow}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ width: 96, height: 6, borderRadius: 3, background: accent }} />
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 980 }}>{title}</div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.78)", maxWidth: 960 }}>{subtitle}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

/** Square app icon from the logo on a white tile. */
export async function logoIcon(size: number) {
  const logo = await logoDataUrl();
  const inner = Math.round(size * 0.84);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: Math.round(size * 0.18),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={inner} height={Math.round(inner * (768 / 798))} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

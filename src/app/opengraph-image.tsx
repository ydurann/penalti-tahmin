import { ImageResponse } from "next/og";
import { BRAND, BrandMark } from "@/lib/brand";
import { SITE_HOST } from "@/lib/site";

export const alt = "GoalSpot: gerçek penaltıları tahmin et, 3D sahnede izle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Paylaşım görseli: gece stadyumu zemini, GoalSpot logosu, slogan ve ligler. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          background: "linear-gradient(180deg, #050d09 0%, #0a1f13 55%, #0d2a19 100%)",
          color: "#f3f7f4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <BrandMark size={150} />
          <div style={{ display: "flex", fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>
            <span>{BRAND.parts[0]}</span>
            <span style={{ color: BRAND.spot }}>{BRAND.parts[1]}</span>
          </div>
        </div>
        <div style={{ fontSize: 36, color: "#b9c8be", display: "flex" }}>
          Penaltı tahmin oyunu: gerçek penaltılar, 3D sahne
        </div>
        <div
          style={{
            marginTop: 10,
            padding: "10px 22px",
            borderRadius: 999,
            border: "2px solid rgba(47,180,92,0.7)",
            background: "rgba(47,180,92,0.15)",
            color: "#a9ecbf",
            fontSize: 22,
            letterSpacing: 2,
            display: "flex",
          }}
        >
          SÜPER LİG · PREMIER LEAGUE · BUNDESLIGA · ŞAMPİYONLAR LİGİ
        </div>
        {SITE_HOST && <div style={{ display: "flex", fontSize: 30, color: BRAND.spot, fontWeight: 800 }}>{SITE_HOST}</div>}
      </div>
    ),
    size,
  );
}

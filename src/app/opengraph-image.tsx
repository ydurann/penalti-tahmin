import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = "Penaltı Tahmin: gerçek penaltıları tahmin et, 3D sahnede izle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Paylaşım görseli: gece stadyumu zemini, kale ve altın top, başlık ve slogan. */
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
          gap: 18,
          background: "linear-gradient(180deg, #050d09 0%, #0a1f13 55%, #0d2a19 100%)",
          color: "#f3f7f4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 420,
            width: 360,
            height: 200,
            border: "10px solid rgba(243,247,244,0.85)",
            borderBottom: "none",
            borderRadius: "10px 10px 0 0",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 196,
            left: 690,
            width: 64,
            height: 64,
            borderRadius: 999,
            background: "#f3b623",
            boxShadow: "0 0 40px #f3b623",
            display: "flex",
          }}
        />
        <div style={{ marginTop: 230, fontSize: 92, fontWeight: 800, letterSpacing: -2, display: "flex" }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 34, color: "#b9c8be", display: "flex" }}>
          Gerçek penaltıları tahmin et, 3D sahnede izle
        </div>
        <div
          style={{
            marginTop: 18,
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
      </div>
    ),
    size,
  );
}

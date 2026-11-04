import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS ana ekran simgesi; `icon.tsx` ile aynı tasarım, büyük boy. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          background: "linear-gradient(180deg, #0f2a19 0%, #071510 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 34,
            left: 28,
            width: 124,
            height: 84,
            border: "10px solid #f3f7f4",
            borderBottom: "none",
            borderRadius: "10px 10px 0 0",
          }}
        />
        <div
          style={{
            width: 56,
            height: 56,
            marginBottom: 22,
            borderRadius: 999,
            background: "#f3b623",
            boxShadow: "0 0 24px #f3b623",
          }}
        />
      </div>
    ),
    size,
  );
}

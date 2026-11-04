import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Sekme simgesi: koyu yeşil zemin üzerinde kale ve altın top. */
export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 10,
            width: 44,
            height: 30,
            border: "4px solid #f3f7f4",
            borderBottom: "none",
            borderRadius: "4px 4px 0 0",
          }}
        />
        <div
          style={{
            width: 20,
            height: 20,
            marginBottom: 8,
            borderRadius: 999,
            background: "#f3b623",
            boxShadow: "0 0 8px #f3b623",
          }}
        />
      </div>
    ),
    size,
  );
}

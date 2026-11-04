import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Sekme simgesi: GoalSpot işareti. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <BrandMark size={64} />
      </div>
    ),
    size,
  );
}

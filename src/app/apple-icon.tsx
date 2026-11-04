import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS ana ekran simgesi: GoalSpot işareti, köşeler iOS tarafından yuvarlanır. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <BrandMark size={180} radius={0} />
      </div>
    ),
    size,
  );
}

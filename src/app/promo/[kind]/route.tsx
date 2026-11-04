import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, BrandMark } from "@/lib/brand";
import { SITE_HOST } from "@/lib/site";

/**
 * Sosyal medya tanıtım görselleri (yalnızca geliştirmede; yayında 404). Türler:
 *   /promo/square  1080×1080  Instagram gönderi, Twitter
 *   /promo/story   1080×1920  Instagram story, YouTube Shorts ve TikTok kapağı
 *   /promo/thumb   1280×720   YouTube küçük resmi
 *   /promo/banner  1500×500   Twitter/X kapak
 * Çıktılar `npm run promo` ile `marketing/` klasörüne alınır.
 */
export const dynamic = "force-dynamic";

const KINDS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  thumb: { width: 1280, height: 720 },
  banner: { width: 1500, height: 500 },
} as const;
type Kind = keyof typeof KINDS;

const LOGOS = [
  "competition-super-lig.png",
  "competition-premier-league.svg",
  "competition-bundesliga.svg",
  "competition-serie-a.svg",
  "competition-champions-league.svg",
  "competition-fifa-world-cup-2022.svg",
];

/** Alan adı `NEXT_PUBLIC_SITE_URL`'den; yerelde yoksa görsellerde "ücretsiz · tarayıcıda" yazar. */
const DOMAIN = SITE_HOST || "ücretsiz · tarayıcıda · kayıt yok";
const BG = "linear-gradient(180deg, #050d09 0%, #0a1f13 55%, #0d2a19 100%)";

/** Logo: işaret + iki renkli "GoalSpot" yazısı. */
function Wordmark({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.22 }}>
      <BrandMark size={size * 1.15} />
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, letterSpacing: -size * 0.03, lineHeight: 1 }}>
        <span>{BRAND.parts[0]}</span>
        <span style={{ color: BRAND.spot }}>{BRAND.parts[1]}</span>
      </div>
    </div>
  );
}

async function logoDataUrl(file: string): Promise<string | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "logos", file));
    const mime = file.endsWith(".svg") ? "image/svg+xml" : "image/png";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Kale ve 3×3 ızgara; bir bölge altın renkte işaretli, top o bölgeye uçuyor. */
function Goal({ width }: { width: number }) {
  const height = width * 0.4;
  const cells = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width,
          height,
          padding: 6,
          border: `${Math.round(width * 0.018)}px solid rgba(243,247,244,0.9)`,
          borderBottom: "none",
          borderRadius: "10px 10px 0 0",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      >
        {cells.map((i) => (
          <div
            key={i}
            style={{
              width: "33.333%",
              height: "33.333%",
              display: "flex",
              padding: 3,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                borderRadius: 6,
                border: i === 8 ? "3px solid #f3b623" : "1px solid rgba(255,255,255,0.35)",
                background: i === 8 ? "rgba(243,182,35,0.55)" : "rgba(255,255,255,0.08)",
              }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          width: width * 0.075,
          height: width * 0.075,
          marginTop: -width * 0.09,
          marginLeft: width * 0.62,
          borderRadius: 999,
          background: "#f3b623",
          boxShadow: "0 0 28px #f3b623",
        }}
      />
    </div>
  );
}

function Logos({ urls, size }: { urls: string[]; size: number }) {
  return (
    <div style={{ display: "flex", gap: size * 0.3, alignItems: "center" }}>
      {urls.map((url) => (
        <div
          key={url.slice(0, 40)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size * 1.25,
            height: size,
            padding: size * 0.12,
            borderRadius: size * 0.2,
            background: "#ffffff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- satori <img> */}
          <img src={url} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
        </div>
      ))}
    </div>
  );
}

function Pill({ children, size }: { children: string; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        padding: `${size * 0.35}px ${size * 0.9}px`,
        borderRadius: 999,
        border: "2px solid rgba(47,180,92,0.7)",
        background: "rgba(47,180,92,0.15)",
        color: "#a9ecbf",
        fontSize: size,
        letterSpacing: 2,
      }}
    >
      {children}
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const { kind } = await params;
  if (!(kind in KINDS)) return new Response("Bilinmeyen tür", { status: 404 });
  const { width, height } = KINDS[kind as Kind];
  const logos = (await Promise.all(LOGOS.map(logoDataUrl))).filter((u): u is string => u !== null);

  const base = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: BG,
    color: "#f3f7f4",
    fontFamily: "sans-serif",
  };

  let content;
  if (kind === "story") {
    content = (
      <div style={{ ...base, gap: 44, padding: 80 }}>
        <Pill size={30}>PENALTI TAHMİN OYUNU · 3D SAHNE</Pill>
        <Wordmark size={118} />
        <div style={{ display: "flex", fontSize: 44, color: "#b9c8be", textAlign: "center", lineHeight: 1.3 }}>
          Harry Kane topun başında. Sen kaleci olsan nereye atlardın?
        </div>
        <Goal width={720} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: 40, color: "#f3f7f4", marginTop: 20 }}>
          <div style={{ display: "flex" }}>1 · Oyuncuyu ve skoru oku</div>
          <div style={{ display: "flex" }}>2 · Bölgeyi ve vuruşu seç</div>
          <div style={{ display: "flex" }}>3 · Gerçek vuruşu 3D izle</div>
        </div>
        <Logos urls={logos} size={78} />
        <div style={{ display: "flex", marginTop: 10, padding: "22px 54px", borderRadius: 999, background: "#f3b623", color: "#2a1d02", fontSize: 48, fontWeight: 800 }}>
          {DOMAIN}
        </div>
      </div>
    );
  } else if (kind === "square") {
    content = (
      <div style={{ ...base, gap: 34, padding: 70 }}>
        <Pill size={24}>PENALTI TAHMİN OYUNU · 3D SAHNE</Pill>
        <Wordmark size={100} />
        <div style={{ display: "flex", fontSize: 38, color: "#b9c8be", textAlign: "center", lineHeight: 1.3 }}>
          Kalenin neresine, nasıl atılacak? Tahmin et, 3D sahnede izle.
        </div>
        <Goal width={560} />
        <Logos urls={logos} size={66} />
        <div style={{ display: "flex", marginTop: 6, padding: "18px 46px", borderRadius: 999, background: "#f3b623", color: "#2a1d02", fontSize: 40, fontWeight: 800 }}>
          {DOMAIN}
        </div>
      </div>
    );
  } else if (kind === "thumb") {
    content = (
      <div style={{ ...base, flexDirection: "row", gap: 50, padding: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1 }}>
          <Pill size={22}>GERÇEK PENALTILAR</Pill>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Nereye atacak?</div>
          <div style={{ display: "flex", fontSize: 40, color: "#b9c8be", lineHeight: 1.3 }}>
            1273 gerçek penaltı, 3D sahne, dünya sıralaması.
          </div>
          <Logos urls={logos.slice(0, 4)} size={60} />
          <Wordmark size={44} />
        </div>
        <Goal width={480} />
      </div>
    );
  } else {
    content = (
      <div style={{ ...base, flexDirection: "row", gap: 60, padding: "40px 90px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Wordmark size={84} />
          <div style={{ display: "flex", fontSize: 32, color: "#b9c8be" }}>Gerçek penaltıları tahmin et, 3D sahnede izle · {DOMAIN}</div>
          <Logos urls={logos} size={54} />
        </div>
        <Goal width={360} />
      </div>
    );
  }

  return new ImageResponse(content, { width, height });
}

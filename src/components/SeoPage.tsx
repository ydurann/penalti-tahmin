import Link from "next/link";
import type { ReactNode } from "react";
import type { OutcomeTally } from "@/game/seoPages";
import { percent } from "@/game/seoPages";
import { SITE_URL } from "@/lib/site";
import { AdSlot } from "./AdSlot";
import styles from "./Game.module.css";

/**
 * Arama motoru sayfalarının (`/ligler`, `/oyuncular`) ortak iskeleti: giriş ekranının gece
 * stadyumu zemini, cam kart ve ekmek kırıntısı; `BreadcrumbList` JSON-LD buradan üretilir.
 * Sunucu bileşenidir ve dil bilmez: metinler Türkçedir.
 */
export interface Crumb {
  name: string;
  href: string;
}

export function SeoPage({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href}`,
    })),
  };
  return (
    <main className={styles.intro}>
      <article className={`${styles.seo} ${styles.page}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav aria-label="Konum" className={styles.breadcrumb}>
          <ol>
            {crumbs.map((crumb, i) => (
              <li key={crumb.href}>
                {i === crumbs.length - 1 ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href}>{crumb.name}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {children}
      </article>
      {/* İçerik sayfalarında reklam makalenin altında; metin ve bağlantılar reklamdan önce gelir. */}
      <AdSlot slot="content" />
    </main>
  );
}

/** Gol / kurtarış / kaçan kutuları; yalnızca toplam sayılar, bölge bilgisi yok. */
export function TallyTiles({ tally }: { tally: OutcomeTally }) {
  const tiles = [
    { label: "penaltı", value: tally.total, note: null },
    { label: "gol", value: tally.goal, note: `%${percent(tally.goal, tally.total)}` },
    { label: "kurtarış", value: tally.saved, note: `%${percent(tally.saved, tally.total)}` },
    { label: "kaçan", value: tally.missed, note: `%${percent(tally.missed, tally.total)}` },
  ];
  return (
    <ul className={styles.stats}>
      {tiles.map((tile) => (
        <li key={tile.label}>
          <strong>{tile.value}</strong>
          <span>{tile.label}</span>
          {tile.note && <small>{tile.note}</small>}
        </li>
      ))}
    </ul>
  );
}

/** ISO tarihi Türkçe uzun biçimde yazar ("10 Ağustos 2025"); bozuk tarihte olduğu gibi döner. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

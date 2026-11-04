import type { MetadataRoute } from "next";
import { indexedPlayers, summarizeCompetitions } from "@/game/seoPages";
import { SITE_URL } from "@/lib/site";
import { loadPool } from "@/server/manualStore";

/**
 * Ana sayfa, dizinler, her turnuva+sezon sayfası ve en az `PLAYER_PAGE_MIN` penaltısı olan
 * oyuncuların sayfaları. Havuz her istekte okunur; elle eklenen penaltılar hemen listelenir.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pool = await loadPool();
  const now = new Date();
  const competitions = summarizeCompetitions(pool);
  const players = indexedPlayers(pool);
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/ligler`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/oyuncular`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...competitions.map((page) => ({
      url: `${SITE_URL}/ligler/${page.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...players.map((player) => ({
      url: `${SITE_URL}/oyuncular/${player.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}

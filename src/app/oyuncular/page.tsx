import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/Game.module.css";
import { SeoPage } from "@/components/SeoPage";
import { indexedPlayers, PLAYER_PAGE_MIN } from "@/game/seoPages";
import { loadPool } from "@/server/manualStore";

/** Oyuncu sayfalarının dizini: en az `PLAYER_PAGE_MIN` penaltı kullananlar, çoktan aza. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Penaltı kullanan oyuncular",
  description:
    "Harry Kane'den Mauro Icardi'ye, havuzdaki gerçek penaltıları kullanan oyuncular: toplam penaltı, gol, kurtarış ve kaçan sayıları. Penaltılarını tahmin et, vuruşu 3D sahnede izle.",
  alternates: { canonical: "/oyuncular" },
  openGraph: { title: "Penaltı kullanan oyuncular", url: "/oyuncular" },
};

export default async function PlayersIndex() {
  const players = indexedPlayers(await loadPool());
  return (
    <SeoPage crumbs={[{ name: "Penaltı Tahmin", href: "/" }, { name: "Oyuncular", href: "/oyuncular" }]}>
      <h1>Penaltı kullanan oyuncular</h1>
      <p>
        Havuzda en az {PLAYER_PAGE_MIN} penaltı kullanmış {players.length} oyuncu. Her sayfada
        oyuncunun takımları, toplam penaltısı, gol / kurtarış / kaçan sayıları ve penaltı kullandığı
        turnuvalar bulunur; yön dağılımı oyunda ipucu olarak verilir.
      </p>
      <ol className={styles.rankList}>
        {players.map((player) => (
          <li key={player.slug}>
            <div>
              <Link href={`/oyuncular/${player.slug}`}>{player.name}</Link>
              <span>{player.teams.join(", ")}</span>
            </div>
            <span>
              {player.tally.total} penaltı · {player.tally.goal} gol
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.sourceNote}>
        <Link href="/ligler">Ligler ve turnuvalar</Link> · <Link href="/">Ana sayfa</Link>
      </p>
    </SeoPage>
  );
}

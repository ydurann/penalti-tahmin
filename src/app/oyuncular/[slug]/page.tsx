import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/Game.module.css";
import { SeoPage, TallyTiles } from "@/components/SeoPage";
import { TeamBadge } from "@/components/TeamBadge";
import { trLabels } from "@/game/labels";
import { findPlayerPage, percent, PLAYER_PAGE_MIN, playUrl, tallyText } from "@/game/seoPages";
import { loadPool } from "@/server/manualStore";

/**
 * Oyuncu sayfası ("/oyuncular/harry-kane"): takımları, toplam penaltı, gol / kurtarış / kaçan
 * ve hangi turnuvalarda kullandığı. Yön dağılımı (`history`) oyunda ipucu olduğu için
 * GÖSTERİLMEZ; bölge, vuruş tipi ve kaleci yönü de yoktur. Az penaltısı olan oyuncunun sayfası
 * açılır ama dizine girmez (`PLAYER_PAGE_MIN`).
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const FOOT = { left: "sol", right: "sağ" } as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const player = findPlayerPage(await loadPool(), slug);
  if (!player) return { title: "Sayfa bulunamadı", robots: { index: false } };
  const competitions = player.competitions.map((c) => trLabels.competition(c.competition, c.season));
  const title = `${player.name} penaltıları`;
  const description = `${player.name} (${player.teams.join(", ")}): ${tallyText(player.tally)}${competitions.length > 0 ? `; ${competitions.join(", ")}` : ""}. Penaltılarının kalenin neresine gittiğini tahmin et, vuruşu 3D sahnede izle.`;
  const url = `/oyuncular/${player.slug}`;
  return {
    title,
    description,
    keywords: [`${player.name} penaltı`, `${player.name} penaltıları`, `${player.name} penaltı istatistikleri`, "penaltı tahmin oyunu"],
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
    twitter: { title, description },
    robots: player.tally.total >= PLAYER_PAGE_MIN ? undefined : { index: false, follow: true },
  };
}

export default async function PlayerPageView({ params }: Params) {
  const { slug } = await params;
  const player = findPlayerPage(await loadPool(), slug);
  if (!player) notFound();

  const goalRate = percent(player.tally.goal, player.tally.total);
  const competitionIds = player.competitions.map((c) => c.id);

  return (
    <SeoPage crumbs={[{ name: "GoalSpot", href: "/" }, { name: "Oyuncular", href: "/oyuncular" }, { name: player.name, href: `/oyuncular/${player.slug}` }]}>
      <header className={styles.pageHead}>
        <TeamBadge name={player.teams[0]} size={48} />
        <div>
          <h1>{player.name} penaltıları</h1>
          <span>
            {player.teams.join(" · ")} · {FOOT[player.foot]} ayak
          </span>
        </div>
      </header>

      <p>
        {player.name} havuzumuzda {player.teams.length > 1 ? `${player.teams.join(" ve ")} formalarıyla` : `${player.teams[0]} formasıyla`}{" "}
        {tallyText(player.tally)}; gol oranı %{goalRate}
        {player.shootouts > 0 && <>, {player.shootouts} tanesi seri penaltısı</>}.
        {player.competitions.length > 0 && (
          <>
            {" "}
            Penaltıları {player.competitions.map((c) => trLabels.competition(c.competition, c.season)).join(", ")}{" "}
            {player.competitions.length > 1 ? "turnuvalarından" : "turnuvasından"} geliyor.
          </>
        )}{" "}
        Topun kalenin hangi bölgesine ve nasıl gittiği oyunun cevabıdır; önceki penaltılarının
        yön dağılımı sana oyunda ipucu olarak gösterilir.
      </p>

      <TallyTiles tally={player.tally} />

      {player.competitions.length > 0 && (
        <section>
          <h2>Hangi turnuvalarda?</h2>
          <div className={styles.linkChips}>
            {player.competitions.map((c) => (
              <Link key={c.id} href={`/ligler/${c.slug}`}>
                {trLabels.competition(c.competition, c.season)}{" "}
                <span>
                  {c.count} penaltı · {c.goal} gol
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.playRow}>
        <Link href={playUrl(competitionIds)} className={styles.start}>
          Bu turnuvalarla oyna
        </Link>
        <span className={styles.note}>
          Oyun, {player.name}&apos;in penaltı kullandığı turnuvalar seçili başlar; her turda havuzdan
          rastgele bir penaltı gelir.
        </span>
      </div>

      <p className={styles.sourceNote}>
        <Link href="/oyuncular">Bütün oyuncular</Link> · <Link href="/ligler">Ligler ve turnuvalar</Link> ·{" "}
        <Link href="/">Ana sayfa</Link>
      </p>
    </SeoPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompetitionLogo } from "@/components/CompetitionLogo";
import styles from "@/components/Game.module.css";
import { formatDate, SeoPage, TallyTiles } from "@/components/SeoPage";
import { competitionKind } from "@/game/competitions";
import { trLabels } from "@/game/labels";
import { findCompetitionPage, percent, PLAYER_PAGE_MIN, playUrl, tallyText } from "@/game/seoPages";
import { ROUNDS_PER_GAME } from "@/game/session";
import { loadPool } from "@/server/manualStore";

/**
 * Turnuva + sezon sayfası ("/ligler/super-lig-2025-26"): arama motoru için Türkçe özet.
 * Yalnızca toplam sayılar ve oyuncu listesi gösterilir; bölge, vuruş tipi ve kaleci yönü
 * oyunda tahmin kilitlenmeden verilmediği için burada da yoktur. Havuz elle girilen
 * penaltılarla değişebildiğinden sayfa her istekte hesaplanır.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const KIND_LABEL = { league: "lig", national: "turnuva", cup: "kupa" } as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = findCompetitionPage(await loadPool(), slug);
  if (!page) return { title: "Sayfa bulunamadı", robots: { index: false } };
  const label = trLabels.competition(page.competition, page.season);
  const top = page.topPlayers[0];
  const title = `${label} penaltıları`;
  const where = competitionKind(page.competition) === "league" ? "sezonunda" : "turnuvasında";
  const description = `${label} ${where} ${tallyText(page.tally)}${top ? `; en çok penaltı kullanan ${top.name} (${top.tally.total})` : ""}. Gerçek penaltıların kalenin neresine atıldığını tahmin et, vuruşu 3D sahnede izle.`;
  const url = `/ligler/${page.slug}`;
  return {
    title,
    description,
    keywords: [`${label} penaltıları`, `${trLabels.competition(page.competition)} penaltıları`, `${trLabels.competition(page.competition)} penaltı istatistikleri`, "penaltı tahmin oyunu"],
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
    twitter: { title, description },
  };
}

export default async function CompetitionPageView({ params }: Params) {
  const { slug } = await params;
  const pool = await loadPool();
  const page = findCompetitionPage(pool, slug);
  if (!page) notFound();

  const name = trLabels.competition(page.competition);
  const label = trLabels.competition(page.competition, page.season);
  const kind = competitionKind(page.competition);
  const goalRate = percent(page.tally.goal, page.tally.total);
  const enough = page.tally.total >= ROUNDS_PER_GAME;

  return (
    <SeoPage crumbs={[{ name: "GoalSpot", href: "/" }, { name: "Ligler ve turnuvalar", href: "/ligler" }, { name: label, href: `/ligler/${page.slug}` }]}>
      <header className={styles.pageHead}>
        <CompetitionLogo competition={page.competition} season={page.season} height={44} />
        <div>
          <h1>{label} penaltıları</h1>
          <span>
            {page.tally.total} gerçek penaltı · {page.teams} takım · {page.playerCount} oyuncu
          </span>
        </div>
      </header>

      <p>
        {label} {KIND_LABEL[kind] === "lig" ? "sezonunda" : "turnuvasında"} havuzumuzda {page.teams} takımdan{" "}
        {page.playerCount} oyuncunun kullandığı {tallyText(page.tally)}. Gol oranı %{goalRate}
        {page.shootouts > 0 && <>, bunların {page.shootouts} tanesi seri penaltısı</>}.
        {page.dates && (
          <>
            {" "}
            Kayıtlar {formatDate(page.dates.from)} ile {formatDate(page.dates.to)} arasındaki maçlardan.
          </>
        )}{" "}
        GoalSpot&apos;ta bu penaltılar sana gerçek bağlamıyla gelir: oyuncu, takım, dakika ve skor.
        Topun kalenin hangi bölgesine ve nasıl atıldığını tahmin edersin; vuruş 3D sahnede oynar.
      </p>

      <TallyTiles tally={page.tally} />

      <div className={styles.playRow}>
        {enough ? (
          <Link href={playUrl([page.id])} className={styles.start}>
            {name} penaltılarıyla oyna
          </Link>
        ) : (
          <Link href="/" className={styles.start}>
            Oyuna başla
          </Link>
        )}
        <span className={styles.note}>
          {enough
            ? `Bir oyun ${ROUNDS_PER_GAME} penaltıdır; yalnızca ${label} seçili başlar, girişte başka turnuvalar da eklenebilir.`
            : `Bu sezonda ${ROUNDS_PER_GAME} penaltıdan az kayıt var; girişte başka turnuvalarla birlikte oynanır.`}
        </span>
      </div>

      {page.topPlayers.length > 0 && (
        <section>
          <h2>En çok penaltı kullanan oyuncular</h2>
          <ol className={styles.rankList}>
            {page.topPlayers.map((player) => (
              <li key={player.slug}>
                <div>
                  {player.tally.total >= PLAYER_PAGE_MIN ? (
                    <Link href={`/oyuncular/${player.slug}`}>{player.name}</Link>
                  ) : (
                    <strong>{player.name}</strong>
                  )}
                  <span>{player.teams.join(", ")}</span>
                </div>
                <span>
                  {player.tally.total} penaltı · {player.tally.goal} gol
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {page.otherSeasons.length > 0 && (
        <section>
          <h2>{name}: diğer sezonlar</h2>
          <div className={styles.linkChips}>
            {page.otherSeasons.map((season) => (
              <Link key={season.id} href={`/ligler/${season.slug}`}>
                {name} {season.season} <span>{season.count} penaltı</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Bu sayfada ne var, ne yok?</h2>
        <p>
          Sayfada yalnızca toplam sayılar bulunur. Penaltıların kalenin hangi bölgesine atıldığı,
          vuruş tipi ve kalecinin dalış yönü oyunun cevabıdır; tahminini kilitledikten sonra 3D
          sahnede görürsün. Oyuncunun önceki penaltılarının yön dağılımı ise oyunda ipucu olarak
          verilir.
        </p>
        {kind === "national" && (
          <p className={styles.sourceNote}>
            Milli takım turnuvalarının verisi StatsBomb açık verisinden alınmıştır.
          </p>
        )}
      </section>

      <p className={styles.sourceNote}>
        <Link href="/ligler">Bütün ligler ve turnuvalar</Link> · <Link href="/oyuncular">Oyuncular</Link> ·{" "}
        <Link href="/">Ana sayfa</Link>
      </p>
    </SeoPage>
  );
}

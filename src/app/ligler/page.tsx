import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/Game.module.css";
import { SeoPage } from "@/components/SeoPage";
import { COMPETITION_KINDS, competitionKind, type CompetitionKind } from "@/game/competitions";
import { trLabels } from "@/game/labels";
import { summarizeCompetitions } from "@/game/seoPages";
import { loadPool } from "@/server/manualStore";

/** Lig ve turnuva sayfalarının dizini; ekmek kırıntısının "Ligler" halkası buraya gelir. */
export const dynamic = "force-dynamic";

const KIND_TITLE: Record<CompetitionKind, string> = {
  league: "Ligler",
  national: "Milli takım turnuvaları",
  cup: "Kupalar",
};

export const metadata: Metadata = {
  title: "Lig ve turnuva penaltıları",
  description:
    "Süper Lig, Premier League, Bundesliga, Şampiyonlar Ligi, Dünya Kupası ve daha fazlasından gerçek penaltılar: sezon sezon penaltı sayıları, gol ve kurtarış oranları, en çok penaltı kullanan oyuncular.",
  alternates: { canonical: "/ligler" },
  openGraph: { title: "Lig ve turnuva penaltıları", url: "/ligler" },
};

export default async function CompetitionsIndex() {
  const pages = summarizeCompetitions(await loadPool());
  const total = pages.reduce((sum, p) => sum + p.tally.total, 0);
  const sections = COMPETITION_KINDS.map((kind) => ({
    kind,
    pages: pages.filter((p) => competitionKind(p.competition) === kind),
  })).filter((s) => s.pages.length > 0);

  return (
    <SeoPage crumbs={[{ name: "GoalSpot", href: "/" }, { name: "Ligler ve turnuvalar", href: "/ligler" }]}>
      <h1>Lig ve turnuva penaltıları</h1>
      <p>
        Havuzda {pages.length} turnuva ve sezondan {total} gerçek penaltı var. Her sayfada o sezonun
        gol, kurtarış ve kaçan penaltı sayıları ile en çok penaltı kullanan oyuncular bulunur;
        oyun o turnuva seçili olarak başlatılabilir.
      </p>
      {sections.map((section) => (
        <section key={section.kind}>
          <h2>{KIND_TITLE[section.kind]}</h2>
          <div className={styles.linkChips}>
            {section.pages.map((page) => (
              <Link key={page.id} href={`/ligler/${page.slug}`}>
                {trLabels.competition(page.competition, page.season)} <span>{page.tally.total} penaltı</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <p className={styles.sourceNote}>
        <Link href="/oyuncular">Oyuncular</Link> · <Link href="/">Ana sayfa</Link>
      </p>
    </SeoPage>
  );
}

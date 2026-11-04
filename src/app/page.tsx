import { Game } from "@/components/Game";
import { SeoIntro } from "@/components/SeoIntro";
import { listCompetitions } from "@/game/competitions";
import { parsePlayParam } from "@/game/seoPages";
import { loadPool } from "@/server/manualStore";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ turnuva?: string | string[] }> };

export default async function Home({ searchParams }: Props) {
  // Turnuva listesi sunucuda hesaplanır; cevaplı veri istemciye gitmez. Elle girilen
  // penaltılar dosyadan her istekte okunduğu için sayfa dinamiktir. Tanıtım/SSS bölümü
  // sunucuda işlenir ve yalnızca giriş ekranında, kartın altında görünür. Lig ve oyuncu
  // sayfalarından gelen `?turnuva=` ön seçimi sunucuda eşlenir ki ilk çizimde seçili olsun.
  const competitions = listCompetitions(await loadPool());
  const { turnuva } = await searchParams;
  const preselected = parsePlayParam(turnuva, competitions.map((c) => c.id));
  return (
    <Game
      competitions={competitions}
      preselected={preselected}
      footer={<SeoIntro competitions={competitions} />}
    />
  );
}

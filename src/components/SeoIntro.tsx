import Link from "next/link";
import { groupCompetitions } from "@/game/competitions";
import { trLabels } from "@/game/labels";
import { competitionSlug } from "@/game/seoPages";
import { ROUND_TIME_MS, ROUNDS_PER_GAME } from "@/game/session";
import type { CompetitionOption } from "@/game/types";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import styles from "./Game.module.css";

/**
 * Giriş kartının altındaki, sunucuda işlenen Türkçe tanıtım ve SSS: arama motorunun
 * okuyacağı metin ile JSON-LD (VideoGame + FAQPage). Oyun ekranı neredeyse hiç metin
 * içermediğinden sıralama için bu bölüm gerekir. Turnuva listesi havuzdan gelir.
 */
interface SeoIntroProps {
  competitions: CompetitionOption[];
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "Penaltı Tahmin nasıl oynanır?",
    a: `Her turda gerçek bir penaltı gelir: oyuncu, takım, dakika, skor ve oyuncunun önceki penaltılarının yön dağılımı gösterilir. Kalede dokuz bölgeden birini ya da "Dışarı"yı ve vuruş tipini (plase, sert, panenka) seçip kilitlersin; vuruş 3D sahnede oynar ve puanın hesaplanır. Bir oyun ${ROUNDS_PER_GAME} penaltıdır, her penaltı için ${ROUND_TIME_MS / 1000} saniye vardır.`,
  },
  {
    q: "Penaltılar gerçek mi?",
    a: "Evet. Dünya Kupası, Avrupa Şampiyonası, Copa América ve Afrika Kupası penaltıları StatsBomb açık verisinden; Süper Lig, Premier League, Bundesliga, Serie A, Ligue 1, Eredivisie, Şampiyonlar Ligi ve Avrupa Ligi penaltıları maç verisinden alınmıştır. Topun kaleye girdiği nokta gerçek vuruşa göre işlenir.",
  },
  {
    q: "Arkadaşlarımla oynayabilir miyim?",
    a: "Evet. Bir oda kurup kodu paylaşırsın; herkes aynı penaltıları aynı anda tahmin eder ve tur sonunda puanlar karşılaştırılır. Ayrıca her hafta herkese aynı 10 penaltının geldiği haftalık challenge ve dünya sıralaması vardır.",
  },
  {
    q: "Oyun ücretsiz mi, kayıt gerekiyor mu?",
    a: "Oyun ücretsizdir ve kayıt gerektirmez. Sıralamaya girmek için yalnızca bir takma ad ve bölge seçmek yeterlidir; tarayıcıda çalışır, uygulama indirmek gerekmez.",
  },
];

export function SeoIntro({ competitions }: SeoIntroProps) {
  const sections = groupCompetitions(competitions);
  const total = competitions.reduce((sum, c) => sum + c.count, 0);
  const kindTitle = { league: "Ligler", national: "Milli takım turnuvaları", cup: "Kupalar" } as const;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "Game",
      genre: ["Sports", "Football", "Trivia"],
      gamePlatform: "Web browser",
      playMode: ["SinglePlayer", "MultiPlayer"],
      inLanguage: ["tr", "en", "de"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <section className={styles.seo} aria-labelledby="seo-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 id="seo-title">Online penaltı tahmin oyunu: gerçek penaltılar, 3D sahne</h2>
      <p>
        Penaltı Tahmin, futbolun en gergin anını oyuna çeviren ücretsiz bir penaltı oyunudur. Harry
        Kane, Mauro Icardi ya da Kylian Mbappé topun başına geçtiğinde kalecinin yerine sen karar
        verirsin: top sol alta mı, sağ üste mi, ortaya mı gidecek; vuruş plase mi, sert mi, yoksa bir
        panenka mı? Tahminini kilitledikten sonra gerçek vuruş 3D stadyumda oynar ve ne kadar
        isabetli olduğunu görürsün. Havuzda {competitions.length} turnuva ve sezondan {total} gerçek
        penaltı var.
      </p>

      <div className={styles.seoGrid}>
        {sections.map(({ kind, groups }) => (
          <div key={kind}>
            <h3>{kindTitle[kind]}</h3>
            <ul>
              {groups.map((g) => (
                <li key={g.competition}>
                  {/* Her sezon kendi lig sayfasına bağlanır ("/ligler/super-lig-2025-26"). */}
                  <Link href={`/ligler/${competitionSlug(g.competition, g.seasons[0].season)}`}>
                    {trLabels.competition(g.competition)}
                  </Link>{" "}
                  <span>
                    {g.seasons.map((s, i) => (
                      <span key={s.id}>
                        {i > 0 && ", "}
                        <Link href={`/ligler/${competitionSlug(g.competition, s.season)}`}>{s.season}</Link>
                      </span>
                    ))}{" "}
                    · {g.count} penaltı
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className={styles.seoLinks}>
        <Link href="/ligler">Bütün ligler ve turnuvalar</Link> · <Link href="/oyuncular">Penaltı kullanan oyuncular</Link>
      </p>

      <h3>Sık sorulan sorular</h3>
      <dl className={styles.seoFaq}>
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt>{f.q}</dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

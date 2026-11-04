# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proje

Penaltı Tahmin: kullanıcı, bir penaltının kalenin hangi bölgesine (3×3) ve hangi tiple
(plase / sert / panenka) atılacağını tahmin eder; vuruş sonra 3D sahnede oynatılır. Next.js 16
(App Router) + React 19 + TypeScript, 3D için three.js + @react-three/fiber.

Kullanıcı Türkçe yazar; yanıtlar, kod yorumları ve test adları Türkçedir. Arayüz üç dildir
(Türkçe varsayılan, İngilizce, Almanca); yeni metin `src/i18n/tr.ts`'ye anahtar olarak girer,
`en.ts` ve `de.ts`'ye çevirisi yazılır (anahtar eşitliği testle korunur).

## Komutlar

```bash
npm install
npm run dev -- -p 3457        # geliştirme sunucusu (bu projede 3457 kullanıldı)
npm test                      # vitest run, tüm testler
npx vitest run src/components/pitch3d/keeperClip.test.ts   # tek dosya
npx vitest run -t "yakalama"  # adına göre test
npm run lint                  # eslint (flat config, eslint.config.mjs)
npx tsc --noEmit              # tip kontrolü
npm run build
node scripts/trace-anim.mjs <dosya.fbx> [adım] [başlangıç] [bitiş]   # Mixamo hareketini incele
node scripts/inspect-model.mjs <dosya.fbx>                            # Mixamo karakterini incele (kemik, mesh, malzeme)
npm run import:statsbomb -- --list                                   # StatsBomb turnuvalarını listele
npm run import:statsbomb                                             # varsayılan turnuvalardan gerçek penaltıları üret
npm run import:statsbomb -- --competitions "FIFA World Cup:2022,UEFA Euro:2024"
npm run import:fotmob                                               # Bundesliga 2025/26 penaltılarını FotMob'dan üret
npm run import:fotmob -- --league 71 --season 2025/2026             # Süper Lig (lig kimliği FotMob'un)
```

Node 26 gerekir (betik `.mts`/`.ts` dosyalarını Node'un yerleşik tip soymasıyla çalıştırır; bu
yüzden `tsconfig.json`'da `allowImportingTsExtensions` açık ve `**/*.mts` dahil).

Vitest yapılandırması `vitest.config.mts` (`.mts` olmalı, `@` → `src`). Next 16'da eski
`FlatCompat` ESLint kurulumu döngüsel hata verdiği için yapılandırma doğrudan
`eslint-config-next` flat dizilerinden kurulur.

## Başka bilgisayarda devam ederken

- **Model dosyaları git'te yok.** `.gitignore` içinde `/assets-src/` ve `/public/models/` var
  (ham Mixamo dosyaları dağıtılmasın diye). Yeni bilgisayara elle kopyalanmaları gerekir:
  - `assets-src/mixamo/`: kullanıcının indirdiği orijinaller.
  - `public/models/`: oyunun okuduğu kopyalar; `kaleci.fbx` ve `penaltici.fbx` (ikisi de Mixamo
    "Ch38" formalı insan karakteri, yalnızca T-poz, 52 MB'lık aynı dosya; farklı yüz istenirse
    başka karakter indirilir), `kaleci-dalis.fbx` (eski manken; dalış buradan alınır),
    `kaleci-orta.fbx` (bekleme), `kaleci-orta-yakalama.fbx` (ortada yakalama),
    `penaltici-vurus.fbx` (eski manken; koşu ve vuruş buradan alınır), `penaltici-bekleme.fbx`
    (Ch38 ile "with skin" indirilmiş 10,6 sn'lik bekleme, 53 MB; yalnızca hareketi kullanılır,
    yoksa oyuncu koşunun ilk karesinde durur).
  - Dosyalar yoksa oyun çökmez: konsola uyarı yazar ve kapsül figürlerle (`humanoid.ts`) devam eder.
- Kullanıcı yeni bir hareket indirdiğinde `assets-src/mixamo/`'ya koyar; dosyayı
  `public/models/`'a kopyalamak ve koda bağlamak bize düşer.
- Claude'un otomatik hafızası bilgisayara özeldir; kalıcı olması gereken bilgi bu dosyaya yazılır.

## Mimari

### Sunucu yetkili oyun akışı
- `src/game/` saf mantıktır (React/Next'e bağımlı değil): `session.ts` oyun durumunu ilerletir
  (`createGame`, `currentRound`, `submitGuess`, `nextRound`, hatalı akışta `GameFlowError` → 409),
  `scoring.ts` puanlar (tam bölge 100, doğru yön 40, doğru tip 50, ikinci tam isabetten itibaren
  seri bonusu 25×(seri−1)). 10 tur, tur başına 30 sn + 1,5 sn tolerans. Hız bonusu: tahmin
  kilitlenirken kalan her tam saniye tur puanının %2'si (`SPEED_BONUS_PER_SECOND`), sunucu
  saatiyle hesaplanır (`earlySeconds`), ipucu kesintisinden sonra uygulanır, sıfır puana eklenmez.
- İpucu (`hints.ts`): her penaltının kimliğinden kararlı seçilen tek tür (yön, yükseklik ya
  da vuruş tipi). `POST /api/games/[id]/hint` ve `/api/rooms/[code]/hint` ile istenir, tur
  "ipuculu" işaretlenir ve o turun bütün puan bileşenleri `HINT_FACTOR` (0,5) ile çarpılır.
  Odada ipucu oyuncuya özeldir, kilitledikten sonra alınamaz, çiplerde ampul simgesiyle görünür.
- Tahmin hedefi (`Target`) bir bölge ya da `"out"` (Dışarı). Sonuç (`Outcome`) `goal | saved |
  missed`. Kaçan vuruşta cevabın `zone`'u topun geçtiği yöne en yakın bölgedir: "Dışarı" tahmini
  100, aynı sütundaki bölge 40 alır; kaleyi bulan vuruşta "Dışarı" bölge puanı almaz.
- `src/data/penalties.ts`: 24 KURGUSAL penaltı (yedek). Cevap (`zone`, `shot`, `outcome`,
  `keeperDive`) yalnızca sunucuda durur; istemciye ancak tahmin kilitlendikten sonra döner.
  Kurtarışlarda `keeperDive === zone.col` olmalıdır (testle korunur).
- `src/data/realPenalties.ts`: `penalties.generated.json` içindeki gerçek penaltılar. Oyunun
  kullandığı havuzu `src/server/manualStore.ts` → `loadPool()` kurar: üretilenler + elle
  girilenler; toplam 10'dan azsa kurgusal veri. Rotalar ve `page.tsx` bunu her istekte çağırır.

### Elle veri girişi (gizli yönetim ekranı)
- Adres `/yonetim`; ana sayfadan bağlantı yoktur, `robots: noindex`. Uçlar (`/api/admin/*`)
  `ADMIN_SECRET` ortam değişkeniyle korunur; istemci anahtarı `x-admin-key` başlığında yollar,
  tarayıcıda `sessionStorage`'da tutar. Değişken yoksa 503, yanlışsa 401. Geliştirme anahtarı
  `.env.local` dosyasındadır (git dışı); Next dev dosyayı yeniden başlatmadan okur.
- Kayıtlar `src/data/penalties.manual.json` (git'te) dosyasına yazılır: `categories`
  (turnuva + sezon) ve oyun şemasında `penalties`. Yazma atomiktir (geçici dosya + yeniden
  adlandırma) ve yazılabilir disk ister; sunucusuz ortamda çalışmaz.
- Saf mantık `src/data/manual.ts`: doğrulama (Türkçe hata metinleri, kurtarışta kaleci =
  topun sütunu, panenka = orta sütun), `historyFor` (aynı adlı oyuncunun daha eski tarihli
  penaltıları, en çok 10), `toPenalty`. Ekran `src/components/Admin.tsx`: kategori ekleme,
  3×3 kale ızgarasıyla penaltı formu, girilenlerin listesi ve silme. Aynı maçtan art arda
  giriş için kategori, takımlar ve tarih formda kalır.
- Süper Lig gibi liglerde yerleşim verisi ücretsiz kaynaklarda yok; bağlam (oyuncu, dakika,
  skor) bir API'den, bölge/tip/kaleci yönü resmi özet videolarından elle kodlanır.

### Gerçek veri (StatsBomb açık verisi)
- `scripts/import-statsbomb.mts` turnuvaları `data-src/statsbomb/` altına indirir (git dışı,
  ~3 MB/maç) ve `src/data/penalties.generated.json` üretir. Varsayılan küme (Dünya Kupası 2018
  ve 2022, Euro 2020 ve 2024, Copa America 2024, Afrika Kupası 2023): 314 maç, ~900 MB,
  354 penaltı (245 gol, 72 kurtarış, 37 kaçan), 251 oyuncu. Dönüşüm mantığı saf ve testli:
  `src/data/statsbomb/mapping.ts`.
- Koordinatlar: kale x=120, direkler y=36/44 (küçük y vuranın SOLU), z yard cinsinden yükseklik,
  üst direk 2,67. Bölge bu aralıkların üçe bölünmesiyle bulunur.
- Veride OLMAYANLAR ve yaklaşımlar: top hızı yok, vuruş tipi tahminidir ("Lob" + orta = panenka;
  üst bölge veya orta sütun = sert; alçak/orta köşe = plase). Kaleci dalış yönü alanı yok:
  kurtarışta ve "Touched In" golde topun sütunu, "Standing" ise orta, dokunulmayan gol ve
  kaçan toplarda ters köşe varsayılır (orta vuruşta olay kimliğinden kararlı seçim). Sonuç
  eşlemesi: `Goal` → goal; `Saved`, `Saved Off T`, `Saved To Post` → saved; `Off T`, `Post`,
  `Wayward` → missed (direkten dönen top da "kaçan" sayılır, animasyonda direğin dışından geçer).
- `history` oyuncunun veri setindeki ÖNCEKİ en çok 10 penaltısıdır; mevcut penaltı dahil
  değildir, çoğu oyuncuda 0'dır. Dakika StatsBomb `minute + 1`; seri penaltılarda (period 5)
  skor yalnızca seriyi sayar.
- Lisans (StatsBomb Public Data User Agreement, 8 Eylül 2023; 2 Kasım 2026'da okundu): veri
  üçüncü taraflara dağıtılamaz, ticari kullanılamaz; yayınlanan analiz StatsBomb logosuyla atıf
  ister; resource-centre'da ad/e-posta kaydı istenir. Ham veri bu yüzden git dışıdır; herkese
  açık yayından ve her türlü gelir modelinden önce StatsBomb'dan yazılı izin alınmalı ya da
  CC BY lisanslı bir kaynağa geçilmelidir.

### Lig sezonları (FotMob)
- StatsBomb açık verisinde ligler yok; lig sezonları `scripts/import-fotmob.mts` ile FotMob'un
  maç detayı yanıtından (`/api/data/leagues`, `/api/data/matchDetails`) üretilir. Ham yanıtlar
  `data-src/fotmob/` (git dışı, ~300 KB/maç), çıktı `src/data/penalties.fotmob.json` (git'te;
  aynı turnuva+sezon yeniden çalıştırmada değişir, diğerleri korunur). `realPenalties.ts` iki
  üretilen dosyayı birleştirir. Mevcut küme (hepsi 2025/26): Bundesliga (FotMob lig 54, 306
  maç, 109 penaltı), Süper Lig (71, 306 maç, 90), Premier League (47, 380 maç), Serie A (55,
  380 maç), Eredivisie (57, 309 maç; play-off dahil), Ligue 1 (53, 306 maç); ayrıca Şampiyonlar
  Ligi (42) ve Avrupa Ligi (73) 2024/25 ile 2025/26 (sezon başına 189 maç: lig aşaması + eleme
  turları, ön elemeler yok; seri penaltılar `period: "PenaltyShootout"` ile gelir). FotMob'un
  lig adı "Süper Lig" elle giriş kategorisiyle aynıdır, ikisi tek kategori olarak görünür.
- Dönüşüm saf ve testli: `src/data/fotmob/mapping.ts`. Şut haritasında her şutun kale çizgisini
  geçtiği nokta var: `goalCrossedY` saha genişliğinde metre (direkler 34 ± 3,66; BÜYÜK Y
  vuranın SOLU, StatsBomb'un tersi; 2022 DK finalinin 11 penaltısıyla doğrulandı),
  `goalCrossedZ` yükseklik (üst direk 2,44). Sonuç: `Goal` → goal, `AttemptSaved` → saved,
  `Miss`/`Post` → missed. Ayak `shotType` (LeftFoot/RightFoot; kafa atlanır). Skor olay
  listesindeki "olaydan önceki skor" alanından okunur. Vuruş tekniği olmadığından panenka
  üretilmez; kaleci yönü StatsBomb'daki kuralla tahmin edilir (`keeperDiveFor`). `history`
  yalnızca o çalıştırmadaki kayıtlardan hesaplanır.
- Takım adları FotMob'un kısa adlarıdır ("Mainz 05", "Başakşehir"); forma renkleri `kits.ts`'e
  bu adlarla girildi, top stilleri `ballStyles.ts` → "Bundesliga", "Süper Lig" vb. Kulüp
  logoları `npm run logos:fetch` ile gelir (aşağıdaki "Takım logoları").
- Lisans: FotMob'un resmî/açık bir API'si yoktur, kullanım şartları otomatik erişimi kısıtlar.
  Ham veri bu yüzden git dışıdır; herkese açık yayından ve gelir modelinden önce bu veri için
  izinli bir kaynağa (ör. ücretli API) geçilmeli ya da kayıtlar resmi özet videolarından elle
  doğrulanmalıdır. Toplu indirme araç izniyle engellenebilir; betiği kullanıcı terminalde çalıştırır.
- `src/server/gameStore.ts`: oyunlar bellekte, `globalThis` üzerinde (HMR'da kaybolmasın diye).
  Sunucu yeniden başlayınca silinir, tek sunucu örneğinde çalışır.
- `src/app/api/games/`: `POST /api/games` (gövde isteğe bağlı: `{ competitions?: string[] }`,
  kimlik "turnuva|sezon"; seçimde 10'dan az penaltı varsa 400), `POST /api/games/[id]/guess`,
  `POST /api/games/[id]/next`.
- `src/game/competitions.ts`: havuzdaki turnuvaları sayar ve seçime göre süzer. Liste
  `page.tsx`'te sunucuda hesaplanıp `Game`'e prop olarak gider; kurgusal veride boştur ve
  girişteki seçici gösterilmez. Türkçe turnuva adları `labels.ts` → `competitionLabel`.
- Giriş kartı kısa tutulur: slogan + "Nasıl oynanır?", ad/bölge alanları, turnuva özeti şeridi
  (`CompetitionSheet.tsx` → `CompetitionBar`: üst üste en çok 5 logo, "+N", seçim sayısı ve
  penaltı sayısı) ve üç mod kartı (`modeCards`; tek kişilik altın birincil kart). Tam turnuva
  listesi şeride tıklanınca ekranı kaplayan panelde (`CompetitionSheet`) açılır; seçim 10
  penaltının altındaysa "Tamam" kapalıdır ve uyarı panelde görünür. Esc kapatır.
- Girişteki seçici `CompetitionPicker.tsx`: `groupCompetitions` turnuvaları türe göre bölümler
  (`competitionKind`: ad kalıbından lig / milli takım / kupa; bilinmeyen ad lig) ve aynı
  turnuvanın sezonlarını tek kartta toplar (sezonlar kart içinde sekme). Seçim durumu "dışarıda
  bırakılanlar" kümesidir (boş = hepsi); tıklama kuralı `toggleGroup`: hepsi açıkken tıklanan
  tek başına seçilir, sonra ekler/çıkarır, hiç açık kalmazsa yeniden hepsi. Kartta logo varsa
  `CompetitionLogo`, yoksa kupa simgesi; sezonların bir kısmı seçiliyse işaret yarım dolar.
- Duraklatma (`pauseGame` / `resumeGame`, `POST /api/games/[id]/pause` ve `/resume`): yalnızca
  tek kişilik oyunda ve tahmin evresinde; challenge denemesi duraklatılamaz (409
  `game.pauseChallenge`), odalarda zaman çizelgesi ortak olduğundan düğme yoktur. Sürdürünce
  `roundStartedAt` duraklatılan süre kadar kaydırılır ve kalan süre (`remainingMs`) döner;
  istemci sayacını (`deadline` ref) bununla hizalar. Duraklatılmışken tahmin ve ipucu 409
  `game.paused` alır.
- Duraklat ve çık düğmeleri sahanın üst ortasında cam hap (`fieldActions`, dar ekranda sağ
  altta); duraklatılmışken gizlenir. Çıkış onay kaplaması
  modda göre not gösterir (tek kişilik: sıralamaya sayılmaz; challenge: o ana kadarki puanla
  sayılır; oda: odadan ayrılır). Yarım bırakılan tek kişilik oyun sunucuda süresi dolunca silinir.
- Öğretici (`Tutorial.tsx`): ilk ziyarette kendiliğinden açılan beş adımlı kaplama (turnuva
  seçimi, penaltıyı oku, bölge ve vuruş seç, kilitle ve süre, puanlama); görüldü bilgisi `localStorage`
  `penalti-tahmin:ogretici`, giriş kartındaki "Nasıl oynanır?" ile yeniden açılır. Metinlerdeki
  sayılar `scoring.ts` ve `session.ts` sabitlerinden gelir; çizimler arayüz parçalarının CSS
  kopyalarıdır (`art*` sınıfları). Ok tuşları adım değiştirir, Esc kapatır.
- `src/components/Game.tsx`: tek kişilik istemci durum makinesi (`idle → guessing → shooting →
  revealed`, tahminde `paused`). Süre dolarken hem bölge hem tip seçiliyse tahmin bilerek gönderilir. `shooting`
  süresi `shotDurationMs(answer)` ile 3D animasyondan okunur. `revealed` evresinde özet
  (gerçek vuruş, tahmin, puan dökümü, toplam) gösterilir ve `AUTO_NEXT_MS` (15 sn) sonra
  sıradaki penaltıya (son turda sonuçlara) kendiliğinden geçilir; "Hemen geç" beklemeyi atlar. Tur ekranının kendisi
  (`RoundView.tsx`) durumu dışarıdan alır; tek kişilik ve çok oyunculu mod onu paylaşır.

### Yayına alma (Docker)
- `next.config.ts` → `output: "standalone"`. `Dockerfile` çok aşamalı (Node 26 alpine),
  `docker-compose.yml` app + Caddy (HTTPS, `Caddyfile`; SSE için `flush_interval -1`),
  `.env.production.example`, kurulum adımları `DEPLOY.md`. `/api/health` HEALTHCHECK ucu.
- Kalıcı veri tek yerde: `./data` volume'u `/app/data`; elle giriş dosyasının klasörü imajda
  sembolik bağ (`/app/src/data` → `/app/data/manual`), ilk açılışta `/app/seed` kopyasından
  oluşturulur. `manualStore` yolu bilerek sabit: değişken yol Next'in dosya izleyicisini bütün
  projeyi kopyalamaya itiyordu (standalone 2 GB); `next.config.ts`'te
  `outputFileTracingExcludes` ham veri, model ve `data/` klasörlerini dışarıda tutar. Model ve
  logo klasörleri imaja girmez (`.dockerignore`), salt okunur volume ile bağlanır.
- Uygulama tek örnek çalışmalı (bellek içi oyun/oda durumu). Yerelde Docker yok; imaj sunucuda
  kurulur, yerelde yalnızca standalone derleme doğrulanır.

### SEO ve paylaşım
- Ortak kimlik `src/lib/site.ts`: `SITE_URL` (`NEXT_PUBLIC_SITE_URL` ortam değişkeni, yoksa
  `http://localhost:3457`; yayında `.env.local`'a yazılır), ad, anahtar kelimeli başlık ve
  açıklama. `layout.tsx` buradan `metadataBase`, başlık şablonu, Open Graph / Twitter, robots
  ve canonical üretir; `viewport` tema rengi koyu yeşil.
- Kodla üretilen dosyalar (`src/app/`): `robots.ts` (`/yonetim` ve `/api/` kapalı, sitemap
  adresi), `sitemap.ts` (ana sayfa, `/ligler`, `/oyuncular`, her turnuva+sezon sayfası ve en az
  `PLAYER_PAGE_MIN` penaltılı oyuncu sayfaları; havuz her istekte okunur), `manifest.ts`,
  `icon.tsx` (64 px) ve `apple-icon.tsx` (180 px) kale+top simgesi, `opengraph-image.tsx`
  (1200×630) `next/og` ImageResponse ile. Yollar: `/robots.txt`, `/sitemap.xml`,
  `/manifest.webmanifest`, `/icon`, `/apple-icon`, `/opengraph-image`.
- `SeoIntro.tsx` (sunucu bileşeni) giriş kartının altında aranabilir Türkçe metin verir:
  tanıtım, havuzdaki turnuvalar (türe göre, sezon ve sayıyla; her sezon kendi lig sayfasına
  bağlı), SSS; ayrıca JSON-LD (`VideoGame` + `FAQPage`). `page.tsx` → `Game`'e `footer`
  prop'u olarak gider, yalnızca giriş ekranında görünür. Sunucu dil bilmediğinden bölüm Türkçedir.
- Uzun kuyruk sayfalar (sunucuda işlenir, Türkçe, `force-dynamic`): `/ligler` dizini ve
  `/ligler/[slug]` (turnuva+sezon, slug `competitionSlug` = `teamSlug("Süper Lig 2025/26")` →
  `super-lig-2025-26`), `/oyuncular` dizini ve `/oyuncular/[slug]` (`playerSlug` =
  `teamSlug(ad)`; aynı adlı oyuncular tek sayfada birleşir). Özet hesabı saf ve testli:
  `src/game/seoPages.ts` (`summarizeCompetitions`, `summarizePlayers`, `findCompetitionPage`,
  `findPlayerPage`, `indexedPlayers`, `playUrl`, `parsePlayParam`). Ortak iskelet
  `src/components/SeoPage.tsx` (`.intro` zemini + `.seo .page` kartı, ekmek kırıntısı ve
  `BreadcrumbList` JSON-LD, `TallyTiles`). Lig sayfası: gol/kurtarış/kaçan kutuları, en çok
  penaltı kullanan 10 oyuncu, diğer sezon çipleri, "oyna" bağlantısı. Oyuncu sayfası: takımlar,
  ayak, sayılar, turnuva çipleri, "bu turnuvalarla oyna". Üç penaltıdan az oyuncunun sayfası
  açılır ama `robots: noindex` alır ve sitemap'e girmez. CEVAP SIZMAZ: bölge, vuruş tipi,
  kaleci yönü ve oyuncunun yön dağılımı (`history`) hiçbir sayfada yoktur (testle korunur).
- "Oyna" bağlantısı ana sayfayı `?turnuva=<id>` (tekrarlanabilir, "turnuva|sezon") ile açar;
  `page.tsx` parametreyi `parsePlayParam` ile havuzdakilere eşleyip `Game`'e `preselected`
  verir, `Game` `excluded` kümesini buna göre kurar (hepsi seçiliyse boş küme).
- Yapılmayanlar: dil başına ayrı adres yok (`/en`, `/dil`), bu yüzden `hreflang` verilmedi;
  yayında Search Console ve Bing Webmaster kaydı, sitemap gönderimi kullanıcıya düşer. Milli
  takım sayfalarında StatsBomb kaynak notu metin olarak var; lisansın istediği logo ile atıf
  yayından önce eklenmeli.

### Bölgeler ve tohum oyuncular
- Oyuncu ülke yerine bölge seçer (`src/game/regions.ts`: Türkiye, Avrupa, Orta Doğu, Asya,
  Afrika, Kuzey Amerika, Güney Amerika, Okyanusya; `localStorage` `penalti-tahmin:bolge`).
  Toplam puan ve challenge sıralamaları `?region=` ile süzülür ("world" = Dünya); sıra süzgeç
  içinde hesaplanır, `RegionTabs` bileşeni sekmeleri çizer. Takma ad + bölge olmadan oyun
  sıralamaya sayılmaz.
- Tohum oyuncular (`src/game/seedBoard.ts`): oyuncu çekmek için sıralamalar başta dolu görünür.
  Dosyaya yazılmazlar; `src/server/seeds.ts` durum hesaplanırken sanal olarak birleştirir.
  Anahtarları "seed-" ile başlar, üretim kararlıdır (bölge ve haftaya göre), gerçek oyuncular
  aynı kurallarla aralarına girer. `SEED_LEADERBOARD=0` ortam değişkeniyle kapatılır. Kullanıcı
  bunları gerçek oyuncu gibi göstermeyi istedi; arayüzde ayırt edici işaret yok.

### Takım logoları
- Logolar `public/logos/<slug>.svg|png` dosyalarından okunur; klasör git dışıdır (marka
  hakkı), dosyaları kullanıcı koyar. Slug takım adından türetilir (`src/game/teams.ts` →
  `teamSlug`: "Fenerbahçe" → `fenerbahce`, "Côte d'Ivoire" → `cote-d-ivoire`).
- `npm run logos` klasörü tarayıp `src/data/logos.manifest.json` üretir (git'te; dosya yoksa
  arayüz baş harfli rozete düşer). `npm run logos -- --missing` havuzdaki takımlardan logosu
  olmayanları beklenen dosya adıyla listeler.
- Kulüp logoları `npm run logos:fetch` (`scripts/team-logos.mts`) ile FotMob logo CDN'inden
  (`images.fotmob.com/image_resources/logo/teamlogo/<id>_small.png`, 150×150 PNG, 5–15 KB)
  indirilir; takım kimlikleri `data-src/fotmob/league-*.json` fikstürlerinden okunur, var olan
  dosya atlanır, ardından manifest üretilir. 160 kulüp (altı lig + iki kupa) bu yolla geldi.
  Kullanıcı küçük logoların kabul edilebilir risk olduğuna karar verdi (4 Kasım 2026); yine de
  marka hakkı kulüplerindir, klasör git dışıdır ve yeni bilgisayarda komut yeniden çalıştırılır.
- Milli takımlar için bayrak: `flag-icons` (MIT) paketinin 4:3 SVG'leri `npm run flags` ile
  `public/flags/` klasörüne kopyalanır (git'te; bayrak marka değildir). Takım adı → ISO kodu
  haritası `src/game/countries.ts` (StatsBomb İngilizce adları ve Türkçe adlar; İngiltere,
  İskoçya, Galler "gb-eng" gibi alt kodlar). Yeni milli takım eklenince haritaya ekle ve
  `npm run flags` çalıştır.
- `TeamBadge` bileşeni sırayla logo → bayrak → baş harf rozeti çizer; tur ekranında oyuncu
  kartında ve takım–skor–rakip şeridinde kullanılır.
- Turnuva logoları aynı klasörde `competition-<slug>[-<sezon>].png|svg` adıyla durur; sezona
  özel dosya önce aranır (`competition-fifa-world-cup-2022.svg`), yoksa genel
  (`competition-bundesliga.svg`, `competition-super-lig.png`). `npm run logos` manifeste alır.
  Kaynaklar: Süper Lig tff.org ana sayfası (477×177 PNG, saydam); Bundesliga, Premier League,
  Serie A, Ligue 1, Eredivisie, Euro 2020/2024, Dünya Kupası 2018/2022, Copa América 2024 ve
  Afrika Kupası 2023 en.wikipedia bilgi kutusu dosyaları (upload.wikimedia.org; çoğu "non-free
  logo" işaretli, 150 KB'yi aşan SVG'ler yerine 330 px PNG küçük resmi alındı). `CompetitionLogo` bileşeni
  logoyu sabit yükseklikte beyaz plakada çizer, yoksa `fallback` (girişte kupa simgesi)
  gösterir; girişte turnuva kartı (genel logo yoksa en yeni sezonunki) ve tur ekranında
  oyuncu kartındaki karşılaşma satırında kullanılır. Turnuva logoları da marka hakkıyla
  korunur; klasör git dışıdır. Kulüp logoları için lisansı temiz
  ücretsiz kaynak yoktur; TheSportsDB (ücretsiz geliştirici anahtarı, uygulama mağazası için
  ücretli) ya da API-Football/Sportmonks abonelikleri logo verir, ancak marka hakları kulüplere
  aittir.
- Kullanıcının bulduğu github.com/Leo4815162342/football-logos deposunda tek tek logo yok
  (ülke başına önizleme kartı var), lisans dosyası yok; README logoların marka hakkıyla
  korunduğunu ve ticari kullanımın yasak olduğunu söylüyor. Logolar football-logos.cc'den
  kullanıcı tarafından indirilir.

### Tek kişilik toplam puan sıralaması
- Girişte takma ad yazılırsa `POST /api/games` gövdesine `token` ve `name` gider ve oturum
  `GameSession.solo` ile işaretlenir; oyun bitince (`finished`) puan `data/leaderboard/solo.json`
  dosyasındaki oyuncunun toplamına eklenir (`src/game/soloBoard.ts` → `recordGame`). Yarım
  bırakılan oyun sayılmaz. Sıralama: toplam puan, sonra az oyunda toplayan, sonra erken ulaşan.
- `GET /api/leaderboard?token=` ilk 10 ve senin sıranı döner; girişte `SoloBoard` bileşeni
  listeler, bitiş ekranı kısa satır gösterir. Kimlik ve ad `src/components/identity.ts`
  (`localStorage`: `penalti-tahmin:oyuncu`, `penalti-tahmin:ad`); challenge ve odalar da aynı
  anahtarı kullanır. Giriş sunucuda da işlendiği için anahtar `useSyncExternalStore` ile boş
  sunucu anlık görüntüsünden okunur (hidrasyon uyumsuzluğu olmasın).

### Haftalık challenge (dünya sıralaması)
- Hafta Pazartesi 00:00 Türkiye saatinde (UTC+3 sabit) başlar; `src/game/challenge.ts` →
  `weekOf` ISO hafta anahtarı üretir ("2026-W45"), `pickWeekPenalties` havuzu kimliğe göre
  sıralayıp hafta anahtarıyla tohumlanmış karıştırmadan 10 penaltı seçer. Seçim ilk istekte
  `data/challenge/<hafta>.json` dosyasına dondurulur (git dışı), havuz sonradan değişse de hafta
  değişmez.
- Kimlik: hesap yok; istemci `localStorage`'da UUID (`penalti-tahmin:oyuncu`) tutar, sunucu
  haftada bir denemeyi bu anahtara göre uygular (en iyi çaba; depolama silinirse yeniden
  oynanabilir, Faz 3'te hesapla çözülür). Ad `penalti-tahmin:ad` anahtarıyla paylaşılır.
- Akış: `GET /api/challenge?token=` durum + ilk 20 + senin sıran; `POST /api/challenge/start`
  `{token, name}` denemeyi kaydeder ve sıradan oyun oturumu (`GameSession.challenge`) açar;
  turlar `/api/games/[id]/guess` üzerinden oynanır ve her turda puan tabloya işlenir, yarım
  bırakılan deneme o puanla sayılır. Sıralama: puan, sonra bitirmiş olma, sonra erken bitiren.
- Depo `src/server/challengeStore.ts`: dosya başına değişiklik zamanı önbelleği, yazmalar tek
  kuyrukta. Ekran `src/components/Challenge.tsx`; oyun bitince "Sıralamayı gör" aynı ekrana döner.

### Çok oyunculu oda (Faz 4)
- Taşıma katmanı Socket.IO değil, Next rota işleyicisinden sunucu gönderimli olaylar (SSE):
  `GET /api/rooms/[code]/events?playerId=` her değişiklikte odanın o oyuncuya göre durumunu
  (`RoomState`) yollar; eylemler sıradan POST'tur (`/api/rooms` kur, `[code]/join`, `start`,
  `guess`, `leave`). Özel sunucu gerekmez; `gameStore` gibi tek örnek, bellek içi çalışır.
- `src/game/room.ts` saf mantık: lobi → guessing → reveal → finished. Zaman çizelgesi sunucuya
  aittir: tur 30 sn + 1,5 sn tolerans, herkes kilitleyince erken açıklama, açıklama `REVEAL_MS`
  (8 sn) sonra sıradaki tur. Geç gelen tahmin süresi dolmuş sayılır ama "kilitlendi" kabul
  edilir. En çok 8 oyuncu; ev sahibi ayrılırsa sıradaki devralır. Cevap yalnızca `reveal`
  evresinde ve oyuncunun kendi sonucuyla gider.
- `src/server/roomStore.ts`: odalar `globalThis.__rooms`'ta, 250 ms'lik tek zamanlayıcı
  evreleri ilerletir (`tickRoom`), 2 saat boşta kalan oda silinir. `mutateRoom` sürümü artırıp
  abonelere haber verir.
- `src/components/Multiplayer.tsx`: kurulum (ad, oda kur / koda katıl, `?oda=KOD` bağlantısı),
  lobi, tur (`RoundView` + oyuncu çipleri) ve liderlik tablosu. Oturum `sessionStorage`'da
  (`penalti-tahmin:oda`), ad `localStorage`'da; sayfa yenilenince odaya geri bağlanır. Evre
  geçişi render sırasında türetilir (lint `set-state-in-effect` kuralı yüzünden effect yok),
  kalan süre sunucu saatine (`serverNow`) göre hesaplanır.
- Tarayıcıda denerken: iki sekme aynı tarayıcı profilinde olabilir (oturum sekmeye özeldir).
  Araç gecikmesi birkaç saniye olabildiğinden sayaç okumaları kaymış görünür; bu hata değildir.

### Google AdSense alanları
- Yapılandırma `src/lib/adsense.ts`: `NEXT_PUBLIC_ADSENSE_CLIENT` (ca-pub-…) ve üç birim
  kimliği `NEXT_PUBLIC_ADSENSE_SLOT_INTRO` / `_FINISH` / `_CONTENT` (`.env.local`, yeniden
  başlatma ister). Kimlik yoksa `layout.tsx` AdSense betiğini yüklemez, `AdSlot` yayında
  hiçbir şey çizmez, geliştirmede "REKLAM · intro" kesikli yer tutucu gösterir.
- `AdSlot.tsx` (istemci): duyarlı `auto` birim, `adsbygoogle.push` bir kez; alan 100 px
  en az yükseklikte (CLS). Yerleşimler: giriş kartının altı (`intro`), oyun sonu ekranı
  (`finish`), `SeoPage` ile bütün lig/oyuncu sayfalarının makale altı (`content`). Tur
  ekranında bilerek reklam yok; 3D sahnedeki kayan bant ayrı (aşağıdaki "Reklam panosu").
- `/ads.txt` `src/app/ads.txt/route.ts` ile kimlikten üretilir. AdSense onayı için yayında
  gizlilik politikası sayfası ve AB ziyaretçileri için onay yönetimi (Google CMP) gerekir;
  henüz yok. StatsBomb lisansı gelir modeline izin vermez (yukarıdaki lisans notu); AdSense
  açılmadan önce o veri için izin alınmalı ya da veri çıkarılmalı.

### Reklam panosu (gelir alanı)
- Kalenin arkasında, mavi "PENALTI TAHMİN" panosunun üstündeki duvar şeridinde kayan bant
  (`AD_BAND` sabitleri `textures.ts`'te: 150 m genişlik, 1,1 m yükseklik, z=−8,7). İçerik
  `createAdBandTexture` ile tek bir uzun tuvale çizilir (yazı + görsel, en çok 8192 px; sığmazsa
  ölçek küçülür), doku `RepeatWrapping` ile bant boyunca tekrar eder ve `world.ts` her karede
  `offset.x`'i `AD_SPEED` (1,6 m/sn) ile kaydırır. Hiç açık reklam yoksa bantta oyunun adı yazar.
- Veri `src/game/ads.ts` (saf, testli): `Ad { id, text, image, enabled, createdAt }`, sıra
  listedeki sıradır (`moveAd`). Kayıtlar `data/ads/ads.json`, görseller `data/ads/<id>.<uzantı>`
  (git dışı; `src/server/adStore.ts`, atomik yazma, tek kuyruk).
- Uçlar: herkese açık `GET /api/ads` (yalnızca açık reklamlar, `imageUrl` →
  `/api/ads/[id]/image`); yönetim `GET/POST /api/admin/ads` (POST `multipart/form-data`:
  `text`, isteğe bağlı `image`; PNG/JPEG/WebP/GIF/SVG, en çok 2 MB, yazı en çok 80 karakter),
  `PATCH /api/admin/ads/[id]` (`{ enabled?, text?, move?: -1 | 1 }`), `DELETE`.
- Yönetim ekranındaki "Reklam panosu" paneli (`AdminAds.tsx`) ekleme, açık/kapalı, sıra ve
  silme sunar. `Pitch3D` sahne kurulunca `/api/ads`'i bir kez çeker; reklam değişince oyuncu
  sayfayı yenileyince görür. 2D yedek saha (`Pitch.tsx`) reklam göstermez.

### Çoklu dil (`src/i18n/`)
- Sözlükler düz anahtarlıdır: `tr.ts` tip kaynağı (`MessageKey`), `en.ts` ve `de.ts` aynı
  anahtar kümesini taşımak zorundadır; `i18n.test.ts` anahtar ve `{yerTutucu}` eşitliğini
  denetler. `translate(locale, key, params)` yer tutucuları doldurur, eksik anahtar Türkçeye düşer.
- `LocaleProvider` (`layout.tsx`'te) dili `penalti-tahmin:dil` anahtarıyla localStorage'da tutar;
  ilk çizim her zaman Türkçedir (sunucuyla aynı, hidrasyon bozulmaz), ardından kayıtlı dil ya da
  tarayıcı dili uygulanır ve `<html lang>` güncellenir. Bileşenler `useT()` ile `t` alır;
  `t.locale` büyük/küçük harf (`toLocaleUpperCase(t.locale)`) ve sözcük sırası için taşınır.
- Girişteki TR / EN / DE seçici kartın sağ üst köşesindedir (`langSwitch`).
- Etiketler `src/game/labels.ts`'te `t` alır: `zoneLabel` ("Sol üst" / "Top left" / "Oben
  links", sıra `zone.name` anahtarından), `targetLabel`, `answerLabel`, `shotLabel`,
  `outcomeLabel`, `competitionLabel` (StatsBomb adı → `competition.*`, yoksa olduğu gibi),
  `regionName`, `hintText`. Türkçe sabitler (`SHOT_LABELS`, `OUTCOME_LABELS`, `trLabels`)
  yalnızca çevrilmeyen yönetim ekranı içindir.
- Sunucu dil bilmez: ipucu yapısal döner (`{kind: "direction"|"height", value: Index}` ya da
  `{kind: "shot", value: ShotType}`), metni istemci `hintText` ile üretir. Hata yanıtları
  `{ error, code }` taşır (`GameFlowError`, `RoomError`, `ChallengeError` ve rota düzeyi
  hatalar); istemcide `api.ts` içindeki `errorText(t, e)` kodu `error.<code>` anahtarına
  çevirir, kodu olmayan hatada Türkçe `error` metni gösterilir.
- Yönetim ekranı (`/yonetim`) bilerek Türkçe kaldı.

### 3D sahne (`src/components/pitch3d/`)
- `Field.tsx`, `Pitch3D`'yi `ssr: false` ile yükler; WebGL yoksa 2D `Pitch.tsx`'e düşer.
  Bölge butonları HTML katmanıdır, `projectGoal` ile kale ağzının ekrandaki yerine oturur ve
  vuruş sırasında gizlenir; "Dışarı" şeridi üst direğin hemen üstündedir (`OUT_STRIP`).
- `animation.ts` zaman çizelgesinin tek kaynağıdır ve three.js'e bağlı değildir: metre/saniye,
  kale çizgisi z=0, penaltı noktası z=11. Uçuş süreleri (`FLIGHT`) sert 0,30 sn, plase 0,72 sn,
  panenka 1,0 sn; fark bilerek büyük (kullanıcı sert vuruşun belli olmasını istedi). `KICK_AT = 0.75`, penaltıcı hareketinde ayağın topa
  değdiği kareyle eşleşir; değiştirilirse `shooterClip.ts`'teki `SHOOTER_CONTACT_TIME` ile
  birlikte düşünülmeli. `ballPosition(t, answer)` topun tüm yolunu (uçuş, kurtarışta sekme, golde
  file, kaçan topta direğin yanından/üst direğin üstünden geçip arkada durma) verir; kaçan topun
  çizgiyi geçtiği nokta `missPoint`, kaleci bunda golde olduğu gibi orta yüksekliğe dalar.
- `world.ts`: sahneyi kurar, her karede `update({ clock, t, shot, ... })` çalışır. Kamera
  (`placeCamera`) tahmin sırasında sabittir, vuruşta penaltıcının karşı tarafına kayar.
  Görüş açısı `Pitch3D.tsx`'teki `VERTICAL_FOV` ile birlikte ayarlanır (dik ekranda genişler).
- `netCloth.ts`: sabit adımlı (1/120 sn) Verlet kumaş file; top yalnızca bir yönden çarpar.
- `textures.ts`: tüm dokular tuvalde üretilir (dış dosya yok). Çim: saha dokusu + `world.ts`'te
  `onBeforeCompile` ile iki ölçekte çarpılan yakın çim dokusu ve normal haritası. Tribün
  (`createCrowdTexture`): mat koltuk blokları, merdivenler ve tek tek çizilen seyirciler
  (gövde, baş, saç, kol kaldıranlar, boş koltuklar); `CROWD_REPEAT` (6×3) ile kişi ≈0,4 m,
  sıra ≈0,45 m olur, üst sıralar karartılır.
- Tur ekranında skorboard sahanın sol üst köşesinde (`scoreCard`), ipucu sağ üstte, kontrol
  şeridi altta; kilit düğmesi mavi (`lockBtn`) ki yeşil saha ve amber ipucundan ayrışsın.
- Bölge butonları dolgulu, çerçeveli ve ortasında nokta olan kutulardır (`.zone`). "Dışarı" üç
  şerittir (üst, sol, sağ; `OUT_STRIP`, `OUT_SIDE_RATIO`), hepsi aynı `"out"` hedefini seçer;
  yön puanlamaya girmez. 2D sahada şeritler sabit yüzdelerdedir (`outTopFixed` vb.).
- Turnuvaya özel top: `src/game/ballStyles.ts` turnuva|sezon → `BallStyle` (altıgen rengi,
  beşgen renkleri, beşgen çevresi halka, mozaik). Resmî tasarımlar marka hakkıyla korunduğu
  için bire bir kopyalanmaz, yalnızca renk düzeni çağrıştırılır. `createBallTextures(style)`
  dokuyu üretir, `world.setBall` stil kimliğine göre önbellekler; `RoundView` → `Field` →
  `Pitch3D` zinciriyle her turda `ballStyleFor(round.match)` gider. 2D sahada yalnızca renk.

### Mixamo karakterleri
- Hepsi aynı "Beta" iskeleti (`mixamorig*` kemikleri), santimetre ölçekli (`MODEL_SCALE = 0.01`).
  Mixamo karakterlerinde kemik öneki sayılı gelebilir (`mixamorig5Hips`); `riggedModel.ts`
  yüklerken `normalizeBoneName` ile tek biçime çeker, yoksa hareketler bağlanmaz. FBX
  dosyalarında hareketin yanında boş bir "Take 001" kaydı da olur; hareket `findMotion` ile seçilir.
- Renklendirme (`loadRiggedModel(url, KitColors)`): dokulu karakterlerde cilt, yüz, saç ve
  ayakkabı dokuları korunur; adı `shirt`, `shorts`, `socks` geçen mesh'ler forma rengiyle
  çarpılır (Mixamo'nun forma dokuları beyazdır, renk olduğu gibi çıkar). Dokusuz mankenlerde
  bütün yüzey `shirt`, eklemler `joints` rengine boyanır. Hareket model dosyasında yoksa
  `Pitch3D` dalışı `kaleci-dalis.fbx`'ten, koşu-vuruşu `penaltici-vurus.fbx`'ten yükleyip
  `model.animations` olarak verir. `findMotion` boş "Take 001" kaydını ve karakter
  dosyalarındaki 0,03 sn'lik T-poz kaydını hareket saymaz (saysaydı T-poz oynardı).
- Takım renkleri (`src/game/kits.ts`): havuzdaki milli takımların iç saha formaları elle
  girildi, bilinmeyen takım adından kararlı renk türetir. Kaleci `keeperKitAgainst` ile
  penaltıcının formasından yeterince uzak kiti giyer (sarı, yeşil, mavi, turuncu, mor sırayla).
  `RoundView` her turda `kits` hesaplar → `Field` → `Pitch3D` → `world.setKits`; parçalar
  `userData.kitPart` ile işaretli, `applyKit` yalnızca malzeme rengini değiştirir.
- Kaleci `KEEPER_SCALE` (1,1 × `MODEL_SCALE`) ile penaltıcıdan iri; `createKeeperRig` ve
  `createShooterRig` ölçeği `model.scale.y`'den alır.
- Yeni karakter gelince `node scripts/inspect-model.mjs <dosya.fbx>` ile hareketleri, kemik
  önekini, mesh adlarını ve dokuları gör; forma parçaları yukarıdaki adlarla ayrılmış olmalı.
- `kaleci.fbx` 52 MB (gömülü dokular büyük); yayından önce dokuları küçültüp GLB'ye çevirmek
  gerekir (Blender ile). Penaltıcı hâlâ mankendir; aynı yolla değiştirilebilir (`penaltici.fbx`
  içindeki koşu-vuruş ayrı dosyaya alınır).
- Hareketler `mixer.update(0)` ile oynatılmaz, her karede `action.time` elle ayarlanır; böylece
  hareket oyunun zaman çizelgesine (`t`) kilitlenir.
- Model adresleri `modelUrls.ts`'te. `riggedModel.ts` FBX dosyalarını adrese göre önbellekler
  (`fbxCache`, `SkeletonUtils.clone` ile sahneye kopya verir); `preload.ts` → `preloadScene`
  giriş ekranında 1,2 sn sonra bütün dosyaları indirir (`Game.tsx`, dinamik import), ilk tur
  kapsül figür göstermeden açılır. Dosyalar toplam ~200 MB; GLB'ye çevirme hâlâ açık iş.
- Forma sırtı baskısı: penaltıcı `loadRiggedModel(..., printable=true)` ile yüklenir; forma
  mesh'inin dokusu tuvale kopyalanır (`drawShirt`): temel doku × forma rengi (malzeme rengi
  beyaz kalır), sırt alanı düz renkle kapatılır (Mixamo Ch38 dokusunda hazır bir "7" var),
  üstüne soyadı (büyük harf) ve numara. UV eşlemesi `scripts/inspect-uv.mjs` ile ölçüldü:
  sırt ortası u=0,556 v=0,245; u x ile ters (0,0055/cm), v y ile aynı yönde (0,0051/cm); doku
  4096 px. Yazı düz çizilir, sol ayaklıda model aynalandığı için yazı da aynalanır
  (`world.setShooterPrint`, `printedFoot`). Kaleciye baskı yok (adı veride yok). Geliştirmede
  `window.__penaltiShirt` tuvali verir.
- Forma numarası veride: StatsBomb `lineups` → `jersey_number`, FotMob `content.lineup`
  `starters`/`subs` → `shirtNumber`; `Player.number` (isteğe bağlı), 1273 kaydın hepsinde var.
- `keeperClip.ts`: dalış hareketi kalecinin soluna (kameradan sağa) gider; sol köşede model
  negatif `scale.x` ile aynalanır. Üst köşede gövde `diveLift` ile yükseltilir. Bekleme hareketi
  döngüde oynar ve dalışa 0,3 sn'de karışır. Ortadaki kurtarışta yakalama hareketi oynar;
  top uçuşun son 0,25 sn'sinde ellere kıvrılır ve `heldBall` ile ellerde kalır.
- `shooterClip.ts`: model, vuruş anında ayak ucu topun 12 cm arkasına gelecek şekilde yerleşir
  (temas noktası yüklenince iskeletten ölçülür). Koşu 20° çapraz döndürülür, sol ayaklı
  oyuncularda model aynalanır. Bekleme hareketi verilirse tahmin sırasında döngüde oynar ve
  vuruş başlayınca 0,3 sn'de koşuya karışır; `alignIdleToRun` beklemenin kalçasını koşunun
  başladığı noktaya taşır (y korunur) ki geçişte gövde zıplamasın.
- Yeni bir hareket gelince önce `scripts/trace-anim.mjs` ile ne yaptığını ölç (dosya adı
  hareketi doğru anlatmayabilir; örneğin ilk iki `kaleci-orta.fbx` bekleme hareketiydi). Tüm
  kayıtlara bak, yalnızca çıktının sonuna değil.

## Tarayıcıda deneme notları
- Sayfa açıldıktan sonra tıklamadan önce ~2 sn bekle (hidrasyon).
- Tarayıcı paneli gizliyken canvas boyut almaz, 3D sahne kurulmaz ve modeller yüklenmez.
- Tur süresi 30 sn; yavaş ekran görüntüsü döngüleri süreyi aşınca "tahmin sayılmadı" görülür,
  bu bir hata değildir.
- Konsolda `netBulge`, `SHOT_ANIMATION_MS`, `createBallTextures` gibi eski HMR hataları
  görülebilir; bunlar eski düzenlemelerden kalma kayıtlardır.

## Durum ve sonraki adımlar
- Faz 0–1 tamam: tek kişilik oyun, kurgusal veri, 3D saha, Mixamo kaleci ve penaltıcı.
- Faz 2 büyük ölçüde tamam: StatsBomb içe aktarma, altı turnuva, kaçan penaltılar ve "Dışarı"
  tahmini. Açık: daha fazla turnuva/lig eklemek, vuruş tipi ve kaleci yönü yaklaşımlarını
  iyileştirmek, takım adlarını Türkçeleştirmek, direğe çarpan topu ayrı canlandırmak.
- Faz 4 (çok oyunculu oda) çalışır durumda: SSE + bellek içi oda (yukarıdaki bölüm). Açık:
  aynı odada yeniden oynama (şimdilik "Yeni oda"), bağlantısı kopan oyuncunun işaretlenmesi,
  birden fazla sunucu örneği için Redis.
- Arayüz TR / EN / DE (yukarıdaki "Çoklu dil" bölümü). Açık: takım ve ülke adları veriden
  geldiği gibi (İngilizce) kalır; `<title>` ve meta açıklama Türkçedir (sunucuda dil bilinmez).
- Faz 3: hesaplar, günlük penaltılar, kalıcı liderlik tablosu (Postgres/Redis). Faz 5:
  cilalama, mobil, yayına alma.
- Açık konular: üst orta top için yakalama hareketi yok; telefon performansı ölçülmedi (iki model,
  her biri ~147 bin köşe); 520–900 px tablet aralığı denenmedi.
- Mixamo kullanım şartları birincil kaynaktan doğrulanmadı. Modeller tarayıcıya gönderildiği
  için herkese açık yayından önce şartlar okunmalı.
- `.env.local` içindeki `ADMIN_SECRET` yönetim ekranının anahtarıdır; yeni bilgisayarda
  yeniden üretilir (`node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`).
- Kullanıcı istemedikçe commit veya push yapılmaz. Üçüncü taraf dosya indirmeden önce
  kullanıcıya sorulur; Adobe/Mixamo girişini ve indirmeleri kullanıcı yapar.

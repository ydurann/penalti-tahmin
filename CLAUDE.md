# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proje

Penaltı Tahmin: kullanıcı, bir penaltının kalenin hangi bölgesine (3×3) ve hangi tiple
(plase / sert / panenka) atılacağını tahmin eder; vuruş sonra 3D sahnede oynatılır. Next.js 16
(App Router) + React 19 + TypeScript, 3D için three.js + @react-three/fiber.

Kullanıcı Türkçe yazar; yanıtlar, arayüz metinleri, kod yorumları ve test adları Türkçedir.

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
```

Vitest yapılandırması `vitest.config.mts` (`.mts` olmalı, `@` → `src`). Next 16'da eski
`FlatCompat` ESLint kurulumu döngüsel hata verdiği için yapılandırma doğrudan
`eslint-config-next` flat dizilerinden kurulur.

## Başka bilgisayarda devam ederken

- **Model dosyaları git'te yok.** `.gitignore` içinde `/assets-src/` ve `/public/models/` var
  (ham Mixamo dosyaları dağıtılmasın diye). Yeni bilgisayara elle kopyalanmaları gerekir:
  - `assets-src/mixamo/`: kullanıcının indirdiği orijinaller.
  - `public/models/`: oyunun okuduğu kopyalar; `kaleci.fbx` (model + dalış),
    `kaleci-orta.fbx` (bekleme), `kaleci-orta-yakalama.fbx` (ortada yakalama), `penaltici.fbx`
    (model + koşu ve vuruş).
  - Dosyalar yoksa oyun çökmez: konsola uyarı yazar ve kapsül figürlerle (`humanoid.ts`) devam eder.
- Kullanıcı yeni bir hareket indirdiğinde `assets-src/mixamo/`'ya koyar; dosyayı
  `public/models/`'a kopyalamak ve koda bağlamak bize düşer.
- Claude'un otomatik hafızası bilgisayara özeldir; kalıcı olması gereken bilgi bu dosyaya yazılır.

## Mimari

### Sunucu yetkili oyun akışı
- `src/game/` saf mantıktır (React/Next'e bağımlı değil): `session.ts` oyun durumunu ilerletir
  (`createGame`, `currentRound`, `submitGuess`, `nextRound`, hatalı akışta `GameFlowError` → 409),
  `scoring.ts` puanlar (tam bölge 100, doğru yön 40, doğru tip 50, ikinci tam isabetten itibaren
  seri bonusu 25×(seri−1)). 10 tur, tur başına 15 sn + 1,5 sn tolerans.
- `src/data/penalties.ts`: 24 KURGUSAL penaltı. Cevap (`zone`, `shot`, `outcome`, `keeperDive`)
  yalnızca sunucuda durur; istemciye ancak tahmin kilitlendikten sonra döner. Kurtarışlarda
  `keeperDive === zone.col` olmalıdır (testle korunur).
- `src/server/gameStore.ts`: oyunlar bellekte, `globalThis` üzerinde (HMR'da kaybolmasın diye).
  Sunucu yeniden başlayınca silinir, tek sunucu örneğinde çalışır.
- `src/app/api/games/`: `POST /api/games`, `POST /api/games/[id]/guess`, `POST /api/games/[id]/next`.
- `src/components/Game.tsx`: istemci durum makinesi (`idle → guessing → shooting → revealed`).
  Süre dolarken hem bölge hem tip seçiliyse tahmin bilerek gönderilir. `shooting` süresi
  `shotDurationMs(answer)` ile 3D animasyondan okunur.

### 3D sahne (`src/components/pitch3d/`)
- `Field.tsx`, `Pitch3D`'yi `ssr: false` ile yükler; WebGL yoksa 2D `Pitch.tsx`'e düşer.
  Bölge butonları HTML katmanıdır, `projectGoal` ile kale ağzının ekrandaki yerine oturur ve
  vuruş sırasında gizlenir.
- `animation.ts` zaman çizelgesinin tek kaynağıdır ve three.js'e bağlı değildir: metre/saniye,
  kale çizgisi z=0, penaltı noktası z=11. `KICK_AT = 0.75`, penaltıcı hareketinde ayağın topa
  değdiği kareyle eşleşir; değiştirilirse `shooterClip.ts`'teki `SHOOTER_CONTACT_TIME` ile
  birlikte düşünülmeli. `ballPosition(t, answer)` topun tüm yolunu (uçuş, kurtarışta sekme, golde
  file) verir.
- `world.ts`: sahneyi kurar, her karede `update({ clock, t, shot, ... })` çalışır. Kamera
  (`placeCamera`) tahmin sırasında sabittir, vuruşta penaltıcının karşı tarafına kayar.
  Görüş açısı `Pitch3D.tsx`'teki `VERTICAL_FOV` ile birlikte ayarlanır (dik ekranda genişler).
- `netCloth.ts`: sabit adımlı (1/120 sn) Verlet kumaş file; top yalnızca bir yönden çarpar.
- `textures.ts`: tüm dokular tuvalde üretilir (dış dosya yok). Çim: saha dokusu + `world.ts`'te
  `onBeforeCompile` ile iki ölçekte çarpılan yakın çim dokusu ve normal haritası.

### Mixamo karakterleri
- Hepsi aynı "Beta" iskeleti (`mixamorig*` kemikleri), santimetre ölçekli (`MODEL_SCALE = 0.01`).
  `riggedModel.ts` modeli yükleyip malzemeleri forma renkleriyle değiştirir. FBX dosyalarında
  hareketin yanında boş bir "Take 001" kaydı da olur; hareket `findMotion` ile seçilir.
- Hareketler `mixer.update(0)` ile oynatılmaz, her karede `action.time` elle ayarlanır; böylece
  hareket oyunun zaman çizelgesine (`t`) kilitlenir.
- `keeperClip.ts`: dalış hareketi kalecinin soluna (kameradan sağa) gider; sol köşede model
  negatif `scale.x` ile aynalanır. Üst köşede gövde `diveLift` ile yükseltilir. Bekleme hareketi
  döngüde oynar ve dalışa 0,3 sn'de karışır. Ortadaki kurtarışta yakalama hareketi oynar;
  top uçuşun son 0,25 sn'sinde ellere kıvrılır ve `heldBall` ile ellerde kalır.
- `shooterClip.ts`: model, vuruş anında ayak ucu topun 12 cm arkasına gelecek şekilde yerleşir
  (temas noktası yüklenince iskeletten ölçülür). Koşu 20° çapraz döndürülür, sol ayaklı
  oyuncularda model aynalanır.
- Yeni bir hareket gelince önce `scripts/trace-anim.mjs` ile ne yaptığını ölç (dosya adı
  hareketi doğru anlatmayabilir; örneğin ilk iki `kaleci-orta.fbx` bekleme hareketiydi). Tüm
  kayıtlara bak, yalnızca çıktının sonuna değil.

## Tarayıcıda deneme notları
- Sayfa açıldıktan sonra tıklamadan önce ~2 sn bekle (hidrasyon).
- Tarayıcı paneli gizliyken canvas boyut almaz, 3D sahne kurulmaz ve modeller yüklenmez.
- Tur süresi 15 sn; yavaş ekran görüntüsü döngüleri süreyi aşınca "tahmin sayılmadı" görülür,
  bu bir hata değildir.
- Konsolda `netBulge`, `SHOT_ANIMATION_MS`, `createBallTextures` gibi eski HMR hataları
  görülebilir; bunlar eski düzenlemelerden kalma kayıtlardır.

## Durum ve sonraki adımlar
- Faz 0–1 tamam: tek kişilik oyun, kurgusal veri, 3D saha, Mixamo kaleci ve penaltıcı.
- Faz 2: gerçek penaltı verisi (StatsBomb açık verisi vb.; lisans kontrol edilmeli).
- Faz 3: hesaplar, günlük penaltılar, liderlik tablosu (Postgres/Redis). Faz 4: canlı 1'e 1
  (Socket.IO). Faz 5: cilalama, mobil, yayına alma.
- Açık konular: penaltıcının bekleme hareketi yok (tahmin sırasında koşunun ilk karesinde
  durur); üst orta top için yakalama hareketi yok; telefon performansı ölçülmedi (iki model,
  her biri ~147 bin köşe); 520–900 px tablet aralığı denenmedi.
- Mixamo kullanım şartları birincil kaynaktan doğrulanmadı. Modeller tarayıcıya gönderildiği
  için herkese açık yayından önce şartlar okunmalı.
- Kullanıcı istemedikçe commit veya push yapılmaz. Üçüncü taraf dosya indirmeden önce
  kullanıcıya sorulur; Adobe/Mixamo girişini ve indirmeleri kullanıcı yapar.

# Pazarlama paketi

Marka: **GoalSpot** (tür adı olarak "penaltı tahmin oyunu" metinlerde kalır). Alan adı henüz
yok; metinlerdeki ALANADI yerine kesinleşen adres yazılır. Logo dosyaları:
`public/brand/goalspot-logo.svg` (işaret + yazı) ve `goalspot-mark.svg` (yalnızca işaret).

Görseller bu klasörde (`npm run promo` ile yeniden üretilir; tasarım `src/app/promo/[kind]/route.tsx`):

| Dosya | Boyut | Nerede |
|---|---|---|
| `promo-square.png` | 1080×1080 | Instagram gönderi, X/Twitter, Facebook |
| `promo-story.png` | 1080×1920 | Instagram story/Reels kapağı, YouTube Shorts ve TikTok kapağı |
| `promo-thumb.png` | 1280×720 | YouTube küçük resmi, X link kartı |
| `promo-banner.png` | 1500×500 | X/Twitter profil kapağı |

Alan adı kesinleşince `route.tsx` içindeki `DOMAIN` değiştirilip görseller yeniden üretilir.

## Konumlandırma (tek cümle)

**GoalSpot, gerçek penaltılarda kalecinin yerine geçtiğin ücretsiz bir tarayıcı oyunu:
topun nereye ve nasıl gideceğini tahmin et, vuruşu 3D sahnede izle, dünya sıralamasına gir.**

Ayrıştırıcı üç nokta (her içerikte en az biri geçsin):
1. **Gerçek penaltılar** — Süper Lig, Premier League, Bundesliga, Şampiyonlar Ligi, Dünya Kupası; 1273 vuruş, gerçek oyuncu, dakika ve skor.
2. **Kaleci gibi düşün** — oyuncunun önceki penaltıları ipucu; "Kane sağ alta mı?" sorusu paylaşım yaratır.
3. **Birlikte oyna** — oda kur, arkadaşlarınla aynı penaltıyı aynı anda tahmin et; haftalık challenge.

Hedef kitle: 16–35 yaş futbol izleyicisi, Türkiye öncelikli; ikinci dalga İngilizce/Almanca.

## Video senaryosu (30 sn, dikey 9:16; Shorts, Reels, TikTok)

Ekran kaydı + telefon kayıt gerekmez; oyunun ekran kaydı yeter (OBS ya da Windows Game Bar, Win+G).
Kayıtta telefon boyutuna yakın dar pencere kullan (tarayıcıyı 500 px genişliğe çek) ya da masaüstü kaydını sonradan 9:16 kırp.

| Saniye | Görüntü | Üst yazı (büyük, 2 satır) | Ses |
|---|---|---|---|
| 0–3 | Tur ekranı: oyuncu kartı "Harry Kane · Bayern · 88'", skor 1:1 | "Kane topun başında." | Tribün uğultusu |
| 3–7 | Kale ızgarası; imleç bölgeler üzerinde geziyor | "Sen kaleci olsan nereye atlardın?" | — |
| 7–11 | Sağ alt seçilir, "Sert" seçilir, kilit düğmesi | "Bölge + vuruş tipi. 30 saniye." | Tık sesi |
| 11–18 | 3D vuruş: koşu, vuruş, top file/kaleci | "Gerçek vuruş. 3D." | Vuruş + file sesi |
| 18–23 | Sonuç kartı: "+150" ve puan dökümü | "Tam bölge 100, doğru vuruş 50." | — |
| 23–27 | Hızlı kesmeler: Süper Lig, Premier League, Şampiyonlar Ligi turları, logolar | "1273 gerçek penaltı." | — |
| 27–30 | Giriş ekranı, adres büyük | "ALANADI · ücretsiz" | — |

İlk 3 saniye kural: izleyici kaydırmadan önce soru görmeli ("nereye atlardın?"). Ses yoksa da anlaşılmalı; üst yazılar zorunlu.

Çekilecek alternatif kısa klipler (10–15 sn, "hook" varyantları):
- "Messi 2022 final penaltısı, nereye?" → cevap 3D.
- "Icardi penaltıda ne yapar?" → geçmiş yön dağılımı kartı → vuruş.
- "Kaleci dalışı doğru köşeye, top yine içeride" → kurtarılamayan sert vuruş.
- Arkadaş odası: iki ekran yan yana, farklı tahmin, aynı vuruş.

## Platform metinleri

### X / Twitter

Lansman:
> Kaleci olsan nereye atlardın? 🧤
> Süper Lig'den Şampiyonlar Ligi'ne 1273 gerçek penaltı. Bölgeyi ve vuruşu tahmin et, vuruşu 3D sahnede izle.
> Ücretsiz, kayıt yok: ALANADI

Günlük seri ("Günün penaltısı", görsel: sorunun ekran görüntüsü, cevap yorumda ya da 1 saat sonra):
> Günün penaltısı: Osimhen, Galatasaray–Fenerbahçe, 90+3. Skor 1-1.
> Nereye attı? Yanıtını yaz, akşam açıklıyoruz. Oynamak için: ALANADI

Challenge (her pazartesi):
> Bu haftanın 10 penaltısı hazır. Herkese aynı 10 vuruş, tek deneme, dünya sıralaması.
> Puanını paylaş 👇 ALANADI

Etiketler (X'te 2–3 yeter): #penaltı #SüperLig #futbol #ŞampiyonlarLigi

### Instagram (gönderi + Reels)

> Topun başında Harry Kane, skor 1-1, dakika 88. Sen kalecisin: sol alt mı, sağ üst mü? ⚽🧤
> GoalSpot'ta gerçek penaltıları tahmin edip vuruşu 3D sahnede izliyorsun. Süper Lig, Premier League, Bundesliga, Şampiyonlar Ligi ve Dünya Kupası'ndan 1273 gerçek vuruş. Ücretsiz, tarayıcıda, kayıt yok.
> Link profilde 👆
> #penaltı #futbol #süperlig #premierleague #şampiyonlarligi #futboloyunu #penaltytahmin #oyun

Reels için metin kısa: "Nereye atlardın? Cevap 3D'de. Link profilde."

### TikTok

Caption kısa, soru biçiminde, Türkçe:
> kane 88. dakika 1-1, kaleci sensin, nereye atlarsın? 🧤 #penaltı #futbol #süperlig #fyp #keşfet #futboloyunu

TikTok'ta bağlantı profilde; ilk videoda "link bio'da" demeden sadece oyun adını söyle, 3–4. videoda bağlantıyı duyur.

### YouTube Shorts

Başlık: **Kaleci olsan nereye atlardın? | GoalSpot**
Açıklama:
> Gerçek penaltıları tahmin et, vuruşu 3D sahnede izle. Süper Lig, Premier League, Bundesliga, Şampiyonlar Ligi, Dünya Kupası. Ücretsiz: https://ALANADI
> #penaltı #futbol #shorts

Uzun video (3–5 dk, isteğe bağlı): "10 penaltıda kaç puan alırım?" biçiminde oynanış; küçük resim `promo-thumb.png`.

### İngilizce (ikinci dalga; X ve Reddit)

> You're the keeper. Kane, 88th minute, 1-1. Where does it go?
> Guess the corner and the shot type on 1,273 real penalties, then watch the real kick in 3D. Free, no sign-up: ALANADI

Reddit: r/soccer kendi tanıtımına izin vermez; r/WebGames, r/incremental_games benzeri topluluklarda "I made a game…" biçiminde, samimi anlatımla paylaş. r/FantasyPL ve kulüp subreddit'lerinde o kulübün penaltı sayfasına ("Bruno Fernandes'in bu sezonki 6 penaltısı") bağlantı ver.

## İlk iki hafta takvimi

| Gün | İçerik |
|---|---|
| 1 (Pzt) | Lansman: X + Instagram gönderisi (`promo-square`), story (`promo-story`), 30 sn video her yerde |
| 2 | TikTok/Shorts hook klibi 1 (Messi final) |
| 3 | X "Günün penaltısı" (Süper Lig) |
| 4 | Instagram Reels: arkadaş odası klibi |
| 5 | TikTok/Shorts hook klibi 2 (Icardi geçmiş) |
| 6 | X: lig sayfası paylaşımı ("Süper Lig 2025/26'da 90 penaltı, en çok kullanan…") |
| 7 | Haftalık challenge sonuçları: ilk 3'ü paylaş |
| 8 (Pzt) | Yeni challenge duyurusu; story'de anket "nereye?" |
| 9–13 | Günün penaltısı ×3, hook klibi ×2 |
| 14 | İki haftalık özet: kaç oyun oynandı, en zor penaltı |

Her gün bir içerik; aynı videoyu TikTok, Reels ve Shorts'a aynı anda yüklemek sorun değil.

## Ölçüm

- Her platform için ayrı bağlantı: `ALANADI/?utm_source=tiktok` gibi; Search Console ve basit bir ziyaret ölçümü (Plausible) ile hangi kanaldan oyuncu geldiğini gör.
- Takip edilecek üç sayı: siteye gelen, bir oyunu bitiren, tekrar gelen. Bitirme oranı düşükse öğretici ya da süre; tekrar gelen azsa challenge paylaşımı.
- "Puanını paylaş" için sonuç ekranına paylaş düğmesi (metin + görsel) eklenmeli; henüz yok, en etkili organik kanal bu.

## Dikkat

- Kulüp ve lig logoları görsellerde kullanılıyor; tanıtımda marka hakları daha görünür risk. Sorun olursa logoları görsellerden çıkarıp yalnızca lig adlarını yazmak yeter (`route.tsx`'te `LOGOS` listesi).
- Oyuncu adlarıyla paylaşım serbest (haber niteliğinde veri), ama oyuncu fotoğrafı kullanma.
- Gerçek maç videosu kesiti paylaşma; yalnızca oyunun 3D sahnesi.

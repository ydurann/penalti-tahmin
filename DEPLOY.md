# Yayına alma

Tek bir Linux sunucuda (VPS) Docker ile çalışır: `app` (Next.js, Node 26) ve `caddy` (HTTPS).
Oyun durumu bellekte, sıralamalar ve odalar tek örnekte tutulduğu için uygulama **tek
kopya** çalışmalıdır; sunucusuz (Vercel vb.) ortam uygun değildir.

## 1. Sunucu

- Ubuntu 24.04, 2 vCPU / 2 GB RAM yeterli (Hetzner CX22, DigitalOcean Basic vb.).
- Docker ve Compose eklentisi: `curl -fsSL https://get.docker.com | sh`
- Güvenlik duvarında 22, 80 ve 443 açık.
- Alan adının A (ve varsa AAAA) kaydı sunucu IP'sine yönlendirilir; Caddy sertifikayı
  ilk istekte kendisi alır.

## 2. Dosyalar

```bash
git clone <depo adresi> penalti-tahmin
cd penalti-tahmin
cp .env.production.example .env.production   # doldur: SITE_DOMAIN, NEXT_PUBLIC_SITE_URL, ADMIN_SECRET
mkdir -p data public/models public/logos
```

Git dışı klasörler yerel bilgisayardan kopyalanır (`scp` ya da `rsync`):

| Yerel | Sunucu | Not |
|---|---|---|
| `public/models/*.fbx` | `public/models/` | Zorunlu; yoksa kapsül figürler oynar. Yayından önce GLB'ye küçültülmeli. |
| `public/logos/` | `public/logos/` | Kulüp ve turnuva logoları; yoksa baş harfli rozet. |
| `data/` | `data/` | Varsa mevcut sıralama ve reklam verisi. |

```bash
rsync -av --progress public/models/ kullanici@sunucu:~/penalti-tahmin/public/models/
rsync -av --progress public/logos/  kullanici@sunucu:~/penalti-tahmin/public/logos/
```

## 3. Başlatma

```bash
docker compose up -d --build
docker compose logs -f app       # "Ready" satırını bekle
curl -s https://ALANADI/api/health
```

İlk açılışta `data/manual/penalties.manual.json` depodaki kopyadan oluşturulur; sonraki
kurulumlarda dokunulmaz. `data/` klasörü bütün kalıcı veridir: düzenli yedekle
(`tar czf yedek-$(date +%F).tgz data`).

## 4. Güncelleme

```bash
git pull
docker compose up -d --build
```

Model ya da logo dosyası değişince yalnızca `rsync` yeter; imaj yeniden kurulmaz.
Yeni lig verisi (`npm run import:fotmob`) yerelde üretilip commit edilir; sunucuda imaj
yeniden kurulunca gelir.

## 5. Yayın sonrası

- Google Search Console ve Bing Webmaster: siteyi doğrula, `https://ALANADI/sitemap.xml` gönder.
- AdSense onayından sonra `.env.production`'a kimlikleri yaz, `docker compose up -d --build`.
- `docker compose logs app` hataları gösterir; `docker stats` bellek kullanımını.
- Yönetim ekranı: `https://ALANADI/yonetim` (anahtar `.env.production` içindeki `ADMIN_SECRET`).

## Ortam değişkenleri

| Değişken | Nerede okunur | Açıklama |
|---|---|---|
| `SITE_DOMAIN` | Caddy | Sertifika ve yönlendirme alan adı |
| `NEXT_PUBLIC_SITE_URL` | derleme + çalışma | Canonical, sitemap, OG görseli |
| `ADMIN_SECRET` | çalışma | Yönetim ekranı anahtarı |
| `SEED_LEADERBOARD` | çalışma | `0` tohum oyuncuları kapatır |
| `NEXT_PUBLIC_ADSENSE_*` | derleme + çalışma | AdSense yayıncı ve birim kimlikleri |

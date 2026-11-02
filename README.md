# Penaltı Tahmin

Penaltının kalenin neresine ve nasıl atılacağını tahmin etme oyunu.

Şu anki durum: Faz 1, tek kişilik oyun ve 3D saha (WebGL yoksa 2D yedek). Veriler kurgusaldır
(`src/data/penalties.ts`).

## Çalıştırma

```bash
npm install
npm run dev
```

Testler için `npm test`, lint için `npm run lint`.

## Yapı

- `src/game`: Puanlama ve oyun akışı. React ve Next.js'e bağımlı değildir.
- `src/data`: Penaltı verisi. Yalnızca sunucu tarafından okunur.
- `src/server`: Oyun deposu ve istek doğrulama.
- `src/app/api/games`: Oyun API'si.
- `src/components`: Arayüz.
- `src/components/pitch3d`: Stadyum, kale, oyuncular ve vuruş animasyonu (three.js).

Gerçek vuruş bilgisi istemciye ancak tahmin kilitlendikten sonra gönderilir. Oyunlar şimdilik
bellekte tutulur, bu yüzden sunucu yeniden başlayınca silinir ve tek sunucu örneğinde çalışır.

# Penaltı Tahmin — üretim imajı (Next.js standalone çıktısı, Node 26).
#
#   docker compose up -d --build      # bkz. DEPLOY.md
#
# Model ve logo dosyaları git dışıdır; imaja kopyalanmaz, çalışma anında volume ile bağlanır
# (docker-compose.yml). Kalıcı veri /app/data altında durur.

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Yayın adresi derlemede de okunur (sitemap, OG görseli); compose build.args ile gelir.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT_INTRO
ARG NEXT_PUBLIC_ADSENSE_SLOT_FINISH
ARG NEXT_PUBLIC_ADSENSE_SLOT_CONTENT
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /app/data/manual /app/public/models /app/public/logos /app/src \
  && chown -R app:app /app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Elle girilen penaltılar (`src/data/penalties.manual.json`) kalıcı diske yazılır: klasör
# sembolik bağla /app/data/manual'a gider; ilk kurulumda depodaki kopya oraya alınır.
COPY --from=build --chown=app:app /app/src/data/penalties.manual.json /app/seed/penalties.manual.json
RUN rm -rf /app/src/data && ln -s /app/data/manual /app/src/data

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["sh", "-c", "[ -f /app/data/manual/penalties.manual.json ] || cp /app/seed/penalties.manual.json /app/data/manual/; node server.js"]

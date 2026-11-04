/** Oyuncu anahtarı: istemcinin ürettiği UUID; biçimi uymayanlar reddedilir. */
export const parseToken = (value: unknown): string | null =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value.toLowerCase() : null;

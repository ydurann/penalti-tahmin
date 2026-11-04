/**
 * Takım logoları `public/logos/<slug>.png|svg` dosyalarından okunur. Slug takım adından
 * türetilir: küçük harf, aksan ve Türkçe karakterler sadeleştirilir, harf/rakam dışı her şey
 * tire olur. "Côte d'Ivoire" → "cote-d-ivoire", "Fenerbahçe" → "fenerbahce".
 */
const TURKISH: Record<string, string> = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ç: "c", Ç: "c", ö: "o", Ö: "o", ü: "u", Ü: "u" };

export function teamSlug(name: string): string {
  return name
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (ch) => TURKISH[ch])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rozet için kısaltma: tek kelimede ilk üç harf, çok kelimede baş harfler (en çok üç). */
export function teamInitials(name: string): string {
  const words = name
    .split(/[\s\-']+/)
    .filter((w) => w.length > 1 && !/^(fc|sk|fk|cf|sc|afc|club|de|da|del)$/i.test(w));
  const source = words.length > 0 ? words : name.split(/\s+/);
  const text = source.length === 1 ? source[0].slice(0, 3) : source.slice(0, 3).map((w) => w.charAt(0)).join("");
  // Türkçe büyük harf kuralı ("i" → "İ") yalnızca Türkçe adlarda; "Switzerland" "SWİ" olmasın.
  const turkish = /[ıİşŞğĞçÇöÖüÜ]/.test(name);
  return turkish ? text.toLocaleUpperCase("tr") : text.toUpperCase();
}

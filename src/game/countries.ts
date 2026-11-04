/**
 * Milli takım adı (StatsBomb İngilizce adı ya da elle girilen Türkçe ad) → ISO 3166-1 alpha-2
 * kodu. Bayraklar `flag-icons` (MIT) paketinden gelir; İngiltere, İskoçya, Galler için
 * paketin "gb-eng" gibi alt kodları kullanılır. Eşleşme büyük/küçük harfe duyarsızdır.
 */
const COUNTRY_CODES: Record<string, string> = {
  // Avrupa
  albania: "al", arnavutluk: "al", andorra: "ad", armenia: "am", ermenistan: "am", austria: "at", avusturya: "at",
  azerbaijan: "az", azerbaycan: "az", belarus: "by", belgium: "be", belçika: "be", "bosnia and herzegovina": "ba",
  "bosnia & herzegovina": "ba", "bosna hersek": "ba", bulgaria: "bg", bulgaristan: "bg", croatia: "hr", hırvatistan: "hr",
  cyprus: "cy", kıbrıs: "cy", "czech republic": "cz", czechia: "cz", çekya: "cz", denmark: "dk", danimarka: "dk",
  england: "gb-eng", ingiltere: "gb-eng", i̇ngiltere: "gb-eng", estonia: "ee", estonya: "ee", "faroe islands": "fo",
  finland: "fi", finlandiya: "fi", france: "fr", fransa: "fr", georgia: "ge", gürcistan: "ge", germany: "de", almanya: "de",
  gibraltar: "gi", greece: "gr", yunanistan: "gr", hungary: "hu", macaristan: "hu", iceland: "is", izlanda: "is",
  ireland: "ie", "republic of ireland": "ie", irlanda: "ie", israel: "il", israil: "il", i̇srail: "il", italy: "it", italya: "it",
  i̇talya: "it", kazakhstan: "kz", kazakistan: "kz", kosovo: "xk", kosova: "xk", latvia: "lv", letonya: "lv",
  liechtenstein: "li", lithuania: "lt", litvanya: "lt", luxembourg: "lu", lüksemburg: "lu", malta: "mt", moldova: "md",
  montenegro: "me", karadağ: "me", netherlands: "nl", hollanda: "nl", "north macedonia": "mk", "kuzey makedonya": "mk",
  "northern ireland": "gb-nir", "kuzey irlanda": "gb-nir", norway: "no", norveç: "no", poland: "pl", polonya: "pl",
  portugal: "pt", portekiz: "pt", romania: "ro", romanya: "ro", russia: "ru", rusya: "ru", "san marino": "sm",
  scotland: "gb-sct", iskoçya: "gb-sct", i̇skoçya: "gb-sct", serbia: "rs", sırbistan: "rs", slovakia: "sk", slovakya: "sk",
  slovenia: "si", slovenya: "si", spain: "es", ispanya: "es", i̇spanya: "es", sweden: "se", isveç: "se", i̇sveç: "se",
  switzerland: "ch", isviçre: "ch", i̇sviçre: "ch", turkey: "tr", türkiye: "tr", ukraine: "ua", ukrayna: "ua",
  wales: "gb-wls", galler: "gb-wls",
  // Amerika
  argentina: "ar", arjantin: "ar", bolivia: "bo", bolivya: "bo", brazil: "br", brezilya: "br", canada: "ca", kanada: "ca",
  chile: "cl", şili: "cl", colombia: "co", kolombiya: "co", "costa rica": "cr", "kosta rika": "cr", cuba: "cu", küba: "cu",
  ecuador: "ec", ekvador: "ec", "el salvador": "sv", guatemala: "gt", haiti: "ht", honduras: "hn", jamaica: "jm",
  jamaika: "jm", mexico: "mx", meksika: "mx", nicaragua: "ni", panama: "pa", paraguay: "py", peru: "pe",
  "trinidad and tobago": "tt", "united states": "us", usa: "us", abd: "us", uruguay: "uy", venezuela: "ve",
  // Afrika
  algeria: "dz", cezayir: "dz", angola: "ao", benin: "bj", botswana: "bw", "burkina faso": "bf", burundi: "bi",
  cameroon: "cm", kamerun: "cm", "cape verde islands": "cv", "cape verde": "cv", "cabo verde": "cv", "yeşil burun": "cv",
  "central african republic": "cf", chad: "td", comoros: "km", "congo dr": "cd", "dr congo": "cd", "congo": "cg",
  "côte d'ivoire": "ci", "cote d'ivoire": "ci", "ivory coast": "ci", "fildişi sahili": "ci", egypt: "eg", mısır: "eg",
  "equatorial guinea": "gq", "ekvator ginesi": "gq", eritrea: "er", ethiopia: "et", etiyopya: "et", gabon: "ga",
  gambia: "gm", gambiya: "gm", ghana: "gh", gana: "gh", guinea: "gn", gine: "gn", "guinea-bissau": "gw", kenya: "ke",
  liberia: "lr", libya: "ly", madagascar: "mg", malawi: "mw", mali: "ml", mauritania: "mr", moritanya: "mr",
  mauritius: "mu", morocco: "ma", fas: "ma", mozambique: "mz", mozambik: "mz", namibia: "na", namibya: "na", niger: "ne",
  nijer: "ne", nigeria: "ng", nijerya: "ng", rwanda: "rw", ruanda: "rw", senegal: "sn", "sierra leone": "sl",
  somalia: "so", "south africa": "za", "güney afrika": "za", "south sudan": "ss", sudan: "sd", tanzania: "tz",
  togo: "tg", tunisia: "tn", tunus: "tn", uganda: "ug", zambia: "zm", zambiya: "zm", zimbabwe: "zw", zimbabve: "zw",
  // Asya ve Okyanusya
  australia: "au", avustralya: "au", bahrain: "bh", bahreyn: "bh", bangladesh: "bd", china: "cn", "china pr": "cn",
  çin: "cn", india: "in", hindistan: "in", indonesia: "id", endonezya: "id", iran: "ir", i̇ran: "ir", iraq: "iq", irak: "iq",
  japan: "jp", japonya: "jp", jordan: "jo", ürdün: "jo", kuwait: "kw", kuveyt: "kw", lebanon: "lb", lübnan: "lb",
  malaysia: "my", malezya: "my", "new zealand": "nz", "yeni zelanda": "nz", "north korea": "kp", "kuzey kore": "kp",
  oman: "om", umman: "om", palestine: "ps", filistin: "ps", philippines: "ph", qatar: "qa", katar: "qa",
  "saudi arabia": "sa", "suudi arabistan": "sa", singapore: "sg", "south korea": "kr", "korea republic": "kr",
  "güney kore": "kr", syria: "sy", suriye: "sy", thailand: "th", tayland: "th", "united arab emirates": "ae",
  uae: "ae", "birleşik arap emirlikleri": "ae", uzbekistan: "uz", özbekistan: "uz", vietnam: "vn",
};

/**
 * Arama anahtarı: noktalı ve noktasız "i" tek harfe iner, standart küçük harf kullanılır
 * (Türkçe kural "Iceland"ı "ıceland" yapar), kıvrık kesme işareti düze çevrilir.
 */
const normalizeKey = (text: string) =>
  text.trim().replace(/[İı]/g, "i").toLowerCase().replace(/̇/g, "").replace(/’/g, "'");

const LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODES).map(([name, code]) => [normalizeKey(name), code]),
);

/** Takım adı bir ülkeyse ISO kodu, değilse null (kulüpler için). */
export function countryCode(teamName: string): string | null {
  return LOOKUP[normalizeKey(teamName)] ?? null;
}

/** Bayrak dosyalarının kopyalanması için haritadaki tüm kodlar. */
export const ALL_COUNTRY_CODES = [...new Set(Object.values(COUNTRY_CODES))].sort();

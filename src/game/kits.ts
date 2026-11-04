/**
 * Takım forma renkleri (iç saha). Havuzdaki milli takımlar elle girildi; listede olmayan takım
 * adından türetilen kararlı bir renk alır. Kaleci, penaltıcının formasından ayrışan bir
 * kaleci kiti giyer.
 */
export interface Kit {
  shirt: string;
  shorts: string;
  socks: string;
}

const kit = (shirt: string, shorts: string, socks: string): Kit => ({ shirt, shorts, socks });

const WHITE = "#f4f4f4";
const BLACK = "#1f2328";
const NAVY = "#10254a";
const RED = "#c8102e";
const BLUE = "#1e5fd0";
const GREEN = "#138a3c";
const YELLOW = "#f2c200";
const ORANGE = "#f47a1f";
const SKY = "#7fb8e6";
const MAROON = "#7a1e2a";

const KITS: Record<string, Kit> = {
  Algeria: kit(WHITE, WHITE, GREEN),
  Angola: kit(RED, BLACK, RED),
  Argentina: kit(SKY, BLACK, WHITE),
  Australia: kit(YELLOW, "#0b6b3a", YELLOW),
  Austria: kit(RED, WHITE, RED),
  Belgium: kit(RED, BLACK, RED),
  Brazil: kit("#f7d117", "#1f3f9f", WHITE),
  "Burkina Faso": kit(GREEN, GREEN, GREEN),
  Canada: kit(RED, RED, RED),
  "Cape Verde Islands": kit(BLUE, WHITE, BLUE),
  Colombia: kit(YELLOW, "#1f3f9f", RED),
  "Congo DR": kit(BLUE, BLUE, BLUE),
  "Costa Rica": kit(RED, BLUE, WHITE),
  Croatia: kit("#d7263d", WHITE, "#1f4fa3"),
  "Czech Republic": kit(RED, RED, BLUE),
  "Côte d'Ivoire": kit(ORANGE, ORANGE, ORANGE),
  Denmark: kit(RED, WHITE, RED),
  Ecuador: kit("#f5d000", NAVY, RED),
  Egypt: kit(RED, WHITE, BLACK),
  England: kit(WHITE, NAVY, WHITE),
  "Equatorial Guinea": kit(RED, RED, RED),
  Finland: kit(WHITE, "#1f4fa3", WHITE),
  France: kit("#1f2d6b", WHITE, RED),
  Georgia: kit(WHITE, WHITE, WHITE),
  Germany: kit(WHITE, BLACK, WHITE),
  Ghana: kit(WHITE, WHITE, WHITE),
  Guinea: kit(RED, RED, RED),
  Hungary: kit(RED, WHITE, GREEN),
  Iceland: kit(BLUE, BLUE, BLUE),
  Iran: kit(WHITE, WHITE, WHITE),
  Italy: kit("#1f6fd0", WHITE, "#1f6fd0"),
  Jamaica: kit(YELLOW, BLACK, YELLOW),
  Japan: kit(NAVY, WHITE, NAVY),
  Mali: kit(YELLOW, YELLOW, YELLOW),
  Mauritania: kit(GREEN, YELLOW, GREEN),
  Mexico: kit("#0b6b3a", WHITE, RED),
  Morocco: kit(RED, RED, RED),
  Mozambique: kit(RED, RED, RED),
  Namibia: kit(BLUE, BLUE, BLUE),
  Netherlands: kit(ORANGE, WHITE, ORANGE),
  Nigeria: kit(GREEN, GREEN, GREEN),
  "North Macedonia": kit(RED, RED, RED),
  Panama: kit(RED, RED, RED),
  Paraguay: kit("#d7263d", "#1f3f9f", "#1f3f9f"),
  Peru: kit(WHITE, WHITE, WHITE),
  Poland: kit(WHITE, RED, WHITE),
  Portugal: kit(RED, "#0b6b3a", RED),
  Qatar: kit(MAROON, WHITE, MAROON),
  Romania: kit(YELLOW, YELLOW, YELLOW),
  Russia: kit(RED, RED, RED),
  "Saudi Arabia": kit(WHITE, WHITE, WHITE),
  Scotland: kit(NAVY, WHITE, NAVY),
  Senegal: kit(WHITE, WHITE, WHITE),
  Slovakia: kit(BLUE, BLUE, BLUE),
  Slovenia: kit(WHITE, WHITE, WHITE),
  "South Africa": kit(YELLOW, "#0b6b3a", YELLOW),
  "South Korea": kit(RED, RED, RED),
  Spain: kit(RED, NAVY, NAVY),
  Sweden: kit("#f7d117", "#1f4fa3", "#f7d117"),
  Switzerland: kit(RED, WHITE, RED),
  Tunisia: kit(RED, WHITE, RED),
  Turkey: kit(RED, WHITE, RED),
  Türkiye: kit(RED, WHITE, RED),
  Ukraine: kit(YELLOW, "#1f4fa3", YELLOW),
  "United States": kit(WHITE, NAVY, WHITE),
  Uruguay: kit(SKY, BLACK, BLACK),
  Venezuela: kit(MAROON, WHITE, MAROON),
  Wales: kit(RED, RED, RED),

  // Bundesliga 2025/26 kulüpleri (FotMob adlarıyla), iç saha formaları.
  "Bayern München": kit(RED, RED, RED),
  "Borussia Dortmund": kit("#f7d117", BLACK, "#f7d117"),
  "RB Leipzig": kit(WHITE, WHITE, WHITE),
  "VfB Stuttgart": kit(WHITE, WHITE, WHITE),
  Hoffenheim: kit("#1c63b7", "#1c63b7", "#1c63b7"),
  "Bayer Leverkusen": kit(BLACK, BLACK, BLACK),
  Freiburg: kit(RED, RED, RED),
  "Eintracht Frankfurt": kit(BLACK, BLACK, BLACK),
  Augsburg: kit(WHITE, "#0b7a3b", WHITE),
  "Mainz 05": kit(RED, RED, RED),
  "Union Berlin": kit(RED, RED, RED),
  "Borussia Mönchengladbach": kit(WHITE, WHITE, WHITE),
  "Hamburger SV": kit(WHITE, "#1f4fa3", "#1f4fa3"),
  "1. FC Köln": kit(WHITE, WHITE, WHITE),
  "Werder Bremen": kit("#0b7a3b", WHITE, "#0b7a3b"),
  Wolfsburg: kit("#5ac432", WHITE, "#5ac432"),
  "FC Heidenheim": kit(RED, "#1f3f9f", RED),
  "St. Pauli": kit("#5a3a22", WHITE, "#5a3a22"),

  // Süper Lig 2025/26 kulüpleri (FotMob adlarıyla), iç saha formaları.
  Galatasaray: kit("#d9242b", "#f2c200", "#f2c200"),
  Fenerbahçe: kit("#1c3f94", WHITE, "#f2c200"),
  Trabzonspor: kit("#6b1e3f", "#2a4a8a", "#6b1e3f"),
  Beşiktaş: kit(WHITE, BLACK, BLACK),
  Başakşehir: kit(ORANGE, NAVY, ORANGE),
  Göztepe: kit("#f2c200", RED, "#f2c200"),
  Samsunspor: kit(RED, WHITE, RED),
  Rizespor: kit(GREEN, "#1f4fa3", GREEN),
  Konyaspor: kit(GREEN, WHITE, GREEN),
  Kocaelispor: kit("#0b7a3b", BLACK, "#0b7a3b"),
  Alanyaspor: kit(ORANGE, GREEN, ORANGE),
  "Gaziantep FK": kit(RED, BLACK, RED),
  Kasımpaşa: kit(NAVY, WHITE, NAVY),
  Gençlerbirliği: kit(RED, BLACK, BLACK),
  Eyüpspor: kit("#5b2a86", "#f2c200", "#5b2a86"),
  Antalyaspor: kit(RED, WHITE, WHITE),
  Kayserispor: kit("#f2c200", RED, RED),
  "Fatih Karagümrük": kit(RED, BLACK, RED),

  // Premier League 2025/26.
  Arsenal: kit(RED, WHITE, WHITE),
  "Manchester City": kit(SKY, WHITE, SKY),
  "Manchester United": kit(RED, WHITE, BLACK),
  "Aston Villa": kit("#670e36", WHITE, "#670e36"),
  Liverpool: kit(RED, RED, RED),
  "AFC Bournemouth": kit("#b50e12", BLACK, BLACK),
  Sunderland: kit(RED, BLACK, RED),
  "Brighton & Hove Albion": kit("#0057b8", WHITE, WHITE),
  Brentford: kit(RED, BLACK, RED),
  Chelsea: kit("#034694", "#034694", WHITE),
  Fulham: kit(WHITE, BLACK, WHITE),
  "Newcastle United": kit(BLACK, BLACK, BLACK),
  Everton: kit("#003399", WHITE, WHITE),
  "Leeds United": kit(WHITE, WHITE, WHITE),
  "Crystal Palace": kit("#c4122e", "#1b458f", RED),
  "Nottingham Forest": kit(RED, WHITE, RED),
  "Tottenham Hotspur": kit(WHITE, NAVY, WHITE),
  "West Ham United": kit("#7a263a", WHITE, "#7a263a"),
  Burnley: kit("#6c1d45", WHITE, "#6c1d45"),
  "Wolverhampton Wanderers": kit("#fdb913", BLACK, "#fdb913"),

  // Serie A 2025/26.
  Inter: kit("#010e80", BLACK, BLACK),
  Napoli: kit("#12a0d7", WHITE, "#12a0d7"),
  Roma: kit("#8e1f2f", WHITE, "#8e1f2f"),
  Como: kit("#1e5fd0", WHITE, "#1e5fd0"),
  Milan: kit("#fb090b", WHITE, BLACK),
  Juventus: kit(BLACK, WHITE, WHITE),
  Atalanta: kit("#1e71b8", BLACK, BLACK),
  Bologna: kit("#9f1e2d", WHITE, "#1a2f48"),
  Lazio: kit(SKY, WHITE, SKY),
  Udinese: kit(BLACK, BLACK, BLACK),
  Sassuolo: kit("#0b7a3b", BLACK, BLACK),
  Torino: kit("#8b2332", "#8b2332", "#8b2332"),
  Parma: kit(WHITE, "#1f3f9f", "#f2c200"),
  Cagliari: kit("#b01e2d", WHITE, "#1a2f48"),
  Fiorentina: kit("#5b2a86", "#5b2a86", "#5b2a86"),
  Genoa: kit("#b01e2d", WHITE, "#1a2f48"),
  Lecce: kit("#f2c200", "#c8102e", "#f2c200"),
  Cremonese: kit("#8b2332", WHITE, "#8b2332"),
  "Hellas Verona": kit("#f2c200", "#1e3a8a", "#f2c200"),
  Pisa: kit("#1b2a5a", WHITE, "#1b2a5a"),

  // Eredivisie 2025/26.
  "PSV Eindhoven": kit(RED, BLACK, RED),
  Feyenoord: kit(RED, BLACK, BLACK),
  "NEC Nijmegen": kit("#c8102e", BLACK, "#0b7a3b"),
  "FC Twente": kit(RED, WHITE, RED),
  Ajax: kit("#d2122e", WHITE, WHITE),
  "FC Utrecht": kit(WHITE, RED, RED),
  "AZ Alkmaar": kit(RED, WHITE, RED),
  "SC Heerenveen": kit("#1f4fa3", WHITE, "#1f4fa3"),
  "FC Groningen": kit("#0b7a3b", WHITE, "#0b7a3b"),
  "Sparta Rotterdam": kit(RED, WHITE, WHITE),
  "Fortuna Sittard": kit("#f2c200", "#0b7a3b", "#f2c200"),
  "Go Ahead Eagles": kit("#c8102e", "#f2c200", "#c8102e"),
  Excelsior: kit(RED, BLACK, RED),
  Telstar: kit(WHITE, WHITE, WHITE),
  "PEC Zwolle": kit("#1f4fa3", WHITE, "#1f4fa3"),
  "FC Volendam": kit(ORANGE, BLACK, ORANGE),
  "NAC Breda": kit("#f2c200", BLACK, "#f2c200"),
  Heracles: kit(BLACK, BLACK, BLACK),

  // Ligue 1 2025/26.
  "Paris Saint-Germain": kit("#004170", "#004170", "#004170"),
  Lens: kit("#f2c200", "#c8102e", "#f2c200"),
  Lille: kit(RED, WHITE, RED),
  Lyon: kit(WHITE, WHITE, WHITE),
  Marseille: kit(WHITE, WHITE, SKY),
  Rennes: kit("#c8102e", BLACK, "#c8102e"),
  Monaco: kit("#d7263d", WHITE, WHITE),
  Strasbourg: kit("#1f4fa3", WHITE, "#1f4fa3"),
  Toulouse: kit("#5a2d82", WHITE, "#5a2d82"),
  Lorient: kit(ORANGE, BLACK, ORANGE),
  "Paris FC": kit("#1b2a5a", "#1b2a5a", "#1b2a5a"),
  Brest: kit(RED, WHITE, RED),
  Angers: kit(BLACK, BLACK, BLACK),
  "Le Havre": kit(SKY, NAVY, SKY),
  Auxerre: kit(WHITE, "#1f4fa3", WHITE),
  Nice: kit(RED, BLACK, BLACK),
  Nantes: kit("#f2c200", "#0b7a3b", "#f2c200"),
  Metz: kit(MAROON, WHITE, MAROON),

  // Şampiyonlar Ligi ve Avrupa Ligi 2024/25–2025/26'da görülen, yukarıdaki liglerde olmayan kulüpler.
  Anderlecht: kit("#5b2a86", WHITE, "#5b2a86"),
  "Athletic Club": kit(RED, BLACK, BLACK),
  "Atlético Madrid": kit("#d7263d", "#1b2a5a", RED),
  Barcelona: kit("#a50044", "#004d98", "#004d98"),
  Basel: kit("#1f4fa3", "#c8102e", "#1f4fa3"),
  Benfica: kit(RED, WHITE, RED),
  "Bodø/Glimt": kit("#f2c200", "#f2c200", "#f2c200"),
  Braga: kit("#c8102e", WHITE, "#c8102e"),
  Brann: kit(RED, WHITE, RED),
  "Celta Vigo": kit(SKY, WHITE, SKY),
  Celtic: kit("#0b7a3b", WHITE, WHITE),
  "Club Brugge": kit("#1f4fa3", BLACK, BLACK),
  "Dinamo Zagreb": kit("#1f4fa3", "#1f4fa3", "#1f4fa3"),
  "Dynamo Kyiv": kit(WHITE, WHITE, WHITE),
  Elfsborg: kit("#f2c200", BLACK, "#f2c200"),
  "FC København": kit(WHITE, "#1f4fa3", WHITE),
  "FC Midtjylland": kit(BLACK, BLACK, RED),
  "FC Porto": kit("#1f4fa3", "#1f4fa3", "#1f4fa3"),
  FCSB: kit("#c8102e", "#1f3f9f", "#c8102e"),
  Ferencváros: kit("#0b7a3b", WHITE, "#0b7a3b"),
  "FK Crvena Zvezda": kit(RED, WHITE, RED),
  Genk: kit("#1f4fa3", WHITE, "#1f4fa3"),
  Girona: kit(RED, RED, RED),
  "Kairat Almaty": kit("#f2c200", BLACK, "#f2c200"),
  "Ludogorets Razgrad": kit(GREEN, WHITE, GREEN),
  "Maccabi Tel Aviv": kit("#f2c200", "#1f4fa3", "#f2c200"),
  "Malmö FF": kit(SKY, WHITE, SKY),
  Olympiacos: kit("#c8102e", WHITE, "#c8102e"),
  "Pafos FC": kit("#1f4fa3", WHITE, "#1f4fa3"),
  Panathinaikos: kit("#0b7a3b", "#0b7a3b", "#0b7a3b"),
  "PAOK Thessaloniki": kit(BLACK, BLACK, BLACK),
  "Qarabağ FK": kit(BLACK, WHITE, BLACK),
  Rangers: kit("#1f4fa3", WHITE, BLACK),
  "Real Betis": kit("#0b7a3b", WHITE, GREEN),
  "Real Madrid": kit(WHITE, WHITE, WHITE),
  "Real Sociedad": kit("#1f4fa3", WHITE, "#1f4fa3"),
  RFS: kit("#c8102e", BLACK, "#c8102e"),
  Salzburg: kit(WHITE, WHITE, RED),
  "Shakhtar Donetsk": kit(ORANGE, BLACK, ORANGE),
  "Slavia Prague": kit(RED, WHITE, WHITE),
  "Slovan Bratislava": kit(SKY, WHITE, SKY),
  "Sparta Prague": kit(MAROON, BLACK, MAROON),
  "Sporting CP": kit("#0b7a3b", BLACK, WHITE),
  "Sturm Graz": kit(BLACK, WHITE, BLACK),
  "Union St.Gilloise": kit("#f2c200", "#1f3f9f", "#f2c200"),
  "Viktoria Plzeň": kit("#1f4fa3", "#1f4fa3", "#1f4fa3"),
  Villarreal: kit("#f2c200", "#1f3f9f", "#f2c200"),
  "Young Boys": kit("#f2c200", BLACK, "#f2c200"),
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** HSL → hex; türetilen renkler için. */
function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Takımın forması; listede yoksa adından türetilen kararlı bir renk (şort koyu). */
export function kitFor(team: string): Kit {
  const known = KITS[team];
  if (known) return known;
  const shirt = hsl(hash(team) % 360, 0.65, 0.42);
  return kit(shirt, BLACK, shirt);
}

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const distance = (a: string, b: string) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

/** Kaleci kitleri; penaltıcının formasından yeterince uzak olan ilk seçilir. */
const KEEPER_KITS: Kit[] = [
  kit("#e0a526", "#23272e", "#e0a526"),
  kit("#2ea043", "#1f2328", "#2ea043"),
  kit("#0ea5e9", "#0f1f3a", "#0ea5e9"),
  kit("#f47a1f", "#1f2328", "#f47a1f"),
  kit("#7c3aed", "#1f2328", "#7c3aed"),
];
const KEEPER_MIN_DISTANCE = 140;

export function keeperKitAgainst(shooter: Kit): Kit {
  return KEEPER_KITS.find((k) => distance(k.shirt, shooter.shirt) >= KEEPER_MIN_DISTANCE) ?? KEEPER_KITS[0];
}

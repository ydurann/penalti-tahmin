"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ManualCategory, ManualStore } from "@/data/manual";
import { OUTCOME_LABELS, SHOT_LABELS, trLabels } from "@/game/labels";
import { SHOT_TYPES, type Index, type Outcome, type Penalty, type ShotType, type Situation } from "@/game/types";
import styles from "./Admin.module.css";
import { AdminAds } from "./AdminAds";
import { CheckIcon, LockIcon, TrophyIcon } from "./Icons";

const KEY_STORAGE = "penalti-tahmin:yonetim";
const INDEXES: Index[] = [0, 1, 2];
const OUTCOMES: Outcome[] = ["goal", "saved", "missed"];
const DIVE_LABELS: Record<Index, string> = { 0: "Sol", 1: "Orta", 2: "Sağ" };

interface FormState {
  competition: string;
  season: string;
  playerName: string;
  team: string;
  opponent: string;
  date: string;
  foot: "left" | "right";
  situation: Situation;
  minute: string;
  score: string;
  col: Index | null;
  row: Index | null;
  shot: ShotType | null;
  outcome: Outcome;
  keeperDive: Index | null;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (category?: ManualCategory): FormState => ({
  competition: category?.competition ?? "",
  season: category?.season ?? "",
  playerName: "",
  team: "",
  opponent: "",
  date: today(),
  foot: "right",
  situation: "regular",
  minute: "",
  score: "0-0",
  col: null,
  row: null,
  shot: null,
  outcome: "goal",
  keeperDive: null,
});

async function adminFetch<T>(key: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", "x-admin-key": key, ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Sunucu hatası (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

/**
 * Yönetim ekranı: anahtarla giriş, kategori ekleme, penaltı girişi ve girilenlerin listesi.
 * Kayıtlar `penalties.manual.json` dosyasına yazılır ve oyun havuzuna hemen girer.
 */
export function Admin() {
  // Sayfa sunucuda da işlenir; anahtar yalnızca tarayıcıda okunur. Giriş formu her iki
  // tarafta da aynı göründüğü için hidrasyon bozulmaz.
  const [key, setKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.sessionStorage.getItem(KEY_STORAGE) ?? "";
    } catch {
      return "";
    }
  });
  const [keyInput, setKeyInput] = useState("");
  const [store, setStore] = useState<ManualStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<ManualCategory>({ competition: "", season: "" });
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async (k: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await adminFetch<ManualStore>(k, "/api/admin/penalties");
      setStore(data);
      setKey(k);
      try {
        window.sessionStorage.setItem(KEY_STORAGE, k);
      } catch {
        // depolama kapalı
      }
    } catch (e) {
      setStore(null);
      setKey("");
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Kayıtlı anahtar varsa açılışta yükle; çağrı bir sonraki döngüye ertelenir.
  useEffect(() => {
    if (!key || store) return;
    const timer = setTimeout(() => void load(key), 0);
    return () => clearTimeout(timer);
  }, [key, store, load]);

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const categories = await adminFetch<ManualCategory[]>(key, "/api/admin/categories", {
        method: "POST",
        body: JSON.stringify(category),
      });
      setStore((s) => (s ? { ...s, categories } : s));
      setForm((f) => ({ ...f, competition: category.competition.trim(), season: category.season.trim() }));
      setNotice(`${category.competition} ${category.season} eklendi.`);
      setCategory({ competition: "", season: "" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPenalty = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const penalty = await adminFetch<Penalty>(key, "/api/admin/penalties", {
        method: "POST",
        body: JSON.stringify({ ...form, minute: form.minute === "" ? null : Number(form.minute) }),
      });
      setStore((s) => (s ? { ...s, penalties: [...s.penalties, penalty] } : s));
      setNotice(`${penalty.player.name} kaydedildi.`);
      // Aynı maçtan birden çok penaltı girilebilsin: kategori, takımlar ve tarih kalır.
      setForm((f) => ({ ...f, playerName: "", minute: "", col: null, row: null, shot: null, keeperDive: null }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeCategory = async (c: ManualCategory) => {
    if (!window.confirm(`${c.competition} ${c.season} kategorisi silinsin mi?`)) return;
    setBusy(true);
    setError(null);
    try {
      const categories = await adminFetch<ManualCategory[]>(key, "/api/admin/categories", {
        method: "DELETE",
        body: JSON.stringify(c),
      });
      setStore((s) => (s ? { ...s, categories } : s));
      setForm((f) =>
        f.competition === c.competition && f.season === c.season ? { ...f, competition: "", season: "" } : f,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removePenalty = async (penalty: Penalty) => {
    if (!window.confirm(`${penalty.player.name} kaydı silinsin mi?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(key, `/api/admin/penalties/${penalty.id}`, { method: "DELETE" });
      setStore((s) => (s ? { ...s, penalties: s.penalties.filter((p) => p.id !== penalty.id) } : s));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  if (!store) {
    return (
      <main className={styles.page}>
        <form
          className={styles.login}
          onSubmit={(e) => {
            e.preventDefault();
            void load(keyInput);
          }}
        >
          <h1><LockIcon /> Yönetim</h1>
          <p>Bu ekran herkese açık değildir. Sunucudaki yönetim anahtarını gir.</p>
          <input
            type="password"
            value={keyInput}
            placeholder="Yönetim anahtarı"
            autoComplete="current-password"
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button type="submit" disabled={busy || !keyInput}>Giriş</button>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>
      </main>
    );
  }

  const categories = store.categories;
  const categoryKey = (c: ManualCategory) => `${c.competition}|${c.season}`;
  const selectedKey = form.competition && form.season ? `${form.competition}|${form.season}` : "";
  const penalties = [...store.penalties].sort((a, b) => (b.match?.date ?? "").localeCompare(a.match?.date ?? ""));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1><LockIcon /> Penaltı veri girişi</h1>
        <p>
          Girilen kayıtlar <code>src/data/penalties.manual.json</code> dosyasına yazılır ve oyuna hemen
          girer. Toplam {store.penalties.length} kayıt, {categories.length} kategori.
        </p>
        <button
          className={styles.linkBtn}
          onClick={() => {
            setStore(null);
            setKey("");
            try {
              window.sessionStorage.removeItem(KEY_STORAGE);
            } catch {
              // depolama kapalı
            }
          }}
        >
          Çıkış
        </button>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status"><CheckIcon /> {notice}</p>}

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2><TrophyIcon /> Kategoriler</h2>
          <p className={styles.muted}>
            Her lig ve sezon ayrı bir kategoridir; istediğin adı yazabilirsin (Süper Lig, Premier Lig,
            1. Lig…). Girişte turnuva seçicide bu adla görünür.
          </p>
          {categories.length === 0 ? (
            <p className={styles.muted}>Henüz kategori yok. Örnek: Süper Lig, 2025/26.</p>
          ) : (
            <ul className={styles.list}>
              {categories.map((c) => {
                const count = store.penalties.filter((p) => p.match && categoryKey(p.match) === categoryKey(c)).length;
                return (
                  <li key={categoryKey(c)} className={styles.categoryItem}>
                    <button
                      type="button"
                      className={selectedKey === categoryKey(c) ? styles.chipOn : styles.chip}
                      onClick={() => setForm((f) => ({ ...f, competition: c.competition, season: c.season }))}
                    >
                      {trLabels.competition(c.competition, c.season)} <span>{count}</span>
                    </button>
                    {count === 0 && (
                      <button
                        type="button"
                        className={styles.danger}
                        aria-label={`${c.competition} ${c.season} kategorisini sil`}
                        disabled={busy}
                        onClick={() => void removeCategory(c)}
                      >
                        Sil
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <form id="kategori-formu" className={styles.inline} onSubmit={(e) => void addCategory(e)}>
            <input
              id="kategori-turnuva"
              value={category.competition}
              placeholder="Turnuva (ör. Süper Lig)"
              maxLength={40}
              onChange={(e) => setCategory((c) => ({ ...c, competition: e.target.value }))}
            />
            <input
              value={category.season}
              placeholder="Sezon (ör. 2025/26)"
              maxLength={40}
              onChange={(e) => setCategory((c) => ({ ...c, season: e.target.value }))}
            />
            <button type="submit" disabled={busy || !category.competition.trim() || !category.season.trim()}>
              Kategori ekle
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <h2>Yeni penaltı</h2>
          <form className={styles.form} onSubmit={(e) => void addPenalty(e)}>
            <label>
              <span>Kategori</span>
              <select
                value={selectedKey}
                required
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    // Yeni lig ya da sezon: soldaki kategori formuna götür.
                    document.getElementById("kategori-turnuva")?.focus();
                    return;
                  }
                  const c = categories.find((x) => categoryKey(x) === e.target.value);
                  setForm((f) => ({ ...f, competition: c?.competition ?? "", season: c?.season ?? "" }));
                }}
              >
                <option value="">Seç…</option>
                {categories.map((c) => (
                  <option key={categoryKey(c)} value={categoryKey(c)}>
                    {trLabels.competition(c.competition, c.season)}
                  </option>
                ))}
                <option value="__new__">+ Yeni kategori (lig ya da sezon)…</option>
              </select>
            </label>
            <div className={styles.row}>
              <label>
                <span>Oyuncu</span>
                <input value={form.playerName} maxLength={40} required onChange={(e) => update("playerName", e.target.value)} />
              </label>
              <label>
                <span>Ayak</span>
                <select value={form.foot} onChange={(e) => update("foot", e.target.value as "left" | "right")}>
                  <option value="right">Sağ</option>
                  <option value="left">Sol</option>
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label>
                <span>Takım</span>
                <input value={form.team} maxLength={40} required onChange={(e) => update("team", e.target.value)} />
              </label>
              <label>
                <span>Rakip</span>
                <input value={form.opponent} maxLength={40} required onChange={(e) => update("opponent", e.target.value)} />
              </label>
            </div>
            <div className={styles.row}>
              <label>
                <span>Tarih</span>
                <input type="date" value={form.date} required onChange={(e) => update("date", e.target.value)} />
              </label>
              <label>
                <span>Durum</span>
                <select value={form.situation} onChange={(e) => update("situation", e.target.value as Situation)}>
                  <option value="regular">Normal süre</option>
                  <option value="shootout">Seri penaltı</option>
                </select>
              </label>
              <label>
                <span>Dakika</span>
                <input
                  type="number"
                  min={1}
                  max={130}
                  value={form.minute}
                  disabled={form.situation === "shootout"}
                  required={form.situation === "regular"}
                  onChange={(e) => update("minute", e.target.value)}
                />
              </label>
              <label>
                <span>Skor (atan takımın gözünden)</span>
                <input value={form.score} placeholder="1-1" pattern="\d{1,2}-\d{1,2}" required onChange={(e) => update("score", e.target.value)} />
              </label>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>Topun gittiği bölge (vuranın gözünden; kaçan vuruşta en yakın bölge)</legend>
              <div className={styles.goal} role="group" aria-label="Bölge">
                {INDEXES.flatMap((row) =>
                  INDEXES.map((col) => {
                    const on = form.col === col && form.row === row;
                    return (
                      <button
                        key={`${col}-${row}`}
                        type="button"
                        className={on ? styles.zoneOn : styles.zone}
                        aria-pressed={on}
                        onClick={() => setForm((f) => ({ ...f, col, row }))}
                      >
                        {trLabels.zone({ col, row })}
                      </button>
                    );
                  }),
                )}
              </div>
            </fieldset>

            <div className={styles.row}>
              <fieldset className={styles.fieldset}>
                <legend>Vuruş tipi</legend>
                <div className={styles.chips}>
                  {SHOT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={form.shot === type ? styles.chipOn : styles.chip}
                      aria-pressed={form.shot === type}
                      onClick={() => update("shot", type)}
                    >
                      {SHOT_LABELS[type]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.fieldset}>
                <legend>Sonuç</legend>
                <div className={styles.chips}>
                  {OUTCOMES.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={form.outcome === o ? styles.chipOn : styles.chip}
                      aria-pressed={form.outcome === o}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          outcome: o,
                          // Kurtarışta kaleci topun sütunundadır.
                          keeperDive: o === "saved" && f.col !== null ? f.col : f.keeperDive,
                        }))
                      }
                    >
                      {OUTCOME_LABELS[o]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.fieldset}>
                <legend>Kalecinin dalışı (vuranın gözünden)</legend>
                <div className={styles.chips}>
                  {INDEXES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={form.keeperDive === d ? styles.chipOn : styles.chip}
                      aria-pressed={form.keeperDive === d}
                      onClick={() => update("keeperDive", d)}
                    >
                      {DIVE_LABELS[d]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <button
              type="submit"
              className={styles.primary}
              disabled={busy || !selectedKey || form.col === null || form.shot === null || form.keeperDive === null}
            >
              Penaltıyı kaydet
            </button>
          </form>
        </section>
      </div>

      <section className={styles.panel}>
        <h2>Girilen penaltılar</h2>
        {penalties.length === 0 ? (
          <p className={styles.muted}>Henüz kayıt yok.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Oyuncu</th>
                <th>Maç</th>
                <th>Vuruş</th>
                <th>Sonuç</th>
                <th>Kaleci</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {penalties.map((p) => (
                <tr key={p.id}>
                  <td>{p.match?.date}</td>
                  <td>{p.match && trLabels.competition(p.match.competition, p.match.season)}</td>
                  <td>{p.player.name} <span className={styles.muted}>({p.player.team})</span></td>
                  <td>
                    {p.match?.opponent}, {p.situation === "shootout" ? "seri" : `${p.minute}'`}, {p.score}
                  </td>
                  <td>{trLabels.answer(p.answer)}, {SHOT_LABELS[p.answer.shot].toLocaleLowerCase("tr")}</td>
                  <td>{OUTCOME_LABELS[p.answer.outcome]}</td>
                  <td>{DIVE_LABELS[p.answer.keeperDive]}</td>
                  <td>
                    <button type="button" className={styles.danger} disabled={busy} onClick={() => void removePenalty(p)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AdminAds adminKey={key} />
    </main>
  );
}

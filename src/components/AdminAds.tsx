"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AD_TEXT_MAX, type Ad, type AdStore } from "@/game/ads";
import styles from "./Admin.module.css";

interface AdminAdsProps {
  adminKey: string;
}

async function request<T>(key: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "x-admin-key": key, ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Sunucu hatası (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

/**
 * Reklam panosu yönetimi: kalenin arkasındaki bantta kayan yazı ve görseller. Sıra listedeki
 * sıradır; kapalı reklam bantta görünmez ama kayıt durur.
 */
export function AdminAds({ adminKey }: AdminAdsProps) {
  const [store, setStore] = useState<AdStore | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setStore(await request<AdStore>(adminKey, "/api/admin/ads"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [adminKey]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const run = async (action: () => Promise<AdStore>) => {
    setBusy(true);
    setError(null);
    try {
      setStore(await action());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const body = new FormData();
    body.append("text", text);
    if (file) body.append("image", file);
    void run(async () => {
      const next = await request<AdStore>(adminKey, "/api/admin/ads", { method: "POST", body });
      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      return next;
    });
  };

  const patch = (ad: Ad, change: { enabled?: boolean; move?: -1 | 1 }) =>
    run(() =>
      request<AdStore>(adminKey, `/api/admin/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      }),
    );

  const remove = (ad: Ad) => {
    if (!window.confirm(`"${ad.text || "görsel"}" reklamı silinsin mi?`)) return;
    void run(() => request<AdStore>(adminKey, `/api/admin/ads/${ad.id}`, { method: "DELETE" }));
  };

  const ads = store?.ads ?? [];

  return (
    <section className={styles.panel}>
      <h2>Reklam panosu</h2>
      <p className={styles.muted}>
        Kalenin arkasındaki bantta soldan sağa kayar; her reklam yazı, görsel ya da ikisi birden olabilir.
        Görsel bant yüksekliğine sığdırılır (yatay logolar en iyi görünür). Kapalı reklam bantta çıkmaz.
        Hiç açık reklam yoksa bantta oyunun adı görünür.
      </p>

      <form className={styles.inline} onSubmit={add}>
        <input
          value={text}
          maxLength={AD_TEXT_MAX}
          placeholder={`Yazı (en çok ${AD_TEXT_MAX} karakter)`}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          aria-label="Görsel"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={busy || (!text.trim() && !file)}>Reklam ekle</button>
      </form>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {store && ads.length === 0 ? (
        <p className={styles.muted}>Henüz reklam yok.</p>
      ) : (
        <ul className={styles.adList}>
          {ads.map((ad, i) => (
            <li key={ad.id} className={ad.enabled ? styles.adItem : `${styles.adItem} ${styles.adOff}`}>
              {ad.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- yerel dosya, boyut bilinmiyor
                <img className={styles.adThumb} src={`/api/ads/${ad.id}/image`} alt="" />
              ) : (
                <span className={styles.adThumb} aria-hidden="true" />
              )}
              <span className={styles.adText}>{ad.text || <em className={styles.muted}>yalnızca görsel</em>}</span>
              <label className={styles.adToggle}>
                <input
                  type="checkbox"
                  checked={ad.enabled}
                  disabled={busy}
                  onChange={(e) => void patch(ad, { enabled: e.target.checked })}
                />
                Açık
              </label>
              <button
                type="button"
                className={styles.chip}
                aria-label="Yukarı taşı"
                disabled={busy || i === 0}
                onClick={() => void patch(ad, { move: -1 })}
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.chip}
                aria-label="Aşağı taşı"
                disabled={busy || i === ads.length - 1}
                onClick={() => void patch(ad, { move: 1 })}
              >
                ↓
              </button>
              <button type="button" className={styles.danger} disabled={busy} onClick={() => remove(ad)}>
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

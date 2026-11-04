"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { ADSENSE_CLIENT, ADSENSE_SLOTS, adsenseEnabled, type AdPlacement } from "@/lib/adsense";
import styles from "./Game.module.css";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  slot: AdPlacement;
}

/**
 * Google AdSense reklam alanı. Yayıncı ve birim kimliği varsa duyarlı (`auto`) bir birim
 * çizer ve betiğe bildirir; yoksa geliştirmede kesikli yer tutucu, yayında hiçbir şey. Alanın
 * en az yüksekliği sabittir ki reklam yüklenirken sayfa zıplamasın (CLS).
 */
export function AdSlot({ slot }: AdSlotProps) {
  const t = useT();
  const id = ADSENSE_SLOTS[slot];
  const active = adsenseEnabled() && id !== "";
  const pushed = useRef(false);

  useEffect(() => {
    if (!active || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // reklam engelleyici betiği durdurduysa sessizce geç
    }
  }, [active]);

  if (!active) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div className={`${styles.adSlot} ${styles.adPlaceholder}`} aria-hidden="true">
        {t("ads.label")} · {slot}
      </div>
    );
  }

  return (
    <div className={styles.adSlot}>
      <span className={styles.adLabel}>{t("ads.label")}</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={id}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

import { BRAND, BrandMark } from "@/lib/brand";
import styles from "./Game.module.css";

interface LogoProps {
  /** İşaretin piksel boyu; yazı buna göre ölçeklenir. Varsayılan 44. */
  size?: number;
  /** Yalnızca işaret (yazı yok). */
  markOnly?: boolean;
}

/** GoalSpot logosu: işaret + iki renkli yazı. Başlık yerine kullanılır; metin gerçek metindir (SEO). */
export function Logo({ size = 44, markOnly = false }: LogoProps) {
  return (
    <span className={styles.logo} style={{ fontSize: size * 0.82 }}>
      <BrandMark size={size} />
      {!markOnly && (
        <span className={styles.logoWord}>
          {BRAND.parts[0]}
          <span className={styles.logoSpot}>{BRAND.parts[1]}</span>
        </span>
      )}
    </span>
  );
}

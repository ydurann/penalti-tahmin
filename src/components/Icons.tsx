import type { SVGProps } from "react";

/**
 * Satır içi, çizgi tabanlı ikonlar; dış kütüphane yok. Renk `currentColor`'dan,
 * boyut yazı boyutundan gelir (`1.1em`). Hepsi süslemedir, `aria-hidden` ile gizlenir.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Oyuna başla. */
export const PlayIcon = () => (
  <Icon fill="currentColor" stroke="none">
    <path d="M7 4.5v15l12-7.5z" />
  </Icon>
);

/** Yeniden oyna. */
export const ReplayIcon = () => (
  <Icon>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
    <path d="M3.5 3.5V8H8" />
  </Icon>
);

/** Turnuva çipleri. */
export const TrophyIcon = () => (
  <Icon>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
    <path d="M12 13v3M9 20h6M10 16h4l1 4H9z" />
  </Icon>
);

/** "Tümü" çipi. */
export const GridIcon = () => (
  <Icon>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Icon>
);

/** Tam bölge. */
export const TargetIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Icon>
);

/** Doğru yön. */
export const DirectionIcon = () => (
  <Icon>
    <path d="M4 12h16" />
    <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />
  </Icon>
);

/** Doğru vuruş tipi: ayakkabı. */
export const BootIcon = () => (
  <Icon>
    <path d="M4 16c0-2 1-3 3-3h3l3-4c1-1 2-1 3 0l4 4c1 1 1 3-1 3H5z" />
    <path d="M4 16v2h16v-2" />
  </Icon>
);

/** Seri bonusu: alev. */
export const FlameIcon = () => (
  <Icon>
    <path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 8 12c0-1 .3-2 1-3 0 2 1 3 2 3 0-3-1-5 1-9z" />
    <path d="M9 18.5a3 3 0 0 0 6 0c0-1.5-1-2.5-3-4-2 1.5-3 2.5-3 4z" />
  </Icon>
);

/** Plase: kıvrılan yol. */
export const CurveIcon = () => (
  <Icon>
    <path d="M4 18c3-1 5-4 6-8s3-6 10-6" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" />
  </Icon>
);

/** Sert: şimşek. */
export const BoltIcon = () => (
  <Icon>
    <path d="M13 3L5 13h6l-1 8 9-11h-6z" />
  </Icon>
);

/** Panenka: tüy. */
export const FeatherIcon = () => (
  <Icon>
    <path d="M20 4c-6 0-11 4-13 10l-3 6" />
    <path d="M7 14c3 1 6 0 9-2M9 10c2 0 4-1 6-3" />
  </Icon>
);

/** Tahmini kilitle. */
export const LockIcon = () => (
  <Icon>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Icon>
);

/** Sıradaki penaltı. */
export const ArrowRightIcon = () => (
  <Icon>
    <path d="M4 12h16" />
    <path d="M13 5l7 7-7 7" />
  </Icon>
);

/** Arkadaşlarınla yarış. */
export const UsersIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .8 3 2.6 3 5.5" />
  </Icon>
);

/** Kodu kopyala. */
export const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);

/** Odadan ayrıl / geri. */
export const BackIcon = () => (
  <Icon>
    <path d="M20 12H4" />
    <path d="M11 5l-7 7 7 7" />
  </Icon>
);

/** Nasıl oynanır. */
export const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.5" />
    <path d="M12 17.2v.3" />
  </Icon>
);

/** Oyunu duraklat. */
export const PauseIcon = () => (
  <Icon>
    <rect x="6" y="4.5" width="4" height="15" rx="1" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" />
  </Icon>
);

/** Oyundan çık (kapıdan dışarı ok). */
export const ExitIcon = () => (
  <Icon>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M14 12h6" />
    <path d="M17 8.5l3.5 3.5-3.5 3.5" />
  </Icon>
);

/** Kilitlenmiş tahmin işareti. */
export const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
);

/** Haftalık challenge, dünya sıralaması. */
export const GlobeIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </Icon>
);

/** İpucu. */
export const BulbIcon = () => (
  <Icon>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.5 1.5 2.1h4c0-.6.7-1.5 1.5-2.1A6 6 0 0 0 12 3z" />
  </Icon>
);

/** Sonuçları gör. */
export const FlagIcon = () => (
  <Icon>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2 4 2 4H5" />
  </Icon>
);

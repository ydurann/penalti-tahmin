import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ADSENSE_CLIENT, adsenseEnabled } from "@/lib/adsense";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * Site geneli metadata. Sunucu dil bilmediği için başlık ve açıklama Türkçedir (ana hedef
 * Türkçe aramalar). Open Graph görseli `opengraph-image.tsx`, simgeler `icon.tsx` ve
 * `apple-icon.tsx` ile kodla üretilir; `metadataBase` göreli adresleri yayın adresine çevirir.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "games",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "tr_TR",
    alternateLocale: ["en_US", "de_DE"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a1f13",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        {/* AdSense betiği yalnızca yayıncı kimliği verildiğinde ve sayfa etkileşime geçtikten sonra yüklenir. */}
        {adsenseEnabled() && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}

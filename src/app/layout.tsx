import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penaltı Tahmin",
  description: "Penaltının kalenin neresine ve nasıl atılacağını tahmin et.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

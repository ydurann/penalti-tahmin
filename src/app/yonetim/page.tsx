import type { Metadata } from "next";
import { Admin } from "@/components/Admin";

export const metadata: Metadata = {
  title: "Yönetim · Penaltı Tahmin",
  robots: { index: false, follow: false },
};

/** Gizli yönetim ekranı: ana sayfadan bağlantı verilmez, uçlar ADMIN_SECRET ile korunur. */
export default function AdminPage() {
  return <Admin />;
}

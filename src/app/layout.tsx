import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { LANG_COOKIE, dirOf, messages, normalizeLang } from "@/lib/i18n";
import { RegisterServiceWorker } from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apply Board",
  description: "Track internship applications, deadlines and notes in one place.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Apply Board", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1f5fd1", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body>
        <a className="skip" href="#main">{messages[lang].skip}</a>
        <main id="main">{children}</main>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

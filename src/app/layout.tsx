import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apply Board",
  description: "Track internship applications, deadlines and notes in one place.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Apply Board", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1f5fd1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <main id="main">{children}</main>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

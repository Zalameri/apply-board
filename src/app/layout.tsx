import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apply Board",
  description: "Track internship applications, deadlines and notes in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, messages, type Lang } from "@/lib/i18n";

// Stores the chosen language in a cookie and re-renders the server components.
export default function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter();
  const next: Lang = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      className="secondary"
      lang={next}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      {messages[lang].switchLang}
    </button>
  );
}

// Lee el idioma elegido desde la cookie (la escribe useLang en el cliente).
// Permite que las páginas de SERVIDOR rendericen en el mismo idioma que el
// resto de la app, sin convertirlas en client components.

import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export function getServerLang(): Lang {
  try {
    return cookies().get("premortem-lang")?.value === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

/** Helper de traducción server-side: devuelve EN si existe, si no el español. */
export function makeTr(lang: Lang) {
  return (es: string, en: string) => (lang === "en" ? en : es);
}

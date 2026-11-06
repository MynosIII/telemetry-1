import { lang } from "next/root-params";
import type { LangCode } from "./i18n";

/** The language comes from the app/[lang] segment, so every page is prerendered once per language. */
export async function getLang(): Promise<LangCode> {
  try {
    return (await lang()) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

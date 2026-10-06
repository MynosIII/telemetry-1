import { cookies } from "next/headers";
import { LangCode } from "./i18n";

export function getLang(): LangCode {
  try {
    const cookieStore = cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value;
    return lang === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

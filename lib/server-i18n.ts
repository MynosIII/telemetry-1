import { cookies } from "next/headers";
import { LangCode } from "./i18n";

export async function getLang(): Promise<LangCode> {
  try {
    const cookieStore = await cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value;
    return lang === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

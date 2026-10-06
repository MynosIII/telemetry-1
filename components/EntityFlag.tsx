import { getHistoryIndex } from "@/lib/history";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";

export async function EntityFlag({ href }: { href?: string | null }) {
  if (!href) return null;
  let category: string | null = null;
  let id: string | null = null;

  const match = href.match(/^\/historia\/([^/]+)\/([^/]+)/);
  if (match) {
    category = match[1];
    id = match[2];
  } else if (href.startsWith("/pilotos/")) {
    category = "drivers";
    id = href.split("/")[2];
  }

  if (!category || !id) return null;

  const index = await getHistoryIndex();
  const entity = index.entities.find((e) => e.category === category && e.id === id);
  if (!entity || !entity.country) return null;

  const flagUrl = getCountryFlagUrl(entity.country);
  if (!flagUrl) return null;

  return (
    <img
      src={flagUrl}
      alt=""
      width={16}
      height={11}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        marginRight: "6px",
        borderRadius: "2px",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.15)"
      }}
      aria-hidden="true"
      title={entity.country}
    />
  );
}

import directory from "@/data/social-links.json";
export type SocialProfile = { website: string; source: string; reviewedAt: string; note?: string; links: { label: string; href: string }[] };
const profiles: Record<string, SocialProfile> = directory;
export function getSocialProfile(category: "drivers" | "constructors", id: string): SocialProfile | undefined {
  const sourceId = category === "drivers" && id === "lindblad" ? "arvid-lindblad" : id;
  return profiles[`${category}/${sourceId}`];
}

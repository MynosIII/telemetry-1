import { getSocialProfile } from "@/lib/social-links";
export function SocialLinks({ category, sourceId, name }: { category: "drivers" | "constructors"; sourceId: string; name: string }) {
  const profile = getSocialProfile(category, sourceId);
  if (!profile) return null;
  return <div className="profile-socials">
    <p className="profile-socials-label">Web y redes · {name}</p>
    <nav aria-label={`Web y redes de ${name}`}><a href={profile.website} target="_blank" rel="noopener noreferrer" aria-label={`Sitio oficial de ${name} (abre en una pestaña nueva)`}>Sitio oficial <span aria-hidden="true">↗</span></a>{profile.links.map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${name} en ${link.label} (abre en una pestaña nueva)`}>{link.label} <span aria-hidden="true">↗</span></a>)}</nav>
    {profile.note ? <small>{profile.note}</small> : null}
  </div>;
}

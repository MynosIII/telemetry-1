import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AccountPanel } from "@/components/account/AccountPanel";
import { games, predestinato } from "@/lib/games";

export const metadata: Metadata = { title: "Tu cuenta", robots: { index: false } };

export default function AccountPage() {
  return (
    <main id="top" className="inner-page account-page">
      <SiteHeader />
      <section className="account-wrap">
        <h1>Tu cuenta</h1>
        <AccountPanel games={[predestinato, ...games].map(({ slug, title }) => ({ slug, title }))} />
      </section>
      <SiteFooter />
    </main>
  );
}

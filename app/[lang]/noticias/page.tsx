import type { Metadata } from "next";
import { NewsList } from "@/components/NewsList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getNews } from "@/lib/news";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Las últimas noticias de Fórmula 1."
};

export const revalidate = 900;

export default async function NewsPage() {
  const items = await getNews();
  return (
    <main id="top" className="inner-page">
      <SiteHeader />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">FÓRMULA 1</p>
        <h1>ÚLTIMAS <em>NOTICIAS</em></h1>
      </section>
      <section className="news-page">
        <NewsList items={items} />
        <p className="news-credit">Titulares de Motorsport.com. Cada nota se abre en su sitio original.</p>
      </section>
      <SiteFooter />
    </main>
  );
}

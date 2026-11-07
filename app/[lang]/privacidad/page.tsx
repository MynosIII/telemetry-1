import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Privacidad", description: "Qué datos guarda Telemetry One y cómo borrarlos." };

export default function PrivacyPage() {
  return (
    <main id="top" className="inner-page account-page">
      <SiteHeader />
      <article className="account-wrap privacy">
        <h1>Privacidad</h1>
        <p>Podés usar todo Telemetry One sin cuenta. La cuenta es opcional y sirve para seguir pilotos y escuderías y guardar tu progreso en los juegos.</p>
        <h2>Qué guardamos</h2>
        <p>Cuando ingresás con Google recibimos tu nombre, tu email y tu foto de perfil. Guardamos eso, los pilotos y escuderías que seguís y el progreso de los juegos. No recibimos tu contraseña ni accedemos a nada más de tu cuenta de Google.</p>
        <h2>Para qué</h2>
        <p>Solo para mostrarte tu cuenta en este sitio. No vendemos ni compartimos tus datos, y no te mandamos emails.</p>
        <h2>Dónde</h2>
        <p>El sitio funciona en Vercel y los datos se guardan en una base de datos de Neon. La sesión se guarda en una cookie de tu navegador.</p>
        <h2>Cómo borrarlos</h2>
        <p>Desde <Link href="/cuenta">Tu cuenta</Link> podés borrar la cuenta y todo lo guardado en cualquier momento. Se borra en el acto.</p>
      </article>
      <SiteFooter />
    </main>
  );
}

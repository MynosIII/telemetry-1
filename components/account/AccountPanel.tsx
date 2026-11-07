"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteAccount, setFollow, signIn, signOut, useAccount } from "./account-store";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

/** /cuenta: who you are, what you follow, which games are saved, and the way out. */
export function AccountPanel({ games }: { games: { slug: string; title: string }[] }) {
  const account = useAccount();
  const [confirming, setConfirming] = useState(false);

  if (!account) return <p className="account-note">Cargando…</p>;
  if (!account.enabled) return <p className="account-note">Las cuentas todavía no están disponibles.</p>;
  if (!account.user) {
    return (
      <div className="account-signed-out">
        <p>Con una cuenta seguís a tus pilotos y escuderías, los ves primero en el inicio y tu progreso en los juegos queda guardado en cualquier dispositivo.</p>
        <button type="button" className="button button-primary" onClick={signIn}>Ingresar con Google</button>
        <p className="account-note">Solo guardamos tu nombre, tu email y lo que hagas en el sitio. <Link href="/privacidad">Privacidad</Link></p>
      </div>
    );
  }

  const drivers = account.follows.filter((f) => f.kind === "driver");
  const teams = account.follows.filter((f) => f.kind === "team");
  const saved = games.filter((game) => account.progress[game.slug]);

  return (
    <div className="account-panel">
      <section className="account-block account-profile">
        {account.user.image ? <img src={account.user.image} alt="" width={64} height={64} referrerPolicy="no-referrer" /> : null}
        <div><h2>{account.user.name}</h2><p>{account.user.email}</p></div>
        <button type="button" className="account-button" onClick={signOut}>Cerrar sesión</button>
      </section>

      {([["Pilotos", drivers, "/pilotos/", "Entrá a la ficha de un piloto y tocá Seguir."], ["Escuderías", teams, "/historia/constructors/", "Entrá a la página de una escudería y tocá Seguir."]] as const).map(([title, list, base, empty]) => (
        <section className="account-block" key={title}>
          <h2>{title}</h2>
          {list.length ? <ul className="account-follows">{list.map((follow) => (
            <li key={follow.id}><Link href={`${base}${follow.id}`}>{follow.label}</Link><button type="button" onClick={() => setFollow(follow, false)}>Dejar de seguir</button></li>
          ))}</ul> : <p className="account-note">{empty}</p>}
        </section>
      ))}

      <section className="account-block">
        <h2>Juegos</h2>
        {saved.length ? <ul className="account-follows">{saved.map((game) => (
          <li key={game.slug}><Link href={`/juegos/${game.slug}`}>{game.title}</Link><span>Guardado el {formatDate(account.progress[game.slug].updatedAt)}</span></li>
        ))}</ul> : <p className="account-note">Todavía no hay partidas guardadas.</p>}
      </section>

      <section className="account-block account-danger">
        <h2>Borrar cuenta</h2>
        <p className="account-note">Se borran tu cuenta, tus seguidos y tu progreso. No se puede deshacer.</p>
        {confirming
          ? <p><button type="button" className="account-button account-delete" onClick={deleteAccount}>Sí, borrar todo</button> <button type="button" className="account-button" onClick={() => setConfirming(false)}>Cancelar</button></p>
          : <button type="button" className="account-button" onClick={() => setConfirming(true)}>Borrar mi cuenta</button>}
      </section>
    </div>
  );
}

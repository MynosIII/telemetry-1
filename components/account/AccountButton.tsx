"use client";

import Link from "next/link";
import { signIn, useAccount } from "./account-store";

/** Header entry: "Ingresar" when signed out, the user's initial (linking to /cuenta) when signed in. */
export function AccountButton({ lang }: { lang: "es" | "en" }) {
  const account = useAccount();
  if (!account?.enabled) return null;
  if (!account.user) {
    const label = lang === "en" ? "Sign in" : "Ingresar";
    return (
      <button type="button" className="button-lang account-signin" onClick={signIn} aria-label={label}>
        <span className="account-signin-text">{label}</span>
        <svg className="account-signin-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M2.5 14.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
    );
  }
  const name = account.user.name ?? account.user.email ?? "";
  return (
    <Link className="account-avatar" href="/cuenta" aria-label={lang === "en" ? "Your account" : "Tu cuenta"} title={name}>
      {account.user.image ? <img src={account.user.image} alt="" width={32} height={32} referrerPolicy="no-referrer" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
    </Link>
  );
}

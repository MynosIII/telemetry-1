"use client";

import { useSyncExternalStore } from "react";
import { signIn as authSignIn, signOut as authSignOut } from "next-auth/react";

export type Follow = { kind: "driver" | "team"; id: string; label: string };
export type Account = {
  /** False until the site has a database and Google credentials: every account widget stays hidden. */
  enabled: boolean;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  follows: Follow[];
  progress: Record<string, { data: unknown; updatedAt: string }>;
};

const LOADING: Account = { enabled: false, user: null, follows: [], progress: {} };
let state: Account | null = null;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Account) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function refreshAccount() {
  request = fetch("/api/me", { cache: "no-store", credentials: "same-origin" })
    .then((response) => response.ok ? response.json() : LOADING)
    .then((data) => set({ ...LOADING, ...data, follows: data.follows ?? [], progress: data.progress ?? {} }))
    .catch(() => set(LOADING));
  return request;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!request) void refreshAccount();
  return () => listeners.delete(listener);
}

/** The account, or null while it loads. Shared by every widget on the page: one request per visit. */
export function useAccount() {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

export function signIn() {
  void authSignIn("google", { redirectTo: window.location.href });
}

export function signOut() {
  void authSignOut({ redirectTo: window.location.pathname });
}

export async function setFollow(follow: Follow, following: boolean) {
  if (!state?.user) return signIn();
  const before = state;
  const follows = following
    ? [...state.follows.filter((f) => !(f.kind === follow.kind && f.id === follow.id)), follow]
    : state.follows.filter((f) => !(f.kind === follow.kind && f.id === follow.id));
  set({ ...state, follows });
  const response = await fetch("/api/me/follows", {
    method: following ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(follow)
  }).catch(() => null);
  if (!response?.ok) set(before);
}

export async function saveGameProgress(game: string, data: unknown) {
  if (!state?.user) return false;
  const response = await fetch("/api/me/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game, data })
  }).catch(() => null);
  if (response?.ok) set({ ...state, progress: { ...state.progress, [game]: { data, updatedAt: new Date().toISOString() } } });
  return Boolean(response?.ok);
}

export async function deleteAccount() {
  const response = await fetch("/api/me", { method: "DELETE" }).catch(() => null);
  if (response?.ok) window.location.assign("/");
}

"use client";

import { useEffect } from "react";
import { saveGameProgress, useAccount } from "./account-store";

/**
 * Lets an embedded game keep its progress in the visitor's account. The games live on other
 * domains, so they talk to this page with postMessage:
 *
 *   game → page  { type: "telemetry-one:ready" }                 when the game has loaded
 *   page → game  { type: "telemetry-one:restore", signedIn, data } the saved progress (or null)
 *   game → page  { type: "telemetry-one:progress", data }          after each finished round
 *
 * Signed-out players keep playing as before: the game's own localStorage holds their progress,
 * and the first "progress" message after they sign in copies it to the account.
 */
export function GameProgressBridge({ game, source, frameId }: { game: string; source: string; frameId: string }) {
  const account = useAccount();
  const signedIn = Boolean(account?.user);
  const saved = account?.progress[game]?.data ?? null;

  useEffect(() => {
    const origin = new URL(source).origin;
    const frame = () => document.getElementById(frameId) as HTMLIFrameElement | null;
    const restore = () => frame()?.contentWindow?.postMessage({ type: "telemetry-one:restore", game, signedIn, data: saved }, origin);

    function onMessage(event: MessageEvent) {
      if (event.origin !== origin || event.source !== frame()?.contentWindow) return;
      const message = event.data as { type?: string; data?: unknown } | null;
      if (message?.type === "telemetry-one:ready") restore();
      if (message?.type === "telemetry-one:progress" && signedIn && message.data && typeof message.data === "object") {
        void saveGameProgress(game, message.data);
      }
    }
    window.addEventListener("message", onMessage);
    // The account can finish loading after the game said it was ready.
    if (account) restore();
    return () => window.removeEventListener("message", onMessage);
    // `saved` changes after every save; resending it would loop the game's own state back to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, source, frameId, signedIn, Boolean(account)]);

  return null;
}

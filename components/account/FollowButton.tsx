"use client";

import { setFollow, useAccount, type Follow } from "./account-store";

/** "Seguir" on a driver or team page. Signed-out visitors are sent to Google first. */
export function FollowButton(follow: Follow) {
  const account = useAccount();
  if (!account?.enabled) return null;
  const following = account.follows.some((f) => f.kind === follow.kind && f.id === follow.id);
  return (
    <button type="button" className="follow-button" aria-pressed={following} onClick={() => setFollow(follow, !following)}>
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}

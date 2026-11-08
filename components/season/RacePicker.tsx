import Link from "next/link";
import type { RaceSession } from "@/lib/season-pace";

/** Links to each finished race of the season, newest first. */
export function RacePicker({ sessions, current, base }: { sessions: RaceSession[]; current: number; base: string }) {
  return (
    <nav className="season-picker" aria-label="Carrera">
      {[...sessions].reverse().map((session) => (
        <Link key={session.key} href={`${base}?carrera=${session.key}`} aria-current={session.key === current ? "page" : undefined} prefetch={false}>
          {session.country || session.circuit}{session.sprint ? " · sprint" : ""}
        </Link>
      ))}
    </nav>
  );
}

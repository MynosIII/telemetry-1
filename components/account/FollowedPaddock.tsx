"use client";

import Link from "next/link";
import { useAccount } from "./account-store";

type Driver = { driverId: string; name: string; team: string; position: string; points: string; image?: string };
type LastRace = { name: string; results: { driverId: string; position: string; team: string; points: string }[] };

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(f1|team|racing|scuderia|formula one)\b/g, "").replace(/[^a-z0-9]/g, "");

/** Teams in the drivers' standings: points summed per team, ranked. */
function teamTable(standings: Driver[]) {
  const teams = new Map<string, { name: string; points: number; drivers: string[] }>();
  for (const driver of standings) {
    const entry = teams.get(driver.team) ?? { name: driver.team, points: 0, drivers: [] };
    entry.points += Number(driver.points) || 0;
    entry.drivers.push(driver.name.split(" ").at(-1) ?? driver.name);
    teams.set(driver.team, entry);
  }
  return [...teams.values()].sort((a, b) => b.points - a.points).map((team, index) => ({ ...team, position: index + 1 }));
}

function sameTeam(followLabel: string, followId: string, team: string) {
  const a = normalize(team);
  return [normalize(followLabel), normalize(followId)].some((b) => b && (a === b || a.includes(b) || b.includes(a)));
}

/** "Tu paddock" on the home page: only the signed-in visitor's drivers and teams, from this season's table. */
export function FollowedPaddock({ standings, lastRace }: { standings: Driver[]; lastRace?: LastRace }) {
  const account = useAccount();
  if (!account?.user || !account.follows.length) return null;
  const teams = teamTable(standings);

  return (
    <section className="section section-light followed-paddock" aria-labelledby="followed-title">
      <div className="followed-head">
        <h2 id="followed-title">Tu paddock</h2>
        <Link href="/cuenta">Editar</Link>
      </div>
      <ul className="followed-list">
        {account.follows.map((follow) => {
          if (follow.kind === "driver") {
            const driver = standings.find((row) => row.driverId === follow.id);
            const race = lastRace?.results.find((row) => row.driverId === follow.id);
            return (
              <li key={`d-${follow.id}`}>
                <Link href={`/pilotos/${follow.id}`}>
                  {driver?.image ? <img src={driver.image} alt="" width={56} height={56} loading="lazy" /> : <span className="followed-initial">{follow.label.slice(0, 1)}</span>}
                  <span className="followed-name"><b>{driver?.name ?? follow.label}</b><small>{driver?.team ?? "Piloto"}</small></span>
                  {driver ? <span className="followed-figures">
                    <span><small>Campeonato</small><b>P{driver.position}</b></span>
                    <span><small>Puntos</small><b>{driver.points}</b></span>
                    {race && lastRace ? <span title={lastRace.name}><small>Última carrera</small><b>{/^\d+$/.test(race.position) ? `P${race.position}` : race.position}</b></span> : null}
                  </span> : <span className="followed-figures"><small>No corre esta temporada</small></span>}
                </Link>
              </li>
            );
          }
          const team = teams.find((row) => sameTeam(follow.label, follow.id, row.name));
          return (
            <li key={`t-${follow.id}`}>
              <Link href={`/historia/constructors/${follow.id}`}>
                <span className="followed-initial followed-team">{follow.label.slice(0, 1)}</span>
                <span className="followed-name"><b>{follow.label}</b><small>{team ? team.drivers.join(" · ") : "Escudería"}</small></span>
                {team ? <span className="followed-figures">
                  <span><small>Constructores</small><b>P{team.position}</b></span>
                  <span><small>Puntos</small><b>{team.points}</b></span>
                </span> : <span className="followed-figures"><small>No corre esta temporada</small></span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

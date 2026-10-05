"""Build a reproducible historical encyclopedia from the local F1DB + model release.

No StatsF1 prose or images are scraped. Public facts are independently aggregated;
Wikipedia/StatsF1 references are kept alongside original, fact-based narratives.
Run from F1: .venv/Scripts/python.exe telemetry-1/scripts/build-history.py
"""
from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[2]
CATEGORIES = {"drivers": "drivers", "constructors": "constructors", "engines": "engine-manufacturers", "circuits": "circuits", "nations": "countries", "tyres": "tyre-manufacturers", "grands-prix": "grands-prix"}
NO_START = {"DNS", "DNQ", "DNPQ", "EX", "DNP"}
LABELS = {"drivers": "Piloto", "constructors": "Constructor", "engines": "Motorista", "circuits": "Circuito", "nations": "Nación", "tyres": "Neumáticos", "grands-prix": "Gran Premio", "seasons": "Temporada"}
WIKI = {
    "constructors/ferrari": "Scuderia Ferrari", "constructors/mercedes": "Mercedes-Benz in Formula One", "constructors/red-bull": "Red Bull Racing", "constructors/lotus": "Team Lotus", "constructors/alfa-romeo": "Alfa Romeo in Formula One", "constructors/renault": "Renault in Formula One", "constructors/honda": "Honda in Formula One", "constructors/haas": "Haas F1 Team", "constructors/racing-point": "Racing Point F1 Team", "constructors/racing-bulls": "Racing Bulls", "constructors/rb": "RB Formula One Team", "constructors/toro-rosso": "Scuderia Toro Rosso", "constructors/alpine": "Alpine F1 Team", "constructors/aston-martin": "Aston Martin in Formula One", "constructors/williams": "Williams Racing", "constructors/sauber": "Sauber", "constructors/force-india": "Force India", "constructors/brawn": "Brawn GP",
    "engines/honda": "Honda in Formula One", "engines/mercedes": "Mercedes AMG High Performance Powertrains", "engines/ferrari": "Scuderia Ferrari", "engines/ford": "Cosworth", "engines/renault": "Renault in Formula One", "engines/honda-rbpt": "Red Bull Powertrains", "engines/rbpt": "Red Bull Powertrains", "engines/tag": "Techniques d'Avant Garde", "engines/bmw": "BMW in Formula One",
    "tyres/goodyear": "Goodyear Tire and Rubber Company", "tyres/pirelli": "Pirelli", "tyres/bridgestone": "Bridgestone", "tyres/michelin": "Michelin", "tyres/firestone": "Firestone Tire and Rubber Company", "tyres/dunlop": "Dunlop Tyres",
    "circuits/monza": "Monza Circuit", "circuits/monaco": "Circuit de Monaco", "circuits/spa-francorchamps": "Circuit de Spa-Francorchamps", "circuits/silverstone": "Silverstone Circuit", "circuits/suzuka": "Suzuka International Racing Course", "circuits/interlagos": "Interlagos Circuit", "circuits/indianapolis": "Indianapolis Motor Speedway",
    "drivers/nino-farina": "Giuseppe Farina", "drivers/mike-hawthorn": "Mike Hawthorn", "drivers/jack-brabham": "Jack Brabham", "drivers/michael-schumacher": "Michael Schumacher", "drivers/jim-clark": "Jim Clark", "drivers/graham-hill": "Graham Hill", "drivers/andrea-kimi-antonelli": "Andrea Kimi Antonelli",
}

def load(path):
    if not path.exists(): return None
    return yaml.load(path.read_text(encoding="utf-8"), Loader=yaml.CSafeLoader)

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")

def integer(value):
    return value if isinstance(value, int) else None

def snapshot(recs, group, category):
    """Count drivers individually; deduplicate shared-car credits for equipment."""
    starts = [r for r in recs if r["status"] not in NO_START]
    def credits(predicate):
        return len({(r["eventId"], r["driverId"] if category in {"drivers", "nations"} else (r["constructorId"], r["number"], r["position"])) for r in starts if predicate(r)})
    return {"entries": len({(r["eventId"], r["driverId"]) for r in recs}), "races": len({r["eventId"] for r in recs}), "starts": len({(r["eventId"], r["driverId"]) for r in starts}), "wins": credits(lambda r: r["position"] == 1), "podiums": credits(lambda r: r["position"] is not None and 1 <= r["position"] <= 3), "poles": credits(lambda r: r["grid"] == 1 and not r["shared"]), "fastestLaps": credits(lambda r: r["fastest"]), "retirements": len({(r["eventId"], r["driverId"]) for r in starts if r["retired"]}), "laps": sum(r["laps"] or 0 for r in starts if not r["shared"]), "drivers": len({r["driverId"] for r in recs}), "seasons": len({r["season"] for r in recs})}

def build(source, output, cutoff):
    editorial = json.loads((ROOT / "telemetry-1/data/history-editorial.json").read_text(encoding="utf-8"))
    ranking_path = ROOT / "data/outputs/rookie_backcast_v7_6/driver_ranking_retrospective_v7_6.csv"
    ranking_wins = {}
    if ranking_path.exists():
        with ranking_path.open(encoding="utf-8", newline="") as handle:
            ranking_wins = {row["driver_id"]: float(row["wins"]) for row in csv.DictReader(handle)}
    records = {cat: {p.stem: load(p) for p in (source / folder).glob("*.yml")} for cat, folder in CATEGORIES.items()}
    records["seasons"] = {}
    lab = ROOT / "telemetry-1/public/laboratorio-historico"
    html = (lab / "index.html").read_text(encoding="utf-8")
    model = json.loads(re.search(r'<script id="visualizer-data" type="application/json">(.*?)</script>', html, re.S)[1])
    profiles, aliases = {}, {}
    for path in (lab / "drivers").glob("*/index.html"):
        match = re.search(r'<script id="profile" type="application/json">(.*?)</script>', path.read_text(encoding="utf-8"), re.S)
        if match:
            p = json.loads(match[1]); profiles[p["f1dbId"]] = p; aliases[p["f1dbId"]] = p["id"]
    all_rows, groups, standings, titles = [], defaultdict(list), defaultdict(list), defaultdict(list)
    last_date, events = "", set()
    for season_path in sorted((source / "seasons").iterdir()):
        if not season_path.name.isdigit() or int(season_path.name) > cutoff: continue
        year = int(season_path.name)
        records["seasons"][str(year)] = {"id": str(year), "name": str(year), "fullName": f"Campeonato Mundial {year}"}
        for row in load(season_path / "driver-standings.yml") or []:
            key = ("drivers", row["driverId"])
            standings[key].append({"season": year, "position": row.get("position"), "points": row.get("points") or 0})
            if row.get("position") == 1: titles[key].append(year)
        for row in load(season_path / "constructor-standings.yml") or []:
            key = ("constructors", row["constructorId"])
            standings[key].append({"season": year, "position": row.get("position"), "points": row.get("points") or 0})
            if row.get("position") == 1: titles[key].append(year)
        for race_path in sorted((season_path / "races").iterdir()):
            race = load(race_path / "race.yml")
            race_rows = load(race_path / "race-results.yml") or []
            if not race or not race_rows: continue
            race_date = str(race["date"]); last_date = max(last_date, race_date); events.add(race["id"])
            fastest = {r["driverId"] for r in load(race_path / "fastest-laps.yml") or [] if r.get("position") == 1}
            gp = records["grands-prix"].get(race["grandPrixId"], {})
            for row in race_rows:
                identity = records["drivers"].get(row["driverId"], {})
                r = {"eventId": race["id"], "season": year, "round": race["round"], "date": race_date, "event": gp.get("fullName", race["grandPrixId"]), "grandPrixId": race["grandPrixId"], "circuitId": race["circuitId"], "driverId": row["driverId"], "constructorId": row["constructorId"], "engineId": row.get("engineManufacturerId"), "tyreId": row.get("tyreManufacturerId"), "nationId": identity.get("nationalityCountryId"), "position": integer(row.get("position")), "status": str(row.get("position")), "grid": integer(row.get("gridPosition")), "laps": row.get("laps"), "number": row.get("driverNumber"), "shared": bool(row.get("sharedCar")), "fastest": row["driverId"] in fastest, "retired": row.get("reasonRetired"), "points": row.get("points") or 0}
                all_rows.append(r)
                for category, field in (("drivers", "driverId"), ("constructors", "constructorId"), ("engines", "engineId"), ("tyres", "tyreId"), ("circuits", "circuitId"), ("nations", "nationId"), ("grands-prix", "grandPrixId")):
                    if r[field]: groups[(category, r[field])].append(r)
                groups[("seasons", str(year))].append(r)
    index, details = [], {}
    for (category, source_id), rows in groups.items():
        raw = records[category].get(source_id, {"name": source_id})
        entity_id = aliases.get(source_id, source_id) if category == "drivers" else source_id
        key = f"{category}/{entity_id}"
        stats = snapshot(rows, groups, category)
        by_season = defaultdict(list)
        for r in rows: by_season[r["season"]].append(r)
        season_lookup = {r["season"]: r for r in standings[(category, source_id)]}
        season_rows = [{"season": year, **snapshot(rs, groups, category), "position": season_lookup.get(year, {}).get("position"), "points": season_lookup.get(year, {}).get("points"), "champion": year in titles[(category, source_id)]} for year, rs in sorted(by_season.items())]
        name = raw.get("name", source_id)
        wiki_title = WIKI.get(f"{category}/{source_id}", name if category == "drivers" or source_id == "mclaren" else raw.get("fullName", name))
        if category == "seasons": wiki_title = f"{source_id} Formula One World Championship"
        elif category == "grands-prix": wiki_title = raw.get("fullName", name)
        elif category == "nations": wiki_title = f"Formula One drivers from {name}"
        statsf1 = {"drivers": "pilotes.aspx", "constructors": "constructeurs.aspx", "engines": "moteurs.aspx", "circuits": "circuits.aspx", "nations": "nations.aspx", "tyres": "pneus.aspx", "grands-prix": "grands-prix.aspx", "seasons": f"{source_id}.aspx"}[category]
        if category == "drivers": statsf1 = f"{source_id}.aspx"
        elif category == "engines" and source_id in {"honda", "ferrari", "mercedes", "renault", "bmw", "tag"}: statsf1 = f"moteur-{source_id}.aspx"
        elif category == "constructors" and source_id in {"ferrari", "mclaren", "williams", "mercedes", "red-bull", "renault", "tyrrell", "brabham", "benetton", "toleman"}: statsf1 = f"{source_id}.aspx"
        elif category == "circuits" and source_id in {"monza", "monaco", "silverstone", "suzuka"}: statsf1 = f"circuit-{source_id}.aspx"
        item = {"id": entity_id, "sourceId": source_id, "category": category, "name": name, "fullName": raw.get("fullName", name), "country": records["nations"].get(raw.get("nationalityCountryId", raw.get("countryId")), {}).get("name"), "firstSeason": min(by_season), "lastSeason": max(by_season), "stats": stats, "titleSeasons": titles[(category, source_id)], "href": f"/pilotos/{entity_id}" if category == "drivers" else f"/historia/{category}/{entity_id}"}
        index.append(item)
        milestones = []
        for label, predicate in (("Primera inscripción", lambda r: True), ("Primera victoria", lambda r: r["position"] == 1), ("Primer podio", lambda r: r["position"] is not None and 1 <= r["position"] <= 3), ("Primera salida P1", lambda r: r["grid"] == 1)):
            match = next((r for r in rows if predicate(r)), None)
            if match: milestones.append({"label": label, "season": match["season"], "event": match["event"], "date": match["date"]})
        last = rows[-1]
        milestones.append({"label": "Última participación del archivo", "season": last["season"], "event": last["event"], "date": last["date"]})
        for y in titles[(category, source_id)]: milestones.append({"label": "Campeón mundial", "season": y, "event": "Campeonato de pilotos" if category == "drivers" else "Campeonato de constructores"})
        first, final = item["firstSeason"], item["lastSeason"]
        place = raw.get("placeOfBirth")
        paragraphs = []
        if category == "drivers":
            born = str(raw.get("dateOfBirth") or "")
            if born: paragraphs.append(f"{raw.get('fullName', name)} nació el {born}" + (f" en {place}." if place else "."))
            paragraphs.append(f"Su recorrido en el Campeonato Mundial comprende {stats['seasons']} temporadas entre {first} y {final}. El archivo registra {stats['entries']} inscripciones y {stats['starts']} participaciones en carrera, con {stats['wins']} victorias y {stats['podiums']} podios.")
            if titles[(category, source_id)]: paragraphs.append(f"Sus títulos mundiales llegaron en {', '.join(map(str, titles[(category, source_id)]))}. La evolución por temporada permite poner esos campeonatos en relación con sus resultados y los equipos y motores de cada etapa.")
        elif category == "circuits":
            paragraphs.append(f"{raw.get('fullName', name)} forma parte del archivo del Campeonato Mundial desde {first}. Hasta {final} albergó {stats['races']} pruebas, con {stats['drivers']} pilotos representados en sus clasificaciones.")
            paragraphs.append(f"El trazado está situado en {raw.get('placeName', name)}, {item['country'] or 'ubicación no documentada'}. La ficha de F1DB registra {raw.get('length', '—')} km y {raw.get('turns', '—')} curvas para su configuración de referencia; las configuraciones históricas se muestran por separado.")
        else:
            subject = {"constructors": "como constructor", "engines": "como proveedor de motores", "tyres": "como proveedor de neumáticos", "nations": "a través de sus pilotos", "grands-prix": "como prueba del campeonato", "seasons": "en el Campeonato Mundial"}[category]
            paragraphs.append(f"{name} aparece {subject} en {stats['seasons']} temporadas del archivo, entre {first} y {final}. Sus registros abarcan {stats['races']} Grandes Premios y {stats['drivers']} pilotos.")
            if category not in {"circuits", "grands-prix", "seasons"}: paragraphs.append(f"Sus participantes acumularon {stats['wins']} victorias, {stats['podiums']} podios y {stats['fastestLaps']} vueltas rápidas. Estos resultados pertenecen a las combinaciones de piloto, constructor, motor y neumáticos registradas en cada carrera.")
            if titles[(category, source_id)]: paragraphs.append(f"El campeonato de constructores se ganó en {', '.join(map(str, titles[(category, source_id)]))}.")
        best = max(season_rows, key=lambda s: (s["wins"], s["podiums"], s["starts"]))
        if stats["wins"]: paragraphs.append(f"La temporada con más victorias en este archivo fue {best['season']}: {best['wins']} triunfos y {best['podiums']} podios. La gráfica permite contrastar esa concentración de resultados con el resto de su trayectoria.")
        p = profiles.get(source_id) if category == "drivers" else None
        trace = model["drivers"].get(p["id"], {}).get("points", []) if p else []
        if p:
            m = p["model"]
            # The legacy profile's win count counts shared victories in full;
            # the ranking credits fractional wins. Preserve the latter for xW.
            m["observedWins"] = ranking_wins.get(p["id"])
            paragraphs.append(f"La investigación de TelemetryOne v7.6 sitúa su pico ELO en {p['peak']['rating']}, durante {p['peak']['season']} en {p['peak']['event']}. El modelo estima {m.get('expectedWins', '—')} victorias esperadas dentro de su propia cobertura. Esta estimación se interpreta junto a los resultados de ese mismo conjunto de carreras, que puede ser distinto del archivo completo.")
        # Add a genuinely researched account where it has been written and reviewed.
        if key in editorial:
            paragraphs[1:1] = editorial[key]["paragraphs"]
        details[key] = {**item, "biography": {k: str(v) if isinstance(v, date) else v for k,v in raw.items() if k in {"fullName", "dateOfBirth", "dateOfDeath", "placeOfBirth", "length", "turns", "type", "direction", "layouts"}}, "narrative": paragraphs, "milestones": sorted(milestones, key=lambda r: (r["season"], r.get("date", "9999"))), "seasons": season_rows, "seasonStandings": standings[(category, source_id)], "officialPoints": sum(r["points"] for r in standings[(category, source_id)]) if standings[(category, source_id)] else None, "model": p, "ratingHistory": [{"season": t[2], "round": t[3], "event": t[4], "rating": t[1], "expectedWin": t[11]} for t in trace], "sources": {"statsf1": f"https://www.statsf1.com/en/{statsf1}", "wikipedia": f"https://en.wikipedia.org/wiki/{wiki_title.replace(' ', '_')}", "wikipediaTitle": wiki_title}, "relations": []}
        # The compact visualizer's point 11 is the CAR win expectation, not XW.
        for rating in details[key]["ratingHistory"]:
            rating["expectedCarWin"] = rating.pop("expectedWin")
        if category == "engines":
            details[key]["engineSpecs"] = [load(path) for path in (source / "engines").glob(f"{source_id}-*.yml")]
        details[key]["editorialSources"] = editorial.get(key, {}).get("sources", [])
        details[key]["editorialReviewedAt"] = editorial.get(key, {}).get("reviewedAt")
        if category == "drivers":
            details[key]["raceResults"] = [{k: r[k] for k in ("season", "round", "date", "event", "circuitId", "constructorId", "engineId", "tyreId", "position", "status", "grid", "laps", "retired", "points", "shared", "fastest")} for r in rows]
    # Only link to existing entities. Deduplicate each entity/driver/race relation.
    for (category, source_id), rows in groups.items():
        entity_id = aliases.get(source_id, source_id) if category == "drivers" else source_id
        item = details[f"{category}/{entity_id}"]
        for related_cat, field in (("drivers", "driverId"), ("constructors", "constructorId"), ("engines", "engineId"), ("tyres", "tyreId"), ("circuits", "circuitId"), ("nations", "nationId"), ("grands-prix", "grandPrixId")):
            if related_cat == category: continue
            by_related = defaultdict(list)
            for r in rows:
                if r[field]: by_related[r[field]].append(r)
            related = []
            for rid, rr in by_related.items():
                target_id = aliases.get(rid, rid) if related_cat == "drivers" else rid
                target = details.get(f"{related_cat}/{target_id}")
                if target:
                    related.append({"id": target_id, "name": target["name"], "href": target["href"], "races": len({r["eventId"] for r in rr}), "wins": snapshot(rr, groups, related_cat)["wins"], "firstSeason": min(r["season"] for r in rr), "lastSeason": max(r["season"] for r in rr)})
            if related: item["relations"].append({"category": related_cat, "items": sorted(related, key=lambda r: (-r["wins"], -r["races"], r["name"]))})
        if category == "drivers":
            team_group = next((g for g in item["relations"] if g["category"] == "constructors"), None)
            if team_group:
                stages = sorted(team_group["items"], key=lambda t: t["firstSeason"])
                item["narrative"].insert(-1, "Su recorrido por constructores incluye " + "; ".join(f"{t['name']} ({t['firstSeason']}–{t['lastSeason']}, {t['wins']} victorias)" for t in stages) + ". Las etapas indican el primer y último año registrado con cada constructor; pueden incluir interrupciones o regresos.")
        write(output / category / f"{entity_id}.json", item)
    try: revision = subprocess.check_output(["git", "-C", str(source.parents[2]), "rev-parse", "HEAD"], text=True).strip()
    except (OSError, subprocess.CalledProcessError): revision = None
    meta = {"firstSeason": 1950, "lastSeason": cutoff, "lastRaceDate": last_date, "events": len(events), "generatedAt": datetime.now(timezone.utc).isoformat(), "f1dbRevision": revision, "model": model["meta"]["model"], "modelEvents": model["meta"]["events"], "categories": {cat: {"label": LABELS[cat], "count": sum(e["category"] == cat for e in index)} for cat in LABELS}}
    write(output / "index.json", {"meta": meta, "entities": sorted(index, key=lambda r: (r["category"], -r["stats"]["wins"], r["name"]))})
    print(json.dumps(meta, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "data/cache/f1db/src/data")
    parser.add_argument("--output", type=Path, default=ROOT / "telemetry-1/public/history")
    parser.add_argument("--through", type=int, default=2025)
    args = parser.parse_args()
    build(args.source, args.output, args.through)

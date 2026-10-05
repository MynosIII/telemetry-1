"""Build season and Grand Prix dossiers from F1DB and the actual TelemetryOne release."""
from __future__ import annotations
import argparse
from collections import defaultdict
import json
from pathlib import Path
import math
import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[2]
NO_START = {"DNS", "DNQ", "DNPQ", "EX", "DNP"}

def load(path):
    return yaml.load(path.read_text(encoding="utf-8"), Loader=yaml.CSafeLoader) if path.exists() else None

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False, default=str), encoding="utf-8")

def clean(value):
    if value is None or pd.isna(value): return None
    if isinstance(value, (float, int)):
        return round(float(value), 6) if math.isfinite(float(value)) else None
    return value

MODEL_FIELDS = {
    "xw": "XW", "xp": "XP", "expectedPosition": "expected_position", "observedWin": "observed_winner",
    "eloBefore": "retrospective_pre_race_rating", "eloAfter": "retrospective_rating", "raceDelta": "retrospective_race_delta",
    "qualifyingDelta": "retrospective_qualifying_delta", "expectedPerformance": "retrospective_expected_performance",
    "performanceResidual": "retrospective_performance_residual", "carWin": "expected_car_win_v7_6",
    "carSuitability": "car_suitability_score_v7_6", "driverContribution": "XdW_probability_contribution",
    "carContribution": "XcW_probability_contribution", "teamContribution": "XtW_probability_contribution",
    "neutralXw": "XW_neutral_baseline", "confidence": "model_confidence", "quality": "data_quality",
    "eligible": "rating_eligible", "carModel": "model_entity_id", "carIdentity": "car_identity_resolution",
    "marginAdjustment": "pairwise_margin_performance_adjustment", "weatherSource": "weather_source",
    "wetFraction": "wet_fraction", "airTemperature": "air_temperature", "trackTemperature": "track_temperature",
    "windSpeed": "wind_speed", "shapeQuality": "shape_topology_quality",
}

def build(source, output, through):
    archive = json.loads((output / "index.json").read_text(encoding="utf-8"))
    entities = {(e["category"], e["sourceId"]): e for e in archive["entities"]}
    folders = {"drivers": "drivers", "constructors": "constructors", "engines": "engine-manufacturers", "circuits": "circuits", "tyres": "tyre-manufacturers", "grands-prix": "grands-prix", "entrants": "entrants", "chassis": "chassis"}
    raw = {kind: {p.stem: load(p) for p in (source / folder).glob("*.yml")} for kind, folder in folders.items()}
    def ref(kind, identity):
        if not identity: return None
        e = entities.get((kind, identity))
        return {"id": e["id"] if e else identity, "name": e["name"] if e else raw.get(kind, {}).get(identity, {}).get("name", identity), "href": e["href"] if e else None}
    def session(rows):
        return [{"position": r.get("position"), "number": r.get("driverNumber"), "driver": ref("drivers", r["driverId"]), "constructor": ref("constructors", r["constructorId"]), "engine": ref("engines", r.get("engineManufacturerId")), "tyre": ref("tyres", r.get("tyreManufacturerId")), **{k: r.get(k) for k in ["laps", "time", "gap", "interval", "points", "q1", "q2", "q3", "gridPosition", "reasonRetired", "sharedCar", "lap", "pitStops", "timePenalty"]}} for r in rows]
    def standings(rows, kind):
        return [{"position": r.get("position"), "entity": ref(kind, r[f'{"driver" if kind == "drivers" else "constructor"}Id']), "engine": ref("engines", r.get("engineManufacturerId")), "points": r.get("points") or 0} for r in rows]

    model_path = ROOT / "data/outputs/rookie_backcast_v7_6/driver_rating_history_retrospective_v7_6.parquet"
    frame = pd.read_parquet(model_path)
    write(output / "model-schema.json", {"source": model_path.name, "columns": list(frame.columns)})
    model_groups = {(int(year), int(round_)): group for (year, round_), group in frame.groupby(["season", "round"])}
    races, seasons, total_model = [], [], 0
    for season_dir in sorted((source / "seasons").iterdir()):
        if not season_dir.name.isdigit() or int(season_dir.name) > through: continue
        year = int(season_dir.name)
        season_races, matrix, model_history = [], defaultdict(lambda: defaultdict(list)), defaultdict(list)
        for race_dir in sorted((season_dir / "races").iterdir()):
            info = load(race_dir / "race.yml")
            results = load(race_dir / "race-results.yml") or []
            if not info or not results: continue
            round_ = info["round"]
            identifier = f"{year}-{round_}"
            gp = raw["grands-prix"].get(info["grandPrixId"], {})
            name = f"{year} {gp.get('fullName', info['grandPrixId'])}"
            sessions = {key: session(load(race_dir / file) or []) for key, file in {"qualifying": "qualifying-results.yml", "grid": "starting-grid-positions.yml", "race": "race-results.yml", "fastestLaps": "fastest-laps.yml", "sprintQualifying": "sprint-qualifying-results.yml", "sprint": "sprint-race-results.yml", "pitStops": "pit-stops.yml"}.items() if key != "pitStops"}
            pole = next((r for r in sessions["qualifying"] if r["position"] == 1), None)
            fastest = [r for r in sessions["fastestLaps"] if r["position"] == 1]
            podium = [r for r in sessions["race"] if isinstance(r["position"], int) and r["position"] <= 3]
            model_rows, group = [], model_groups.get((year, round_))
            if group is not None:
                csv_path = output / "model-events" / f"{identifier}.csv"
                csv_path.parent.mkdir(parents=True, exist_ok=True)
                group.to_csv(csv_path, index=False)
                for row in group.to_dict(orient="records"):
                    r = {"driver": ref("drivers", row["driver_id_f1db"]), "constructor": ref("constructors", row["constructor_id_f1db"]), **{name: clean(row.get(column)) for name, column in MODEL_FIELDS.items()}}
                    r["totalDelta"] = clean((r["raceDelta"] or 0) + (r["qualifyingDelta"] or 0))
                    model_rows.append(r)
                    model_history[r["driver"]["id"]].append({"round": round_, **r})
                total_model += len(model_rows)
            for row in sessions["race"]:
                matrix[row["driver"]["id"]][str(round_)].append({"position": row["position"], "points": row["points"] or 0, "grid": row["gridPosition"], "fastest": any(f["driver"]["id"] == row["driver"]["id"] for f in fastest), "constructor": row["constructor"], "engine": row["engine"], "shared": bool(row["sharedCar"]), "retired": row["reasonRetired"]})
            winner_names = ", ".join(r["driver"]["name"] for r in podium if r["position"] == 1)
            paragraphs = [f"{name} fue la ronda {round_} del campeonato, disputada el {info['date']} en {ref('circuits', info['circuitId'])['name']}. La ficha reúne los registros del fin de semana y la clasificación oficial."]
            if winner_names: paragraphs.append(f"La victoria correspondió a {winner_names}. Se registraron {len(results)} inscripciones, de las cuales {sum(str(r.get('position')) not in NO_START for r in results)} comenzaron la carrera.")
            if model_rows: paragraphs.append(f"TelemetryOne v7.6 aporta {len(model_rows)} observaciones de este Gran Premio. Sus expectativas de victoria y rendimiento se muestran junto a los cambios de ELO, con la identidad del auto y la calidad documentada por la investigación.")
            editorial = None
            if identifier == "1975-11":
                editorial = {"text": "Los problemas de neumáticos y las averías alteraron la carrera del Nürburgring. Reutemann terminó ganando desde la décima posición de salida. Laffite consiguió el segundo puesto para Frank Williams Racing Cars y Lauda, que había marcado la pole, completó el podio tras sufrir un pinchazo. El resultado permitió a Lauda ampliar su ventaja en el campeonato mientras Reutemann recuperaba el segundo lugar.", "url": "https://en.wikipedia.org/wiki/1975_German_Grand_Prix"}
            race = {"id": identifier, "year": year, "round": round_, "href": f"/historia/carreras/{year}/{round_}", "name": name, "eventName": gp.get("fullName", info["grandPrixId"]), "date": str(info["date"]), "circuit": ref("circuits", info["circuitId"]), "grandPrix": ref("grands-prix", info["grandPrixId"]), "facts": {k: info.get(k) for k in ["officialName", "courseLength", "laps", "distance", "circuitType", "circuitLayoutId", "turns", "direction", "qualifyingFormat"]}, "podium": podium, "pole": pole, "fastest": fastest, "narrative": paragraphs, "editorial": editorial, "sessions": sessions, "standings": {"drivers": standings(load(race_dir / "driver-standings.yml") or [], "drivers"), "constructors": standings(load(race_dir / "constructor-standings.yml") or [], "constructors")}, "model": model_rows, "modelExport": f"/history/model-events/{identifier}.csv" if model_rows else None, "sources": {"wikipedia": f"https://en.wikipedia.org/wiki/{name.replace(' ', '_')}", "f1db": "https://github.com/f1db/f1db", "statsf1": f"https://www.statsf1.com/en/{year}/{info['grandPrixId']}.aspx", "model": "driver_rating_history_retrospective_v7_6.parquet"}}
            write(output / "races" / f"{identifier}.json", race)
            races.append({k: race[k] for k in ["id", "year", "round", "href", "name", "eventName", "date", "circuit"]})
            season_races.append({**races[-1], "podium": [{"position": r["position"], "driver": r["driver"], "constructor": r["constructor"]} for r in podium], "pole": pole["driver"] if pole else None, "fastest": [f["driver"] for f in fastest], "modelCount": len(model_rows), "driverStandings": race["standings"]["drivers"], "constructorStandings": race["standings"]["constructors"]})
        if not season_races: continue
        driver_standings = standings(load(season_dir / "driver-standings.yml") or [], "drivers")
        ranked = {r["entity"]["id"] for r in driver_standings}
        for driver_id in matrix:
            if driver_id not in ranked:
                e = next(e for e in archive["entities"] if e["category"] == "drivers" and e["id"] == driver_id)
                driver_standings.append({"position": None, "entity": {"id": e["id"], "name": e["name"], "href": e["href"]}, "engine": None, "points": 0})
        constructor_standings = standings(load(season_dir / "constructor-standings.yml") or [], "constructors")
        entrants = []
        def walk(node, inherited=None):
            if isinstance(node, list):
                for child in node: walk(child, inherited)
                return
            current = {**(inherited or {}), **{k: v for k, v in node.items() if k not in {"drivers", "constructors", "chassis"}}}
            if "chassis" in node: current["chassis"] = node["chassis"]
            if "constructors" in node: walk(node["constructors"], current)
            elif "drivers" in node: walk(node["drivers"], current)
            elif current.get("driverId"):
                entrant_id = current.get("entrantId")
                chassis = current.get("chassis", [{"chassisId": current.get("chassisId")}])
                entrants.append({"entrant": raw["entrants"].get(entrant_id, {}).get("name", entrant_id), "driver": ref("drivers", current["driverId"]), "constructor": ref("constructors", current.get("constructorId")), "engine": ref("engines", current.get("engineManufacturerId")), "engineModel": current.get("engineId"), "tyre": ref("tyres", current.get("tyreManufacturerId")), "chassis": [raw["chassis"].get(c.get("chassisId"), {}).get("name", c.get("chassisId")) for c in chassis if c.get("chassisId")], "rounds": str(current.get("rounds", "—"))})
        walk(load(season_dir / "entrants.yml") or [])
        model_summary = []
        for identity, history in model_history.items():
            valid = [r for r in history if r["eloAfter"] is not None]
            model_summary.append({"driver": history[0]["driver"], "events": len(history), "observedWins": sum(r["observedWin"] or 0 for r in history), "expectedWins": sum(r["xw"] or 0 for r in history), "meanXp": sum(r["xp"] or 0 for r in history) / len(history), "firstElo": valid[0]["eloBefore"] if valid else None, "lastElo": valid[-1]["eloAfter"] if valid else None, "history": [{"round": r["round"], "elo": r["eloAfter"], "xw": r["xw"], "carWin": r["carWin"], "xp": r["xp"]} for r in history]})
        wiki_title = f"{year} Formula One season" if year <= 1980 else f"{year} Formula One World Championship"
        champion = next((r for r in driver_standings if r["position"] == 1), None)
        team_champion = next((r for r in constructor_standings if r["position"] == 1), None)
        narrative = [f"El Campeonato Mundial de {year} comprendió {len(season_races)} Grandes Premios, desde {season_races[0]['date']} hasta {season_races[-1]['date']}. Las tablas separan los resultados de cada prueba de los puntos computados oficialmente para el campeonato."]
        if champion: narrative.append(f"{champion['entity']['name']} ganó el campeonato de pilotos con {champion['points']} puntos." + (f" {team_champion['entity']['name']} encabezó el campeonato de constructores con {team_champion['points']} puntos." if team_champion else " En esta temporada no hay una clasificación de constructores en el archivo."))
        scoring = {"text": "Los puntos y posiciones finales se conservan según las clasificaciones oficiales de F1DB. No se reconstruye el campeonato sumando una escala moderna: pueden intervenir descartes, sanciones, puntos compartidos, pruebas interrumpidas y sprint.", "url": "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Championship_points_scoring_systems"}
        editorial = None
        if year == 1975:
            editorial = {"text": "La primera corona de Lauda y el título de Ferrari marcaron el campeonato. La temporada también quedó atravesada por los accidentes de Montjuïc y de Mark Donohue en Austria. El calendario combina victorias de Ferrari con triunfos de McLaren, Brabham, Tyrrell, Hesketh y March.", "url": "https://en.wikipedia.org/wiki/1975_Formula_One_season"}
            scoring["text"] = "Se otorgaban 9, 6, 4, 3, 2 y 1 puntos a los seis primeros. Se retenían los seis mejores resultados de cada mitad de siete carreras. Para constructores sólo puntuaba el auto mejor ubicado; España y Austria otorgaron medio puntaje. Los totales oficiales ya aplican estas reglas."
            scoring["url"] = "https://en.wikipedia.org/wiki/1975_Formula_One_season#Scoring_system"
        season = {"year": year, "races": season_races, "narrative": narrative, "editorial": editorial, "scoring": scoring, "driverStandings": driver_standings, "constructorStandings": constructor_standings, "driverResults": dict(matrix), "entrants": entrants, "model": sorted(model_summary, key=lambda r: -(r["lastElo"] or 0)), "sources": {"wikipedia": f"https://en.wikipedia.org/wiki/{wiki_title.replace(' ', '_')}", "f1dbRevision": archive["meta"]["f1dbRevision"], "model": "v7.6", "resultsThrough": archive["meta"]["lastRaceDate"]}}
        write(output / "championships" / f"{year}.json", season)
        seasons.append({"year": year, "races": len(season_races), "drivers": len(matrix), "modelEvents": sum(bool(r["modelCount"]) for r in season_races)})
    manifest = {"seasons": seasons, "races": races, "modelObservations": total_model, "modelSource": model_path.name, "cutoff": through}
    write(output / "weekends.json", manifest)
    print(f"Built {len(seasons)} championships, {len(races)} races and {total_model} model observations.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "data/cache/f1db/src/data")
    parser.add_argument("--output", type=Path, default=ROOT / "telemetry-1/public/history")
    parser.add_argument("--through", type=int, default=2025)
    args = parser.parse_args()
    build(args.source, args.output, args.through)

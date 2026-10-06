"""Rebuild achievements from the archive's local F1DB snapshot."""
import json
from pathlib import Path
import yaml
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data/cache/f1db/src/data'
OUT = ROOT / 'telemetry-1/public/history'
def load(path):
    return yaml.load(path.read_text(encoding='utf-8'), Loader=yaml.CSafeLoader) if path.exists() else []
index = json.loads((OUT / 'index.json').read_text(encoding='utf-8'))
drivers = {}
for entity in index['entities']:
    if entity['category'] != 'drivers': continue
    raw = load(SOURCE / 'drivers' / (entity['sourceId'] + '.yml'))
    drivers[entity['sourceId']] = {'id': entity['id'], 'code': raw.get('abbreviation'), 'number': raw.get('permanentNumber'), 'starts': [], 'grandSlams': [], 'driverOfTheDay': [], 'votesCovered': 0}
events = 0
for directory in sorted((SOURCE / 'seasons').glob('*/races/*')):
    year = int(directory.parent.parent.name)
    if year > index['meta']['lastSeason']: continue
    info, results = load(directory / 'race.yml'), load(directory / 'race-results.yml')
    if not info or not results: continue
    events += 1
    event = {'season': year, 'round': info['round']}
    votes = load(directory / 'driver-of-the-day-results.yml')
    winners = {r['driverId'] for r in votes if r['position'] == 1}
    seen = set()
    for row in results:
        driver = drivers.get(row['driverId'])
        if not driver: continue
        if row.get('position') not in {'DNS', 'DNQ', 'DNPQ', 'EX', 'DNP'} and event not in driver['starts']: driver['starts'].append(event)
        if row.get('grandSlam'): driver['grandSlams'].append(event)
        if row['driverId'] not in seen:
            if votes: driver['votesCovered'] += 1
            if row['driverId'] in winners: driver['driverOfTheDay'].append(event)
        seen.add(row['driverId'])
assert events == index['meta']['events'], (events, index['meta']['events'])
data = {'meta': {'through': index['meta']['lastSeason'], 'events': events, 'f1dbRevision': index['meta']['f1dbRevision'], 'source': 'https://github.com/f1db/f1db'}, 'drivers': {row.pop('id'): row for row in drivers.values()}}
(OUT / 'driver-achievements.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Achievements: {len(drivers)} drivers, {events} races')

"""Rebuild circuit race tables from the archive's F1DB snapshot (no prose scraped)."""
import json
from pathlib import Path
import yaml
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data/cache/f1db/src/data'
OUT = ROOT / 'telemetry-1/public/history'
def load(path):
    return yaml.load(path.read_text(encoding='utf-8'), Loader=yaml.CSafeLoader) if path.exists() else []
def seconds(value):
    if not isinstance(value,str): return None
    try:
        parts=value.split(':'); total=0
        for part in parts: total=total*60+float(part)
        return round(total,3) if total>0 else None
    except ValueError: return None
index=json.loads((OUT/'index.json').read_text(encoding='utf-8'))
drivers={e['sourceId']:{'id':e['id'],'name':e['name'],'href':e['href']} for e in index['entities'] if e['category']=='drivers'}
circuits={e['id']:[] for e in index['entities'] if e['category']=='circuits'}
venues={}
for circuit_id in circuits:
    raw=load(SOURCE/'circuits'/f'{circuit_id}.yml')
    venues[circuit_id]={key:raw.get(key) for key in ['placeName','type','direction','latitude','longitude','previousNames']}
for directory in sorted((SOURCE/'seasons').glob('*/races/*')):
    year=int(directory.parent.parent.name)
    if year>index['meta']['lastSeason']: continue
    info=load(directory/'race.yml'); results=load(directory/'race-results.yml')
    if not info or not results: continue
    dossier=json.loads((OUT/'races'/f"{year}-{info['round']}.json").read_text(encoding='utf-8'))
    grid=load(directory/'starting-grid-positions.yml')
    pole=next((r for r in grid if r.get('position')==1),None)
    qualifying=load(directory/'qualifying-results.yml')
    qualifier=next((r for r in qualifying if pole and r['driverId']==pole['driverId']),None)
    sprint=year==2021 and bool(load(directory/'sprint-race-results.yml'))
    pole_time=pole.get('time') if pole else None
    if not pole_time and qualifier and not sprint:
        pole_time=next((qualifier.get(k) for k in ['q3','q2','q1','time'] if qualifier.get(k)),None)
    if sprint: pole_time=None
    format_='sprint' if sprint else 'four-laps' if info['circuitId']=='indianapolis' and year<=1960 else 'lap'
    winners=[r for r in results if r.get('position')==1]
    fastest=load(directory/'fastest-laps.yml')
    fastest=[r for r in fastest if r.get('position')==1]
    ref=lambda row: drivers.get(row['driverId'],{'id':row['driverId'],'name':row['driverId'],'href':None})
    row={'year':year,'round':info['round'],'date':str(info['date']),'name':dossier['name'],'href':dossier['href'],'layoutId':info.get('circuitLayoutId'),'length':info.get('courseLength'),'laps':info.get('laps'),'distance':info.get('distance'),'pole':ref(pole) if pole else None,'poleTime':pole_time,'poleSeconds':seconds(pole_time),'poleFormat':format_,'winners':[ref(r) for r in winners],'winnerTime':winners[0].get('time') if winners else None,'fastest':[ref(r) for r in fastest],'fastestTime':fastest[0].get('time') if fastest else None}
    circuits[info['circuitId']].append(row)
for rows in circuits.values(): rows.sort(key=lambda r:(r['year'],r['round']))
assert sum(map(len,circuits.values()))==index['meta']['events']
data={'meta':{'through':index['meta']['lastSeason'],'events':index['meta']['events'],'f1dbRevision':index['meta']['f1dbRevision']},'venues':venues,'circuits':circuits}
(OUT/'circuit-results.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f"Built {len(circuits)} circuits / {data['meta']['events']} races")

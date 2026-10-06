"""Rebuild circuit race tables from the archive's F1DB snapshot (no prose scraped)."""
import json
import hashlib
import math
from datetime import datetime, timedelta
import pandas as pd
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
shapes=pd.read_csv(ROOT/'data/outputs/circuit_shape_v9/historical_event_shape_profiles_v9.csv')
shape_events={(int(r.season),int(r['round'])):r for _,r in shapes.iterrows()}
topology={}

def weather(info,venue):
    date=str(info['date'])
    params={'latitude':round(float(venue['latitude']),4),'longitude':round(float(venue['longitude']),4),'start_date':date,'end_date':date,'hourly':'temperature_2m,precipitation,wind_speed_10m','wind_speed_unit':'ms','timezone':'GMT'}
    key=hashlib.sha256(json.dumps(params,sort_keys=True).encode()).hexdigest()[:20]
    target=ROOT/'data/cache/weather'/f'{date}_{key}.json'
    if not target.exists():
        # Earlier investigations used a different coordinate precision. ERA5's
        # returned point is a regional grid cell, not the requested track point.
        candidates=[]
        for cached in (ROOT/'data/cache/weather').glob(f'{date}_*.json'):
            candidate=json.loads(cached.read_text(encoding='utf-8'))
            if 'latitude' not in candidate or 'longitude' not in candidate: continue
            lat=math.radians(venue['latitude']); dlat=math.radians(candidate['latitude']-venue['latitude']); dlon=math.radians(candidate['longitude']-venue['longitude'])
            distance=6371*2*math.asin(min(1,math.sqrt(math.sin(dlat/2)**2+math.cos(lat)*math.cos(math.radians(candidate['latitude']))*math.sin(dlon/2)**2)))
            if distance<=25:candidates.append((distance,cached))
        if not candidates:return None
        target=min(candidates,key=lambda c:c[0])[1]
    payload=json.loads(target.read_text(encoding='utf-8')); h=payload.get('hourly',{})
    if not h.get('time'): return None
    # Whole UTC day: do not turn an inferred start time into a race observation.
    rain=h.get('precipitation',[]); temp=h.get('temperature_2m',[])
    if len(rain)!=24 or len(temp)!=24 or any(v is None for v in rain+temp): return None
    total=round(sum(rain),2); peak=max(rain)
    return {'scope':'utc-day','temperature':round(sum(temp)/24,1),'rain':total,'peakRain':peak,'condition':'heavy' if peak>=5 else 'rain' if total>0.1 else 'dry','hours':24,'gridLatitude':payload['latitude'],'gridLongitude':payload['longitude']}
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
    row['weather']=weather(info,venues[info['circuitId']])
    shape=shape_events.get((year,info['round']))
    if shape is not None and shape.get('shape_topology_quality') in ['high','medium']:
        fields={'turnCount':'turn_count','turnsPerKm':'turns_per_km','longestStraight':'longest_straight_m_v9','chicanes':'chicane_count','esses':'esses_count','complexity':'geometry_only_complexity_v9','straightExposure':'geometry_only_straight_exposure_v9','totalTurningPerKm':'total_absolute_turning_deg_per_km'}
        metrics={key:float(shape[column]) if column in shape and pd.notna(shape[column]) else None for key,column in fields.items()}
        candidate={**metrics,'year':year,'round':info['round'],'quality':shape['shape_topology_quality'],'imageTitle':shape['image_title'],'source':shape['description_url'],'geometryKey':shape['layout_key']}
        topology.setdefault(info['circuitLayoutId'],[]).append(candidate)
    circuits[info['circuitId']].append(row)
for rows in circuits.values(): rows.sort(key=lambda r:(r['year'],r['round']))
assert sum(map(len,circuits.values()))==index['meta']['events']
# A layout can contain multiple source drawings. Choose the most frequent geometry,
# rather than silently copying today's track metrics into a historical layout.
from collections import Counter
profiles={}
for layout_id,candidates in topology.items():
    key=Counter(c['geometryKey'] for c in candidates).most_common(1)[0][0]
    profiles[layout_id]=next(c for c in reversed(candidates) if c['geometryKey']==key)
data={'meta':{'through':index['meta']['lastSeason'],'events':index['meta']['events'],'f1dbRevision':index['meta']['f1dbRevision']},'venues':venues,'circuits':circuits,'topology':profiles}
(OUT/'circuit-results.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f"Built {len(circuits)} circuits / {data['meta']['events']} races")

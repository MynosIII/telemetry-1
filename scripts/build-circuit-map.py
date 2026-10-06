"""Cache current OSM raceway geometry; historical layouts remain separate drawings."""
import json,time,urllib.request,urllib.parse,math,xml.etree.ElementTree as ET
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
venues=json.loads((root/'public/history/circuit-results.json').read_text(encoding='utf-8'))['venues']
target=root/'data/circuit-map-lines.json'
lines=json.loads(target.read_text()) if target.exists() else {}
def fetch(item):
    key,v=item
    try:
        lat,lon=v['latitude'],v['longitude'];dy=0.022;dx=dy/max(0.3,math.cos(math.radians(lat)))
        req=urllib.request.Request(f'https://api.openstreetmap.org/api/0.6/map?bbox={lon-dx},{lat-dy},{lon+dx},{lat+dy}',headers={'User-Agent':'TelemetryOne/1.0 circuit-history'})
        with urllib.request.urlopen(req,timeout=60) as res: data=ET.fromstring(res.read())
        nodes={n.attrib['id']:[float(n.attrib['lat']),float(n.attrib['lon'])] for n in data.findall('node')}
        paths=[]
        for way in data.findall('way'):
            tags={t.attrib['k']:t.attrib['v'] for t in way.findall('tag')}
            if tags.get('highway')=='raceway':
                path=[nodes[n.attrib['ref']] for n in way.findall('nd') if n.attrib['ref'] in nodes]
                if len(path)>1:paths.append(path)
        return key,{'paths':paths,'checked':'2026-10-06','source':'OpenStreetMap API','status':'available' if paths else 'no-geometry'}
    except Exception as error:
        print(key,type(error).__name__,flush=True)
        return key,{'paths':[],'status':'unavailable'}
with ThreadPoolExecutor(max_workers=2) as pool:
    for key,value in pool.map(fetch,[(k,v) for k,v in venues.items() if k not in lines or lines[k]['status']=='unavailable']):
        lines[key]=value
        target.write_text(json.dumps(lines,separators=(',',':')),encoding='utf-8')
        print(key,len(value['paths']),flush=True)

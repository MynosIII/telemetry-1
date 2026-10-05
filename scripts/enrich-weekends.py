"""Add balanced statistics, qualifying matrices and a source-backed chassis catalogue."""
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import yaml
import importlib.util

spec=importlib.util.spec_from_file_location('leading_stats',Path(__file__).with_name('fetch-leading-stats.py'))
leading_module=importlib.util.module_from_spec(spec); spec.loader.exec_module(leading_module)
Tables=leading_module.Tables

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'telemetry-1/public/history'
SOURCE = ROOT/'data/cache/f1db/src/data'

def read(path): return json.loads(path.read_text(encoding='utf8'))
def write(path, obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf8')
def records(folder): return {p.stem:yaml.load(p.read_text(encoding='utf8'),Loader=yaml.CSafeLoader) for p in (SOURCE/folder).glob('*.yml')}
def image(file,author,license):
    digest=hashlib.md5(file.encode()).hexdigest()
    return {'url':f'https://upload.wikimedia.org/wikipedia/commons/thumb/{digest[0]}/{digest[:2]}/{file}/960px-{file}', 'source':'https://commons.wikimedia.org/wiki/File:'+file,'author':author,'license':license}

def build():
    archive=read(OUT/'index.json'); entities={(e['category'],e['sourceId']):e for e in archive['entities']}
    drivers=records('drivers'); chassis=records('chassis'); engines=records('engines')
    def ref(kind,ident):
        entity=entities.get((kind,ident))
        return {'id':entity['id'],'name':entity['name'],'href':entity['href']} if entity else None
    nationalities={e['id']:ref('nations',drivers[e['sourceId']]['nationalityCountryId']) for e in archive['entities'] if e['category']=='drivers'}
    photos={
        'mclaren-m23':image('1973_Mclaren_Ford_M23.jpg','Brian Snelson','CC BY 2.0'),
        'ferrari-312t':image('Ferrari_312T_(19817663389).jpg','Neil','CC BY 2.0'),
    }
    cars={}
    # The source identifies chassis at season-entry level, not necessarily at each race.
    for path in sorted((OUT/'championships').glob('*.json')):
        season=read(path); year=season['year']; totals={m:{d:{} for d in ['drivers','constructors','engines','nations']} for m in ['wins','poles','fastestLaps','podiums','laps','km']}
        qmatrix=defaultdict(lambda:defaultdict(list)); gmatrix=defaultdict(lambda:defaultdict(list)); missing_laps=0
        def add(metric,dim,entity,value):
            if entity and value:
                bucket=totals[metric][dim]
                if entity['id'] not in bucket: bucket[entity['id']]={'entity':entity,'value':0}
                bucket[entity['id']]['value']+=value
        def credits(metric,rows,value):
            seen={d:set() for d in ['drivers','constructors','engines','nations']}
            for row in rows:
                car=(row['constructor']['id'],row['number'])
                for dim,entity,identity in [('drivers',row['driver'],row['driver']['id']),('constructors',row['constructor'],car),('engines',row['engine'],car),('nations',nationalities.get(row['driver']['id']),(car,(nationalities.get(row['driver']['id']) or {}).get('id')))]:
                    if identity not in seen[dim]: add(metric,dim,entity,value(row)); seen[dim].add(identity)
        for race_info in season['races']:
            race_path=OUT/'races'/f"{race_info['id']}.json"; race=read(race_path); sessions=race['sessions']
            # In 2021 sprint winners received the official pole credit; 2022 onward uses qualifying.
            if year==2021 and race['facts']['qualifyingFormat']=='SPRINT_RACE':
                race['pole']=next((r for r in sessions['sprint'] if r['position']==1),None); race_info['pole']=race['pole']['driver'] if race['pole'] else None
            credits('wins',[r for r in sessions['race'] if r['position']==1],lambda _:1)
            credits('podiums',[r for r in sessions['race'] if isinstance(r['position'],int) and r['position']<=3],lambda _:1)
            credits('poles',[race['pole']] if race['pole'] else [],lambda _:1)
            credits('fastestLaps',race['fastest'],lambda _:1)
            running=[r for r in sessions['race'] if str(r['position']) not in ['DNS','DNQ','DNPQ','EX','DNP']]
            credits('laps',running,lambda r:r['laps'] or 0)
            credits('km',running,lambda r:(r['laps'] or 0)*(race['facts']['courseLength'] or 0))
            missing_laps+=sum(r['laps'] is None for r in running)
            for kind,matrix in [('qualifying',qmatrix),('grid',gmatrix)]:
                for row in sessions[kind]: matrix[row['driver']['id']][str(race['round'])].append({'position':row['position'],'time':row['time'],'constructor':row['constructor'],'engine':row['engine']})
            if race['id']=='1950-4':
                race['poster']={'url':'https://upload.wikimedia.org/wikipedia/commons/b/bd/CH-NB_Poster_Collection_SNL_SPOR_236.jpg','source':'https://commons.wikimedia.org/wiki/File:CH-NB_Poster_Collection_SNL_SPOR_236.jpg','author':'Ernst Ruprecht · Swiss National Library','license':'Dominio público (Wikimedia Commons)','caption':'Grand Prix Bern, 3–4 de junio de 1950'}
            race['pitStops']=[]
            folders=list((SOURCE/'seasons'/str(year)/'races').glob(f"{race['round']:02d}-*"))
            if folders:
                pitfile=folders[0]/'pit-stops.yml'
                if pitfile.exists():
                    for row in yaml.load(pitfile.read_text(encoding='utf8'),Loader=yaml.CSafeLoader) or []:
                        race['pitStops'].append({'driver':ref('drivers',row['driverId']),'stop':row.get('stop',row.get('pitStop')),'lap':row.get('lap'),'time':row.get('clockTime'),'duration':row.get('duration',row.get('time'))})
            write(race_path,race)
        season['qualifyingResults']=dict(qmatrix); season['gridResults']=dict(gmatrix)
        season['stats']={metric:{'source':'https://github.com/f1db/f1db','dimensions':{dim:sorted(rows.values(),key=lambda r:-r['value']) for dim,rows in dimensions.items()}} for metric,dimensions in totals.items()}
        leading=OUT/'leading'/f'{year}.json'
        if leading.exists(): season['stats'].update(read(leading))
        if year==1951:
            # One verified source page remained available; don't infer missing kilometres.
            sample=ROOT/'telemetry-1/data/statsf1-laps-led-sample.html'
            if sample.exists():
                tables=Tables(); tables.feed(sample.read_text(encoding='utf8'))
                mapped={}; aliases={'giuseppe-farina':'nino-farina','estados-unidos':'united-states-of-america'}
                for table,dim in [('Pilote','drivers'),('Constructeur','constructors'),('Moteur','engines'),('Nation','nations')]:
                    mapped[dim]=[]
                    for row in tables.tables.get(table,[]):
                        slug=row['href'].split('/')[-1].replace('.aspx','').removeprefix('moteur-'); entity=ref(dim,aliases.get(slug,slug))
                        mapped[dim].append({'entity':entity or {'id':slug,'name':row['cells'][1],'href':'https://www.statsf1.com'+row['href']},'value':float(row['cells'][2].replace(' ',''))})
                season['stats']['lapsLed']={'source':'https://www.statsf1.com/es/1951/stats-tour-en-tete.aspx','retrieved':'2026-10-05','dimensions':mapped}
        season['statCoverage']={'missingDriverLaps':missing_laps,'note':'Victorias y podios compartidos dan un crédito a cada piloto; el mismo auto se cuenta una vez para constructor y motor. Las naciones reflejan a los pilotos. Vueltas y kilómetros son los registrados por inscripción en F1DB: cuando no se desglosa la conducción compartida no se atribuye una distancia individual. No incluyen sprint. Las poles de sprint de 2021 siguen el criterio oficial de esa temporada.'}
        car_refs={}
        # Match exact constructor + model names; ambiguous season chassis lists stay season-level.
        for entry in season['entrants']:
            model_refs=[]
            for name in entry['chassis']:
                matches=[c for c in chassis.values() if c['constructorId']==entry['constructor']['id'] and str(c['name'])==str(name)]
                if len(matches)!=1: continue
                raw=matches[0]; cid=raw['id']; full=str(raw.get('fullName',f"{entry['constructor']['name']} {name}")); car_ref={'id':cid,'name':full,'href':f'/historia/autos/{cid}'}
                model_refs.append(car_ref); car_refs[cid]=car_ref
                if cid not in cars: cars[cid]={'id':cid,'name':full,'constructor':entry['constructor'],'seasons':[],'drivers':{},'engines':{},'entries':[],'photo':photos.get(cid),'wikipedia':'https://en.wikipedia.org/wiki/'+full.replace(' ','_'),'href':car_ref['href']}
                car=cars[cid]
                if year not in car['seasons']: car['seasons'].append(year)
                car['drivers'][entry['driver']['id']]=entry['driver']
                if entry['engine']: car['engines'][entry['engine']['id']]=entry['engine']
                car['entries'].append({'year':year,'driver':entry['driver'],'entrant':entry['entrant'],'rounds':entry['rounds'],'engine':entry['engine'],'engineModel':engines.get(entry['engineModel'],{}).get('fullName',entry['engineModel']),'tyre':entry['tyre'],'multipleModels':len(entry['chassis'])>1})
            entry['cars']=model_refs; entry['engineModelName']=engines.get(entry['engineModel'],{}).get('fullName',entry['engineModel'])
            observations=[r for cell in season['driverResults'].get(entry['driver']['id'],{}).values() for r in cell if r['constructor']['id']==entry['constructor']['id'] and (r['engine'] or {}).get('id')==(entry['engine'] or {}).get('id')]
            finishes=[r['position'] for r in observations if isinstance(r['position'],int)]; grids=[r['grid'] for r in observations if isinstance(r['grid'],int)]
            entry['bestFinish']=min(finishes) if finishes else None; entry['bestGrid']=min(grids) if grids else None
        season['cars']=list(car_refs.values())
        previous=OUT/'championships'/f'{year-1}.json'
        if previous.exists():
            prior=read(previous)
            old_drivers={r['driver']['id'] for r in prior['entrants']}; old_teams={r['constructor']['id'] for r in prior['entrants']}; old_tracks={r['circuit']['id'] for r in prior['races']}
            def unique(refs): return list({r['id']:r for r in refs}.values())
            season['changes']={'drivers':unique(e['driver'] for e in season['entrants'] if e['driver']['id'] not in old_drivers),'constructors':unique(e['constructor'] for e in season['entrants'] if e['constructor']['id'] not in old_teams),'circuits':unique(r['circuit'] for r in season['races'] if r['circuit']['id'] not in old_tracks)}
        write(path,season)
    summaries=[]
    for car in cars.values():
        car['drivers']=list(car['drivers'].values()); car['engines']=list(car['engines'].values()); car['seasons'].sort()
        car['source']='https://github.com/f1db/f1db'; car['identification']='season_entry'
        write(OUT/'cars'/f"{car['id']}.json",car)
        summaries.append({k:car[k] for k in ['id','name','constructor','seasons','engines','photo','href']})
    write(OUT/'cars.json',{'cars':sorted(summaries,key=lambda c:c['name']),'source':'https://github.com/f1db/f1db','cutoff':2025})
    print(f'Enriched 76 championships and indexed {len(cars)} named chassis with documented season entries.')
if __name__=='__main__': build()

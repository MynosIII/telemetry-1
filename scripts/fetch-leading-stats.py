"""Cache attributed factual season totals from STATS F1, without reusing its prose."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables = {}; self.table = None; self.row = None; self.cell = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'table':
            ident = attrs.get('id', '').split('_')[-1]
            self.table = ident if ident in ['Pilote','Constructeur','Moteur','Nation'] else None
            if self.table: self.tables[self.table] = []
        if self.table and tag == 'tr': self.row = {'cells': [], 'href': None}
        if self.row is not None and tag == 'td': self.cell = ''
        if self.row is not None and tag == 'a': self.row['href'] = attrs.get('href')
    def handle_data(self, data):
        if self.cell is not None: self.cell += data
    def handle_endtag(self, tag):
        if tag == 'td' and self.row is not None and self.cell is not None:
            self.row['cells'].append(self.cell.strip()); self.cell = None
        if tag == 'tr' and self.row is not None:
            if self.row['href'] and len(self.row['cells']) == 3: self.tables[self.table].append(self.row)
            self.row = None
        if tag == 'table': self.table = None

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--through',type=int,default=2025); args = parser.parse_args()
    archive = json.loads((ROOT/'public/history/index.json').read_text(encoding='utf8'))
    entities = {(e['category'], e['sourceId']):e for e in archive['entities']}
    aliases = {'giuseppe-farina':'nino-farina', 'jose-froilan-gonzalez':'jose-froilan-gonzalez', 'red-bull-racing':'red-bull', 'great-britain':'united-kingdom','usa':'united-states','uk':'united-kingdom'}
    dimensions = {'Pilote':'drivers','Constructeur':'constructors','Moteur':'engines','Nation':'nations'}
    cache = ROOT/'data/statsf1'; cache.mkdir(parents=True,exist_ok=True)
    target = ROOT/'public/history/leading'; target.mkdir(parents=True,exist_ok=True)
    failures = []
    for year in range(1950,args.through+1):
        result = {}
        for metric,page in [('lapsLed','stats-tour-en-tete'),('kmLed','stats-kms-en-tete')]:
            url = f'https://www.statsf1.com/es/{year}/{page}.aspx'
            cached = cache/f'{year}-{metric}.html'
            try:
                if not cached.exists():
                    req = Request(url,headers={'User-Agent':'Mozilla/5.0'})
                    with urlopen(req,timeout=30) as response: html = response.read().decode('utf8')
                    if 'GV_Pilote' not in html: raise ValueError('No statistics table returned')
                    cached.write_text(html,encoding='utf8'); time.sleep(0.6)
                html = cached.read_text(encoding='utf8'); parsed = Tables(); parsed.feed(html)
                data = {}
                for table,kind in dimensions.items():
                    rows = []
                    for r in parsed.tables.get(table,[]):
                        slug = r['href'].rsplit('/',1)[-1].replace('.aspx','').removeprefix('moteur-')
                        entity = entities.get((kind,aliases.get(slug,slug)))
                        value = float(r['cells'][2].replace(' ','').replace('\xa0','').replace(',','.'))
                        rows.append({'entity': {'id':entity['id'] if entity else slug,'name':entity['name'] if entity else r['cells'][1],'href':entity['href'] if entity else 'https://www.statsf1.com'+r['href']},'value':value})
                    data[kind] = rows
                if not data['drivers']: raise ValueError('Empty driver table')
                result[metric] = {'source':url,'retrieved':'2026-10-05','dimensions':data}
            except Exception as error:
                failures.append({'year':year,'metric':metric,'error':str(error)}); print(f'Missing {year} {metric}: {error}',flush=True)
        (target/f'{year}.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf8')
        if year%10==0: print(f'STATS F1 facts cached through {year}',flush=True)
    (cache/'failures.json').write_text(json.dumps(failures,indent=2),encoding='utf8')
    print(f'Finished leading statistics: {len(failures)} unavailable tables.',flush=True)
if __name__=='__main__': main()

#!/usr/bin/env python3
"""Rebuild and verify a bounded identity-only snapshot; fetch sources sequentially."""
import argparse,gzip,hashlib,json,pathlib,re,subprocess
p=argparse.ArgumentParser();p.add_argument('--metadata-root',required=True);args=p.parse_args()
root=pathlib.Path(args.metadata_root);out=pathlib.Path(__file__).resolve().parent
commit='cbddf7e54033b1b58e44af1049c88832e55b94d0'
base='https://raw.githubusercontent.com/tcgdex/cards-database/'+commit+'/'
def digest(b):return hashlib.sha256(b).hexdigest()
def fetch(path):
 b=subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2',base+path]);return b
license=fetch('LICENSE');assert digest(license)=='12e7dd2d018848b9997d0226c4632f01da86ec4bf6ebe0c8b19953d5e5eeb6ff','license changed'
lock=json.loads((root/'catalog.lock.json').read_text())
source=root/'packages/api/data/tcg/cards-extra-042.json.gz';blob=source.read_bytes();rows=json.loads(gzip.decompress(blob));rows=sorted([r for r in rows if r.get('setId')=='pokemon-set-ja-cp1'],key=lambda r:r['number'])
assert len(rows)==34
setpath='data-asia/XY/CP1.ts';settext=fetch(setpath);match=re.search(r"ja:\s*['\"]([^'\"]+)['\"]",settext.decode());assert match
setname=match[1];cards=[];sources=[{'path':setpath,'sha256':digest(settext)}]
for r in rows:
 assert re.fullmatch(r'\d{3}',r['number'])
 path='data-asia/XY/CP1/'+r['number']+'.ts';b=fetch(path);m=re.search(r'ja:\s*"([^"\n]+)"',b.decode());assert m and m[1]==r['name'],r['id']
 assert r['setName']==setname and r['language']=='ja' and r['gameId']=='pokemon'
 assert r['printingSourceId']=='tcgdex:ja:CP1-'+r['number']
 cards.append({'id':r['id'],'gameId':'pokemon','name':m[1],'number':r['number'],'setId':'pokemon-set-ja-cp1','setName':setname,'language':'ja','sources':{'tcgdex':r['sources']['tcgdex'],'licensedSource':'https://github.com/tcgdex/cards-database/blob/'+commit+'/'+path}})
 sources.append({'path':path,'sha256':digest(b),'metadataId':r['id']})
assert len({c['id'] for c in cards})==34
catalog={'cards':cards,'sets':[{'id':'pokemon-set-ja-cp1','gameId':'pokemon','name':setname,'code':'CP1','language':'ja'}]}
allowed={'id','gameId','name','number','setId','setName','language','sources'}
assert all(set(c)==allowed for c in cards)
encoded=(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode()
provenance={'version':1,'upstreamRepository':'https://github.com/tcgdex/cards-database','upstreamCommit':commit,'license':'MIT','licenseSha256':digest(license),'metadataSourcePath':'packages/api/data/tcg/cards-extra-042.json.gz','metadataSourceSha256':digest(blob),'catalogLockSha256':digest((root/'catalog.lock.json').read_bytes()),'catalogSha256':digest(encoded),'cards':34,'sets':1,'fields':sorted(allowed),'excluded':['artwork','image URLs','prices','descriptions','rules','rarity enrichment','official-site enrichment'],'sources':sources}
(out/'catalog.json').write_bytes(encoded);(out/'LICENSE-TCGdex.txt').write_bytes(license)
(out/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n')
checks=['34 unique canonical identities','one linked set','all 34 names match pinned MIT upstream','set name matches pinned MIT upstream','identity field allowlist only','no images or prices','license digest verified']
report={'ok':True,'cards':34,'sets':1,'catalogSha256':digest(encoded),'checks':checks,'command':'python3 data/metadata-demo/build-snapshot.py --metadata-root /Users/area/@metadata'}
(out/'acceptance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

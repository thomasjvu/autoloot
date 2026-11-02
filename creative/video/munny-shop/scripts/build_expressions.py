"""Attach reviewed See-through face alternatives to the stable original body."""
from pathlib import Path
import json,base64,io,subprocess,sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'assets';REPO=ROOT.parents[2]
original=REPO/'creative/character/munny-rig/complete'
name=sys.argv[1] if len(sys.argv)>1 else 'joyful'
assert name in ('joyful','surprised','thinking')
face=A/f'expressions/{name}-seethrough/color-layers'
base=json.loads((original/'layers.json').read_text())
new=json.loads((face/'layers.json').read_text())
feature_order=['face','nose','eyewhite-l','eyewhite-r','eyebrow-l','eyebrow-r','irides-l','irides-r','eyelash-l','eyelash-r','mouth']
features=set(feature_order)
new['layers'].sort(key=lambda layer:feature_order.index(layer['name']) if layer['name'] in features else -1)
def tag(path,cls=''):
 im=Image.open(path).convert('RGBA');box=im.getchannel('A').getbbox();assert box
 im=im.crop(box);data=io.BytesIO();im.save(data,format='PNG')
 return f'<image class="{cls}" x="{box[0]}" y="{box[1]}" width="{im.width}" height="{im.height}" href="data:image/png;base64,{base64.b64encode(data.getvalue()).decode()}"/>'
for state in ['closed','open']:
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="128 0 512 768"><title>Munny {name} expression - See-through face on stable original body</title>']
 inserted=False
 for layer in base['layers']:
  if layer['name'] in features:
   if not inserted:
    for alt in new['layers']:
     if alt['name'] not in features:continue
     if alt['name']=='mouth' and (state=='closed' or name=='thinking'):
      if state=='open':svg.append('<g transform="rotate(18 401 148)"><ellipse cx="401" cy="150" rx="7" ry="5" fill="#743a39" stroke="#2a211d" stroke-width="1.8"/><path d="M397 152 Q401 149 405 152" fill="#e4a09b"/></g>')
      else:svg.append('<g transform="rotate(18 401 148)"><path d="M394 147 Q401 153 408 147" fill="none" stroke="#2a211d" stroke-width="2.2" stroke-linecap="round"/></g>')
     else:svg.append(tag(face/alt['file']))
    inserted=True
   continue
  svg.append(tag(original/layer['file']))
 svg.append('</svg>');path=A/f'munny-{name}-{state}.svg';path.write_text(''.join(svg))
 subprocess.run(['rsvg-convert','-o',str(A/f'munny-{name}-{state}.png'),str(path)],check=True)
print(name+' closed/open poses exported; stable body, repaired ears and shoes preserved.')

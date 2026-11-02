from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
import json,subprocess,bisect
root=Path('/Users/area/live-shopping-companion'); v=root/'creative/video/munny-shop';a=v/'assets';r=v/'renders'
import shutil
shutil.copy('/Users/area/Library/Fonts/MapleMono-NF-CN-Regular.ttf',a/'MapleMono-Variable.ttf')
name=ImageFont.truetype(str(root/'public/fonts/AutolootDisplay-Black.ttf'),30)
body=ImageFont.truetype(str(a/'MapleMono-Variable.ttf'),36)
records=[]
for s,e,text in [(5.1,9.3,'Oh! Welcome to Autoloot!'),(9.7,15.7,"I'm Munny. Let's put on a selling show!")]:records.append((s,e,text,'intro',s))
for c in json.loads((v/'resolve/final-cues.json').read_text()):
 s,e=c['start'],c['end']
 if s<42:records.append((s+1.2,e+1.2,c['text'],'small',s+1.2))
 elif s>=97:records.append((s+3.6,e+3.6,c['text'],'full' if s>=116 else 'small',s+3.6))
# Captured dialogue, using the original event timing and words.
title='Charizard ex · 151 #199/165 · Rehearsal'
records += [(46.8,60.5,f"Next up: {title}. Opening at $45.00. Let's take a look!",'live',46.8),(64.8,69.4,'$45.00 from autoloot_tech! Current high bid.','live',64.8),(72.5,79.4,'$50.00 from ultima_exe! Current high bid.','live',72.5),(84.0,89.4,'$60.00 from autoloot_tech! Current high bid.','live',84.0),(93,99.4,'Sold to autoloot_tech for $60.00! Start checkout within 15 minutes.','close',93)]
def panel(text,kind):
 im=Image.new('RGBA',(1920,1080));d=ImageDraw.Draw(im)
 if kind in ('intro','live','close'):x,y,right,bottom=170,809,1750,1025; nx,ny=210,779;tx,ty=230,873
 else:x,y,right,bottom=(170 if kind=='full' else 330),855,(1750 if kind=='full' else 1850),1040;nx,ny=x+36,829;tx,ty=x+50,905
 d.rounded_rectangle((x,y,right,bottom),radius=35,fill='#fff4d9',outline='#302921',width=5)
 d.rounded_rectangle((nx,ny,nx+215,ny+65),radius=20,fill='#d2df4b',outline='#302921',width=4)
 d.text((nx+29,ny+15),'Munny',font=name,fill='#302921')
 lines=['']
 for word in text.split(' '):
  candidate=(lines[-1]+' '+word).strip()
  if d.textlength(candidate,font=body)>right-tx-45:lines.append(word)
  else:lines[-1]=candidate
 for i,line in enumerate(lines):d.text((tx,ty+i*45),line,font=body,fill='#302921')
 if kind=='close':
  small=im.resize((1018,572),Image.Resampling.LANCZOS);im=Image.new('RGBA',(1920,1080));im.alpha_composite(small,(451,9))
 return im
enc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an','-c:v','qtrle','-pix_fmt','argb',str(r/'dialogue-website-fonts-alpha.mov')],stdin=subprocess.PIPE)
blank=Image.new('RGBA',(1920,1080)).tobytes();cache={}
for n in range(3888):
 t=n/30;active=next((x for x in records if x[0]<=t<x[1]),None)
 if active:
  s,e,text,kind,start=active;count=min(len(text),int((t-start)*24));key=(kind,text[:count])
  if key not in cache:cache[key]=panel(text[:count],kind).tobytes()
  data=cache[key]
 else:data=blank
 enc.stdin.write(data)
 if n%900==0:print(n,flush=True);cache.clear()
enc.stdin.close();assert enc.wait()==0
panel('Oh! Welcome to Autoloot!','intro').save(a/'dialogue-font-review.png')
print('Font overlay complete',flush=True)

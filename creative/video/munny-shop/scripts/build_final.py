"""Final practice demo from actual screen evidence and the OBS bid take."""
from pathlib import Path
import subprocess,json,wave
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import build as b
from build_v2 import schedule
from build_sfx import effect
ROOT=b.ROOT;A=b.A;R=b.R;C=ROOT/'capture';FPS=30;LENGTH=126
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf',38)
SMALL=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf',24)
PAGES=[(18.5,25,'Your Studio stays ready, with an overview of your shop.','joyful'),(25.5,30,'Open Your show when it is time to host.','neutral'),(30.5,36,'Real card images help everyone see the lot.','thinking'),(36.5,41.8,'This is practice mode. No real payments today.','neutral'),(42.1,47.1,'Charizard ex, from 151! Opening at $45.','joyful'),(97.3,103,'In Settings, connect Codex with your ChatGPT account.','thinking'),(103.2,109,'Codex helps me answer questions and draft listings for your review.','joyful'),(109.2,115.7,'Copy the native browser-source link into OBS. That is it!','neutral'),(116.3,125,'Your cards. Your stream. I will keep the shop moving!','joyful')]
CHALK_PATH=ROOT.parents[2]/'public/fonts/chalk/MunnyShop-Regular.ttf'
BID_LOG=json.loads((C/'bid-sequence.json').read_text())
def chalk_board(draw,t):
 u=t-42;events=[e for e in BID_LOG if e['seconds']+.6<=u];current=events[-1] if events else BID_LOG[0]
 amount=current['amount']/100;sold=current['status']=='sold';bid=any(e['action']=='/api/demo/bid' for e in events)
 draw.rectangle((1285,150,1840,585),fill='#252d2a')
 def txt(x,y,text,size,color):draw.text((x,y),text,font=ImageFont.truetype(str(CHALK_PATH),size),fill=color)
 txt(1295,175,'CHARIZARD EX',31,'#f6e88d');txt(1295,222,'151 #199/165',26,'#f6e88d')
 bidder='CARDFAN' if amount in (50,65) else 'COZYCOLLECTOR'
 txt(1730,203,'RAW',25,'#fff5dc')
 deadline=(current['endsAt']-BID_LOG[0]['endsAt'])/1000+45
 remaining=max(0,int(deadline-u+.5));txt(1295,310,'SOLD!' if sold else f'00:{remaining:02}',100,'#f6b6c9')
 txt(1295,465,f'${amount:.0f}',84,'#c4edba')
 txt(1565,508,('WON BY ' if sold else 'BID BY ')+bidder if bid else 'OPENING BID',18,'#a9dff2')

def run(args):subprocess.run(['ffmpeg','-y','-v','error',*args],check=True)
def screenshot(src,box,out):
 im=Image.open(C/src).crop(box);im.thumbnail((1920,1080),Image.Resampling.LANCZOS);canvas=Image.new('RGB',(1920,1080),'#f5f0e7');canvas.paste(im,((1920-im.width)//2,(1080-im.height)//2));canvas.save(A/out)
def still(src,duration,out):run(['-loop','1','-framerate','30','-i',str(src),'-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-an',str(R/out)])
def main():
 screenshot('studio-persistent-hero.png',(0,160,2718,1690),'final-studio.png')
 screenshot('your-show-card-scans.png',(470,630,2670,2320),'final-show.png')
 card=Image.new('RGB',(1920,1080),'#252b28');d=ImageDraw.Draw(card);chalk=ImageFont.truetype(str(ROOT.parents[2]/'public/fonts/chalk/MunnyShop-Regular.ttf'),76);small=ImageFont.truetype(str(ROOT.parents[2]/'public/fonts/chalk/MunnyShop-Regular.ttf'),48)
 d.text((130,130),'Connect your cohost',font=chalk,fill='#f6e88d')
 for y,text,color in [(295,'1  Settings / Codex / Connect Codex','#a9dff2'),(395,'2  Sign in with ChatGPT on OpenAI','#c4edba'),(515,'Ask questions. Draft listings. Review proposals.','#f6b6c9')]:d.text((130,y),text,font=small,fill=color)
 d.text((130,660),'Autoloot validates bids and determines winners.',font=FONT,fill='#fff5dc');card.save(A/'final-codex-setup.png')
 card=Image.new('RGB',(1920,1080),'#252b28');d=ImageDraw.Draw(card)
 d.text((130,130),'Your stream. Your shop.',font=chalk,fill='#f6e88d')
 for y,text,color in [(300,'1  Settings / Stream / Chalkboard auction','#a9dff2'),(410,'2  Copy link / OBS Browser Source','#c4edba'),(520,'3  Enable Munny room audio for live cues','#f6b6c9')]:d.text((130,y),text,font=small,fill=color)
 d.text((130,690),'Native browser sources. Transparent backgrounds.',font=FONT,fill='#fff5dc');card.save(A/'final-stream-setup.png')
 still(A/'final-studio.png',12,'final-studio.mp4');still(A/'final-show.png',12,'final-show.mp4');still(A/'final-codex-setup.png',12,'final-codex-setup.mp4');still(A/'final-stream-setup.png',7,'final-stream-setup.mp4')
 bg=Image.open(A/'shop-background-v4.png').convert('RGBA');bg.alpha_composite(Image.open(A/'counter-positioned-v4.png'));bg.convert('RGB').save(A/'final-farewell.jpg');still(A/'final-farewell.jpg',10,'final-farewell.mp4')
 # Actual OBS take, with its original timing and accepted bid updates.
 run(['-ss','16.3','-i',str(C/'obs-chalk-bids-complete.mov'),'-t','55','-vf','fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration=55','-t','55','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-an',str(R/'final-bid-picture.mp4')])
 clips=['intro-picture-v4.mp4','final-studio.mp4','final-show.mp4','final-bid-picture.mp4','final-codex-setup.mp4','final-stream-setup.mp4','final-farewell.mp4'];(R/'final-concat.txt').write_text(''.join("file '"+str(R/x)+"'\n" for x in clips));run(['-f','concat','-safe','0','-i',str(R/'final-concat.txt'),'-c','copy',str(R/'final-base.mp4')])
 bid_lines=[]
 for i,event in enumerate(BID_LOG):
  if event['action']=='/api/demo/bid':
   who='cardfan' if event['amount'] in (5000,6500) else 'cozycollector'
   start=42+event['seconds']+1.3;bid_lines.append((start,min(start+3.4,96.7),f"${event['amount']/100:.0f} from {who}!",'joyful',f'bid-{i}.wav'))
  elif event['status']=='sold':bid_lines.append((42+event['seconds']+1.8,97.25,'Sold to cardfan!','joyful','sold.wav'))
 records=[dict(schedule(text),start=start,end=end,expression=expr) for start,end,text,expr in PAGES]
 records += [dict(schedule(text),start=start,end=end,expression=expr,vn=wav) for start,end,text,expr,wav in bid_lines]
 (A/'vn-bid-cues.json').write_text(json.dumps([{'file':wav,'text':text} for _,_,text,_,wav in bid_lines]))
 subprocess.run(['node',str(ROOT/'scripts/build_vn_bids.mjs')],check=True)
 poses={}
 for expr in ['neutral','joyful','thinking']:
  for state in ['closed','open']:
   file=A/(f'munny-mouth-{state}-v4.png' if expr=='neutral' else f'munny-{expr}-{state}.png');im=Image.open(file).convert('RGBA');poses[expr,state]=im
 encoder=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an','-c:v','qtrle','-pix_fmt','argb',str(R/'final-narrator-alpha.mov')],stdin=subprocess.PIPE)
 clean_corner=Image.open(A/'shop-background-v3.png').convert('RGBA').crop((0,0,550,80))
 counter=Image.open(A/'counter-positioned-v4.png').convert('RGBA')
 cache={};sr=48000;audio=np.zeros((LENGTH*sr,2),dtype=np.float32)
 with wave.open(str(A/'intro-sound-v4.wav'),'rb') as f:raw=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2)/32767;audio[:len(raw)]=raw
 # Original OBS babble during the captured auction.
 raw=subprocess.check_output(['ffmpeg','-v','error','-ss','16.3','-i',str(C/'obs-chalk-bids-complete.mov'),'-t','55','-f','f32le','-ar','48000','-ac','2','-vn','-']);raw=np.frombuffer(raw,dtype='<f4').reshape(-1,2);audio[42*sr:42*sr+min(len(raw),55*sr)]+=raw[:55*sr]
 audio[42*sr:97*sr]=0
 for event in BID_LOG:
  kind='bid' if event['action']=='/api/demo/bid' else 'sold' if event['status']=='sold' else None
  if kind:
   cue=effect(kind);at=int((42+event['seconds']+.6)*sr);audio[at:at+len(cue)]+=cue*.65
 for line in records:
  if line.get('vn'):
   raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(A/'sfx'/line['vn']),'-f','f32le','-ar','48000','-ac','2','-vn','-']);cue=np.frombuffer(raw,dtype='<f4').reshape(-1,2);at=int(line['start']*sr);audio[at:at+len(cue)]+=cue
   continue
  for burst in line['bursts']:
   n=int(burst['duration']*sr);tt=np.arange(n)/sr;sig=np.sin(2*np.pi*burst['pitch']*tt)*np.sin(np.pi*tt/burst['duration'])**2*.10;at=int((line['start']+burst['time'])*sr);audio[at:at+n]+=sig[:,None]
 try:
  for frame in range(LENGTH*FPS):
   t=frame/FPS;im=b.blank();draw=ImageDraw.Draw(im)
   if 42<=t<97:
    im.alpha_composite(clean_corner,(0,0));im.alpha_composite(counter);chalk_board(draw,t)
   for line in records:
    if line['start']<=t<line['end']:
     u=t-line['start'];count=sum(v<=u for v in line['reveal']);mouth=any(x['time']<=u<x['time']+x['duration'] for x in line['bursts']);expr=line['expression'];state='open' if mouth else 'closed'
     full=t>=116 or 42<=t<97
     key=(expr,state,full)
     if key not in cache:
      pose=poses[expr,state];layer=b.blank()
      if full:layer.alpha_composite(pose.resize((1100,1650)),(-120,40));layer.alpha_composite(counter)
      else:layer.alpha_composite(pose.crop((45,0,455,430)).resize((355,372)),(8,708))
      cache[key]=layer
     im.alpha_composite(cache[key]);d=ImageDraw.Draw(im);d.rounded_rectangle((170 if full else 330,855,1750 if full else 1850,1035),radius=30,fill='#fff4d9',outline='#302921',width=4);d.rounded_rectangle((206 if full else 366,829,400 if full else 560,883),radius=16,fill='#d2df4b',outline='#302921',width=3);d.text((230 if full else 390,843),'Munny',font=SMALL,fill='#302921');text=line['text'][:count];words=text.split();lines=['']
     for word in words:
      candidate=(lines[-1]+' '+word).strip()
      if d.textlength(candidate,font=FONT)>1390:lines.append(word)
      else:lines[-1]=candidate
     for i,text in enumerate(lines):d.text((220 if full else 380,910+i*46),text,font=FONT,fill='#302921')
   encoder.stdin.write(im.tobytes())
   if frame%900==0:print(f'Narrator {t:.0f}/{LENGTH}',flush=True)
  encoder.stdin.close();assert encoder.wait()==0
 except BaseException:encoder.kill();raise
 with wave.open(str(A/'final-audio.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
 run(['-i',str(R/'final-base.mp4'),'-i',str(R/'final-narrator-alpha.mov'),'-i',str(A/'final-audio.wav'),'-filter_complex','[0:v][1:v]overlay=0:0,fade=t=out:st=125.3:d=0.7[v]','-map','[v]','-map','2:a','-t','126','-c:v','libx264','-preset','veryfast','-crf','18','-c:a','aac','-b:a','192k','-movflags','+faststart',str(R/'Autoloot-Munny-Practice-Demo-Final.mp4')])
 (ROOT/'resolve/final-cues.json').write_text(json.dumps(records,indent=2));print('Final practice demo rendered: 2:06',flush=True)
if __name__=='__main__':main()

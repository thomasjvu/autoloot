"""Render a clearly labeled 2:45 rehearsal cut and editable Resolve overlays.

Actual OBS/Twitch recordings are deliberately represented by recording slates.
"""
from pathlib import Path
import json, subprocess, wave, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import build as base
from build_v2 import schedule

A,R,ROOT=base.A,base.R,base.ROOT
W,H,FPS,LENGTH=1920,1080,30,165
FONT='/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'
TITLE=ImageFont.truetype(FONT,66);BODY=ImageFont.truetype(FONT,34)
TEXT=ImageFont.truetype(FONT,38);SMALL=ImageFont.truetype(FONT,25)
CHAPTERS=[
 (18,38,'01 / Prepare a lot','Photo → draft → creator review','Record the real photo upload, draft result and approval.'),
 (38,55,'02 / Let chat choose','Twitch vote → result → creator launch','Record actual chat commands, vote updates and creator approval.'),
 (55,95,'03 / Run the auction','Two bidders → late bid → winner','Record registered Twitch bidders and one real timer extension.'),
 (95,125,'04 / Winner checkout','Private order → sandbox checkout → verified payment','Record the same order before checkout and after the signed Stripe event.'),
 (125,138,'05 / Fulfillment handoff','Paid order → creator fulfillment controls','Record the paid order and handoff. Do not stage carrier dispatch.'),
 (138,158,'06 / Built with Codex','Actual chat → relevant diff → truthful checks','Record the genuine development session and final verification results.')]
PAGES=[
 (18.8,24.8,'First, a photo and the seller’s terms.'),
 (25.3,36.8,'AI helps draft the listing. You review it before it goes live.'),
 (38.8,45.8,'What should we sell next? Let’s ask chat!'),
 (46.3,54.4,'The votes are in. The creator gives the go-ahead.'),
 (56,64.5,'Bid right in Twitch chat!'),
 (76,84.5,'A late bid! There’s still time to respond.'),
 (89.3,94.7,'We have a winner!'),
 (96,104.8,'Your winning order is waiting in your storefront account.'),
 (106,114.8,'This is sandbox checkout—no real charge.'),
 (117,124.5,'Stripe confirmed the test payment. All set!'),
 (126,137.5,'Now the creator can prepare the order and keep hosting.'),
 (139,146.5,'Codex helped build and review my shop.'),
 (147,157,'From auction timing to payment retries and buyer privacy.'),
 (158.5,165,'Thanks for stopping by. See you at the next show!')]

def panel(text,count):
    im=base.blank();d=ImageDraw.Draw(im)
    d.rounded_rectangle((330,868,1840,1043),radius=32,fill='#302921')
    d.rounded_rectangle((330,860,1840,1035),radius=32,fill='#fff4d9',outline='#3a3028',width=4)
    d.rounded_rectangle((365,833,545,887),radius=17,fill='#d2df4b',outline='#3a3028',width=3)
    d.text((389,845),'Munny',font=SMALL,fill='#302921')
    words=text[:count].split(' ');lines=['']
    for word in words:
        candidate=(lines[-1]+' '+word).lstrip()
        if d.textlength(candidate,font=TEXT)>1390:lines.append(word)
        else:lines[-1]=candidate
    for i,line in enumerate(lines):d.text((380,910+i*49),line,font=TEXT,fill='#302921')
    if count>=len(text):d.polygon([(1765,997),(1785,997),(1775,1009)],fill='#878348')
    return im

def slate(chapter):
    start,end,title,flow,instruction=chapter
    im=Image.new('RGBA',(W,H),'#292724');d=ImageDraw.Draw(im)
    d.rounded_rectangle((82,70,650,122),radius=14,fill='#d2df4b')
    d.text((105,83),'REHEARSAL / RECORDING REQUIRED',font=SMALL,fill='#292724')
    d.text((95,225),title,font=TITLE,fill='#fff4d9')
    d.text((99,332),flow.replace('→',' / '),font=BODY,fill='#d2df4b')
    d.rounded_rectangle((98,430,1818,715),radius=28,outline='#706b61',width=3)
    d.text((135,470),'Replace this slot with real OBS / Twitch footage.',font=BODY,fill='#fff4d9')
    words=instruction.split();line='';lines=[]
    for word in words:
        candidate=(line+' '+word).lstrip()
        if d.textlength(candidate,font=BODY)>1610:lines.append(line);line=word
        else:line=candidate
    lines.append(line)
    for i,line in enumerate(lines):d.text((135,550+i*48),line,font=BODY,fill='#c3bba9')
    if start==95:
        d.rounded_rectangle((1240,70,1818,122),radius=14,fill='#fff4d9')
        d.text((1262,83),'STRIPE SANDBOX / NO REAL CHARGE',font=SMALL,fill='#292724')
    return im

def encode(name,alpha=False):
    args=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an']
    args+=['-c:v','qtrle','-pix_fmt','argb','-g','300'] if alpha else ['-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-threads','2']
    return subprocess.Popen(args+[str(R/name)],stdin=subprocess.PIPE)

def main():
    records=[dict(schedule(text),start=start,end=end) for start,end,text in PAGES]
    (ROOT/'walkthrough-timing-v4.json').write_text(json.dumps({'length':165,'fps':30,'chapters':CHAPTERS,'pages':records,'footage':'not recorded'},indent=2))
    poses=[];large=[]
    for state in ['closed','open']:
        src=Image.open(A/f'munny-mouth-{state}-v4.png').convert('RGBA')
        im=base.blank();im.alpha_composite(src.crop((45,0,455,430)).resize((355,372),Image.Resampling.LANCZOS),(10,708));poses.append(im)
        large.append(Image.open(A/f'munny-{state}-positioned-v4.png').convert('RGBA'))
    bg=Image.open(A/'shop-background-v4.png').convert('RGBA');counter=Image.open(A/'counter-positioned-v4.png').convert('RGBA')
    # In the farewell, the chalk welcome remains part of the actual shop background.
    outro=Image.alpha_composite(bg,counter)
    slates=[slate(c) for c in CHAPTERS]
    preview=encode('walkthrough-picture-v4.mp4');basevid=encode('walkthrough-base-v4.mp4')
    charvid=encode('walkthrough-munny-alpha-v4.mov',True);dialogvid=encode('walkthrough-dialogue-alpha-v4.mov',True)
    intro=subprocess.Popen(['ffmpeg','-v','error','-i',str(R/'intro-picture-v4.mp4'),'-f','rawvideo','-pix_fmt','rgba','-'],stdout=subprocess.PIPE)
    blank=base.blank();blank_bytes=blank.tobytes();cache={}
    reviews=[6,17,21,30,41,50,60,79,91,100,109,120,130,142,150,161]
    try:
        for frame in range(LENGTH*FPS):
            t=frame/FPS;character=blank;dialogue=blank
            if t<18:
                data=intro.stdout.read(W*H*4);assert len(data)==W*H*4
                picture=Image.frombytes('RGBA',(W,H),data)
                if t>=15.7:
                    p=min(1,(t-15.7)/2.3);e=p*p*(3-2*p)
                    box=(round(930*e),round(104*e),round(W+(1880-W)*e),round(H+(638-H)*e))
                    picture=picture.crop(box).resize((W,H),Image.Resampling.BICUBIC)
                ground=picture
            else:
                if t>=158:ground=outro.copy()
                else:
                    idx=next(i for i,c in enumerate(CHAPTERS) if c[0]<=t<c[1]);ground=slates[idx]
                    c=CHAPTERS[idx]
                    if idx>0 and t<c[0]+.25:ground=Image.blend(slates[idx-1],slates[idx],(t-c[0])/.25)
                mouth=False
                for line in records:
                    if line['start']<=t<line['end']:
                        u=t-line['start'];count=sum(v<=u for v in line['reveal'])
                        key=(line['text'],count,t>=158)
                        if key not in cache:cache[key]=base.panel(line['text'],count) if t>=158 else panel(line['text'],count)
                        dialogue=cache[key]
                        mouth=any(b['time']<=u<b['time']+b['duration'] for b in line['bursts'])
                character=large[int(mouth)] if t>=158 else poses[int(mouth)]
                picture=ground.copy();picture.alpha_composite(character);picture.alpha_composite(dialogue)
                if t>=164.4:
                    fade=min(1,(165-t)/.6);picture=Image.blend(Image.new('RGBA',(W,H),'black'),picture,fade)
            for process,im in [(preview,picture),(basevid,ground),(charvid,character),(dialogvid,dialogue)]:process.stdin.write(blank_bytes if im is blank else im.tobytes())
            if frame in [s*30 for s in reviews]:picture.convert('RGB').save(R/f'walkthrough-review-{int(t):03d}.jpg',quality=90)
            if frame%900==0:print(f'Rendered {int(t)}/{LENGTH} seconds',flush=True)
            # Bound memory use while retaining the final states most frames reuse.
            if len(cache)>100:cache.clear()
        for process in [preview,basevid,charvid,dialogvid]:process.stdin.close();assert process.wait()==0
        intro.stdout.close();assert intro.wait()==0
    except BaseException:
        for process in [preview,basevid,charvid,dialogvid,intro]:process.kill()
        raise
    sr=48000;audio=np.zeros((LENGTH*sr,2),dtype=np.float32)
    with wave.open(str(A/'intro-sound-v4.wav'),'rb') as f:raw=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2)/32767
    audio[:len(raw)]=raw
    for line in records:
        for b in line['bursts']:
            n=int(b['duration']*sr);t=np.arange(n)/sr;phase=2*np.pi*np.cumsum(b['pitch']*(1+.08*np.sin(2*np.pi*11*t)))/sr
            sig=(np.sin(phase)+.35*np.sin(2*phase)+.14*np.sin(3*phase))*np.sin(np.pi*t/b['duration'])**2*.075
            at=int((line['start']+b['time'])*sr);audio[at:at+n]+=sig[:,None]
    with wave.open(str(A/'walkthrough-babble-v4.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(R/'walkthrough-picture-v4.mp4'),'-i',str(A/'walkthrough-babble-v4.wav'),'-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart',str(R/'autoloot-full-rehearsal-v4.mp4')],check=True)
    sheet=Image.new('RGB',(1920,1080),'#292724')
    for i,sec in enumerate(reviews):
        im=Image.open(R/f'walkthrough-review-{sec:03d}.jpg').resize((480,270));sheet.paste(im,((i%4)*480,(i//4)*270))
    sheet.save(R/'walkthrough-contact-sheet-v4.jpg',quality=92)
    label=base.blank();d=ImageDraw.Draw(label)
    d.rounded_rectangle((1220,60,1850,132),radius=14,fill='#fff4d9',outline='#3a3028',width=3)
    d.text((1250,84),'STRIPE SANDBOX / NO REAL CHARGE',font=SMALL,fill='#292724')
    label.save(A/'sandbox-label-v4.png')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','30','-i',str(A/'sandbox-label-v4.png'),'-t','30','-c:v','qtrle','-pix_fmt','argb','-g','900',str(R/'sandbox-label-v4.mov')],check=True)
    (ROOT/'resolve/dialogue-cues-v4.lua').write_text('return {\n'+',\n'.join('{'+str(x['start'])+','+str(x['end'])+','+json.dumps(x['text'],ensure_ascii=False)+'}' for x in records)+'\n}\n')
    print('Full 2:45 rehearsal edit and separate Resolve layers complete.',flush=True)

if __name__=='__main__':main()

"""Close shop shot with syllable-timed mouth poses for Resolve and OBS."""
from pathlib import Path
import sys, re, json, math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw
import build as base

ROOT=base.ROOT; A=base.A; R=base.R; W=1920; H=1080; FPS=30; DURATION=18
LINES=base.LINES
VERSION=sys.argv[1] if len(sys.argv)>1 else "v2"
assert VERSION in ("v2","v3","v4"), "Expected v2, v3 or v4"
CHARACTER_X=-120 if VERSION=="v4" else 20 if VERSION=="v3" else 100

def schedule(text):
    reveal=[]; bursts=[]; elapsed=0.; last=-1.
    for i,c in enumerate(text):
        reveal.append(elapsed)
        if c.isalnum() and elapsed-last>=.095:
            bursts.append({'time':round(elapsed,5),'duration':.065,'pitch':[470,590,520,680,550,620,495][i%7]})
            last=elapsed
        elapsed+=1/28
        if c in '.!?,': elapsed+=.15
        elif c==' ': elapsed+=.025
    return {'text':text,'reveal':reveal,'bursts':bursts,'duration':elapsed}

def encoder(name,alpha=False):
    args=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an']
    args+=['-c:v','qtrle','-pix_fmt','argb','-g','540'] if alpha else ['-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p']
    return subprocess.Popen(args+[str(R/name)],stdin=subprocess.PIPE)

def main():
    # The existing editable SVG rig supplies both poses; no generated face replacement.
    svg=(A/'munny-idle.svg').read_text()
    poses=[]
    for state in ['closed','open']:
        css=f'.mouth-open{{opacity:{1 if state=="open" else 0}}}.mouth-closed{{opacity:{0 if state=="open" else 1}}}'
        src=re.sub(r'<style>.*?</style>','<style>'+css+'</style>',svg,flags=re.S)
        path=A/f'munny-mouth-{state}-{VERSION}.svg'; path.write_text(src)
        subprocess.run(['rsvg-convert','-o',str(A/f'munny-mouth-{state}-{VERSION}.png'),str(path)],check=True)
        sprite=Image.open(A/f'munny-mouth-{state}-{VERSION}.png').convert('RGBA').resize((1100,1650),Image.Resampling.LANCZOS)
        layer=base.blank();layer.alpha_composite(sprite,(CHARACTER_X,40));poses.append(layer)
        layer.save(A/f'munny-{state}-positioned-{VERSION}.png')
    bg=base.fitted(A/f'shop-interior-{VERSION}.png',(W,H));bg.save(A/f'shop-background-{VERSION}.png')
    counter=base.blank();counter.alpha_composite(base.fitted(A/f'shop-counter-{VERSION}.png',(1920,580)),(0,535));counter.save(A/f'counter-positioned-{VERSION}.png')
    scene=Image.alpha_composite(Image.alpha_composite(bg,poses[0]),counter);scene.save(A/f'shop-live-{VERSION}.png')
    schedules=[dict(schedule(text),start=start,end=end) for start,end,text in LINES]
    (A/f'dialogue-timing-{VERSION}.json').write_text(json.dumps(schedules,indent=2))
    # Syllable audio shares the same event timestamps as the mouth poses.
    sr=48000;audio=np.zeros((DURATION*sr,2))
    with wave.open(str(A/'intro-sound-v1.wav'),'rb') as f:
        old=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2)/32767
    audio[:int(4.5*sr)]=old[:int(4.5*sr)]
    for line in schedules:
        for b in line['bursts']:
            n=int(b['duration']*sr);t=np.arange(n)/sr
            phase=2*np.pi*np.cumsum(b['pitch']*(1+.08*np.sin(2*np.pi*11*t)))/sr
            sig=(np.sin(phase)+.35*np.sin(2*phase)+.14*np.sin(3*phase))*np.sin(np.pi*t/b['duration'])**2*.075
            at=int((line['start']+b['time'])*sr);audio[at:at+n]+=sig[:,None]
    with wave.open(str(A/f'intro-sound-{VERSION}.wav'),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
    preview=encoder(f'intro-picture-{VERSION}.mp4');char=encoder(f'munny-lipsync-{VERSION}.mov',True);dialog=encoder(f'dialogue-alpha-{VERSION}.mov',True)
    try:
        for frame in range(DURATION*FPS):
            t=frame/FPS;text=base.blank();mouth=False
            for line in schedules:
                u=t-line['start']
                if line['start']<=t<line['end']:
                    count=sum(v<=u for v in line['reveal']);text=base.panel(line['text'],count)
                    mouth=any(b['time']<=u<b['time']+b['duration'] for b in line['bursts'])
            character=poses[int(mouth)]
            scene=bg.copy();scene.alpha_composite(character);scene.alpha_composite(counter);scene.alpha_composite(text)
            door=base.blank();d=ImageDraw.Draw(door)
            if t<.8:d.rectangle((0,0,W,H),fill='black')
            elif t<3.8:
                p=(t-.8)/3;e=p*p*(3-2*p);left=int(920*(1-e));right=int(1000+920*e)
                d.rectangle((0,0,left,H),fill='#171412');d.polygon([(right,0),(W,0),(W,H),(right+int(160*(1-e)),H)],fill='#211a15');d.line([(left,0),(left,H)],fill='#b38b50',width=3)
            scene.alpha_composite(door)
            for process,layer in [(preview,scene),(char,character),(dialog,text)]:process.stdin.write(layer.tobytes())
            if frame in [90,156,159,180,360,510]:scene.convert('RGB').save(R/f'{VERSION}-review-{frame:03d}.jpg',quality=93)
        for p in [preview,char,dialog]:
            p.stdin.close();assert p.wait()==0
    except BaseException:
        for p in [preview,char,dialog]:p.kill()
        raise
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(R/f'intro-picture-{VERSION}.mp4'),'-i',str(A/f'intro-sound-{VERSION}.wav'),'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(R/f'munny-shop-intro-{VERSION}.mp4')],check=True)
    for name in [f'shop-background-{VERSION}',f'counter-positioned-{VERSION}']:
        codec=['-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p'] if name.startswith('shop-') else ['-c:v','qtrle','-pix_fmt','argb','-g','540']
        subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','30','-i',str(A/f'{name}.png'),'-t','18',*codec,str(R/f'{name}.mov')],check=True)
    sheet=Image.new('RGB',(1920,720),'#211e1b')
    for i,n in enumerate([90,156,159,180,360,510]):sheet.paste(Image.open(R/f'{VERSION}-review-{n:03d}.jpg').resize((640,360)),((i%3)*640,(i//3)*360))
    sheet.save(R/f'{VERSION}-contact-sheet.jpg',quality=92)
    print(f'Built {VERSION} close shop, timed mouth animation, synchronized audio, and editable layers.')

if __name__=='__main__':main()

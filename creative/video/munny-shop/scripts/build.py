"""Build the Resolve/OBS shop pack and a deterministic 18-second intro preview.

Generated illustration masters remain untouched. Pillow draws/composites video
layers; ffmpeg encodes the resulting footage. Run from any directory.
"""
from pathlib import Path
import json, math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
A, R = ROOT / 'assets', ROOT / 'renders'
W, H, FPS, SECONDS = 1920, 1080, 30, 18
FONT = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'
font = ImageFont.truetype(FONT, 46)
small = ImageFont.truetype(FONT, 30)
LINES = [(5.1, 9.3, 'Oh! Welcome to Autoloot!'),
         (9.7, 15.7, "I'm Munny. Let's put on a selling show!")]

def blank(): return Image.new('RGBA', (W,H))
def save(im, name): im.save(A/name)
def fitted(path, size): return Image.open(path).convert('RGBA').resize(size, Image.Resampling.LANCZOS)
def panel(text='', count=1000):
    im=blank(); d=ImageDraw.Draw(im)
    d.rounded_rectangle((166,817,1754,1022),radius=44,fill='#2c2622')
    d.rounded_rectangle((170,809,1750,1014),radius=44,fill='#fff4d9',outline='#3a3028',width=5)
    d.rounded_rectangle((210,779,422,846),radius=22,fill='#d2df4b',outline='#3a3028',width=4)
    d.text((241,794),'Munny',font=small,fill='#302921')
    d.text((230,877),text[:count],font=font,fill='#302921')
    if count >= len(text) and text:
        d.polygon([(1668,964),(1692,964),(1680,978)],fill='#878348')
    return im

def synth_audio():
    sr=48000; audio=np.zeros((SECONDS*sr,2),dtype=np.float64)
    def tone(start,duration,hz,amp=.10,pan=0,kind='voice'):
        n=int(duration*sr); t=np.arange(n)/sr
        env=np.sin(np.pi*np.minimum(t/duration,1))**2
        if kind=='bell':
            sig=(np.sin(2*np.pi*hz*t)+.35*np.sin(2*np.pi*hz*2.76*t))*np.exp(-t*6)
        else:
            f=hz*(1+.08*np.sin(2*np.pi*11*t))
            phase=2*np.pi*np.cumsum(f)/sr
            sig=(np.sin(phase)+.35*np.sin(2*phase)+.14*np.sin(3*phase))*env
        i=int(start*sr); n=min(n,len(audio)-i)
        audio[i:i+n,0]+=sig[:n]*amp*(1-pan*.3)
        audio[i:i+n,1]+=sig[:n]*amp*(1+pan*.3)
    # Original synthesized latch, door creak and entrance bell, no sampled game audio.
    tone(.42,.075,130,.12,-.3); tone(.55,.12,85,.08,-.3)
    tone(.9,.6,72,.018,-.4); tone(2.7,1.2,1340,.13,.3,'bell')
    pitches=[470,590,520,680,550,620,495]
    for start,end,line in LINES:
        for i,c in enumerate(line):
            if c.isalnum(): tone(start+i/28,.054,pitches[i%len(pitches)],.055,0)
    peak=np.max(np.abs(audio)); audio*=min(1,.75/max(peak,.0001))
    with wave.open(str(A/'intro-sound-v1.wav'),'wb') as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(sr)
        wav.writeframes((audio*32767).astype('<i2').tobytes())

def main():
    R.mkdir(exist_ok=True)
    bg=fitted(A/'shop-interior-v1.png',(W,H))
    # Preserve the supplied source pixels and export full-canvas compositing plates.
    char=Image.open(A/'munny-reference.png').convert('RGBA')
    char=char.crop(char.getbbox()); char=char.resize((int(char.width*990/char.height),990),Image.Resampling.LANCZOS)
    character=blank(); character.alpha_composite(char,(420,102))
    counter=blank(); counter.alpha_composite(fitted(A/'shop-counter-v1.png',(1920,580)),(0,535))
    save(bg,'shop-background-1080.png'); save(character,'munny-positioned-1080.png')
    save(counter,'counter-positioned-1080.png'); save(panel(),'dialogue-empty-1080.png')
    for i,(_,_,line) in enumerate(LINES): save(panel(line),'dialogue-page-%02d.png'%(i+1))
    shop=Image.alpha_composite(Image.alpha_composite(bg,character),counter)
    save(shop,'shop-live-1080.png')
    synth_audio()
    # Four individually editable video layers in Resolve, plus stereo audio.
    def encoder(name,alpha=False):
        args=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an']
        if alpha: args+=['-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-threads','2']
        else: args+=['-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-threads','2']
        return subprocess.Popen(args+[str(R/name)],stdin=subprocess.PIPE)
    preview=encoder('intro-picture-v1.mp4')
    dialogue=encoder('dialogue-alpha-v1.mov',True)
    entrance=encoder('door-alpha-v1.mov',True)
    try:
        for frame in range(SECONDS*FPS):
            t=frame/FPS; text_layer=blank()
            for start,end,line in LINES:
                if start<=t<end: text_layer=panel(line,max(0,int((t-start)*28)))
            door=blank(); d=ImageDraw.Draw(door)
            if t<.8: d.rectangle((0,0,W,H),fill=(0,0,0,255))
            elif t<3.8:
                p=(t-.8)/3; ease=p*p*(3-2*p)
                left=int(920*(1-ease)); right=int(1000+920*ease)
                # A hinged near door and far jamb move aside to reveal the room.
                d.rectangle((0,0,left,H),fill='#171412')
                d.polygon([(right,0),(W,0),(W,H),(right+int(160*(1-ease)),H)],fill='#211a15')
                d.line([(left,0),(left,H)],fill='#b38b50',width=3)
            # Small character hop while revealing a page; the livestream uses the SVG mouth rig.
            hop=0
            for start,end,line in LINES:
                if start<=t<start+len(line)/28: hop=round(-3*max(0,math.sin((t-start)*15)))
            scene=bg.copy(); scene.alpha_composite(character,(0,hop)); scene.alpha_composite(counter)
            scene.alpha_composite(text_layer); scene.alpha_composite(door)
            preview.stdin.write(scene.tobytes()); dialogue.stdin.write(text_layer.tobytes()); entrance.stdin.write(door.tobytes())
            if frame in [0,90,180,360,510]: scene.convert('RGB').save(R/f'review-{frame:03d}.jpg',quality=90)
        for p in [preview,dialogue,entrance]:
            p.stdin.close()
            if p.wait(): raise RuntimeError('ffmpeg encode failed')
    except BaseException:
        for p in [preview,dialogue,entrance]: p.kill()
        raise
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(R/'intro-picture-v1.mp4'),'-i',str(A/'intro-sound-v1.wav'),'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(R/'munny-shop-intro-v1.mp4')],check=True)
    thumbs=[]
    for n in [0,90,180,360,510]:
        im=Image.open(R/f'review-{n:03d}.jpg'); im.thumbnail((640,360)); thumbs.append(im)
    sheet=Image.new('RGB',(1920,760),'#211e1b'); d=ImageDraw.Draw(sheet)
    for i,im in enumerate(thumbs):
        x=(i%3)*640; y=(i//3)*380; sheet.paste(im,(x,y)); d.text((x+12,y+340),f'{i+1} / { [0,3,6,12,17][i] } seconds',font=small,fill='white')
    sheet.save(R/'intro-contact-sheet.jpg',quality=90)
    for name in ['shop-background-1080','munny-positioned-1080','counter-positioned-1080']:
        codec=['-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p'] if name.startswith('shop-') else ['-c:v','qtrle','-pix_fmt','argb','-g','540']
        subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','30','-i',str(A/f'{name}.png'),'-t','18',*codec,str(R/f'{name}.mov')],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','30','-i',str(A/'recording-slot.png'),'-t','147','-c:v','libx264','-preset','ultrafast','-crf','25','-pix_fmt','yuv420p',str(R/'recording-slots-v1.mp4')],check=True)
    print('Built 18s intro, alpha MOV layers, sound, PNG stream plates and contact sheet.',flush=True)

if __name__=='__main__': main()

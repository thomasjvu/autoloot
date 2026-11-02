from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,wave
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop');a=v/'assets';sr=48000
mix=np.zeros((int(129.6*sr),2));rng=np.random.default_rng(42)
def tone(at,dur,midi,amp):
 n=int(dur*sr);t=np.arange(n)/sr;hz=440*2**((midi-69)/12);env=(1-np.exp(-t*150))*np.exp(-t*4.8);s=(np.sin(2*np.pi*hz*t)+.18*np.sin(2*np.pi*hz*3*t))*env*amp;i=int(at*sr);n=min(n,len(mix)-i)
 if n>0:mix[i:i+n]+=s[:n,None]*np.array([[.96,1.]])
# Original, restrained marimba/electric-piano pattern; no theme samples or copied melody.
notes=[72,76,79,74,81,79,76,74,74,77,81,76,83,81,77,74,77,81,84,79,86,84,81,79,79,83,86,81,88,86,83,79]
step=60/88/2
for i,at in enumerate(np.arange(44.4,99.4,step)):
 tone(at,.85,notes[i%len(notes)],.026)
 if i%4==0:tone(at,1.3,[48,50,53,55][(i//8)%4],.018)
for at in [18,43.2,99.4]:
 n=int(.42*sr);t=np.arange(n)/sr;noise=rng.normal(0,1,n);noise=np.convolve(noise,np.ones(18)/18,mode='same');sig=noise*np.sin(np.pi*t/.42)**2*.09;i=int(at*sr);mix[i:i+n]+=sig[:,None];tone(at+.18,.5,84,.035);tone(at+.26,.45,91,.022)
# Gentle fades and extra space for the native bid chimes and babble.
t=np.arange(len(mix))/sr;gain=np.ones(len(t))
for start,end in [(46.8,60.5),(64.5,69.4),(72,79.4),(83.5,89.4),(92.5,99.4)]:gain[(t>=start)&(t<end)]=.50
mix*=gain[:,None];mix[(t>=44.4)&(t<45.4)]*=((t[(t>=44.4)&(t<45.4)]-44.4))[:,None]
with wave.open(str(a/'bidding-music-and-chalk-cues.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
im=Image.open(v/'capture/twitch-real/twitch-chat-history.png')
for name,y0,y1 in [('45',1045,1100),('50',1100,1160),('60',1290,1350),('winner',1350,1420)]:
 crop=im.crop((20,y0,2300 if name=='winner' else 850,y1));crop.save(a/f'twitch-message-{name}-raw.png')
 canvas=Image.new('RGBA',(1920,1080));d=ImageDraw.Draw(canvas);x,y=(35,630) if name=='winner' else (35,70);w=1835 if name=='winner' else 900
 d.rounded_rectangle((x,y,x+w,y+155),radius=18,fill='#18171d',outline='#9146ff',width=3)
 d.text((x+22,y+16),'TWITCH / autoloot_tech',font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',22),fill='#c6a4ff')
 crop.thumbnail((w-44,78),Image.Resampling.LANCZOS);canvas.alpha_composite(crop.convert('RGBA'),(x+22,y+63));canvas.save(a/f'twitch-message-{name}.png')
print('Music, transition cues and authentic per-message crops ready')

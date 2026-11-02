from pathlib import Path
import numpy as np,subprocess,wave
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop');a=v/'assets';sr=48000;length=159.6;n=int(length*sr)
def read(p,start,dur):
 raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(p),'-t',str(dur),'-vn','-ar',str(sr),'-ac','2','-f','f32le','-']);return np.frombuffer(raw,dtype='<f4').reshape(-1,2)
def write(name,data):
 with wave.open(str(a/name),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
voice=np.zeros((n,2),np.float32);base=v/'renders/Autoloot-Munny-Practice-Demo-Final.mp4';real=v/'capture/twitch-real/competitive-twitch-original.mov';proof=v/'renders/codex-proof-with-munny.mp4'
for p,start,dur,pos in [(base,0,18,0),(base,18,24,19.2),(real,295,25,44.4),(real,335,10,69.4),(real,400,10,79.4),(real,475,10,89.4),(base,97,19,100.6),(proof,0,30,119.6),(base,116,10,149.6)]:
 raw=read(p,start,dur);i=round(pos*sr);voice[i:i+len(raw)]+=raw
stems={key:np.zeros_like(voice) for key in ['door','bids','finalize']}
stems['door'][:int(4.5*sr)]=voice[:int(4.5*sr)];voice[:int(4.5*sr)]=0
# Align original recorded chimes by correlation with their source templates.
for sourceAt,destAt,kind,file,duration in [(314.6,64,'bids','bid-kaching.wav',.64),(337.97,72.37,'bids','bid-kaching.wav',.64),(404.66,84.06,'bids','bid-kaching.wav',.64),(477.4,91.8,'finalize','sale-finalized.wav',1.14)]:
 searchStart=sourceAt-.4;search=read(real,searchStart,2.6).mean(1);template=read(a/'sfx'/file,0,duration).mean(1);size=1<<int(np.ceil(np.log2(len(search)+len(template)-1)));corr=np.fft.irfft(np.fft.rfft(search,size)*np.conj(np.fft.rfft(template,size)),size);lag=int(np.argmax(corr[:len(search)-len(template)+1]));at=destAt+(searchStart+lag/sr-sourceAt);i=round(at*sr);end=i+round(duration*sr);stems[kind][i:end]=voice[i:end];voice[i:end]=0;print(kind,round(at,3))
write('mix-dialogue.wav',voice)
for kind,data in stems.items():write('mix-sfx-'+kind+'.wav',data)
rng=np.random.default_rng(42);music=np.zeros_like(voice);chalk=np.zeros_like(voice)
def tone(buf,at,dur,midi,amp):
 ns=int(dur*sr);t=np.arange(ns)/sr;hz=440*2**((midi-69)/12);sig=(np.sin(2*np.pi*hz*t)+.18*np.sin(2*np.pi*hz*3*t))*(1-np.exp(-t*150))*np.exp(-t*4.8)*amp;i=round(at*sr);ns=min(ns,n-i)
 if ns>0:buf[i:i+ns]+=sig[:ns,None]
notes=[72,76,79,74,81,79,76,74,74,77,81,76,83,81,77,74,77,81,84,79,86,84,81,79,79,83,86,81,88,86,83,79]
for k,at in enumerate(np.arange(0,length,60/88/2)):
 tone(music,at,.85,notes[k%32],.018)
 if k%4==0:tone(music,at,1.3,[48,50,53,55][(k//8)%4],.012)
t=np.arange(n)/sr;rise=np.clip((t-43.9)/.5,0,1);fall=np.clip((99.9-t)/.5,0,1);gain=.62+.48*np.minimum(rise,fall);gain*=np.minimum(np.clip(t/1.2,0,1),np.clip((length-t)/1.2,0,1));music*=gain[:,None]
for at in [18,43.2,99.4]:
 ns=int(.42*sr);tt=np.arange(ns)/sr;noise=np.convolve(rng.normal(0,1,ns),np.ones(18)/18,mode='same');sig=noise*np.sin(np.pi*tt/.42)**2*.09;i=round(at*sr);chalk[i:i+ns]+=sig[:,None];tone(chalk,at+.18,.5,84,.035);tone(chalk,at+.26,.45,91,.022)
write('mix-music-full.wav',music);write('mix-sfx-chalk.wav',chalk)
print('Six isolated audio stems ready')

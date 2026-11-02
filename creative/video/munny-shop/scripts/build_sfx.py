"""Original synthesized register and sale-resolution cues, shared by OBS and the edit."""
from pathlib import Path
import numpy as np,wave
ROOT=Path(__file__).resolve().parents[1]
SR=48000
def effect(kind):
 duration=.62 if kind=='bid' else 1.12
 audio=np.zeros(int(duration*SR))
 notes=[(0,1250,.15),(.09,1850,.22),(.15,2460,.36)] if kind=='bid' else [(0,523.25,.38),(.13,659.25,.40),(.26,783.99,.48),(.40,1046.5,.62)]
 for start,hz,length in notes:
  t=np.arange(int(length*SR))/SR
  envelope=(1-np.exp(-t*650))*np.exp(-t*(12 if kind=='bid' else 6))
  signal=(np.sin(2*np.pi*hz*t)+.22*np.sin(2*np.pi*hz*2.01*t))*envelope*.19
  at=int(start*SR);audio[at:at+len(t)]+=signal
 # Quiet mechanical click gives the register sound a distinct onset.
 rng=np.random.default_rng(48);n=int(.027*SR);audio[:n]+=rng.normal(0,.035,n)*np.exp(-np.arange(n)/150)
 return np.column_stack((audio,audio)).astype(np.float32)
def main():
 out=ROOT/'assets/sfx';out.mkdir(exist_ok=True)
 for kind,name in [('bid','bid-kaching'),('sold','sale-finalized')]:
  a=effect(kind)
  with wave.open(str(out/(name+'.wav')),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
if __name__=='__main__':main()

from pathlib import Path
from PIL import Image
import subprocess
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop')
cues=[(64,68,'45'),(72.37,76.37,'50'),(84.06,88.06,'60'),(91.8,98.8,'winner')]
frames={n:Image.open(v/f'assets/twitch-message-{n}.png').tobytes() for _,_,n in cues};blank=Image.new('RGBA',(1920,1080)).tobytes()
p=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an','-c:v','qtrle','-pix_fmt','argb',str(v/'renders/twitch-message-cues-alpha.mov')],stdin=subprocess.PIPE)
for f in range(3888):
 name=next((n for start,end,n in cues if start<=f/30<end),None);p.stdin.write(frames[name] if name else blank)
p.stdin.close();assert p.wait()==0
print('Message cues rendered')

from pathlib import Path
from PIL import Image,ImageDraw
import subprocess
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop');scene=Image.open(v/'assets/shop-live-v4.png').convert('RGBA')
p=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',str(v/'renders/intro-straight-door.mp4')],stdin=subprocess.PIPE)
for f in range(120):
 t=f/30;im=scene.copy();d=ImageDraw.Draw(im)
 if t<.8:d.rectangle((0,0,1920,1080),fill='black')
 elif t<3.8:
  u=(t-.8)/3;e=u*u*(3-2*u);left=int(960*(1-e));right=1920-left;d.rectangle((0,0,left,1080),fill='#171412');d.rectangle((right,0,1920,1080),fill='#211a15');d.line((left,0,left,1080),fill='#b38b50',width=3);d.line((right,0,right,1080),fill='#b38b50',width=3)
 p.stdin.write(im.tobytes())
p.stdin.close();assert p.wait()==0

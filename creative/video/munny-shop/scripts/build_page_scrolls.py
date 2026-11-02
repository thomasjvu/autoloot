from pathlib import Path
from PIL import Image
import subprocess
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop')
p=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',str(v/'renders/web-page-scrolls-background.mp4')],stdin=subprocess.PIPE)
for name in ['studio-persistent-hero.png','your-show-card-scans.png']:
 im=Image.open(v/'capture'/name).convert('RGB').crop((0,162,2678,2638));im=im.resize((1920,round(im.height*1920/im.width)),Image.Resampling.LANCZOS);side=im.crop((0,0,339,1080))
 for f in range(360):
  t=f/359;u=max(0,min(1,(t-.10)/.8));ease=u*u*(3-2*u);y=round((im.height-1080)*ease);frame=im.crop((0,y,1920,y+1080));frame.paste(side,(0,0));p.stdin.write(frame.tobytes())
p.stdin.close();assert p.wait()==0
subprocess.run(['ffmpeg','-y','-v','error','-i',str(v/'renders/web-page-scrolls-background.mp4'),'-ss','18','-i',str(v/'renders/final-narrator-alpha.mov'),'-filter_complex','[0:v][1:v]overlay=0:0:shortest=1[v]','-map','[v]','-t','24','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',str(v/'renders/web-page-scrolls-with-munny.mp4')],check=True)
print('Two 12-second page scrolls ready')

from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop');a=v/'assets';r=v/'renders'
body=ImageFont.truetype(str(a/'MapleMono-Variable.ttf'),30);name=ImageFont.truetype('/Users/area/live-shopping-companion/public/fonts/AutolootDisplay-Black.ttf',29)
shot=Image.open('/tmp/autoloot-codex-response.png').convert('RGB');shot.save(v/'capture/twitch-real/codex-real-cohost-response.png');shot=shot.crop((900,330,3250,1600));shot.thumbnail((1720,790),Image.Resampling.LANCZOS);third=Image.new('RGB',(1920,1080),'#252b28');third.paste(shot,((1920-shot.width)//2,20));third.save(a/'codex-live-response-proof.png')
texts=['We built Autoloot with Codex: real streamer requests, code changes, and regression tests.','In AI mode, I send your shop context to Codex and return a reply or a proposal for your review.','Here is a real Codex response: the correct card, winner, sixty dollars, and three bids.']
(a/'codex-narration.json').write_text(json.dumps(texts))
poses=[Image.open(a/f'munny-mouth-{s}-v4.png').convert('RGBA').crop((45,0,455,430)).resize((300,315)) for s in ['closed','open']]
enc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',str(r/'codex-proof-picture.mp4')],stdin=subprocess.PIPE)
for page,file in enumerate(['codex-build-proof.png','codex-cohost-flow.png','codex-live-response-proof.png']):
 bg=Image.open(a/file).convert('RGBA');cache={}
 for n in range(300):
  t=n/30;count=min(len(texts[page]),int(max(0,t-.4)*25));mouth=(t>.4 and count<len(texts[page]) and n%6<3);key=(count,mouth)
  if key not in cache:
   im=bg.copy();im.alpha_composite(poses[int(mouth)],(10,755));d=ImageDraw.Draw(im);d.rounded_rectangle((315,855,1880,1040),radius=28,fill='#fff4d9',outline='#302921',width=4);d.rounded_rectangle((350,825,555,885),radius=18,fill='#d2df4b',outline='#302921',width=3);d.text((373,839),'Munny',font=name,fill='#302921');rows=['']
   for word in texts[page][:count].split(' '):
    cand=(rows[-1]+' '+word).strip()
    if d.textlength(cand,font=body)>1460:rows.append(word)
    else:rows[-1]=cand
   for j,line in enumerate(rows):d.text((350,910+j*43),line,font=body,fill='#302921')
   cache[key]=im.tobytes()
  enc.stdin.write(cache[key])
  if len(cache)>8:cache.clear()
enc.stdin.close();assert enc.wait()==0
print('Codex proof picture ready')

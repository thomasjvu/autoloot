from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import random
root=Path('/Users/area/live-shopping-companion'); out=root/'creative/video/munny-shop/assets'; font=root/'public/fonts/chalk/MunnyShop-Regular.ttf'
for name,lines,color in [('site',['EXPLORE','THE SHOP'],'#a9dff2'),('bids',['LET THE','BIDDING BEGIN'],'#c4edba'),('setup',['MAKE IT','YOUR STREAM'],'#f6b6c9')]:
 im=Image.new('RGB',(1920,1080),'#252b28');d=ImageDraw.Draw(im);random.seed(18)
 for _ in range(16000):
  x=random.randrange(1920);y=random.randrange(1080);d.point((x,y),fill=random.choice(['#282e2b','#222825','#2a302d']))
 f=ImageFont.truetype(str(font),152)
 for i,line in enumerate(lines):
  box=d.textbbox((0,0),line,font=f);w=box[2]-box[0];d.text(((1920-w)/2,325+i*190),line,font=f,fill=color)
 d.arc((560,755,1360,810),190,350,fill='#fff0d3',width=5)
 for x in [500,1420]:d.ellipse((x-7,748,x+7,762),fill='#f6e88d')
 im.save(out/f'transition-{name}.png')
print('Three chalk cards created')

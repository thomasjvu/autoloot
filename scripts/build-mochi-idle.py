"""Assemble eight tail poses with an immutable body to prevent redraw jitter."""
from PIL import Image, ImageDraw
from pathlib import Path
import sys
source=Image.open(sys.argv[1]).convert('RGBA')
out=Path('public/characters/idle-v2');out.mkdir(exist_ok=True)
source.save(out/'source.png')
w,h=source.width//4,source.height//2
cells=[source.crop(((i%4)*w,(i//4)*h,(i%4+1)*w,(i//4+1)*h)) for i in range(8)]
# Character's body is intentionally immutable; only the isolated left tail zone changes.
mask=Image.new('L',(w,h));draw=ImageDraw.Draw(mask)
draw.polygon([(0,int(h*.43)),(int(w*.31),int(h*.43)),(int(w*.36),int(h*.51)),(int(w*.36),int(h*.62)),(0,int(h*.65))],fill=255)
base=cells[0]
frames=[]
for i,cell in enumerate(cells):
 frame=Image.composite(cell,base,mask)
 frame=frame.crop((int(w*.20),0,int(w*.77),h))
 frame.save(out/f'frame-{i}.webp',lossless=True)
 frames.append(frame)
# Mild tail-only crossfades add subframes without moving any body pixels.
smooth=[]
for i,frame in enumerate(frames):
 for j in range(4):smooth.append(Image.blend(frame,frames[(i+1)%8],j/4))
# Three tail cycles; blink only the eye patch, never the whole portrait.
blink=Image.open(sys.argv[2]).convert('RGBA').resize(source.size)
blink=blink.crop((0,0,w,h)).crop((int(w*.20),0,int(w*.77),h))
box=(int(w*.27),int(h*.14),int(w*.40),int(h*.205))
# coordinates after common crop: eyes at original x .47-.60
box=(int(w*.27),int(h*.14),int(w*.40),int(h*.205))
patch=blink.crop(box)
long=[]
for i in range(96):
 frame=smooth[i%32].copy()
 if i in (43,44):frame.paste(patch,box)
 long.append(frame)
long[0].save('public/characters/mochi-idle-v3.webp' ,save_all=True,append_images=long[1:],duration=80,loop=0,lossless=True)
# Verify immutable upper portrait across every frame.
for frame in frames:assert frame.crop((0,0,frame.width,int(h*.4))).tobytes()==frames[0].crop((0,0,frame.width,int(h*.4))).tobytes()
print(f'8 key poses / 32 tail subframes; 2.56s loop. Portrait pixels identical. {w}x{h}')

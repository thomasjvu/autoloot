"""Register drawn idle frames horizontally to neutral hair/shoe anchors."""
from PIL import Image
import numpy as np
from pathlib import Path
folder=Path(__file__).resolve().parents[1]/'character/legacy-exports/idle-v4'
frames=[Image.open(folder/f'frame-{i}.webp').convert('RGBA') for i in range(8)]
w,h=frames[0].size
ref=np.asarray(frames[0]).astype(float)/255
# Hair crown and shoes are stable; avoid eyes, shoulders and moving tail.
region=np.zeros((h,w),bool)
region[8:65,65:w-30]=True
region[int(h*.88):h-5,65:w-30]=True
refprem=ref[:,:,:3]*ref[:,:,3:4]
shifts=[];aligned=[]
for frame in frames:
 best=None
 for dx in range(-65,66):
  candidate=Image.new('RGBA',frame.size)
  candidate.alpha_composite(frame,(dx,0))
  arr=np.asarray(candidate).astype(float)/255
  diff=(arr[:,:,:3]*arr[:,:,3:4]-refprem)**2
  score=diff[region].mean()
  if best is None or score<best[0]:best=(score,dx,candidate)
 shifts.append(best[1]);aligned.append(best[2])
for i,frame in enumerate(aligned):frame.save(folder/f'aligned-{i}.webp',lossless=True)
aligned[0].save(folder.parent/'mochi-idle-v5.webp',save_all=True,append_images=aligned[1:],duration=[850,650,110,130,650,650,650,650],loop=0,lossless=True)
print('Horizontal frame corrections:',shifts)

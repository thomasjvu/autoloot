"""Split the generated 4x4 Autoloot sheet; retain original alpha and artwork."""
from PIL import Image
from pathlib import Path
import json,sys,shutil
source=Path(sys.argv[1])
out=Path(__file__).resolve().parents[2]/'public/icons'
out.mkdir(exist_ok=True)
if source.resolve() != (out/'autoloot-sheet.png').resolve():
    shutil.copyfile(source,out/'autoloot-sheet.png')
sheet=Image.open(source).convert('RGBA')
def gutters(axis):
    alpha=sheet.getchannel('A')
    length=sheet.width if axis==0 else sheet.height
    active=[]
    for v in range(length):
        line=alpha.crop((v,0,v+1,sheet.height) if axis==0 else (0,v,sheet.width,v+1))
        if sum(a>32 for a in line.getdata())>3:active.append(v)
    runs=[]
    for v in active:
        if not runs or v>runs[-1][-1]+1:runs.append([v])
        else:runs[-1].append(v)
    if len(runs)!=4:raise ValueError('Expected four transparent-separated bands')
    return [0]+[(runs[i][-1]+runs[i+1][0])//2 for i in range(3)]+[length]
columns,rows=gutters(0),gutters(1)
names=['studio','bag','orders','spark','users','settings','plus','play','pause','check','arrow','close','clock','external','trash','search']
manifest={}
for i,name in enumerate(names):
    x,y=i%4,i//4
    cell=sheet.crop((columns[x],rows[y],columns[x+1],rows[y+1]))
    # Ignore barely visible alpha noise when finding the optical bounds.
    bounds=cell.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
    if not bounds:raise ValueError('Empty cell: '+name)
    art=cell.crop(bounds)
    art.thumbnail((208,208),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(256,256))
    tile.alpha_composite(art,((256-art.width)//2,(256-art.height)//2))
    tile.save(out/(name+'.png'),optimize=True)
    manifest[name]={'src':'/icons/'+name+'.png','width':256,'height':256,'sheetCell':[x,y]}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Contact sheet for QA only; individual files preserve transparent alpha.
preview=Image.new('RGBA',(1024,1024),'#f5f0e7')
for i,name in enumerate(names):preview.alpha_composite(Image.open(out/(name+'.png')),(i%4*256,i//4*256))
preview.convert('RGB').save(out/'preview.jpg',quality=90)
print('Exported',len(manifest),'transparent icons')

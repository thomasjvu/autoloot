"""Extract color PSD explicitly; never select the companion depth PSD."""
from pathlib import Path
import sys,json
from PIL import Image
from psd_tools import PSDImage
name=sys.argv[1];root=Path(__file__).resolve().parents[1]/'assets/expressions'/f'{name}-seethrough'
source=root/'output/output/source.psd';out=root/'color-layers';out.mkdir(exist_ok=True)
psd=PSDImage.open(source);canvas=Image.new('RGBA',psd.size);layers=[]
for i,layer in enumerate(psd):
 im=layer.topil()
 if im is None:continue
 full=Image.new('RGBA',psd.size);full.alpha_composite(im.convert('RGBA'),(layer.left,layer.top));box=full.getchannel('A').getbbox()
 if not box:continue
 file=f'{i:02d}.png';full.save(out/file);canvas.alpha_composite(full);layers.append({'name':layer.name,'file':file,'bbox':box})
canvas.save(out/'composite.png');canvas.crop((310,45,495,215)).resize((740,680)).convert('RGB').save(out/'face-review.jpg')
(out/'layers.json').write_text(json.dumps({'canvas':psd.size,'source':'../output/output/source.psd','layers':layers},indent=2))
print(name,len(layers),'color layers exported')

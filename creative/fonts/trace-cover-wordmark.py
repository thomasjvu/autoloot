"""Recover vector lettering from the selected generated cover, not a substitute font.
Requires pillow, numpy, vtracer. This extracts outlines; it does not repaint the cover.
The main font build reads the committed JSON and does not need these dependencies.
"""
from pathlib import Path
from io import BytesIO
import json
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageFilter
import vtracer
from fontTools.svgLib.path import parse_path
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'creative/marketing/autoloot-cover-03-dark.png'
im=np.asarray(Image.open(source).convert('RGB'))[95:285,45:865]
mask=(im[:,:,0]>215)&(im[:,:,1]>210)&(im[:,:,2]>180)&(np.abs(im[:,:,0].astype(int)-im[:,:,1].astype(int))<30)
bitmap=np.where(mask,0,255).astype('uint8')
# A subpixel-scale blur removes raster stair steps before fitting smooth curves.
smoothed=Image.fromarray(bitmap).filter(ImageFilter.GaussianBlur(.65))
bitmap=np.where(np.asarray(smoothed)<128,0,255).astype('uint8')
b=BytesIO();Image.fromarray(bitmap).save(b,format='PNG')
svg=vtracer.convert_raw_image_to_svg(b.getvalue(),img_format='png',colormode='binary',mode='spline',filter_speckle=8,corner_threshold=100,length_threshold=8,splice_threshold=80,max_iterations=30,path_precision=3)
root=ET.fromstring(svg);paths=[]
for element in root:
    if not element.tag.endswith('path'):continue
    transform=element.get('transform','translate(0,0)')
    tx,ty=map(float,transform.removeprefix('translate(').removesuffix(')').split(','))
    d=element.attrib['d'];pen=BoundsPen(None)
    parse_path(d,TransformPen(pen,(1,0,0,1,tx,ty)))
    paths.append({'d':d,'translate':[tx,ty],'bounds':list(pen.bounds)})
paths.sort(key=lambda p:p['bounds'][0])
assert len(paths)==7, len(paths)
# Source has seven components: a,u,t,o,l, joined oo, and final t.
for p,label in zip(paths,['a','u','t','o','l','oo','t.final']):p['letter']=label
record={'source':'creative/marketing/autoloot-cover-03-dark.png','crop':[45,95,865,285],'viewBox':[0,0,820,190],'paths':paths}
(ROOT/'creative/fonts/cover-wordmark-outlines.json').write_text(json.dumps(record,indent=2)+'\n')
# A standalone, scalable brand asset in addition to the real text/font ligature.
asset='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 190" role="img" aria-label="autoloot">\n'
for p in paths:
    tx,ty=p['translate'];asset+=f'<path fill="currentColor" d="{p["d"]}" transform="translate({tx},{ty})"/>\n'
asset+='</svg>\n'
(ROOT/'public/brand/autoloot-wordmark-tilted.svg').write_text(asset)
print('Recovered 7 components, including the original joined oo, into SVG and font outline JSON.')

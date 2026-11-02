from pathlib import Path
import math,string
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'public/fonts/chalk';OUT.mkdir(exist_ok=True)
# Original centerline drawings, inspired by the rounded shop sign. Coordinates y down.
reference=Image.open(ROOT/'creative/video/munny-shop/assets/shop-interior-v3.png').convert('L')
traced={'A':(880,337,995,483),'U':(995,345,1084,462),'T':(1086,345,1173,458),'O':(1172,345,1249,455),'L':(1250,345,1318,454),'W':(940,149,1049,267),'E':(1050,147,1117,243),'C':(1176,133,1248,228),'M':(1317,142,1408,247)}
def arc(cx,cy,rx,ry,start=0,end=360):
 return [(cx+rx*math.cos(math.radians(a)),cy+ry*math.sin(math.radians(a))) for a in np.linspace(start,end,65)]
g={
'A':[[(9,96),(37,5),(47,5),(77,96)],[(20,65),(64,65)]],
'B':[[(13,96),(13,6),(44,6)],arc(44,28,27,22,-90,90),[(44,50),(13,50)],arc(44,73,30,23,-90,90),[(44,96),(13,96)]],
'C':[arc(43,51,33,45,45,315)],
'D':[[(13,96),(13,6),(36,6)],arc(36,51,38,45,-90,90),[(36,96),(13,96)]],
'E':[[(73,7),(13,7),(13,95),(73,95)],[(13,49),(61,49)]],
'F':[[(14,96),(14,7),(74,7)],[(14,48),(61,48)]],
'G':[arc(43,51,33,45,40,315),[(75,60),(48,60)],[(75,60),(75,84)]],
'H':[[(13,6),(13,96)],[(73,6),(73,96)],[(13,50),(73,50)]],
'I':[[(17,7),(69,7)],[(43,7),(43,95)],[(17,95),(69,95)]],
'J':[[(22,7),(74,7),(74,73),(70,88),(59,96),(37,96),(22,87),(16,75)]],
'K':[[(14,6),(14,96)],[(73,6),(15,58)],[(35,41),(76,96)]],
'L':[[(14,6),(14,95),(73,95)]],
'M':[[(10,96),(12,7),(21,7),(44,57),(67,7),(76,7),(78,96)]],
'N':[[(13,96),(13,7),(20,7),(73,94),(73,6)]],
'O':[arc(43,51,33,45)],
'P':[[(14,96),(14,7),(45,7)],arc(45,30,29,23,-90,90),[(45,53),(14,53)]],
'Q':[arc(43,49,33,43),[(49,72),(78,103)]],
'R':[[(14,96),(14,7),(45,7)],arc(45,30,29,23,-90,90),[(45,53),(14,53)],[(43,53),(76,96)]],
'S':[arc(43,29,30,23,205,475),arc(43,73,31,23,205,-85)],
'T':[[(8,7),(78,7)],[(43,7),(43,96)]],
'U':[[(12,6),(12,66)],arc(43,66,31,30,180,0),[(74,66),(74,6)]],
'V':[[(10,6),(39,96),(47,96),(77,6)]],
'W':[[(8,6),(19,96),(27,96),(44,45),(61,96),(69,96),(80,6)]],
'X':[[(12,6),(75,96)],[(75,6),(12,96)]],
'Y':[[(10,6),(43,53),(76,6)],[(43,53),(43,96)]],
'Z':[[(12,7),(75,7),(12,95),(75,95)]],
'0':[arc(43,51,30,45)],
'1':[[(23,24),(43,7),(48,7),(48,95)],[(25,95),(70,95)]],
'2':[arc(43,29,29,23,190,360),[(72,29),(68,43),(15,93),(15,96),(74,96)]],
'3':[arc(39,29,31,23,-100,90),arc(39,73,33,23,-90,110)],
'4':[[(61,96),(61,6),(54,6),(10,65),(77,65)]],
'5':[[(73,7),(17,7),(15,49),(41,46)],arc(41,71,32,25,-90,145)],
'6':[arc(44,65,31,31),[(14,65),(16,36),(27,15),(44,6),(65,8)]],
'7':[[(10,7),(76,7),(33,96)]],
'8':[arc(43,28,28,22),arc(43,73,32,24)],
'9':[arc(43,37,31,31),[(74,37),(72,67),(59,89),(42,96),(21,92)]],
'$':[arc(43,30,29,21,205,475),arc(43,72,30,22,205,-85),[(43,-4),(43,106)]],
'.':[[(43,94),(43,95)]],',':[[(44,91),(37,105)]],':':[[(43,32),(43,33)],[(43,77),(43,78)]],
'-':[[(18,53),(68,53)]],'!':[[(43,7),(43,66)],[(43,94),(43,95)]],
'?':[arc(42,29,29,23,190,360),[(71,29),(64,45),(43,58),(43,66)],[(43,94),(43,95)]],
'/':[[(72,5),(14,97)]],"' ".strip():[[(43,6),(39,25)]],
'(':[arc(65,51,35,50,115,245)],')':[arc(21,51,35,50,-65,65)],
'+':[[(17,52),(69,52)],[(43,25),(43,79)]],
'=':[[(17,38),(69,38)],[(17,65),(69,65)]],
}
def bezier(a,b,c,d):
 return [tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in (0,1)) for t in np.linspace(0,1,55)]
snake=bezier((72,17),(30,-13),(-5,39),(43,51))+bezier((43,51),(96,65),(64,120),(12,85))[1:]
g['S']=[snake];g['$']=[snake,[(43,-4),(43,106)]]
# Rasterized round strokes are traced into scalable TrueType contours, including holes.
fb=FontBuilder(1000,isTTF=True); cmap={32:'space'};glyphs={};metrics={}
pen=TTGlyphPen(None);glyphs['.notdef']=pen.glyph();glyphs['space']=pen.glyph();metrics.update({'.notdef':(650,0),'space':(330,0)})
for ch,paths in g.items():
 mask=Image.new('L',(880,1120));d=ImageDraw.Draw(mask)
 for path in paths:
  pts=[(round(x*8+80),round(y*8+80)) for x,y in path];d.line(pts,fill=255,width=148,joint='curve')
  for x,y in pts:d.ellipse((x-74,y-74,x+74,y+74),fill=255)
 if ch in traced:
  scan=np.array(reference.crop(traced[ch]));_,scan=cv2.threshold(cv2.GaussianBlur(scan,(3,3),.6),135,255,cv2.THRESH_BINARY)
  num,labels,stats,_=cv2.connectedComponentsWithStats(scan);keep=1+np.argmax(stats[1:,cv2.CC_STAT_AREA]);scan=np.where(labels==keep,255,0).astype('uint8')
  ys,xs=np.nonzero(scan);scan=scan[ys.min():ys.max()+1,xs.min():xs.max()+1]
  height=740;width=round(scan.shape[1]/scan.shape[0]*height)
  scan=Image.fromarray(scan).resize((width,height),Image.Resampling.LANCZOS)
  mask=Image.new('L',(max(880,width+140),1120));mask.paste(scan,(70,55))
 # Small irregular pores create actual scalable chalk grain rather than a shadow.
 grain=ImageDraw.Draw(mask);rng=np.random.default_rng(ord(ch)*71)
 for _ in range(680):
  x=int(rng.integers(30,mask.width-30));y=int(rng.integers(30,900));r=int(rng.integers(1,4))
  if mask.getpixel((x,y))>200:grain.ellipse((x,y,x+r*2,y+r),fill=0)
 contours,_=cv2.findContours(np.array(mask),cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
 p=TTGlyphPen(None)
 for contour in contours:
  points=cv2.approxPolyDP(contour,1.1,True).reshape(-1,2)
  if len(points)<3:continue
  points=[(int(x),int(880-y)) for x,y in points];p.moveTo(points[0])
  for pt in points[1:]:p.lineTo(pt)
  p.closePath()
 name='uni%04X'%ord(ch);glyphs[name]=p.glyph();metrics[name]=((width+140) if ch in traced else 825,0);cmap[ord(ch)]=name
 if ch in string.ascii_uppercase:cmap[ord(ch.lower())]=name
fb.setupGlyphOrder(list(glyphs));fb.setupCharacterMap(cmap);fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=960,descent=-240);fb.setupNameTable({'familyName':'Munny Shop','styleName':'Regular','uniqueFontIdentifier':'Autoloot:MunnyShop:0.2','fullName':'Munny Shop Regular','psName':'MunnyShop-Regular','version':'Version 0.2'});fb.setupOS2(sTypoAscender=960,sTypoDescender=-240,usWinAscent=960,usWinDescent=240);fb.setupPost();fb.setupMaxp();fb.save(OUT/'MunnyShop-Regular.ttf')
# Proof uses the actual generated font; no font-shaped illustration stand-ins.
im=Image.new('RGB',(1600,1060),'#262b29');d=ImageDraw.Draw(im)
ui=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',24)
old=str(OUT/'PatrickHand-Regular.ttf');new=str(OUT/'MunnyShop-Regular.ttf')
d.text((60,28),'BIDDING TYPE PROOF  /  CURRENT / CUSTOM MUNNY SHOP',font=ui,fill='#fff5dc')
for x,fontpath,title in [(65,old,'CURRENT · PATRICK HAND'),(850,new,'CUSTOM · MUNNY SHOP v0.2')]:
 d.text((x,100),title,font=ui,fill='#a9dff2')
 for y,text,size,col in [(170,'WELCOME',68,'#fff5dc'),(260,'TO AUTOLOOT',55,'#fff5dc'),(390,'CHARIZARD EX',45,'#f6e88d'),(485,'$65',138,'#c4edba'),(680,'BID BY CARDFAN',36,'#a9dff2'),(750,'00:10',65,'#f6b6c9'),(870,'0123456789',45,'#fff5dc')]:
  d.text((x,y),text,font=ImageFont.truetype(fontpath,size),fill=col)
d.line((795,100,795,970),fill='#fff5dc40',width=1)
d.text((65,1000),'Original rounded letterforms · Monospaced bid digits · Uppercase / small caps · Scalable TrueType',font=ui,fill='#fff5dc')
im.save(ROOT/'creative/video/munny-shop/renders/munny-font-comparison-v2.png')
print(OUT)

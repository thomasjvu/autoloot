"""Render the current typeface for visual review. Requires Pillow. Shaping is verified separately with HarfBuzz."""
from pathlib import Path
from io import BytesIO
from fontTools.ttLib import TTFont
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
FONT=ROOT/'public/fonts/AutolootDisplay-Black.ttf'
preview=TTFont(FONT)
for table in preview['cmap'].tables:
    if table.isUnicode(): table.cmap[0xE000]='autoloot.wordmark'
font_bytes=BytesIO();preview.save(font_bytes)
def load_font(size): return ImageFont.truetype(BytesIO(font_bytes.getvalue()),size)
im=Image.new('RGB',(1800,1600),'#f3efdf');d=ImageDraw.Draw(im)
regular=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',22)
def row(label,text,y,size):
    d.text((60,y),label,font=regular,fill='#62665a')
    if text=='autoloot': text='\ue000'
    f=load_font(size)
    while d.textlength(text,font=f)>1680:
        size-=1;f=load_font(size)
    d.text((60,y+32),text,font=f,fill='#252823')
row('AUTOLOOT DISPLAY / V4','autoloot',28,240)
row('LOWERCASE','abcdefghijklmnopqrstuvwxyz',350,87)
row('UPPERCASE','ABCDEFGHIJKLMNOPQRSTUVWXYZ',500,84)
row('LATIN ACCENTS','ÀÉÎÖÜ ÇÑ ØÆŒ ß àéîöü çñ øæœ',650,78)
row('EXTENDED LATIN','ĀăĄą Ćč Ďď Đđ Ęę Ğğ İı Ķķ Łł Őő Řř Șș Țț Ůů Žž',810,72)
row('LANGUAGE SAMPLES','Crème brûlée · Příliš žluťoučký kůň · Łódź · București',970,65)
row('LIGATURES / KERNING','office affinity fluffy waffle · ff fi fl ffi ffl · AVATAR To WA',1120,64)
row('NUMERALS / PUNCTUATION','0123456789  €48.00  £48  $48  ¥48  “Hello!” — (Ready?)',1270,64)
row('BRAND COPY','Your stream. Your shop. Your pace.',1420,79)
im.save(ROOT/'creative/marketing/autoloot-font-specimen-v4.png')

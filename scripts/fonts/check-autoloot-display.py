"""Structural and shaping checks. Requires fonttools[woff] and uharfbuzz."""
from pathlib import Path
import unicodedata
from fontTools.ttLib import TTFont
import uharfbuzz as hb
ROOT=Path(__file__).resolve().parents[2]
path=ROOT/'public/fonts/AutolootDisplay-Black.ttf'
font=TTFont(path); cmap=font.getBestCmap()
face=hb.Face(path.read_bytes()); hfont=hb.Font(face)

def shape(text,features=None):
    buf=hb.Buffer();buf.add_str(text);buf.guess_segment_properties()
    hb.shape(hfont,buf,features or {})
    return [(font.getGlyphName(g.codepoint),p.x_advance,p.x_offset,p.y_offset) for g,p in zip(buf.glyph_infos,buf.glyph_positions)]

samples=['autoloot','ÀÉÎÖÜ ÇÑ ØÆŒ ß àéîöü çñ øæœ','ĀăĄąćČčĎďĐđĒęěĞğĢģĪīİıĶķĻļŁłŃńŅņŇňŐőŘřŚśŞşȘșŢţȚțŤťŪūŮůŰűŲųŹźŻżŽž','Crème brûlée • Příliš žluťoučký kůň • Łódź • București','office affinity fluffy waffle ffi ffl','0123456789 € £ $ ¥ – — “quotes”']
for text in samples:
    assert all(ord(c) in cmap for c in text),text
    for version in [text,unicodedata.normalize('NFD',text)]:
        result=shape(version)
        assert all(g!='.notdef' for g,*_ in result),version
for text,expected in [('ff','f_f'),('fi','fi'),('fl','fl'),('ffi','f_f_i'),('ffl','f_f_l')]:
    assert shape(text)[0][0]==expected,(text,shape(text))
    assert len(shape(text,{'liga':False}))==len(text)
assert sum(p[1] for p in shape('AV',{'kern':True}))<sum(p[1] for p in shape('AV',{'kern':False}))
assert sum(p[1] for p in shape('autoloot',{'kern':True,'liga':False}))<sum(p[1] for p in shape('autoloot',{'kern':False,'liga':False}))
assert [p[0] for p in shape('autoloot')]==['autoloot.wordmark']
assert len(shape('autoloot',{'liga':False}))==8
assert [p[0] for p in shape('autoloot',{'ss01':True})]==['autoloot.wordmark.tilted']
assert [p[0] for p in shape('a',{'ss01':True})]==['a.tilted']
assert [p[0] for p in shape('aa',{'ss01':True})]==['a.tilted','a']
assert 'a.tilted' not in [p[0] for p in shape('banana',{'ss01':True})]
assert 'a.tilted' not in [p[0] for p in shape('1a',{'ss01':True})]
assert [p[0] for p in shape('a')]==['a']
assert shape('autoloot')[0][1]==shape('autoloot',{'ss01':True})[0][1]
assert font['glyf']['a'].coordinates != font['glyf']['a.tilted'].coordinates
# Counter winding must oppose the outer outline so the a stays open when rendered.
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.areaPen import AreaPen
recording=RecordingPen();font.getGlyphSet()['a'].draw(recording)
area=AreaPen(None);signed=[];previous=0
for operation,args in recording.value:
    getattr(area,operation)(*args)
    if operation=='closePath':signed.append(area.value-previous);previous=area.value
assert len(signed)==2 and signed[0]<0<signed[1]

for code in [0x300,0x301,0x302,0x303,0x304,0x306,0x307,0x308,0x30A,0x30B,0x30C,0x326,0x327,0x328]:
    assert font['hmtx'][cmap[code]][0]==0,hex(code)
for extension in ['ttf','woff2']:
    f=TTFont(ROOT/f'public/fonts/AutolootDisplay-Black.{extension}')
    assert f.getBestCmap()==cmap
    for name in f.getGlyphOrder(): f['glyf'][name].getCoordinates(f['glyf'])
print(f'PASS: {len(cmap)} codepoints; TTF/WOFF2; Latin accents and NFD; ff/fi/fl/ffi/ffl; kerning; zero-width marks; upright wordmark and optional tilted initial.')

"""Build Autoloot Display v4 from traced cover lettering and vendored, OFL-licensed Fredoka outlines.
Requires fonttools[woff]. Offline, reproducible: no font download during build.
See vendor/fredoka/SOURCE.md and public/fonts/AutolootDisplay-OFL.txt.
"""
from pathlib import Path
import hashlib
import unicodedata
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib.tables import otTables

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'scripts/fonts/vendor/fredoka/Fredoka-variable.ttf'
OUT = ROOT / 'public/fonts'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == '2ba02e68b152868aef9ba28e24b3648c7d457fe6f25c761f2c2c53fb61a73fc8', 'Unexpected upstream font source'
font = instantiateVariableFont(TTFont(SOURCE), {'wght': 700, 'wdth': 112}, inplace=True)
cmap = font.getBestCmap()

def name(char): return cmap[ord(char)]
def bounds(glyph):
    pen = BoundsPen(font.getGlyphSet())
    font.getGlyphSet()[glyph].draw(pen)
    return pen.bounds

def add_glyph(glyph, components, width):
    glyph_order = font.getGlyphOrder()[:]
    pen = TTGlyphPen(font.getGlyphSet())
    for component, transform in components:
        pen.addComponent(component, transform)
    font['glyf'][glyph] = pen.glyph()
    font['hmtx'][glyph] = (width, 0)
    font.setGlyphOrder(glyph_order + [glyph])
    font['hmtx'][glyph] = (width, round(bounds(glyph)[0]))
    return glyph

def encode(char, glyph):
    cmap[ord(char)] = glyph
    for table in font['cmap'].tables:
        if table.isUnicode(): table.cmap[ord(char)] = glyph

IDENTITY = (1, 0, 0, 1, 0, 0)
# Preserve the upstream mark anchors. They work for decomposed Unicode too.
base_anchors = {}
mark_anchors = {}
mark_tables = []
for lookup in font['GPOS'].table.LookupList.Lookup:
    if lookup.LookupType != 4: continue
    for table in lookup.SubTable:
        mark_tables.append(table)
        for glyph, record in zip(table.MarkCoverage.glyphs, table.MarkArray.MarkRecord):
            mark_anchors[glyph] = (record.Class, record.MarkAnchor.XCoordinate, record.MarkAnchor.YCoordinate)
        for glyph, record in zip(table.BaseCoverage.glyphs, table.BaseArray.BaseRecord):
            base_anchors[glyph] = record.BaseAnchor

# Replace the five known lowercase shapes with the selected cover's own outlines.
# Retain the full eight-letter arrangement as a font ligature: generated o's and
# t's differ slightly, and the middle oo is joined in the reference image.
import json
from fontTools.svgLib.path import parse_path
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.reverseContourPen import ReverseContourPen
trace=json.loads((ROOT/'scripts/fonts/cover-wordmark-outlines.json').read_text())
trace_paths={p['letter']:p for p in trace['paths']}
changed={}
for char,target_height in [('a',500),('u',500),('t',650),('o',500),('l',720)]:
    p=trace_paths[char];x0,y0,x1,y1=p['bounds'];tx,ty=p['translate']
    factor=target_height/(y1-y0);width=round((x1-x0)*factor)+40
    old_width=font['hmtx'][name(char)][0]
    pen=TTGlyphPen(None); curves=Cu2QuPen(pen,max_err=.5)
    parse_path(p['d'],TransformPen(curves,(factor,0,0,-factor,20+(tx-x0)*factor,target_height-(ty-y0)*factor)))
    font['glyf'][name(char)]=pen.glyph();font['hmtx'][name(char)]=(width,20)
    changed[name(char)]=(width,old_width,target_height)
    anchors=base_anchors.get(name(char),[])
    for i,anchor in enumerate(anchors):
        if anchor:
            anchor.XCoordinate=round(anchor.XCoordinate*width/old_width)
            if i==4:anchor.YCoordinate=target_height
# Upright default a: a level bowl and baseline, vertical terminal, small round
# counter. Preserve the original drawn tilt as an optional opening-letter form.
from copy import deepcopy
order=font.getGlyphOrder()[:]
font['glyf']['a.tilted']=deepcopy(font['glyf'][name('a')])
font.setGlyphOrder(order+['a.tilted'])
font['hmtx']['a.tilted']=font['hmtx'][name('a')]
upright_a_path = (
    'M570 465 Q570 500 535 500 H475 Q435 500 435 465 V450 '
    'C400 480 350 500 285 500 C125 500 20 395 20 245 '
    'C20 88 122 0 285 0 C347 0 397 12 435 45 V30 '
    'Q435 0 465 0 H535 Q570 0 570 30 Z '
    'M345 250 C345 214 316 185 280 185 C244 185 215 214 215 250 '
    'C215 286 244 315 280 315 C316 315 345 286 345 250 Z'
)
a_pen=TTGlyphPen(None)
parse_path(upright_a_path,Cu2QuPen(a_pen,max_err=.5,reverse_direction=True))
font['glyf'][name('a')]=a_pen.glyph()
font['hmtx'][name('a')]=(590,20)
previous_width,original_width,_=changed[name('a')]
changed[name('a')]=(590,original_width,500)
for anchor in base_anchors.get(name('a'),[]):
    if anchor: anchor.XCoordinate=round(anchor.XCoordinate*590/previous_width)

# Update existing precomposed accents to the traced bases and their new anchors.
for glyph in font.getGlyphOrder():
    g=font['glyf'][glyph]
    if not g.isComposite() or not g.components:continue
    base=g.components[0].glyphName
    if base not in changed:continue
    width,old_width,target_height=changed[base]
    for component in g.components[1:]:
        mark=mark_anchors.get(component.glyphName)
        if mark:
            cls,mx,my=mark; anchors=base_anchors.get(base,[])
            anchor=anchors[cls] if cls<len(anchors) else None
            if anchor:component.x=round(anchor.XCoordinate-mx);component.y=round(anchor.YCoordinate-my)
    font['hmtx'][glyph]=(width,20)
# Keep both wordmarks. The default uses the upright a; ss01 restores the art.
min_x=min(p['bounds'][0] for p in trace['paths']);max_x=max(p['bounds'][2] for p in trace['paths'])
word_width=round((max_x-min_x)*4)+40
for glyph,tilted in [('autoloot.wordmark',False),('autoloot.wordmark.tilted',True)]:
    word_pen=TTGlyphPen(None);word_curves=Cu2QuPen(word_pen,max_err=.5)
    for p in trace['paths']:
        if p['letter']=='a' and not tilted:
            factor=(p['bounds'][2]-p['bounds'][0])*4/550
            # Match the o's x-height and baseline instead of the dropped tilted a.
            baseline=760-trace_paths['o']['bounds'][3]*4
            parse_path(upright_a_path,TransformPen(ReverseContourPen(word_curves),(factor,0,0,factor,20-20*factor,baseline)))
        else:
            tx,ty=p['translate']
            parse_path(p['d'],TransformPen(word_curves,(4,0,0,-4,20+(tx-min_x)*4,760-ty*4)))
    order=font.getGlyphOrder()[:];font['glyf'][glyph]=word_pen.glyph();font.setGlyphOrder(order+[glyph])
    font['hmtx'][glyph]=(word_width,20)

# Add a below-comma mark for Romanian and Latvian. Keep it distinct from cedilla.
x0,y0,x1,y1 = bounds('comma')
comma_mark = add_glyph('commaaccentcomb', [('comma', (.65,0,0,.65,-(x0+x1)*.325,-45-y1*.65))], 0)
encode('\u0326', comma_mark)
mark_anchors[comma_mark] = (1,0,0)
for table in mark_tables:
    rec = otTables.MarkRecord(); rec.Class = 1
    rec.MarkAnchor = otTables.Anchor(); rec.MarkAnchor.Format = 1
    rec.MarkAnchor.XCoordinate = 0; rec.MarkAnchor.YCoordinate = 0
    table.MarkCoverage.glyphs.append(comma_mark)
    table.MarkArray.MarkRecord.append(rec); table.MarkArray.MarkCount += 1
# Cedilla is present as a spacing mark; expose it as a genuine combining mark too.
cedilla = cmap[0x327]
if cedilla not in mark_anchors:
    x0,y0,x1,y1 = bounds(cedilla)
    mark_anchors[cedilla] = (1,(x0+x1)/2,0)
    font['hmtx'][cedilla] = (0,font['hmtx'][cedilla][1])
    for table in mark_tables:
        rec=otTables.MarkRecord(); rec.Class=1
        rec.MarkAnchor=otTables.Anchor(); rec.MarkAnchor.Format=1
        rec.MarkAnchor.XCoordinate=round((x0+x1)/2); rec.MarkAnchor.YCoordinate=0
        table.MarkCoverage.glyphs.append(cedilla); table.MarkArray.MarkRecord.append(rec); table.MarkArray.MarkCount += 1

# Dotless j is required for j + circumflex; preserve its original bowl curves.
from copy import deepcopy
from array import array
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
jg = deepcopy(font['glyf'][name('j')])
coords, ends, flags = jg.getCoordinates(font['glyf'])
kept_coords=[]; kept_flags=[]; kept_ends=[]; start=0
for end in ends:
    contour=coords[start:end+1]
    if min(y for x,y in contour) < 520:
        kept_coords.extend(contour); kept_flags.extend(flags[start:end+1]); kept_ends.append(len(kept_coords)-1)
    start=end+1
jg.coordinates=GlyphCoordinates(kept_coords);jg.flags=array('B',kept_flags)
jg.endPtsOfContours=kept_ends;jg.numberOfContours=len(kept_ends)
jg.program.fromBytecode([])
order=font.getGlyphOrder()[:];font['glyf']['dotlessj']=jg;font.setGlyphOrder(order+['dotlessj'])
font['hmtx']['dotlessj']=font['hmtx'][name('j')]
encode('ȷ','dotlessj')

# Build additional accented Latin from the same native outlines and native anchors.
# Existing precomposed letters retain their professionally drawn upstream designs.
for code in list(range(0xC0,0x180)) + [0x1FA,0x1FB,0x218,0x219,0x21A,0x21B,0x1E80,0x1E81,0x1E82,0x1E83,0x1E84,0x1E85,0x1EF2,0x1EF3]:
    if code in cmap: continue
    char = chr(code); parts = unicodedata.normalize('NFD',char)
    if len(parts) < 2 or ord(parts[0]) not in cmap: continue
    base = name(parts[0]); width = font['hmtx'][base][0]
    if parts[0]=='i': base = name('ı')
    if parts[0]=='j' and len(parts)>1:
        # Remove the dot by taking the dotless-j outline, if supplied upstream.
        base = cmap.get(0x237, base)
    components = [(base,IDENTITY)]
    valid = True
    for mark in parts[1:]:
        mg = cmap.get(ord(mark))
        if not mg or mg not in mark_anchors:
            valid = False; break
        cls,mx,my = mark_anchors[mg]
        anchors = base_anchors.get(base,[])
        anchor = anchors[cls] if cls < len(anchors) else None
        if anchor:
            bx,by = anchor.XCoordinate,anchor.YCoordinate
        else:
            bx = width/2; by = 700 if parts[0].isupper() else 500
            if cls in (1,5): by = 0
        # Ogonek attaches toward the right foot, not the optical center.
        if ord(mark)==0x328 and anchor is None: bx=width-80
        components.append((mg,(1,0,0,1,round(bx-mx),round(by-my))))
    if valid: encode(char,add_glyph(f'uni{code:04X}',components,width))

# Czech/Slovak tall-letter carons sit beside the ascender, not inside it.
for char,base_char in [('ď','d'),('ľ','l'),('ť','t'),('Ľ','L')]:
    base=name(base_char); accent=name('’')
    bw=font['hmtx'][base][0]; x0,y0,x1,y1=bounds(accent)
    sx=.65; sy=.65; dx=bw+25-x0*sx; dy=740-y1*sy
    glyph=cmap[ord(char)]; pen=TTGlyphPen(font.getGlyphSet())
    pen.addComponent(base,IDENTITY);pen.addComponent(accent,(sx,0,0,sy,dx,dy))
    font['glyf'][glyph]=pen.glyph();font['hmtx'][glyph]=(round(bw+(x1-x0)*sx+55),font['hmtx'][base][1])

# Additional Latin letters that are not canonical accent decompositions.
for char,base_char in [('Đ','D'),('đ','d'),('Ħ','H'),('ħ','h'),('Ŧ','T'),('ŧ','t')]:
    if ord(char) in cmap: continue
    base=name(base_char); width=font['hmtx'][base][0]
    bar=name('−') if ord('−') in cmap else name('-')
    x0,y0,x1,y1=bounds(bar)
    target_width=width*.8; sx=target_width/(x1-x0)
    cy=350 if base_char.isupper() else 340
    transform=(sx,0,0,.65,(width-target_width)/2-x0*sx,cy-(y0+y1)*.325)
    encode(char,add_glyph(f'uni{ord(char):04X}',[(base,IDENTITY),(bar,transform)],width))

# Complete the conventional ff / fi / fl / ffi / ffl family.
ffl_width=font['hmtx']['f_f'][0]+font['hmtx'][name('l')][0]-30
add_glyph('f_f_l',[('f_f',IDENTITY),(name('l'),(1,0,0,1,font['hmtx']['f_f'][0]-30,0))],ffl_width)
for record in font['GSUB'].table.FeatureList.FeatureRecord:
    if record.FeatureTag != 'liga': continue
    lookup=font['GSUB'].table.LookupList.Lookup[record.Feature.LookupListIndex[0]]
    sub=lookup.SubTable[0]
    lig=otTables.Ligature();lig.LigGlyph='f_f_l';lig.Component=['f',name('l')];lig.CompCount=3
    sub.ligatures['f'].insert(0,lig)
# Upstream decomposes fi/fl in a later ccmp lookup, undoing liga. Disable only
# that reverse substitution so standard ligatures and presentation forms agree.
for record in font['GSUB'].table.FeatureList.FeatureRecord:
    if record.FeatureTag == 'ccmp':
        record.Feature.LookupListIndex = [i for i in record.Feature.LookupListIndex
            if not (font['GSUB'].table.LookupList.Lookup[i].LookupType == 2
                and any(set(getattr(st, 'mapping', {})) == {'fi', 'fl'}
                        for st in font['GSUB'].table.LookupList.Lookup[i].SubTable))]
        record.Feature.LookupCount = len(record.Feature.LookupListIndex)

# Longest-match standard ligature keeps accessible text while matching the art.
brand_lookup=otTables.Lookup();brand_lookup.LookupType=4;brand_lookup.LookupFlag=0
brand_sub=otTables.LigatureSubst();brand_sub.ligatures={}
lig=otTables.Ligature();lig.LigGlyph='autoloot.wordmark'
lig.Component=[name(c) for c in 'utoloot'];lig.CompCount=8
brand_sub.ligatures[name('a')]=[lig]
brand_lookup.SubTable=[brand_sub];brand_lookup.SubTableCount=1
brand_lookup_idx=len(font['GSUB'].table.LookupList.Lookup)
font['GSUB'].table.LookupList.Lookup.append(brand_lookup);font['GSUB'].table.LookupList.LookupCount+=1
for record in font['GSUB'].table.FeatureList.FeatureRecord:
    if record.FeatureTag=='liga':
        record.Feature.LookupListIndex.append(brand_lookup_idx);record.Feature.LookupCount+=1

# ss01: original tilted opening a, opt-in only. The whole-word alternate keeps
# source spacing. Elsewhere, a contextual rule changes only word-initial a's.
lookup_list=font['GSUB'].table.LookupList

def append_lookup(kind,subtables):
    lookup=otTables.Lookup();lookup.LookupType=kind;lookup.LookupFlag=0
    lookup.SubTable=subtables;lookup.SubTableCount=len(subtables)
    idx=len(lookup_list.Lookup);lookup_list.Lookup.append(lookup);lookup_list.LookupCount+=1
    return idx

single=otTables.SingleSubst();single.mapping={'autoloot.wordmark':'autoloot.wordmark.tilted'}
word_alternate_idx=append_lookup(1,[single])
single=otTables.SingleSubst();single.mapping={name('a'):'a.tilted'}
initial_single_idx=append_lookup(1,[single])

def coverage(glyphs):
    c=otTables.Coverage();order={g:i for i,g in enumerate(font.getGlyphOrder())}
    c.glyphs=sorted(set(glyphs),key=order.get);return c

# Ignore a preceded by a letter, number, or combining mark (including alternates).
word_glyphs=[g for code,g in cmap.items() if unicodedata.category(chr(code))[0] in 'LMN']
word_glyphs.extend(['a.tilted','autoloot.wordmark','autoloot.wordmark.tilted'])
ignore=otTables.ChainContextSubst();ignore.Format=3
ignore.BacktrackGlyphCount=1;ignore.BacktrackCoverage=[coverage(word_glyphs)]
ignore.InputGlyphCount=1;ignore.InputCoverage=[coverage([name('a')])]
ignore.LookAheadGlyphCount=0;ignore.LookAheadCoverage=[]
ignore.SubstCount=0;ignore.SubstLookupRecord=[]
initial=otTables.ChainContextSubst();initial.Format=3
initial.BacktrackGlyphCount=0;initial.BacktrackCoverage=[]
initial.InputGlyphCount=1;initial.InputCoverage=[coverage([name('a')])]
initial.LookAheadGlyphCount=0;initial.LookAheadCoverage=[]
record=otTables.SubstLookupRecord();record.SequenceIndex=0;record.LookupListIndex=initial_single_idx
initial.SubstCount=1;initial.SubstLookupRecord=[record]
context_idx=append_lookup(6,[ignore,initial])
ss=otTables.FeatureRecord();ss.FeatureTag='ss01';ss.Feature=otTables.Feature()
params=otTables.FeatureParamsStylisticSet();params.Version=0;params.UINameID=max(n.nameID for n in font['name'].names)+1
font['name'].setName('Tilted opening a',params.UINameID,3,1,0x409)
ss.Feature.FeatureParams=params;ss.Feature.LookupListIndex=[word_alternate_idx,context_idx];ss.Feature.LookupCount=2
features=font['GSUB'].table.FeatureList
ss_index=len(features.FeatureRecord);features.FeatureRecord.append(ss);features.FeatureCount+=1
for script in font['GSUB'].table.ScriptList.ScriptRecord:
    if script.ScriptTag not in ['latn','DFLT']:continue
    systems=([script.Script.DefaultLangSys] if script.Script.DefaultLangSys else [])+[r.LangSys for r in script.Script.LangSysRecord]
    for system in systems:system.FeatureIndex.append(ss_index);system.FeatureCount+=1
# OpenType FeatureList must stay alphabetically ordered; remap language indices.
ordered=sorted(enumerate(features.FeatureRecord),key=lambda p:p[1].FeatureTag)
remap={old:new for new,(old,_) in enumerate(ordered)}
features.FeatureRecord=[r for _,r in ordered]
for script in font['GSUB'].table.ScriptList.ScriptRecord:
    systems=([script.Script.DefaultLangSys] if script.Script.DefaultLangSys else [])+[r.LangSys for r in script.Script.LangSysRecord]
    for system in systems:
        system.FeatureIndex=sorted(remap[i] for i in system.FeatureIndex)
        if system.ReqFeatureIndex!=0xFFFF:system.ReqFeatureIndex=remap[system.ReqFeatureIndex]

# Unicode presentation forms resolve to the same shapes as OpenType substitutions.
for code,glyph in [(0xFB00,'f_f'),(0xFB01,'fi'),(0xFB02,'fl'),(0xFB03,'f_f_i'),(0xFB04,'f_f_l')]: encode(chr(code),glyph)

# Keep ordinary ll and tt readable and independently spaced by default.
# Their decorative joined forms remain available through discretionary ligatures.
for record in font['GSUB'].table.FeatureList.FeatureRecord:
    if record.FeatureTag=='liga':
        for idx in record.Feature.LookupListIndex:
            for sub in font['GSUB'].table.LookupList.Lookup[idx].SubTable:
                for first in ['j','l','t']: getattr(sub,'ligatures',{}).pop(first,None)

# OpenType coverages and matching records must be ordered by glyph ID.
glyph_ids={g:i for i,g in enumerate(font.getGlyphOrder())}
for table in mark_tables:
    ordered=sorted(zip(table.MarkCoverage.glyphs,table.MarkArray.MarkRecord),key=lambda p:glyph_ids[p[0]])
    table.MarkCoverage.glyphs=[p[0] for p in ordered]
    table.MarkArray.MarkRecord=[p[1] for p in ordered]

# Font-specific brand spacing is supplied through GPOS, not negative CSS tracking.
lookup=otTables.Lookup();lookup.LookupType=2;lookup.LookupFlag=0
sub=otTables.PairPos();sub.Format=1
pairs=[('a','u',-12),('u','t',-12),('t','o',-22),('o','l',-12),('l','o',-12),('o','o',-8),('o','t',-18)]
by_first={}
for a,b,value in pairs: by_first.setdefault(name(a),[]).append((name(b),value))
order={g:i for i,g in enumerate(font.getGlyphOrder())}
sub.Coverage=otTables.Coverage();sub.Coverage.glyphs=sorted(by_first,key=order.get)
sub.ValueFormat1=4;sub.ValueFormat2=0;sub.PairSet=[]
from fontTools.ttLib.tables.otBase import ValueRecord
for first in sub.Coverage.glyphs:
    ps=otTables.PairSet();ps.PairValueRecord=[]
    for second,amount in sorted(by_first[first],key=lambda p:order[p[0]]):
        pv=otTables.PairValueRecord();pv.SecondGlyph=second;pv.Value1=ValueRecord();pv.Value1.XAdvance=amount;pv.Value2=None
        ps.PairValueRecord.append(pv)
    ps.PairValueCount=len(ps.PairValueRecord);sub.PairSet.append(ps)
sub.PairSetCount=len(sub.PairSet);lookup.SubTable=[sub];lookup.SubTableCount=1
idx=len(font['GPOS'].table.LookupList.Lookup)
font['GPOS'].table.LookupList.Lookup.append(lookup);font['GPOS'].table.LookupList.LookupCount+=1
for record in font['GPOS'].table.FeatureList.FeatureRecord:
    if record.FeatureTag=='kern':record.Feature.LookupListIndex.append(idx);record.Feature.LookupCount+=1

# Add new classes so shaping engines treat these as marks and bases correctly.
if 'GDEF' in font and font['GDEF'].table.GlyphClassDef:
    classes=font['GDEF'].table.GlyphClassDef.classDefs
    classes[comma_mark]=3
    classes['a.tilted']=1
    classes['autoloot.wordmark']=2
    classes['autoloot.wordmark.tilted']=2
    for g in font.getGlyphOrder():
        if g.startswith('uni') and g not in classes: classes[g]=1

# Slightly strengthen zero and percent without changing advance widths.
# TrueType outer contours run clockwise; counters run counterclockwise.
for char in '0%':
    glyph=font['glyf'][name(char)]
    start=0
    for end in glyph.endPtsOfContours:
        points=glyph.coordinates[start:end+1]
        area=sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))
        cx=(min(x for x,y in points)+max(x for x,y in points))/2
        cy=(min(y for x,y in points)+max(y for x,y in points))/2
        factor=.88 if area>0 else (1.025 if char=='%' else 1.0)
        for index in range(start,end+1):
            x,y=glyph.coordinates[index]
            glyph.coordinates[index]=(round(cx+(x-cx)*factor),round(cy+(y-cy)*factor))
        start=end+1
    glyph.recalcBounds(font['glyf'])
    # Keep metrics synchronized with the strengthened outlines and preserve
    # breathing room at the end of percentage labels.
    advance,_=font['hmtx'][name(char)]
    font['hmtx'][name(char)]=(max(advance,glyph.xMax+32),glyph.xMin)

# Rename the derivative while preserving copyright and all OFL metadata.
names={1:'Autoloot Display',2:'Black',3:'AutolootDisplay-Black-4.000',4:'Autoloot Display Black',6:'AutolootDisplay-Black',5:'Version 4.000',16:'Autoloot Display',17:'Black',18:'Autoloot Display Black',25:'AutolootDisplay'}
for record in font['name'].names:
    if record.nameID in names:record.string=names[record.nameID].encode(record.getEncoding())
font['name'].setName('Autoloot Display v4. Upright a with optional tilted initial ss01; remaining glyphs derived from OFL Fredoka.',10,3,1,0x409)
font['OS/2'].usWeightClass=900
# Compute vertical extents, including accent outlines, to prevent clipping.
all_bounds=[bounds(g) for g in font.getGlyphOrder()]
all_bounds=[b for b in all_bounds if b]
ymax=round(max(b[3] for b in all_bounds))+15;ymin=round(min(b[1] for b in all_bounds))-15
font['hhea'].ascent=ymax;font['hhea'].descent=ymin;font['hhea'].lineGap=0
font['OS/2'].sTypoAscender=ymax;font['OS/2'].sTypoDescender=ymin;font['OS/2'].sTypoLineGap=0
font['OS/2'].usWinAscent=ymax;font['OS/2'].usWinDescent=-ymin
font['head'].fontRevision=4.0
font.recalcTimestamp=False
font.save(OUT/'AutolootDisplay-Black.ttf')
font.flavor='woff2';font.save(OUT/'AutolootDisplay-Black.woff2')
print(f'Built v4: {len(cmap)} codepoints; {len(font.getGlyphOrder())} glyphs; ascent {ymax}, descent {ymin}.')
print('Source sha256:',hashlib.sha256(SOURCE.read_bytes()).hexdigest())

# Export the same default and alternate outlines as standalone SVG assets.
from fontTools.pens.svgPathPen import SVGPathPen
for suffix,glyph in [('', 'autoloot.wordmark'),('-tilted','autoloot.wordmark.tilted')]:
    pen=SVGPathPen(font.getGlyphSet())
    font.getGlyphSet()[glyph].draw(TransformPen(pen,(.25,0,0,-.25,min_x-5,190)))
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 190" role="img" aria-label="autoloot"><path fill="currentColor" d="{pen.getCommands()}"/></svg>\n'
    (ROOT/f'public/brand/autoloot-wordmark{suffix}.svg').write_text(svg)

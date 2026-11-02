"""Build a self-contained SVG puppet from fixed-canvas PSD layer exports."""
import json,base64,io
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent;source=root/'complete';manifest=json.loads((source/'layers.json').read_text());output=root.parents[2]/'public/characters/munny-idle.svg'
css='''
#talk:target{transform-origin:392px 752px;animation:talk-bounce .48s cubic-bezier(.22,.65,.35,1) infinite}
@keyframes talk-bounce{0%,100%{transform:translateY(0) scale(1)}12%{transform:translateY(1px) scale(1.004,.996)}42%{transform:translateY(-4px) scale(.998,1.003)}76%{transform:translateY(-1px) scale(1)}}
.mouth-open{opacity:0}
.mouth-closed{opacity:1}
#talk:target .mouth-open{animation:mouth-open 1.9s steps(1,end) infinite}
#talk:target .mouth-closed{animation:mouth-closed 1.9s steps(1,end) infinite}
@keyframes mouth-open{0%,18%,44%,61%,88%,100%{opacity:0}7%,27%,51%,73%{opacity:1}}
@keyframes mouth-closed{0%,18%,44%,61%,88%,100%{opacity:1}7%,27%,51%,73%{opacity:0}}
.tail{transform-origin:374px 404px;animation:tail 6s ease-in-out infinite}
.ear-left{transform-origin:350px 77px;animation:ear-left 11s ease-in-out infinite}
.ear-right{transform-origin:482px 99px;animation:ear-right 11s ease-in-out infinite}
.eye-left{transform-origin:434px 138px;animation:blink 7.2s linear infinite}
.eye-right{transform-origin:380px 121px;animation:blink 7.2s linear infinite}
@keyframes tail{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes ear-left{0%,66%,72%,100%{transform:rotate(0)}68%{transform:rotate(-3deg)}70%{transform:rotate(1deg)}}
@keyframes ear-right{0%,67%,73%,100%{transform:rotate(0)}69%{transform:rotate(2.5deg)}71%{transform:rotate(-1deg)}}
@keyframes blink{0%,42%,46%,100%{transform:scaleY(1)}43.4%,44.3%{transform:scaleY(.045)}}
@media(prefers-reduced-motion:reduce){.tail,.ear-left,.ear-right,.eye-left,.eye-right,#talk:target,#talk:target .mouth-open,#talk:target .mouth-closed{animation:none}}
'''
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="128 0 512 768" role="img" aria-labelledby="title"><title id="title">Munny idle puppet</title><style>'+css+'</style><g id="talk">']
for layer in manifest['layers']:
 name=layer['name']
 if name=='mouth':
  # Deliberate poses follow the face tilt; no scaling or rubbery interpolation.
  svg.append('<g transform="rotate(18 401 148)"><path class="mouth-closed" d="M394 147 Q401 153 408 147" fill="none" stroke="#2a211d" stroke-width="2.2" stroke-linecap="round"/><g class="mouth-open"><path d="M394 146 Q401 149 409 145 Q409 156 402 157 Q396 156 394 146Z" fill="#64372e" stroke="#2a211d" stroke-width="1.8" stroke-linejoin="round"/><path d="M399 154 Q403 151 407 154 Q404 157 402 156Z" fill="#ec9a7b"/></g></g>')
  continue
 im=Image.open(source/layer['file']).convert('RGBA');box=im.getchannel('A').getbbox();im=im.crop(box);b=io.BytesIO();im.save(b,format='PNG');data=base64.b64encode(b.getvalue()).decode()
 motion='tail' if name=='tail' else 'ear-left' if name.startswith('cat ear left') else 'ear-right' if name.startswith('cat ear right') else 'eye-left' if name in ['irides-l','eyelash-l'] else 'eye-right' if name in ['irides-r','eyelash-r'] else 'mouth' if name=='mouth' else ''
 # Each layer keeps its fixed canvas registration.
 svg.append('<g>'+f'<g class="{motion}"><image x="{box[0]}" y="{box[1]}" width="{im.width}" height="{im.height}" href="data:image/png;base64,{data}"/></g></g>')
svg.append('</g></svg>');output.write_text(''.join(svg));print(output,output.stat().st_size)

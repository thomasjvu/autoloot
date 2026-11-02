"""Local OBS assets and visual-only controls. No creator credentials required."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError
import json,time,threading,os
ROOT=Path(__file__).resolve().parents[1]
APP_ORIGIN=os.environ.get('AUTOLOOT_STREAM_APP','http://127.0.0.1:4173')
assert APP_ORIGIN in ('http://127.0.0.1:4173','http://127.0.0.1:4175')
CONTROL={'revision':0,'cueRevision':0,'expression':'joyful','text':'','follow':True,'at':0}
LOCK=threading.Lock()
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def valid_host(self):return self.headers.get('Host','') in ('127.0.0.1:4188','localhost:4188')
 def reply(self,data,status=200):
  body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  if not self.valid_host():return self.reply({'error':'Local host required'},403)
  if self.path.split('?')[0]=='/stream/vn-tts.js':
   body=(ROOT.parents[2]/'public/vendor/vn-tts/index.js').read_bytes();self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  if self.path.split('?')[0]=='/stream/state':
   with LOCK:data={'control':dict(CONTROL)}
   try:
    with urlopen(APP_ORIGIN+'/api/state',timeout=1.5) as r:state=json.load(r)
    c=state.get('companion',{});data['companion']={k:c.get(k) for k in ('message','mood','eventId','at','enabled','overlayVoice','reducedMotion')};data['connected']=True
    a=state.get('auction');product=next((p for p in state.get('products',[]) if a and p.get('id')==a.get('productId')),None)
    data['auction']={k:a.get(k) for k in ('id','productId','status','bidCount')} if a else None
    if a:data['auction'].update(title=(a.get('product') or product or {}).get('title','Next card'),price=(a.get('product') or product or {}).get('price',0))
   except (URLError,ValueError,TimeoutError):data['connected']=False
   return self.reply(data)
  return super().do_GET()
 def do_POST(self):
  if not self.valid_host() or self.headers.get('Origin') not in ('http://127.0.0.1:4188','http://localhost:4188'):return self.reply({'error':'Use the local control page'},403)
  if self.path!='/stream/control':return self.reply({'error':'Not found'},404)
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<=4096:raise ValueError()
   value=json.loads(self.rfile.read(size))
   with LOCK:
    if 'expression' in value:
     if value['expression'] not in ('neutral','joyful','surprised','thinking'):raise ValueError()
     if value['expression']!='neutral' and not (ROOT/f"assets/munny-{value['expression']}-open.svg").exists():return self.reply({'error':'Expression still processing'},409)
     CONTROL['expression']=value['expression']
    if 'follow' in value:
     if not isinstance(value['follow'],bool):raise ValueError()
     CONTROL['follow']=value['follow']
    if 'text' in value:
     CONTROL['text']=str(value['text'])[:350];CONTROL['cueRevision']+=1
    CONTROL['at']=time.time()*1000;CONTROL['revision']+=1
    result=dict(CONTROL)
   self.reply(result)
  except (ValueError,TypeError):self.reply({'error':'Invalid cue'},400)
 def log_message(self,fmt,*args):
  if not self.path.startswith('/stream/state'):super().log_message(fmt,*args)
if __name__=='__main__':
 print('Shop: http://127.0.0.1:4188/stream/shop.html\nControls: http://127.0.0.1:4188/stream/control.html',flush=True)
 ThreadingHTTPServer(('127.0.0.1',4188),Handler).serve_forever()

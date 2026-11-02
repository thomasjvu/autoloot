"""Create an importable OBS collection without changing active OBS settings."""
from pathlib import Path
import json,uuid,copy
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'obs';OUT.mkdir(exist_ok=True)
template=json.loads((Path.home()/'Library/Application Support/obs-studio/basic/scenes/Untitled.json').read_text())
defaults=template['sources'][0]
sources=[]
def source(name,kind,settings,mixers=0):
    data=copy.deepcopy(defaults)
    data.update(name=name,uuid=str(uuid.uuid4()),id=kind,versioned_id=kind,settings=settings,mixers=mixers,muted=False,volume=1.,hotkeys={},private_settings={})
    sources.append(data);return data
def browser(name,url,w=1920,h=1080,sound=False):
    return source(name,'browser_source',{'url':url,'width':w,'height':h,'fps':30,'fps_custom':True,'shutdown':True,'restart_when_active':True,'reroute_audio':True,'css':'body { margin: 0px auto; overflow: hidden; }'},63 if sound else 0)
welcome=browser('Munny - welcome and babble','http://127.0.0.1:4188/stream/shop.html?autoplay=1&sound=1',sound=True)
room=browser('Munny shop - live room','http://127.0.0.1:4188/stream/shop.html?mode=live&expression=joyful&sound=1',sound=True)
board=source('Board - live content backing','color_source_v3',{'color':4280822053,'width':920,'height':490})
auction=browser('Autoloot - public auction widget','http://127.0.0.1:4173/overlay?widget=chalk-auction',960,500)
auction['settings']['css']='body{margin:0;overflow:hidden}'
vote=browser('Autoloot - public vote widget','http://127.0.0.1:4173/overlay?widget=chalk-vote',1000,550)
vote['settings']['css']='body{margin:0;overflow:hidden}'
brb=browser('Munny - break screen','http://127.0.0.1:4188/stream/shop.html?mode=brb&autoplay=1')
rehearsal=source('Full video - rehearsal only','ffmpeg_source',{'is_local_file':True,'local_file':str(ROOT/'renders/Autoloot-Munny-Practice-Demo-Final.mp4'),'looping':False,'restart_on_activate':True,'close_when_inactive':True,'clear_on_media_end':False,'hw_decode':True},63)
scenes=[]
def scene(name,items):
    content=[]
    for i,(s,x,y,scale) in enumerate(items,1):
        content.append({'name':s['name'],'source_uuid':s['uuid'],'visible':True,'locked':True,'rot':0.,'pos':{'x':float(x),'y':float(y)},'scale':{'x':scale,'y':scale},'align':5,'bounds_type':0,'bounds_align':0,'bounds':{'x':0.,'y':0.},'crop_left':0,'crop_top':0,'crop_right':0,'crop_bottom':0,'id':i,'group_item_backup':False,'scale_filter':'bilinear','blend_method':'default','blend_type':'normal','show_transition':{'duration':0},'hide_transition':{'duration':0}})
    s=source(name,'scene',{'id_counter':len(content),'custom_size':False,'items':content});scenes.append(s)
scene('01 - Welcome to Autoloot',[(welcome,0,0,1.)])
scene('02 - Live auction',[(room,0,0,1.),(board,940,125,1.),(auction,970,140,.9)])
scene('03 - Chat chooses the lot',[(room,0,0,1.),(board,940,125,1.),(vote,960,140,.86)])
scene('04 - Be right back',[(brb,0,0,1.)])
scene('05 - Full video rehearsal',[(rehearsal,0,0,1.)])
doc={'name':'Autoloot Rehearsal','current_scene':scenes[0]['name'],'current_program_scene':scenes[0]['name'],'scene_order':[{'name':s['name']} for s in scenes],'sources':sources,'groups':[],'quick_transitions':template['quick_transitions'],'transitions':[],'saved_projectors':[],'current_transition':'Fade','transition_duration':300,'preview_locked':False,'scaling_enabled':False,'scaling_level':0,'scaling_off_x':0.,'scaling_off_y':0.,'virtual-camera':{'type2':3},'modules':{},'version':2}
(OUT/'Autoloot-Rehearsal.json').write_text(json.dumps(doc,indent=2))
print('Built OBS scene collection:',OUT/'Autoloot-Rehearsal.json')
print('Five scenes; 1080p design; no camera, desktop capture, microphone or stream credentials included.')

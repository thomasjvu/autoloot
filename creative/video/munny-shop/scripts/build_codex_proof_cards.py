from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import textwrap
v=Path('/Users/area/live-shopping-companion/creative/video/munny-shop');a=v/'assets';root=v.parents[2]
brand=ImageFont.truetype(str(root/'public/fonts/AutolootDisplay-Black.ttf'),68);mono=ImageFont.truetype(str(a/'MapleMono-Variable.ttf'),34);small=ImageFont.truetype(str(a/'MapleMono-Variable.ttf'),23)
def card(title):
 im=Image.new('RGB',(1920,1080),'#252b28');d=ImageDraw.Draw(im);d.text((100,70),title,font=brand,fill='#f6e88d');return im,d
def lines(d,text,x,y,color='#fff4d9',width=75,font=mono):
 for row in textwrap.wrap(text,width):d.text((x,y),row,font=font,fill=color);y+=48
 return y
im,d=card('Built with OpenAI Codex')
d.text((100,185),'REAL DEVELOPMENT SESSION EXCERPT',font=small,fill='#a9dff2')
y=lines(d,'Creator request: command controls in Settings, shorter agent replies, and a fix for conflicting styles.',100,250,width=73)
y=lines(d,'Codex implemented Settings / Chat commands toggles and added a regression test for disabled Twitch commands.',100,y+40,'#c4edba',73)
d.text((100,680),'tests/twitch.test.mjs + tests/codex-connection.test.mjs',font=small,fill='#a9dff2');d.text((100,735),'18 tests passed / 0 failed',font=mono,fill='#c4edba')
d.text((100,940),'Session: 01a16e8f-841c-79a0-b112-70203726cce8',font=small,fill='#d0cec0');im.save(a/'codex-build-proof.png')
im,d=card('Codex inside the cohost')
for y,t,c in [(230,'Creator question + sanitized shop snapshot','#a9dff2'),(350,'Local Codex CLI: codex exec','#c4edba'),(470,'Read-only sandbox + structured JSON output','#f6b6c9'),(590,'Munny reply or proposed action for review','#f6e88d')]:d.text((100,y),t,font=mono,fill=c)
lines(d,'Autoloot validates bids, timers and winners. Codex cannot mark a payment or choose the winner.',100,740,width=76)
d.text((100,950),'Source: lib/integrations/companion.mjs',font=small,fill='#d0cec0');im.save(a/'codex-cohost-flow.png')
print('Codex development and cohost explanation cards created')

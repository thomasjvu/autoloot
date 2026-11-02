local root='/Users/area/live-shopping-companion/creative/video/munny-shop/'
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject();local old=p:GetCurrentTimeline();assert(old:GetName()=='14 - Real Twitch - Chalk transitions - 2m10s');local tl=old:DuplicateTimeline('15 - Twitch and Codex evidence - 2m40s');assert(tl);p:SetCurrentTimeline(tl);local pool=p:GetMediaPool()
local function media(path)local c=pool:ImportMedia({root..path});assert(c and c[1]);return c[1]end
local base=media('renders/Autoloot-Munny-Practice-Demo-Final.mp4');local proof=media('renders/codex-proof-with-munny.mp4');local font=media('renders/dialogue-website-fonts-alpha.mov')
for _,kind in ipairs({'video','audio'})do local remove={};for _,item in ipairs(tl:GetItemListInTrack(kind,1))do if item:GetStart()>=3000 and item:GetEnd()>3800 then table.insert(remove,item)end end;assert(#remove==1);assert(tl:DeleteClips(remove,false))end
local fontClips=tl:GetItemListInTrack('video',3);assert(tl:DeleteClips(fontClips,false))
local function add(c,source,count,pos,kind,track)assert(pool:AppendToTimeline({{mediaPoolItem=c,startFrame=source,endFrame=source+count-1,mediaType=kind,trackIndex=track,recordFrame=pos}}))end
for _,kind in ipairs({1,2})do add(base,2910,570,3018,kind,1);add(proof,0,900,3588,kind,1);add(base,3480,300,4488,kind,1)end
add(font,0,3588,0,1,3);add(font,3588,300,4488,1,3)
tl:AddMarker(3588,'Purple','How we built with Codex','Actual development-session example and 18 passing tests.',300);tl:AddMarker(3888,'Purple','How Codex powers the cohost','Sanitized shop context / codex exec / structured reply or reviewed proposal.',300);tl:AddMarker(4188,'Purple','Real Codex cohost response','Approved authenticated request; correct Charizard, autoloot_tech, $60 and 3 bids.',300)
tl:SetCurrentTimecode('00:02:22:00');pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Twitch-And-Codex-Evidence.drp'));r:OpenPage('edit')

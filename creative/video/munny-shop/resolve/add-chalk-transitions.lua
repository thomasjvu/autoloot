local root='/Users/area/live-shopping-companion/creative/video/munny-shop/'
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject();local pool=p:GetMediaPool();pool:SetCurrentFolder(pool:GetRootFolder())
local function media(path)local c=pool:ImportMedia({root..path});assert(c and c[1]);return c[1]end
local base=media('renders/Autoloot-Munny-Practice-Demo-Final.mp4');local real=media('capture/twitch-real/competitive-twitch-original.mov')
local cards={media('assets/transition-site.png'),media('assets/transition-bids.png'),media('assets/transition-setup.png')};local chat=media('assets/twitch-chat-proof.png')
local tl=pool:CreateEmptyTimeline('14 - Real Twitch - Chalk transitions - 2m10s');assert(tl);tl:SetStartTimecode('00:00:00:00');tl:AddTrack('video');local pos=0;local close=nil
local function add(clip,start,frames,label,silent)
 local v=pool:AppendToTimeline({{mediaPoolItem=clip,startFrame=start,endFrame=start+frames-1,mediaType=1,trackIndex=1,recordFrame=pos}});assert(v and v[1]);if not silent then assert(pool:AppendToTimeline({{mediaPoolItem=clip,startFrame=start,endFrame=start+frames-1,mediaType=2,trackIndex=1,recordFrame=pos}}))end
 tl:AddMarker(pos,'Green',label,'Native editable cut. Actual Twitch integration; no-sale rehearsal.',frames);pos=pos+frames;return v[1]
end
add(base,0,540,'Munny welcome');add(cards[1],0,36,'Explore the shop',true);add(base,540,720,'Studio and Your show');add(cards[2],0,36,'Let the bidding begin',true)
add(real,8850,750,'Actual introduction and opening bid');add(real,10050,300,'Competing Twitch bid');add(real,12000,300,'Third Twitch bid')
local chatStart=pos;close=add(real,14250,300,'Auction close and actual Twitch chat');close:SetProperty('ZoomX',0.53);close:SetProperty('ZoomY',0.53);close:SetProperty('Tilt',245)
assert(pool:AppendToTimeline({{mediaPoolItem=chat,startFrame=0,endFrame=299,mediaType=1,trackIndex=2,recordFrame=chatStart}}));tl:SetTrackName('video',2,'Actual Twitch chat history')
add(cards[3],0,36,'Make it your stream',true);add(base,2910,870,'Codex setup, native OBS sources, farewell');assert(pos==3888);assert(tl:GetEndFrame()-tl:GetStartFrame()==3888)
p:SetCurrentTimeline(tl);tl:SetCurrentTimecode('00:00:44:00');pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Chalk-Transitions.drp'));r:OpenPage('edit')

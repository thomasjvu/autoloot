local root='/Users/area/live-shopping-companion/creative/video/munny-shop/'
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject();assert(p)
local pool=p:GetMediaPool();pool:SetCurrentFolder(pool:GetRootFolder())
local function media(path)
 local list=pool:ImportMedia({root..path});assert(list and list[1]);return list[1]
end
local base=media('renders/Autoloot-Munny-Practice-Demo-Final.mp4')
local real=media('capture/twitch-real/competitive-twitch-original.mov')
local tl=pool:CreateEmptyTimeline('13 - Real Twitch - Native editable cuts - 2m06s');assert(tl);tl:SetStartTimecode('00:00:00:00')
local segments={{base,0,42,'Intro and studio'},{real,295,25,'Actual card introduction and opening Twitch bid'},{real,335,10,'Competing Twitch bid'},{real,400,10,'Third Twitch bid'},{real,475,10,'Actual auction close'},{base,97,29,'Codex, OBS setup and farewell'}}
local pos=0
for _,s in ipairs(segments)do
 for _,kind in ipairs({1,2})do assert(pool:AppendToTimeline({{mediaPoolItem=s[1],startFrame=s[2]*30,endFrame=(s[2]+s[3])*30-1,mediaType=kind,trackIndex=1,recordFrame=pos*30}}))end
 tl:AddMarker(pos*30,'Green',s[4],'No-sale rehearsal. Real Twitch messages; waiting time removed.',1);pos=pos+s[3]
end
assert(tl:GetEndFrame()-tl:GetStartFrame()==3780,'Unexpected timeline duration');p:SetCurrentTimeline(tl);tl:SetCurrentTimecode('00:00:42:00');pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Real-Twitch-Demo.drp'));r:OpenPage('edit')

-- Run in Resolve's Lua console with dofile('/absolute/path/to/assemble.lua').
-- Uses the current newly created demo project. Never deletes timelines or media.
local root='/Users/area/live-shopping-companion/videos/munny-shop/'
local r=resolve or Resolve()
assert(r,'Resolve API unavailable')
local pm=r:GetProjectManager()
local project=pm:GetCurrentProject()
assert(project and project:GetName()=='Autoloot - Munny Shop Demo v1','Open the Munny demo project first')
project:SetSetting('timelineFrameRate','30')
project:SetSetting('timelineResolutionWidth','1920')
project:SetSetting('timelineResolutionHeight','1080')
local pool=project:GetMediaPool()
local bin=pool:AddSubFolder(pool:GetRootFolder(),'Munny Shop v1')
assert(bin,'Bin already exists; inspect existing import before rerunning')
pool:SetCurrentFolder(bin)
local paths={
 'renders/shop-background-1080.mov','renders/munny-positioned-1080.mov',
 'renders/counter-positioned-1080.mov','renders/dialogue-alpha-v1.mov',
 'renders/door-alpha-v1.mov','assets/intro-sound-v1.wav',
 'renders/munny-shop-intro-v1.mp4','assets/dialogue-empty-1080.png',
 'assets/shop-live-1080.png','renders/recording-slots-v1.mp4'
}
local clips={}
for i,p in ipairs(paths) do
 local result=pool:ImportMedia({root..p})
 assert(result and result[1],'Import failed: '..p)
 clips[i]=result[1]
end
local intro=pool:CreateEmptyTimeline('01 - Shop entrance - layered 18s')
assert(intro,'Could not create intro timeline')
intro:SetStartTimecode('00:00:00:00')
while intro:GetTrackCount('video')<5 do intro:AddTrack('video') end
local names={'Shop interior','Munny character','Counter foreground','Dialogue alpha','Door entrance alpha'}
for i=1,5 do
 intro:SetTrackName('video',i,names[i])
 local added=pool:AppendToTimeline({{mediaPoolItem=clips[i],startFrame=0,endFrame=540,mediaType=1,trackIndex=i,recordFrame=0}})
 assert(added and #added>0,'Layer append failed: '..names[i])
end
if intro:GetTrackCount('audio')<1 then intro:AddTrack('audio','stereo') end
intro:SetTrackName('audio',1,'Original babble + entrance sounds')
pool:AppendToTimeline({{mediaPoolItem=clips[6],startFrame=0,endFrame=540,mediaType=2,trackIndex=1,recordFrame=0}})
intro:AddMarker(153,'Green','Munny welcome','First dialogue page',126)
intro:AddMarker(291,'Green','Start the show','Second dialogue page',180)
intro:AddMarker(480,'Yellow','Transition to real footage','Display push-in is still to be built after source footage capture',60)
local main=pool:CreateEmptyTimeline('02 - Submission assembly - 2m45s')
main:SetStartTimecode('00:00:00:00')
pool:AppendToTimeline({{mediaPoolItem=clips[7],startFrame=0,endFrame=540,recordFrame=0}})
pool:AppendToTimeline({{mediaPoolItem=clips[10],startFrame=0,endFrame=4410,mediaType=1,trackIndex=1,recordFrame=540}})
local sections={{18,38,'Photo to lot'},{38,55,'Real Twitch vote + approval'},{55,95,'Real auction + extension + winner'},{95,125,'Private order + signed sandbox payment'},{125,138,'Fulfillment handoff'},{138,158,'Actual Codex evidence'},{158,165,'Shop farewell + repository'}}
for _,s in ipairs(sections) do main:AddMarker(s[1]*30,'Yellow',s[3],'RECORDING REQUIRED — replace the labeled slot with actual footage',(s[2]-s[1])*30) end
project:SetCurrentTimeline(intro)
intro:SetCurrentTimecode('00:00:06:00')
pm:SaveProject()
local exported=pm:ExportProject(project:GetName(),root..'resolve/Autoloot-Munny-Shop-v1.drp')
r:OpenPage('edit')
print('MUNNY BUILD COMPLETE: layered intro + 2:45 recording assembly. Export: '..tostring(exported))

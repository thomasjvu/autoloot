-- Add v2 without changing the original v1 timelines.
local root='/Users/area/live-shopping-companion/videos/munny-shop/'
local version=MUNNY_VERSION or 'v2'
assert(version=='v2' or version=='v3')
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject()
assert(p and p:GetName()=='Autoloot - Munny Shop Demo v1','Open the demo project')
local pool=p:GetMediaPool();local binName='Munny Shop '..version..' - close and lipsync'
local bin=nil
for _,folder in ipairs(pool:GetRootFolder():GetSubFolderList()) do if folder:GetName()==binName then bin=folder end end
bin=bin or pool:AddSubFolder(pool:GetRootFolder(),binName)
assert(bin,'Could not create media bin');pool:SetCurrentFolder(bin)
local paths={'renders/shop-background-v2.mov','renders/munny-lipsync-v2.mov','renders/counter-positioned-v2.mov','renders/dialogue-alpha-v2.mov','renders/door-alpha-v1.mov','assets/intro-sound-v2.wav','renders/munny-shop-intro-v2.mp4','renders/recording-slots-v1.mp4'}
local clips={}
for i,path in ipairs(paths) do path=path:gsub('v2',version);local result=pool:ImportMedia({root..path});assert(result and result[1],path);clips[i]=result[1] end
local introName=(version=='v3' and '05' or '03')..' - Close shop + syllable lipsync '..version
local intro=nil
for i=1,p:GetTimelineCount() do local t=p:GetTimelineByIndex(i);if t:GetName()==introName then intro=t end end
pool:SetCurrentFolder(pool:GetRootFolder())
intro=intro or pool:CreateEmptyTimeline(introName);assert(intro,'Could not create intro timeline')
for i=1,intro:GetTrackCount('video') do assert(#intro:GetItemListInTrack('video',i)==0,'Intro already populated; preserving it') end
p:SetCurrentTimeline(intro)
intro:SetStartTimecode('00:00:00:00')
while intro:GetTrackCount('video')<5 do intro:AddTrack('video') end
for i,name in ipairs({'Simple close shop','Munny - timed mouth poses','Clean counter','Timed dialogue','Door entrance'}) do
 intro:SetTrackName('video',i,name)
 local added=pool:AppendToTimeline({{mediaPoolItem=clips[i],startFrame=0,endFrame=540,mediaType=1,trackIndex=i,recordFrame=0}})
 assert(added and #added==1,'Layer append failed: '..name)
end
if intro:GetTrackCount('audio')<1 then intro:AddTrack('audio','stereo') end
intro:SetTrackName('audio',1,'Babble - shared syllable timestamps')
pool:AppendToTimeline({{mediaPoolItem=clips[6],startFrame=0,endFrame=540,mediaType=2,trackIndex=1,recordFrame=0}})
intro:AddMarker(153,'Green','Welcome','Mouth and original babble share burst timestamps',126)
intro:AddMarker(291,'Green','Introduce the show','Mouth closes at punctuation and after text',180)
local main=pool:CreateEmptyTimeline((version=='v3' and '06' or '04')..' - Submission assembly '..version..' - 2m45s');assert(main)
main:SetStartTimecode('00:00:00:00')
pool:AppendToTimeline({{mediaPoolItem=clips[7],startFrame=0,endFrame=540,recordFrame=0}})
pool:AppendToTimeline({{mediaPoolItem=clips[8],startFrame=0,endFrame=4410,mediaType=1,trackIndex=1,recordFrame=540}})
local sections={{18,38,'Photo to lot'},{38,55,'Real Twitch vote + approval'},{55,95,'Auction + extension + winner'},{95,125,'Private order + signed sandbox payment'},{125,138,'Fulfillment'},{138,158,'Codex evidence'},{158,165,'Shop farewell + repository'}}
for _,s in ipairs(sections) do main:AddMarker(s[1]*30,'Yellow',s[3],'RECORDING REQUIRED',(s[2]-s[1])*30) end
p:SetCurrentTimeline(intro);intro:SetCurrentTimecode('00:00:05:06')
local f=assert(io.open(root..'resolve/verification-'..version..'.txt','w'))
f:write('Intro: '..tostring(intro:GetEndFrame()-intro:GetStartFrame())..' frames\n')
for i=1,5 do f:write('V'..i..': '..#intro:GetItemListInTrack('video',i)..' clip\n') end
f:write('Submission: '..tostring(main:GetEndFrame()-main:GetStartFrame())..' frames\n');f:close()
pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Shop-'..version..'.drp'))
r:OpenPage('edit');print('V2 IMPORTED AND EXPORTED')

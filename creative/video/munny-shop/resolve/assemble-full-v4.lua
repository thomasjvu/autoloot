-- Build the complete rehearsal edit while retaining previous versions.
local root='/Users/area/live-shopping-companion/videos/munny-shop/'
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject()
assert(p and p:GetName()=='Autoloot - Munny Shop Demo v1','Open the demo project')
local pool=p:GetMediaPool();local bin=pool:AddSubFolder(pool:GetRootFolder(),'Munny full rehearsal v4')
assert(bin,'v4 already imported; inspect the existing timeline');pool:SetCurrentFolder(bin)
local paths={'renders/walkthrough-base-v4.mp4','renders/walkthrough-munny-alpha-v4.mov','renders/walkthrough-dialogue-alpha-v4.mov','assets/walkthrough-babble-v4.wav','renders/autoloot-full-rehearsal-v4.mp4','renders/munny-shop-intro-v4.mp4','renders/sandbox-label-v4.mov'}
local clips={}
for i,path in ipairs(paths) do local found=pool:ImportMedia({root..path});assert(found and found[1],path);clips[i]=found[1] end
pool:SetCurrentFolder(pool:GetRootFolder())
local tl=pool:CreateEmptyTimeline('07 - Full Munny rehearsal v4 - 2m45s');assert(tl)
tl:SetStartTimecode('00:00:00:00')
while tl:GetTrackCount('video')<4 do tl:AddTrack('video') end
tl:SetTrackName('video',1,'Replace labeled recording clips here')
tl:SetTrackName('video',2,'Munny - synchronized mouth')
tl:SetTrackName('video',3,'Munny dialogue - timed text')
tl:SetTrackName('video',4,'Keep sandbox label over checkout footage')
local chapters={{0,18,'Shop entrance + board transition'},{18,38,'PHOTO TO LOT - recording needed'},{38,55,'TWITCH VOTE - recording needed'},{55,95,'AUCTION - recording needed'},{95,125,'SANDBOX CHECKOUT - recording needed'},{125,138,'FULFILLMENT - recording needed'},{138,158,'CODEX EVIDENCE - recording needed'},{158,165,'Shop farewell'}}
for _,c in ipairs(chapters) do
 local added=pool:AppendToTimeline({{mediaPoolItem=clips[1],startFrame=c[1]*30,endFrame=c[2]*30,mediaType=1,trackIndex=1,recordFrame=c[1]*30}})
 assert(added and #added==1,c[3]);added[1]:SetClipColor(c[1]>=18 and c[1]<158 and 'Yellow' or 'Green')
 tl:AddMarker(c[1]*30,c[1]>=18 and c[1]<158 and 'Yellow' or 'Green',c[3],'Rehearsal edit. Replace V1 with actual OBS/Twitch footage; keep V2/V3 dialogue and character. Reframe around controls.',(c[2]-c[1])*30)
end
for i=2,3 do local added=pool:AppendToTimeline({{mediaPoolItem=clips[i],startFrame=0,endFrame=4950,mediaType=1,trackIndex=i,recordFrame=0}});assert(added and #added==1) end
local label=pool:AppendToTimeline({{mediaPoolItem=clips[7],startFrame=0,endFrame=900,mediaType=1,trackIndex=4,recordFrame=2850}});assert(label and #label==1)
for _,cue in ipairs(dofile(root..'resolve/dialogue-cues-v4.lua')) do tl:AddMarker(math.floor(cue[1]*30),'Blue','Munny: '..cue[3],'Timed dialogue and synchronized babble. Re-time both character and audio if the footage changes.',math.floor((cue[2]-cue[1])*30)) end
if tl:GetTrackCount('audio')<1 then tl:AddTrack('audio','stereo') end
tl:SetTrackName('audio',1,'Original babble + entrance sounds')
local sound=pool:AppendToTimeline({{mediaPoolItem=clips[4],startFrame=0,endFrame=4950,mediaType=2,trackIndex=1,recordFrame=0}});assert(sound and #sound==1)
p:SetCurrentTimeline(tl);tl:SetCurrentTimecode('00:00:21:00')
local f=assert(io.open(root..'resolve/verification-v4.txt','w'))
f:write('Timeline: '..tl:GetName()..'\nDuration: '..(tl:GetEndFrame()-tl:GetStartFrame())..' frames\n')
for i=1,4 do f:write('V'..i..': '..#tl:GetItemListInTrack('video',i)..' clips\n') end
f:write('A1: '..#tl:GetItemListInTrack('audio',1)..' clip\nFootage: not recorded; labeled slates only.\n');f:close()
pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Full-Rehearsal-v4.drp'))
r:OpenPage('edit');print('FULL REHEARSAL IMPORTED')

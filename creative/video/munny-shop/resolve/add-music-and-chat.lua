local root='/Users/area/live-shopping-companion/creative/video/munny-shop/'
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject();local tl=p:GetCurrentTimeline();assert(tl:GetName()=='14 - Real Twitch - Chalk transitions - 2m10s');local pool=p:GetMediaPool()
local function media(path)local c=pool:ImportMedia({root..path});assert(c and c[1]);return c[1]end
local chat=media('renders/twitch-message-cues-alpha.mov');local audio=media('assets/bidding-music-and-chalk-cues.wav')
local history=tl:GetItemListInTrack('video',2);if #history>0 then assert(tl:DeleteClips(history,false))end
while tl:GetTrackCount('video')<4 do tl:AddTrack('video')end
while tl:GetTrackCount('audio')<2 do tl:AddTrack('audio','stereo')end
assert(pool:AppendToTimeline({{mediaPoolItem=chat,startFrame=0,endFrame=3887,mediaType=1,trackIndex=4,recordFrame=0}}));assert(pool:AppendToTimeline({{mediaPoolItem=audio,startFrame=0,endFrame=3887,mediaType=2,trackIndex=2,recordFrame=0}}))
tl:SetTrackName('video',4,'Individual authentic Twitch bid messages');tl:SetTrackName('audio',2,'Original soft bidding music and chalk cues');tl:SetCurrentTimecode('00:01:13:00');pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Music-And-Twitch-Cues.drp'))

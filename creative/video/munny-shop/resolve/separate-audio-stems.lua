local root='/Users/area/live-shopping-companion/creative/video/munny-shop/';local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject();local tl=p:GetCurrentTimeline();assert(tl:GetName()=='15 - Twitch and Codex evidence - 2m40s');local pool=p:GetMediaPool()
for n=1,tl:GetTrackCount('audio')do local items=tl:GetItemListInTrack('audio',n);if #items>0 then tl:DeleteClips(items,false)end end
while tl:GetTrackCount('audio')<6 do tl:AddTrack('audio','stereo')end
local stems={{'mix-dialogue.wav','Dialogue and VN babble'},{'mix-music-full.wav','Music - full film / gentle bidding lift'},{'mix-sfx-chalk.wav','SFX - chalk transitions'},{'mix-sfx-door.wav','SFX - entrance door and bell'},{'mix-sfx-bids.wav','SFX - accepted bid register'},{'mix-sfx-finalize.wav','SFX - auction finalized'}}
for i,s in ipairs(stems)do local c=pool:ImportMedia({root..'assets/'..s[1]});assert(c and c[1]);assert(pool:AppendToTimeline({{mediaPoolItem=c[1],startFrame=0,endFrame=4787,mediaType=2,trackIndex=i,recordFrame=0}}));tl:SetTrackName('audio',i,s[2])end
pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Separate-Audio-Stems.drp'));r:OpenPage('fairlight')

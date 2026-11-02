local root='/Users/area/live-shopping-companion/creative/video/munny-shop/'
local r=resolve or Resolve();local pm=r:GetProjectManager();local p=pm:GetCurrentProject();local pool=p:GetMediaPool();local tl=p:GetCurrentTimeline();assert(tl:GetName()=='13 - Real Twitch - Native editable cuts - 2m06s')
local imported=pool:ImportMedia({root..'assets/twitch-chat-proof.png'});assert(imported and imported[1]);if tl:GetTrackCount('video')<2 then tl:AddTrack('video')end
local clips=tl:GetItemListInTrack('video',1);local close=clips[5];assert(close:GetStart()-tl:GetStartFrame()==2610)
assert(close:SetProperty('ZoomX',0.53));assert(close:SetProperty('ZoomY',0.53));assert(close:SetProperty('Tilt',245))
assert(pool:AppendToTimeline({{mediaPoolItem=imported[1],startFrame=0,endFrame=299,mediaType=1,trackIndex=2,recordFrame=2610}}))
tl:SetTrackName('video',2,'Actual Twitch chat capture');tl:AddMarker(2610,'Purple','Twitch chat proof','Actual captured channel chat history beside the recorded auction close. No-sale rehearsal.',300);tl:SetCurrentTimecode('00:01:30:00');pm:SaveProject();assert(pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Real-Twitch-Demo-With-Chat.drp'))

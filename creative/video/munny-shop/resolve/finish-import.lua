-- Complete the first import when still-source duration prevented long still layers.
local root='/Users/area/live-shopping-companion/videos/munny-shop/'
local r=resolve or Resolve()
local pm=r:GetProjectManager(); local p=pm:GetCurrentProject(); local pool=p:GetMediaPool()
assert(p:GetName()=='Autoloot - Munny Shop Demo v1')
local tl=p:GetTimelineByIndex(1); p:SetCurrentTimeline(tl)
for i,name in ipairs({'shop-background-1080','munny-positioned-1080','counter-positioned-1080'}) do
 local old=tl:GetItemListInTrack('video',i)
 for _,item in ipairs(old or {}) do assert(item:GetName()==name..'.png','Unexpected track content; preserving it') end
 if old and #old>0 then assert(tl:DeleteClips(old,false),'Could not replace generated still layer') end
 local clips=pool:ImportMedia({root..'renders/'..name..'.mov'})
 local added=pool:AppendToTimeline({{mediaPoolItem=clips[1],startFrame=0,endFrame=540,mediaType=1,trackIndex=i,recordFrame=0}})
 assert(added and #added>0,'Append failed: '..name)
end
tl:SetCurrentTimecode('00:00:06:00')
local f=io.open(root..'resolve/verification.txt','w')
for i=1,p:GetTimelineCount() do
 local t=p:GetTimelineByIndex(i)
 f:write(t:GetName()..' duration frames '..tostring(t:GetEndFrame()-t:GetStartFrame())..'\n')
 for track=1,t:GetTrackCount('video') do
  f:write('V'..track..' '..tostring(#t:GetItemListInTrack('video',track))..' clips\n')
 end
end
f:close()
pm:SaveProject()
print('Saved and exported:',pm:ExportProject(p:GetName(),root..'resolve/Autoloot-Munny-Shop-v1.drp'))
r:OpenPage('edit')

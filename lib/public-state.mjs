// Explicit public projection: profile instructions and provider configuration stay private.
export function publicCompanion(companion) {
 return Object.fromEntries(['name','avatar','message','mood','eventId','at','enabled','overlayVoice','reducedMotion','provider'].filter(key=>companion[key]!==undefined).map(key=>[key,companion[key]]));
}
export function publicPulls(pulls=[]) {
 return pulls.slice(0,20).map(({id,name,number,setName,rarity,at})=>({id,name,number,setName,rarity,at}));
}

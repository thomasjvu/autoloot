const original='/characters/mochi-street-v3.png';
const rig='/characters/munny-idle.svg';
let speaking=false;
export function companionAsset(avatar){return !avatar||avatar===original?rig+(speaking?'#talk':''):avatar;}
export function setCompanionSpeaking(value){
 speaking=Boolean(value);
 for(const image of document.querySelectorAll('img')){
   const src=image.getAttribute('src');
   if(src===rig||src===rig+'#talk')image.setAttribute('src',rig+(speaking?'#talk':''));
 }
}

export const defaultProfile=Object.freeze({name:'Munny',tone:'warm',instructions:'',avatar:'/characters/mochi-street-v3.png'});
export function companionProfile(companion={}){return {...defaultProfile,...Object.fromEntries(Object.keys(defaultProfile).filter(key=>companion[key]!==undefined).map(key=>[key,companion[key]]))};}
export function validateProfile(input){
 const name=String(input.name||'').trim(),instructions=String(input.instructions||'').trim(),tone=input.tone,avatar=String(input.avatar||defaultProfile.avatar);
 if(!name||name.length>40)throw Error('Choose a companion name up to 40 characters.');
 if(!['warm','concise','playful','calm'].includes(tone))throw Error('Choose a supported tone.');
 if(instructions.length>1000)throw Error('Keep companion preferences under 1,000 characters.');
 if(avatar!==defaultProfile.avatar&&!/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(avatar))throw Error('Choose an uploaded image or the default avatar.');
 return {name,tone,instructions,avatar};
}

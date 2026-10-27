// DOM is supplied by the caller; importing presentation/lifecycle helpers is safe in Node.
export function captureDraftFocus(document) {
 const focused=document.activeElement;
 return {
  drawer:focused?.closest?.('.munny-drawer')?{id:focused.id,quickInput:focused.matches('#mochi-quick-form input'),start:focused.selectionStart,end:focused.selectionEnd}:null,
  draft:focused?.tagName==='INPUT'?{name:focused.name,value:focused.value}:null,
 };
}
export function restoreDraftFocus(document,{drawer,draft},{quickOpen,escape}) {
 if(drawer&&quickOpen){
  const target=drawer.quickInput?document.querySelector('#mochi-quick-form input'):drawer.id?document.getElementById(drawer.id):null;
  target?.focus();
  if(drawer.quickInput&&target)target.setSelectionRange(drawer.start,drawer.end);
 }
 if(draft?.name&&!drawer){
  const input=document.querySelector(`input[name="${escape(draft.name)}"]`);
  if(input){input.value=draft.value;input.focus();}
 }
}

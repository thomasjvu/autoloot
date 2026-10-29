// Only explicitly opted-in inline forms are snapshotted. Modal/maximum forms own
// their lifecycle; credentials and security fields never enter these drafts.
const safe=control=>['INPUT','TEXTAREA','SELECT'].includes(control.tagName)&&control.name&&!['password','file','hidden','submit','button','reset'].includes(control.type)&&!/(password|secret|token|credential|api.?key)/i.test(control.name);
const controls=form=>Array.from(form.elements||[]).filter(safe);
const identity=control=>JSON.stringify([control.tagName,control.name,control.type,['checkbox','radio'].includes(control.type)?control.value:'']);
const caret=element=>{try{return {start:element.selectionStart,end:element.selectionEnd,direction:element.selectionDirection};}catch{return {};}};
function focus(element,selection){element?.focus();if(element&&selection?.start!=null&&typeof element.setSelectionRange==='function')try{element.setSelectionRange(selection.start,selection.end,selection.direction);}catch{}}
export function captureDraftFocus(document) {
 const focused=document.activeElement,app=document.getElementById('app');
 const forms=Array.from(app?.querySelectorAll('form[data-draft-key]')||[]).map(form=>({key:form.dataset.draftKey,fields:controls(form).map(control=>({key:identity(control),value:control.value,checked:control.checked,selected:control.tagName==='SELECT'?Array.from(control.options).filter(o=>o.selected).map(o=>o.value):null})),focused:form.contains(focused)?identity(focused):null,selection:form.contains(focused)?caret(focused):null}));
 const drawer=focused?.closest?.('.munny-drawer')?{id:focused.id,quickInput:focused.matches('#mochi-quick-form input'),...caret(focused)}:null;
 const formId=focused?.form?.id||null;
 const standalone=focused?.tagName==='INPUT'&&safe(focused)&&focused.id&&app?.contains(focused)&&(!focused.form||formId)&&!focused.form?.dataset.draftKey&&formId!=='maximum-bid-form'&&!drawer?{id:focused.id,formId,type:focused.type,value:focused.value,...caret(focused)}:null;
 return {surface:app?.dataset.draftSurface,forms,drawer,standalone};
}
export function restoreDraftFocus(document,{surface,forms=[],drawer,standalone},{quickOpen}) {
 const app=document.getElementById('app');
 if(surface!==app?.dataset.draftSurface)return;
 for(const saved of forms){
  const matches=Array.from(app?.querySelectorAll('form[data-draft-key]')||[]).filter(form=>form.dataset.draftKey===saved.key);
  if(matches.length!==1)continue;
  const form=matches[0],fields=controls(form);
  for(const savedField of saved.fields){
   const matches=fields.filter(field=>identity(field)===savedField.key);if(matches.length!==1)continue;
   const field=matches[0];
   if(field.tagName==='SELECT')for(const option of field.options)option.selected=savedField.selected.includes(option.value);
   else if(['checkbox','radio'].includes(field.type))field.checked=savedField.checked;
   else field.value=savedField.value;
  }
  if(saved.focused)focus(fields.find(field=>identity(field)===saved.focused),saved.selection);
 }
 if(drawer&&quickOpen){const target=drawer.quickInput?document.querySelector('#mochi-quick-form input'):drawer.id?document.getElementById(drawer.id):null;focus(target,drawer);}
 if(standalone){const input=document.getElementById(standalone.id);if(input&&app?.contains(input)&&safe(input)&&input.type===standalone.type&&(input.form?.id||null)===standalone.formId&&!input.form?.dataset.draftKey&&input.form?.id!=='maximum-bid-form'){input.value=standalone.value;focus(input,standalone);}}
}

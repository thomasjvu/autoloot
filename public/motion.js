// Deliberate navigation feedback only; live state refreshes never re-enter.
let lastSection;
export function enterSection(section, element) {
  if (section === lastSection) return;
  lastSection = section;
  if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});
}
export function openDialog(element) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.animate([{opacity:0,transform:'translateY(8px) scale(.99)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:170,easing:'cubic-bezier(.2,.7,.2,1)'});
}

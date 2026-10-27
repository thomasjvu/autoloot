// Deliberate navigation feedback only; live state refreshes never re-enter.
let lastSection;
export function enterSection(section, element) {
  if (section === lastSection) return;
  lastSection = section;
  if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});
}
let drawerAnimation;
export function openDialog(element) {
  drawerAnimation?.cancel();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const mobile=matchMedia('(max-width: 700px)').matches;
  drawerAnimation=element.animate([
    {transform:mobile?'translateY(100%)':'translateX(100%)',opacity:.85},
    {transform:'translate(0)',opacity:1}
  ],{duration:260,easing:'cubic-bezier(.22,.8,.2,1)'});
}
export async function closeDrawer(element) {
  drawerAnimation?.cancel();
  if (!element.open || element.dataset.closing) return;
  element.dataset.closing='true';
  try {
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const mobile=matchMedia('(max-width: 700px)').matches;
      drawerAnimation=element.animate([{transform:'translate(0)',opacity:1},{transform:mobile?'translateY(100%)':'translateX(100%)',opacity:.85}],{duration:180,easing:'cubic-bezier(.4,0,1,1)'});
      await drawerAnimation.finished.catch(()=>{});
    }
    element.close();
  } finally {delete element.dataset.closing;}
}

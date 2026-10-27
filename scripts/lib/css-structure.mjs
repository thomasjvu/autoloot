// Small structural reader: preserve selector/rule order and nested at-rules.
// Strings, escapes and comments cannot terminate a rule. This does not rewrite CSS.
export function cssRules(source){
 const rules=[];let start=0,depth=0,quote='',comment=false;
 for(let i=0;i<source.length;i++){
  const ch=source[i],next=source[i+1];
  if(comment){if(ch==='*'&&next==='/'){comment=false;i++;}continue;}
  if(quote){if(ch==='\\'){i++;continue;}if(ch===quote)quote='';continue;}
  if(ch==='/'&&next==='*'){comment=true;i++;continue;}
  if(ch==='"'||ch==="'"){quote=ch;continue;}
  if(ch==='{')depth++;
  if(ch==='}'){
   if(--depth<0)throw Error('Unbalanced CSS rule.');
   if(!depth){rules.push(source.slice(start,i+1));start=i+1;}
  }
  if(ch===';'&&!depth){rules.push(source.slice(start,i+1));start=i+1;}
 }
 if(depth||quote||comment)throw Error('Incomplete CSS structure.');
 if(source.slice(start).replace(/\/\*[\s\S]*?\*\//g,'').trim())throw Error('Unexpected CSS tail.');
 return rules;
}
export const withoutComments=source=>source.replace(/\/\*[\s\S]*?\*\//g,'');
export const selector=rule=>withoutComments(rule).split('{')[0].trim();
// Only unconditional :root custom properties can be discarded here. The final
// declaration of the same property wins everywhere; conditional rules stay intact.
export function removeShadowedRootProperties(source){
 const seen=new Set();
 return cssRules(source).reverse().map(rule=>{
  if(selector(rule)!==':root')return rule;
  const positions=[...rule.matchAll(/(--[\w-]+)\s*:[^;{}]+;/g)];
  for(const match of positions.reverse()){
   // Preserve importance and complex values: these need full CSS semantics.
   if(match[0].includes('!important'))throw Error('Root importance needs explicit review.');
   if(seen.has(match[1]))rule=rule.slice(0,match.index)+rule.slice(match.index+match[0].length);
   else seen.add(match[1]);
  }
  return rule;
 }).reverse().join('\n');
}

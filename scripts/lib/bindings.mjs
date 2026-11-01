import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
const common='undefined Uint8Array ArrayBuffer DataView globalThis console JSON Math Number String Boolean Array Object Symbol BigInt Function RegExp Date Map Set WeakMap WeakSet Promise Error TypeError SyntaxError RangeError URIError AggregateError Intl parseInt parseFloat isNaN Infinity NaN decodeURIComponent encodeURIComponent encodeURI decodeURI structuredClone URL URLSearchParams AbortController AbortSignal TextEncoder TextDecoder fetch Headers Request Response ReadableStream WritableStream TransformStream CompressionStream DecompressionStream DOMException setTimeout clearTimeout setInterval clearInterval queueMicrotask performance crypto atob btoa'.split(' ');
const nodeGlobals=new Set([...common,'process','Buffer','WebSocket']);
const browserGlobals=new Set([...common,...'window document navigator location localStorage sessionStorage matchMedia speechSynthesis SpeechSynthesisUtterance EventSource WebSocket CSS FormData File FileReader Blob Image Audio Event CustomEvent HTMLElement HTMLInputElement Node requestAnimationFrame cancelAnimationFrame getComputedStyle ResizeObserver IntersectionObserver'.split(' ')]);
export function bindingErrors(source,{browser=false}={}) {
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true,locations:true});
 const manager=analyze(ast,{ecmaVersion:2024,sourceType:'module'}),globals=browser?browserGlobals:nodeGlobals;
 const errors=manager.globalScope.through.filter(ref=>!globals.has(ref.identifier.name)).map(ref=>({line:ref.identifier.loc.start.line,message:`Unresolved binding ${ref.identifier.name}`}));
 for(const scope of manager.scopes)for(const variable of scope.variables){
  for(const definition of variable.defs){
   if(definition.type!=='Variable'||!['const','let'].includes(definition.kind)||!definition.node.init)continue;
   const [start,end]=definition.node.init.range;
   for(const ref of variable.references){
    // A deferred function body may safely reference a later declaration. Only
    // reads in the initializer's own scope are immediate self-initialization.
    if(ref.isRead()&&ref.from===scope&&ref.identifier.start>=start&&ref.identifier.end<=end)
     errors.push({line:ref.identifier.loc.start.line,message:`Binding ${variable.name} reads itself before initialization`});
   }
  }
 }
 return errors;
}

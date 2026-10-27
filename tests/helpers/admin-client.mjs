// Test/demo client: authenticate via real endpoints; no server-side auth bypass.
const sessions=new Map();
const password='Autoloot-fixture-password-2026!';
const username='fixture-admin';
export async function fetch(input,options={}){
 const url=new URL(input);const headers=new Headers(options.headers||{});
 if(url.pathname==='/api/bootstrap' && ![...headers].length){
  let response=await globalThis.fetch(input,{...options,headers:{Cookie:sessions.get(url.origin)||''}});
  if(response.status!==401)return response;
  const status=await globalThis.fetch(url.origin+'/api/admin/status').then(r=>r.json());
  const login=await globalThis.fetch(url.origin+'/api/admin/'+(status.configured?'login':'setup'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  if(!login.ok)throw Error('Fixture admin login failed: '+login.status);
  const cookie=login.headers.get('set-cookie').split(';')[0];sessions.set(url.origin,cookie);
  return globalThis.fetch(input,{...options,headers:{Cookie:cookie}});
 }
 if(headers.has('X-Autoloot-Admin') || url.searchParams.has('admin')){
  const cookie=sessions.get(url.origin);if(cookie)headers.set('Cookie',[headers.get('Cookie'),cookie].filter(Boolean).join('; '));
 }
 return globalThis.fetch(input,{...options,headers});
}
export const adminCookie=origin=>sessions.get(origin)||'';

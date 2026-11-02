import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminRoutes} from '../lib/auth/admin-routes.mjs';
import {routeApp,post} from './helpers/hono.mjs';
test('logout leaves other authenticated SSE sessions and viewer streams open',async()=>{
  const current={headers:{cookie:'current'},socket:{}},other={headers:{cookie:'other'}};
  const valid=new Set([current,other]),closed=[];
  const auth={valid:req=>valid.has(req),logout:req=>valid.delete(req)};
  const clients=[{role:'admin',request:current,close:()=>closed.push('current')},{role:'admin',request:other,close:()=>closed.push('other')},{role:'viewer',close:()=>closed.push('viewer')}];
  const app=routeApp(createAdminRoutes({auth,clients,localHost:()=>true}),{request:current});
  const response=await post(app,'/api/admin/logout',{});
  assert.equal(response.status,200);assert.deepEqual(closed,['current']);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  closed.length=0;
  assert.equal((await post(app,'/api/admin/logout',{})).status,401);assert.deepEqual(closed,[]);assert.ok(valid.has(other));
});
test('remember me issues a persistent cookie only when explicitly enabled',async()=>{
  for(const remember of [false,true,'true']){
    let args;
    const app=routeApp(createAdminRoutes({auth:{login:async(...values)=>{args=values;return 'token';}},clients:[],localHost:()=>true}));
    const response=await post(app,'/api/admin/login',{username:'streamer',password:'password',remember});
    const cookie=response.headers.get('set-cookie');
    assert.equal(args[3],remember===true);
    if(remember===true)assert.match(cookie,/Max-Age=2592000/);else assert.doesNotMatch(cookie,/Max-Age/);
    assert.match(cookie,/HttpOnly; SameSite=Strict/);
  }
});

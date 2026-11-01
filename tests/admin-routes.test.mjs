import test from 'node:test';
import assert from 'node:assert/strict';
import {adminRoutes} from '../lib/admin-routes.mjs';

test('logout leaves other authenticated SSE sessions and viewer streams open',async()=>{
 const current={method:'POST',headers:{cookie:'current'},socket:{}},other={headers:{cookie:'other'}};
 const valid=new Set([current,other]),closed=[];
 const auth={valid:req=>valid.has(req),logout:req=>valid.delete(req)};
 const clients=[{role:'admin',request:current,res:{end:()=>closed.push('current')}},{role:'admin',request:other,res:{end:()=>closed.push('other')}},{role:'viewer',res:{end:()=>closed.push('viewer')}}];
 let response,cookie;
 const context={req:current,res:{setHeader:(_,value)=>cookie=value},path:'/api/admin/logout',auth,clients,localHost:()=>true,json:(_res,value,status=200)=>response={value,status},body:()=>{throw Error('Logout must not log in.');}};
 assert.equal(await adminRoutes(context),true);assert.equal(response.status,200);assert.deepEqual(closed,['current']);assert.match(cookie,/Max-Age=0/);
 closed.length=0;
 await adminRoutes(context);assert.equal(response.status,401);assert.deepEqual(closed,[]);assert.ok(valid.has(other));
});

test('remember me issues a persistent cookie only when explicitly enabled',async()=>{
 for(const remember of [false,true,'true']){
  let cookie,args;
  await adminRoutes({req:{method:'POST',socket:{},headers:{}},res:{setHeader:(_,value)=>cookie=value},path:'/api/admin/login',auth:{login:async(...values)=>{args=values;return 'token';}},clients:[],localHost:()=>true,json:()=>{},body:async()=>({username:'streamer',password:'password',remember})});
  assert.equal(args[3],remember===true);
  if(remember===true)assert.match(cookie,/Max-Age=2592000/);else assert.doesNotMatch(cookie,/Max-Age/);
  assert.match(cookie,/HttpOnly; SameSite=Strict/);
 }
});

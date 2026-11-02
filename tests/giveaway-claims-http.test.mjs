import {fetch} from './helpers/admin-client.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const address={name:'Private Winner',line1:'1 Main St',city:'Boston',state:'MA',postal_code:'02110',country:'US'};
test('giveaway HTTP claims remain winner-owned and survive archive with private dispatch',async()=>{
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));const dir=mkdtempSync(join(tmpdir(),'autoloot-prize-')),base=`http://localhost:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),PUBLIC_URL:base,DATA_DIR:dir,AUTOLOOT_DEMO:'1',AUTOLOOT_GIVEAWAYS:'1',TWITCH_CLIENT_ID:'',TWITCH_CLIENT_SECRET:'',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:'',SHIPPO_API_TOKEN:'',NFT_RPC_CONFIG:'{}',NFT_WALLET_URL:'',NFT_AGENT_TOKEN:''},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timed out')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',c=>{clearTimeout(timer);reject(Error('Exited '+c));});});
  const token=(await(await fetch(base+'/api/bootstrap')).json()).admin;
  const post=async(path,b,headers={'X-Autoloot-Admin':token})=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(b)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  const login=await post('/api/viewer/demo-login',{},{}),cookie=login.cookie;
  const product=(await post('/api/products',{title:'Identity fixture',price:'1',buyNowPrice:'1',quantity:1,listed:true,condition:'Practice'})).body.state.products.at(-1);
  const purchase=await post('/api/viewer/buy',{productId:product.id,requestId:'identify'},{Cookie:cookie});assert.equal(purchase.status,200);
  const state=(await(await fetch(base+'/api/state',{headers:{'X-Autoloot-Admin':token}})).json());const buyer=state.orders.find(o=>o.id===purchase.body.orderId).userId;
  let result=await post('/api/giveaway/open',{title:'Private prize',rules:'Free US entry',duration:60,claimDays:3});assert.equal(result.status,200);const id=result.body.state.giveaway.id;
  await post('/api/giveaway/demo',{username:buyer.slice(5)});await post('/api/giveaway/close',{});await post('/api/giveaway/draw',{});
  assert.equal((await post('/api/viewer/giveaway/claim',{id,address,confirmed:true},{})).status,401);
  const other=await post('/api/viewer/demo-login',{},{});assert.equal((await post('/api/viewer/giveaway/claim',{id,address,confirmed:true},{Cookie:other.cookie})).status,400);
  assert.equal((await post('/api/viewer/giveaway/claim',{id,address,confirmed:true},{Cookie:cookie})).status,200);
  const publicState=await(await fetch(base+'/api/state')).text();assert.equal(publicState.includes('Private Winner'),false);assert.equal(publicState.includes('winnerUserId'),false);
  let own=await(await fetch(base+'/api/viewer',{headers:{Cookie:cookie}})).json();assert.equal(own.prizes[0].address.name,'Private Winner');assert.equal(own.prizes[0].entries,undefined);
  assert.equal((await(await fetch(base+'/api/viewer',{headers:{Cookie:other.cookie}})).json()).prizes.length,0);
  await post('/api/giveaway/open',{title:'Next prize',rules:'Free',duration:60});
  assert.equal((await post('/api/giveaway/dispatch',{id,tracking:'USPS 123',confirmed:true},{})).status,403);
  result=await post('/api/giveaway/dispatch',{id,tracking:'USPS 123',confirmed:true});assert.equal(result.status,200);assert.equal(result.body.state.giveawayHistory[0].claim.status,'dispatched');
  own=await(await fetch(base+'/api/viewer',{headers:{Cookie:cookie}})).json();assert.equal(own.prizes[0].tracking,'USPS 123');assert.equal(own.prizes[0].status,'dispatched');
 }finally{if(child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await stopped;}rmSync(dir,{recursive:true,force:true});}
});

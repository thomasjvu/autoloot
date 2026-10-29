import {fetch} from './helpers/admin-client.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('private maxima HTTP uses authenticated identity, own projections, retries and payable order prices',async()=>{
 const free=createServer();await new Promise(r=>free.listen(0,'127.0.0.1',r));const port=free.address().port;await new Promise(r=>free.close(r));
 const dir=mkdtempSync(join(tmpdir(),'autoloot-max-http-')),base=`http://localhost:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),PUBLIC_URL:base,DATA_DIR:dir,AUTOLOOT_DEMO:'1',TWITCH_CLIENT_ID:'',TWITCH_CLIENT_SECRET:'',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:'',SHIPPO_API_TOKEN:'',NFT_RPC_CONFIG:'{}',NFT_WALLET_URL:'',NFT_AGENT_TOKEN:''},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',code=>{clearTimeout(timer);reject(Error('Exited '+code));});});
  const token=(await(await fetch(base+'/api/bootstrap')).json()).admin;
  const post=async(path,body,headers={'X-Autoloot-Admin':token})=>{const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});return {status:response.status,body:await response.json(),response};};
  const login=async()=>{const r=await post('/api/viewer/demo-login',{},{});return r.response.headers.get('set-cookie').split(';')[0];};
  const first=await login(),second=await login(),third=await login();
  const own=async cookie=>(await(await fetch(base+'/api/viewer',{headers:{Cookie:cookie}})).json());
  const product=(await post('/api/products',{title:'Maximum fixture',price:'5',quantity:1,condition:'Practice'})).body.state.products.at(-1);
  const auction=(await post('/api/auction/start',{productId:product.id,duration:60,increment:'1'})).body.state.auction;
  const payload={auctionId:auction.id,requestId:'first',amount:'1234.56',confirmed:true};
  assert.equal((await post('/api/viewer/maximum-bid',payload,{})).status,401);
  assert.equal((await post('/api/viewer/maximum-bid',{...payload,confirmed:false},{Cookie:first})).status,400);
  let result=await post('/api/viewer/maximum-bid',payload,{Cookie:first});assert.equal(result.status,200);assert.equal(result.body.maximumBid.maxCents,123456);
  result=await post('/api/viewer/maximum-bid',payload,{Cookie:first});assert.equal(result.status,200);
  assert.equal((await post('/api/viewer/maximum-bid',{...payload,amount:'2000'},{Cookie:first})).status,400);
  assert.equal((await own(first)).maximumBid.maxCents,123456);assert.equal((await own(second)).maximumBid,null);assert.equal((await own(third)).maximumBid,null);
  const state=await(await fetch(base+'/api/state')).json();assert.equal(state.auction.highest.amount,500);assert.equal(JSON.stringify(state).includes('maxCents'),false);assert.equal(JSON.stringify(state).includes('123456'),false);
  const admin=await(await fetch(base+'/api/state',{headers:{'X-Autoloot-Admin':token}})).json();assert.equal(admin.privateBids,undefined);assert.equal(JSON.stringify(admin).includes('maxCents'),false);
  const stream=await fetch(base+'/api/events',{headers:{'X-Autoloot-Admin':token}});const reader=stream.body.getReader();const chunk=new TextDecoder().decode((await reader.read()).value);assert.equal(chunk.includes('privateBids'),false);assert.equal(chunk.includes('123456'),false);await reader.cancel();
  const results=await Promise.all([post('/api/viewer/maximum-bid',{auctionId:auction.id,requestId:'second',amount:'100',confirmed:true,userId:'forged-first'},{Cookie:second}),post('/api/viewer/maximum-bid',{auctionId:auction.id,requestId:'third',amount:'2000',confirmed:true},{Cookie:third})]);
  // Arrival ordering is serialized by the engine; a later low ceiling may correctly
  // reject after the high one. The highest accepted willingness always wins.
  assert.equal(results[1].status,200);assert.ok([200,400].includes(results[0].status));
  assert.equal((await own(third)).maximumBid.status,'leading');assert.equal((await own(first)).maximumBid.status,'outbid');
  assert.equal((await post('/api/viewer/maximum-bid',{...payload,auctionId:'stale',requestId:'stale'},{Cookie:first})).status,400);
  await post('/api/auction/pause',{});assert.equal((await post('/api/auction/void',{})).status,400);assert.equal((await post('/api/viewer/maximum-bid',{...payload,amount:'3000',requestId:'paused'},{Cookie:first})).status,400);
  const finish=await post('/api/auction/finish',{});assert.equal(finish.status,200);const order=finish.body.state.orders[0];assert.equal(order.amount,123556);assert.notEqual(order.amount,200000);assert.equal(order.total,order.amount+order.shippingPrice);
  assert.equal((await own(third)).orders[0].amount,123556);assert.equal((await own(first)).orders.length,0);assert.equal((await own(third)).maximumBid.status,'ended');
 }finally{if(child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await stopped;}rmSync(dir,{recursive:true,force:true});}
});

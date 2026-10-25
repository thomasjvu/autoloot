import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('CSV HTTP workflow protects private exports, applies reviewed imports and ships a paid demo order',async()=>{
 const free=createServer();await new Promise(r=>free.listen(0,'127.0.0.1',r));const port=free.address().port;await new Promise(r=>free.close(r));
 const dir=mkdtempSync(join(tmpdir(),'autoloot-csv-http-')),base=`http://localhost:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),PUBLIC_URL:base,DATA_DIR:dir,AUTOLOOT_DEMO:'1',TWITCH_CLIENT_ID:'',TWITCH_CLIENT_SECRET:'',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:'',NFT_RPC_CONFIG:'{}',NFT_WALLET_URL:'',NFT_AGENT_TOKEN:''},stdio:['ignore','pipe','pipe']});
 try {
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timed out')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',code=>{clearTimeout(timer);reject(Error(`Exited ${code}`));});});
  const token=(await(await fetch(base+'/api/bootstrap')).json()).admin;
  const post=async(path,body,auth=true)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Autoloot-Admin':token}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const input={kind:'inventory',csv:'sku,title,quantity,condition,price,buyNowPrice\nSKU-HTTP,CSV card,1,Used,5.00,7.00'};
  assert.equal((await post('/api/import/preview',input,false)).status,403);
  assert.equal((await post('/api/import/apply',input,false)).status,403);
  assert.equal((await fetch(base+'/api/fulfillment.csv')).status,403);
  const preview=await post('/api/import/preview',input);assert.equal(preview.status,200);assert.equal(preview.body.state,undefined);
  let result=await post('/api/import/apply',{...input,fingerprint:preview.body.fingerprint});assert.equal(result.status,200);
  const product=result.body.state.products.find(p=>p.sku==='SKU-HTTP');assert.equal(product.listed,false);
  assert.equal((await post('/api/import/apply',{...input,fingerprint:preview.body.fingerprint})).status,400);
  await post('/api/products/edit',{...product,price:'5',buyNowPrice:'7',listed:true});
  result=await post('/api/demo/buy',{productId:product.id,username:'fixture',requestId:'csv-http-purchase'});
  assert.equal(result.status,200,JSON.stringify(result.body));
  const order=result.body.state.orders.find(o=>o.product.id===product.id);assert.ok(order);
  result=await post('/api/order',{id:order.id,action:'test-pay'});assert.equal(result.status,200);
  const shipment={kind:'tracking',csv:`Order,Carrier,Tracking\n${order.number},USPS,00123`};
  const plan=await post('/api/import/preview',shipment);assert.equal(plan.body.valid,true,JSON.stringify(plan.body));
  result=await post('/api/import/apply',{...shipment,fingerprint:plan.body.fingerprint});assert.equal(result.status,200);assert.equal(result.body.state.orders.find(o=>o.id===order.id).status,'shipped');
  const exported=await fetch(base+'/api/fulfillment.csv',{headers:{'X-Autoloot-Admin':token}});assert.equal(exported.status,200);assert.equal(exported.headers.get('cache-control'),'no-store');assert.match(await exported.text(),/USPS · 00123/);
 }finally{if(child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await stopped;}rmSync(dir,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {NftDelivery,walletBridge} from '../lib/commerce/nft.mjs';
import {Runs} from '../lib/commerce/runs.mjs';
import {Payments} from '../lib/integrations/payments.mjs';
const address=n=>'0x'+String(n).repeat(40),tx='0x'+'4'.repeat(64),hash='0x'+'5'.repeat(64);
const sender=address(1),recipient=address(2),contract=address(3);
const topic=value=>'0x'+value.slice(2).padStart(64,'0');
const asset={type:'nft',chain:'eip155:8453',contract,tokenId:'7',sender,provider:'Fixture provider'};
function orderFixture(mode='live',fulfillment=asset){const e=new Engine(seed(),{features:{nft:true}});e.setMode(mode);if(mode==='live')e.register({id:'buyer',login:'buyer'});const product=e.addProduct({title:'Fixture redeemable NFT',quantity:1,price:'5',buyNowPrice:'5',listed:true,condition:'NFT entitlement',fulfillment});const order=e.buyNow({productId:product.id,userId:'buyer',username:'buyer',requestId:'buy'});e.orderUpdate(order.id,mode==='demo'?'test-pay':'confirm-paid');return {e,product,order};}
async function rpcFixture(t){
 const state={chain:'0x2105',final:true,owner:recipient,receipt:true,l1Fee:'0x0',fee:'0x2',token:'0x'+BigInt(7).toString(16).padStart(64,'0'),transfers:0,failFirst:false,requested:false};
 const server=createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;res.setHeader('Content-Type','application/json');
  if(req.url==='/transfers'&&req.method==='POST'){state.transfers++;state.requested=true;if(state.failFirst){res.writeHead(503);res.end('{}');return;}res.end(JSON.stringify({transactionId:tx}));return;}
  if(req.url?.startsWith('/transfers/')){res.end(JSON.stringify({transactionId:tx}));return;}
  const {method,params}=JSON.parse(text);let result;
  if(method==='eth_chainId')result=state.chain;
  if(method==='eth_getTransactionReceipt')result=state.receipt?{status:'0x1',transactionHash:tx,blockNumber:'0x9',blockHash:hash,gasUsed:'0x5208',effectiveGasPrice:state.fee,l1Fee:state.l1Fee,logs:[{address:contract,topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',topic(sender),topic(recipient),state.token]}]}:null;
  if(method==='eth_getBlockByNumber')result={number:params[0]==='finalized'?(state.final?'0xa':'0x8'):'0x9',hash,timestamp:'0x'+Math.ceil(Date.now()/1000).toString(16)};
  if(method==='eth_call')result=topic(state.owner);
  res.end(JSON.stringify({jsonrpc:'2.0',id:1,result}));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return {...state,state,url:`http://127.0.0.1:${server.address().port}`};
}
test('NFT orders snapshot the exact entitlement, charge no shipping and cannot use shipment as fulfillment',()=>{
 const {e,product,order}=orderFixture();e.state.show.shippingPrice=900;
 assert.equal(order.shippingPrice,0);assert.equal(order.product.fulfillment.tokenId,'7');
 assert.throws(()=>e.orderUpdate(order.id,'ship','tracking'),/NFT orders/);
 assert.throws(()=>e.editProduct(product.id,{...product,price:'5',buyNowPrice:'5',quantity:1}),/allocated/);
 assert.throws(()=>e.addProduct({...product,quantity:1,price:'5',buyNowPrice:'5',fulfillment:asset}),/unique|allocated/);
});
test('buyer-confirmed wallet locks at authorization and real delivery requires final exact-asset proof',async t=>{
 const rpc=await rpcFixture(t),{e,order}=orderFixture(),nft=new NftDelivery(e,{rpc:{'eip155:8453':rpc.url}});
 assert.throws(()=>nft.setRecipient(order.id,recipient,false),/Confirm/);
 nft.setRecipient(order.id,recipient,true);nft.authorize(order.id,{maxFeeAtomic:'100000'});nft.submit(order.id,tx);
 assert.throws(()=>nft.setRecipient(order.id,address(6),true),/cannot change/);
 rpc.state.final=false;assert.equal(await nft.verify(order),null);
 rpc.state.final=true;const proof=await nft.verify(order);nft.complete(order,proof);
 assert.equal(order.status,'delivered');assert.equal(order.delivery.proof.transactionId,tx);assert.equal(e.product(order.product.id).quantity,0);
 assert.throws(()=>e.markRefunded(order.id,'refund'),/Reconcile/);
});
test('wrong chain, wrong NFT, wrong recipient ownership and excess fees never complete delivery',async t=>{
 const rpc=await rpcFixture(t),{e,order}=orderFixture(),nft=new NftDelivery(e,{rpc:{'eip155:8453':rpc.url}});
 nft.setRecipient(order.id,recipient,true);nft.authorize(order.id,{maxFeeAtomic:'100000'});nft.submit(order.id,tx);
 rpc.state.chain='0x1';await assert.rejects(nft.verify(order),/chain does not match/);rpc.state.chain='0x2105';
 rpc.state.token='0x'+'0'.repeat(63)+'8';await assert.rejects(nft.verify(order),/exact NFT/);rpc.state.token='0x'+'0'.repeat(63)+'7';
 rpc.state.owner=address(6);await assert.rejects(nft.verify(order),/ownership/);rpc.state.owner=recipient;
 rpc.state.l1Fee=undefined;await assert.rejects(nft.verify(order),/missing the Base L1 fee/);
 rpc.state.l1Fee='0x186a0';await assert.rejects(nft.verify(order),/fee exceeds/);
 rpc.state.l1Fee='0x0';rpc.state.fee='0x100';await assert.rejects(nft.verify(order),/fee exceeds/);
 assert.equal(order.status,'paid-external');
});
test('lost wallet response is reconciled by stable job ID after restart without another transfer',async t=>{
 const rpc=await rpcFixture(t),{e,order}=orderFixture();rpc.state.failFirst=true;
 const options={rpc:{'eip155:8453':rpc.url},adapter:walletBridge(rpc.url,'fixture-key')};
 const nft=new NftDelivery(e,options);nft.setRecipient(order.id,recipient,true);nft.authorize(order.id,{allowTransfer:true,maxFeeAtomic:'100000'});
 await nft.tick();assert.equal(order.delivery.status,'reconciling');assert.equal(rpc.state.transfers,1);
 const restored=new Engine(JSON.parse(JSON.stringify(e.state)));restored.now=()=>Date.now()+31000;
 const recovered=new NftDelivery(restored,options);await recovered.tick();
 assert.equal(restored.state.orders[0].status,'delivered');assert.equal(rpc.state.transfers,1);
});
test('autopilot treats a verified NFT receipt as full fulfillment without shipping',()=>{
 const {e,product}=orderFixture('demo'); // Clear fixture purchase so this inventory can be armed once.
 e.state.orders=[];product.quantity=1;
 const nft=new NftDelivery(e),runs=new Runs(e);
 runs.arm({steps:[{productId:product.id,format:'buy-now'}],minutes:10,requestId:'nft-run',allowNftTransfers:true,maxNftFeeAtomic:'100000'});runs.tick();
 const order=e.buyNow({productId:product.id,userId:'buyer',username:'buyer',requestId:'new-buy'});
 nft.setRecipient(order.id,recipient,true);e.orderUpdate(order.id,'test-pay');runs.tick();assert.equal(e.state.run.phase,'waiting-nft-delivery');
 nft.simulate(order.id);runs.tick();runs.tick();
 assert.equal(e.state.run.status,'completed');assert.equal(order.status,'test-delivered');assert.equal(order.shipping,undefined);
});
test('NFT checkout excludes physical shipping/address collection and refunds cannot race an authorized transfer',async()=>{
 const {e,order}=orderFixture();order.status='pending';
 const nft=new NftDelivery(e,{rpc:{'eip155:8453':'https://rpc.example.invalid'}});nft.setRecipient(order.id,recipient,true);
 let args;const client={checkout:{sessions:{create:async input=>{args=input;return {id:'cs_nft',url:'https://checkout.stripe.com/fixture',expires_at:Math.floor(Date.now()/1000)+1800};}}}};
 const payments=new Payments(e,{client,secret:'fixture'});await payments.checkout(order.id);
 assert.equal(args.shipping_address_collection,undefined);assert.equal(args.shipping_options,undefined);
 order.status='paid';
 assert.throws(()=>nft.authorize(order.id,{maxFeeAtomic:'100000'}),/Stripe test payment/);
 order.paymentLive=true;order.refundRequestedAt=Date.now();
 assert.throws(()=>nft.authorize(order.id,{maxFeeAtomic:'100000'}),/refund/);
 delete order.refundRequestedAt;nft.authorize(order.id,{maxFeeAtomic:'100000',allowTransfer:true});
 assert.equal(nft.canTransfer(order),true);order.paymentLive=false;assert.equal(nft.canTransfer(order),false);order.paymentLive=true;
 await assert.rejects(payments.refund(order.id),/Reconcile/);
});
function encode58(bytes){const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let value=BigInt('0x'+Buffer.from(bytes).toString('hex')),out='';while(value){out=alphabet[Number(value%58n)]+out;value/=58n;}return out;}
test('Solana verification checks network, finalized balances, single-supply mint and recipient holdings',async t=>{
 const from=encode58(Buffer.alloc(32,1)),to=encode58(Buffer.alloc(32,2)),mint=encode58(Buffer.alloc(32,3)),signature=encode58(Buffer.alloc(64,4));
 const fulfillment={type:'nft',chain:'solana:devnet',mint,sender:from,provider:'Fixture'};
 const {e,order}=orderFixture('live',fulfillment);
 let supply='1';const program='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
 const balance=owner=>({mint,owner,uiTokenAmount:{amount:'1',decimals:0}});
 const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const {method}=JSON.parse(body);let result;
  if(method==='getGenesisHash')result='EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  if(method==='getTransaction')result={slot:50,blockTime:Math.ceil(Date.now()/1000),transaction:{signatures:[signature]},meta:{err:null,fee:5000,preTokenBalances:[balance(from)],postTokenBalances:[balance(to)]}};
  if(method==='getAccountInfo')result={value:{owner:program,data:{parsed:{type:'mint',info:{decimals:0,supply}}}}};
  if(method==='getTokenAccountsByOwner')result={context:{slot:51},value:[{account:{owner:program,data:{parsed:{info:{owner:to,mint,tokenAmount:{amount:'1',decimals:0}}}}}}]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:1,result}));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const nft=new NftDelivery(e,{rpc:{'solana:devnet':`http://127.0.0.1:${server.address().port}`}});
 nft.setRecipient(order.id,to,true);nft.authorize(order.id,{maxFeeAtomic:'10000'});nft.submit(order.id,signature);
 supply='2';await assert.rejects(nft.verify(order),/single-supply/);supply='1';
 nft.complete(order,await nft.verify(order));assert.equal(order.status,'delivered');assert.equal(order.delivery.proof.blockId,'50');
});
test('paused run-owned NFT jobs cannot initiate a new wallet transfer',async()=>{
 const {e,product}=orderFixture('demo');e.state.orders=[];product.quantity=1;
 const runs=new Runs(e);runs.arm({steps:[{productId:product.id,format:'buy-now'}],minutes:10,requestId:'queued-nft',allowNftTransfers:true,maxNftFeeAtomic:'100000'});runs.tick();
 const order=e.buyNow({productId:product.id,userId:'buyer',username:'buyer',requestId:'queued-buy'});e.orderUpdate(order.id,'test-pay');
 // Promote only fixture state to exercise live wallet dispatch without any real wallet or funds.
 order.mode='live';order.status='paid';order.paymentLive=true;let sends=0;
 const nft=new NftDelivery(e,{rpc:{'eip155:8453':'https://unused.example.invalid'},adapter:{transfer:async()=>{sends++;},lookup:async()=>({status:'pending'})}});
 nft.setRecipient(order.id,recipient,true);nft.authorize(order.id,{allowTransfer:true,maxFeeAtomic:'100000',runId:e.state.run.id});
 runs.pause();await nft.tick();assert.equal(sends,0);assert.equal(order.delivery.status,'queued');
});

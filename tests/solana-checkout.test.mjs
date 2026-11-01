import test from 'node:test';
import assert from 'node:assert/strict';
import {SolanaCheckout,USDC} from '../lib/solana-checkout.mjs';
import {Engine,seed} from '../lib/engine.mjs';
import {applyPolicyPreset,policyPresets} from '../public/policy-presets.js';
import {validateOperator} from '../lib/legal.mjs';
const merchant='So11111111111111111111111111111111111111112',payer='Vote111111111111111111111111111111111111111';
const signature='2'.repeat(88),genesis='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
function fixture(){
 let now=Date.now();const engine=new Engine(seed(),{now:()=>now});
 const p=engine.state.products.find(p=>p.listed&&p.buyNowPrice);const order=engine.buyNow({productId:p.id,userId:'buyer',username:'buyer',requestId:'one'});order.mode='live';order.shipping={name:'Buyer',line1:'1 Main',city:'City',postal_code:'10001',country:'US'};engine.commit();
 const service=new SolanaCheckout(engine,{env:{REOWN_PROJECT_ID:'fixture',SOLANA_USDC_RECIPIENT:merchant,SOLANA_PAYMENT_RPC_URL:'https://rpc.example'}});
 let tx=null,network=genesis;
 service.rpc=async method=>method==='getGenesisHash'?network:method==='getLatestBlockhash'?{context:{slot:1},value:{blockhash:'11111111111111111111111111111111',lastValidBlockHeight:100}}:tx;
 const transaction=()=>{const q=order.cryptoCheckout;return {slot:5,blockTime:Math.floor(now/1000),meta:{err:null,preTokenBalances:[],postTokenBalances:[{accountIndex:1,mint:USDC,owner:q.recipient,uiTokenAmount:{amount:q.amountAtomic,decimals:6}}]},transaction:{signatures:[signature],message:{recentBlockhash:q.blockhash,accountKeys:[{pubkey:q.payer,signer:true},{pubkey:q.destination,signer:false}],instructions:[{programId:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',parsed:{type:'transferChecked',info:{mint:USDC,source:q.source,destination:q.destination,authority:q.payer,tokenAmount:{amount:q.amountAtomic,decimals:6}}}},{programId:'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',parsed:q.memo}]}}};};
 return {engine,order,service,transaction,setTx:value=>tx=value,setNetwork:value=>network=value,advance:()=>now+=3600000};
}
test('policy presets fill only blank fields, never publish or invent identity, and require placeholder edits',()=>{
 const original={name:'Real seller',email:'seller@example.com',shipping:'My shipping'};
 const draft=applyPolicyPreset(original,'tcg-singles');assert.equal(draft.shipping,original.shipping);assert.equal(draft.name,original.name);assert.equal(original.returns,undefined);assert.match(draft.returns,/\[/);
 assert.throws(()=>validateOperator({...draft,acknowledged:true}),/bracketed/);
 assert.notEqual(applyPolicyPreset(original,'sealed-tcg',{replace:true}).shipping,original.shipping);
 assert.equal(Object.keys(policyPresets).length,3);assert.throws(()=>applyPolicyPreset(original,'__proto__'),/Choose/);
});
test('wallet quote uses server total, fixes USDC mint and protects pending stock from other payment paths',async()=>{
 const f=fixture(),quote=await f.service.prepare(f.order.id,payer);
 assert.equal(quote.amountAtomic,(BigInt(f.order.total)*10000n).toString());assert.equal(quote.mint,USDC);assert.ok(Buffer.from(quote.transaction,'base64').length>150);
 assert.deepEqual(await f.service.prepare(f.order.id,payer),quote);
 f.advance();f.engine.expireReservations();assert.equal(f.order.status,'pending');
 assert.throws(()=>f.engine.orderUpdate(f.order.id,'cancel'),/checkout/);assert.throws(()=>f.engine.orderUpdate(f.order.id,'confirm-paid'),/checkout/);
});
test('only finalized matching direct USDC transfer and unique memo can pay an order',async()=>{
 for(const mutate of [t=>t.meta.err='failed',t=>t.transaction.message.instructions[0].parsed.info.tokenAmount.amount='1',t=>t.transaction.message.instructions[0].parsed.info.mint=merchant,t=>t.transaction.message.instructions[0].parsed.info.destination=payer,t=>t.transaction.message.instructions[0].parsed.info.authority=merchant,t=>t.transaction.message.instructions[1].parsed='other-order',t=>t.transaction.message.accountKeys[0].signer=false,t=>t.transaction.signatures[0]='wrong']){
  const f=fixture();await f.service.prepare(f.order.id,payer);const tx=f.transaction();mutate(tx);f.setTx(tx);const before=structuredClone(f.engine.state);await assert.rejects(f.service.verify(f.order.id,signature),/does not match/);assert.deepEqual(f.engine.state,before);
 }
 const f=fixture();await f.service.prepare(f.order.id,payer);await assert.rejects(f.service.verify(f.order.id,signature),/not finalized/);
 f.setTx(f.transaction());assert.deepEqual(await f.service.verify(f.order.id,signature),{paid:true});assert.equal(f.order.status,'paid-external');assert.equal(f.order.cryptoPayment.finalized,true);assert.deepEqual(await f.service.verify(f.order.id,signature),{paid:true});
});
test('wrong network, demo, missing address and active Stripe checkout never create wallet quotes',async()=>{
 const f=fixture();f.setNetwork('devnet');await assert.rejects(f.service.prepare(f.order.id,payer),/mainnet/);assert.equal(f.order.cryptoCheckout,undefined);
 f.setNetwork(genesis);f.order.mode='demo';await assert.rejects(f.service.prepare(f.order.id,payer),/unpaid live/);f.order.mode='live';delete f.order.shipping;await assert.rejects(f.service.prepare(f.order.id,payer),/address/);
 f.order.shipping={name:'Buyer'};f.order.checkoutId='cs_fixture';await assert.rejects(f.service.prepare(f.order.id,payer),/Stripe/);
});

test('expired wallet cancellation proves the block lifetime ended and refuses any matching transfer',async()=>{
 const f=fixture();await f.service.prepare(f.order.id,payer);const q=f.order.cryptoCheckout;
 let height=100,signatures=[];
 f.service.rpc=async method=>method==='getGenesisHash'?genesis:method==='getBlockHeight'?height:signatures;
 await assert.rejects(f.service.cancel(f.order.id),/expire/);assert.ok(f.order.cryptoCheckout);
 height=101;signatures=[{slot:2,memo:q.memo,err:null}];await assert.rejects(f.service.cancel(f.order.id),/matching transaction/);assert.equal(f.order.status,'pending');
 signatures=[];assert.deepEqual(await f.service.cancel(f.order.id),{cancelled:true});assert.equal(f.order.status,'cancelled');assert.equal(f.order.cryptoCheckout,undefined);
});
test('a net-zero transfer or a changed order during RPC cannot mark payment or reserve stock',async()=>{
 const f=fixture();await f.service.prepare(f.order.id,payer);const tx=f.transaction();tx.meta.postTokenBalances[0].uiTokenAmount.amount='0';f.setTx(tx);await assert.rejects(f.service.verify(f.order.id,signature),/balance/);assert.equal(f.order.status,'pending');
 const g=fixture();const rpc=g.service.rpc;g.service.rpc=async method=>{const value=await rpc(method);if(method==='getLatestBlockhash')g.order.status='cancelled';return value;};await assert.rejects(g.service.prepare(g.order.id,payer),/changed/);assert.equal(g.order.cryptoCheckout,undefined);
});

test('existing wallet checkout cannot change its payer and payment holds survive restart',async()=>{
 const f=fixture();await f.service.prepare(f.order.id,payer);await assert.rejects(f.service.prepare(f.order.id,merchant),/Reconnect/);
 f.advance();const recovered=new Engine(structuredClone(f.engine.state),{now:()=>Date.now()+7200000});recovered.expireReservations();assert.equal(recovered.order(f.order.id).status,'pending');assert.ok(recovered.order(f.order.id).cryptoCheckout.transaction);
});

import {randomUUID} from 'node:crypto';
import {createNoopSigner,address,createTransactionMessage,setTransactionMessageFeePayer,setTransactionMessageLifetimeUsingBlockhash,appendTransactionMessageInstructions,compileTransaction,getBase64EncodedWireTransaction} from '@solana/kit';
import {findAssociatedTokenPda,getCreateAssociatedTokenIdempotentInstruction,getTransferCheckedInstruction,TOKEN_PROGRAM_ADDRESS} from '@solana-program/token';
import {isNft} from '../commerce/nft.mjs';
const TOKEN=TOKEN_PROGRAM_ADDRESS;
const MEMO='MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const ata=async owner=>(await findAssociatedTokenPda({owner,mint:address(USDC),tokenProgram:TOKEN}))[0];
export class SolanaCheckout{
 constructor(engine,{env=process.env,fetchImpl=fetch}={}){
  this.engine=engine;this.fetch=fetchImpl;this.locks=new Set();this.projectId=env.REOWN_PROJECT_ID||'';this.recipient=env.SOLANA_USDC_RECIPIENT||'';this.rpcUrl=env.SOLANA_PAYMENT_RPC_URL||'';
  if(this.recipient)address(this.recipient);
  if(this.rpcUrl){const url=new URL(this.rpcUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error('Solana payment RPC must use HTTPS.');}
 }
 get status(){return {configured:Boolean(this.projectId&&this.recipient&&this.rpcUrl),projectId:this.projectId,recipient:this.recipient,network:'solana:mainnet',asset:'USDC',mint:USDC};}
 async rpc(method,params=[]){const response=await this.fetch(this.rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw Error('Solana payment verification unavailable.');const data=await response.json();if(data.error)throw Error('Solana payment verification unavailable.');return data.result;}
 async network(){if(await this.rpc('getGenesisHash')!==GENESIS)throw Error('Payment RPC is not Solana mainnet.');}
 async locked(id,fn){if(this.locks.has(id))throw Error('Payment check already in progress.');this.locks.add(id);try{return await fn();}finally{this.locks.delete(id);}}
 async prepare(id,payerAddress){return this.locked(id,async()=>{
  if(!this.status.configured)throw Error('Wallet checkout is not configured.');
  this.engine.expireReservations();let order=this.engine.order(id);
  if(order.mode!=='live'||order.status!=='pending'||order.checkoutId||order.checkoutCreated!=null)throw Error('Choose an unpaid live order without a Stripe checkout.');
  if(isNft(order))throw Error('Wallet checkout currently supports physical orders only.');
  if(!order.shipping)throw Error('Add a shipping address before wallet checkout.');
  if(order.cryptoCheckout){if(order.cryptoCheckout.payer!==payerAddress)throw Error('Reconnect the wallet used for this checkout, or cancel it after expiry.');return structuredClone(order.cryptoCheckout);}
  const payer=address(payerAddress),recipient=address(this.recipient);
  if(payer===recipient)throw Error('Buyer and seller wallets must differ.');
  await this.network();const latest=await this.rpc('getLatestBlockhash',[{commitment:'finalized'}]);
  if(!Number.isSafeInteger(latest?.context?.slot)||!Number.isSafeInteger(latest?.value?.lastValidBlockHeight))throw Error('RPC returned an invalid block lifetime.');
  // Another authoritative transition can occur while RPC is in flight.
  order=this.engine.order(id);if(order.status!=='pending'||order.checkoutId||order.checkoutCreated!=null||order.cryptoCheckout||this.engine.now()>=order.reservationExpiresAt)throw Error('Order changed. Refresh before paying.');
  const amount=BigInt(order.total)*10000n,source=await ata(payer),destination=await ata(recipient),memo='autoloot:'+order.id+':'+randomUUID();
  const instructions=[
   getCreateAssociatedTokenIdempotentInstruction({payer:createNoopSigner(payer),ata:destination,owner:recipient,mint:address(USDC)}),
   getTransferCheckedInstruction({source,mint:address(USDC),destination,authority:createNoopSigner(payer),amount,decimals:6}),
   {programAddress:address(MEMO),accounts:[],data:new TextEncoder().encode(memo)}
  ];
  const message=appendTransactionMessageInstructions(instructions,setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},setTransactionMessageFeePayer(payer,createTransactionMessage({version:'legacy'}))));
  const transaction=getBase64EncodedWireTransaction(compileTransaction(message));
  order=this.engine.order(id);if(order.status!=='pending'||order.checkoutId||order.checkoutCreated!=null||order.cryptoCheckout||this.engine.now()>=order.reservationExpiresAt)throw Error('Order changed. Refresh before paying.');
  order.cryptoCheckout={provider:'reown',network:'solana:mainnet',mint:USDC,recipient:this.recipient,destination,payer,source,amountAtomic:amount.toString(),memo,createdAt:this.engine.now(),createdSlot:latest.context?.slot,blockhash:latest.value.blockhash,lastValidBlockHeight:latest.value.lastValidBlockHeight,transaction};
  this.engine.commit();return structuredClone(order.cryptoCheckout);
 });}
 async cancel(id){return this.locked(id,async()=>{
  const order=this.engine.order(id),quote=order.cryptoCheckout;
  if(!quote||order.status!=='pending'||order.mode!=='live')throw Error('Choose a pending wallet checkout.');
  await this.network();const height=await this.rpc('getBlockHeight',[{commitment:'finalized'}]);
  if(!Number.isSafeInteger(height)||height<=quote.lastValidBlockHeight)throw Error('Wait for the unsigned transaction to expire before cancelling.');
  const signatures=await this.rpc('getSignaturesForAddress',[quote.destination,{limit:1000,commitment:'finalized'}]);
  if(!Array.isArray(signatures)||signatures.some(tx=>!Number.isSafeInteger(tx.slot))||!Number.isSafeInteger(quote.createdSlot)||signatures.length>=1000&&signatures.at(-1).slot>=quote.createdSlot)throw Error('Unable to prove the wallet checkout unpaid. Reconcile it with the seller.');
  if(signatures.some(tx=>tx.slot>=quote.createdSlot&&!tx.err&&String(tx.memo||'').includes(quote.memo)))throw Error('A matching transaction exists. Verify its signature instead of cancelling.');
  const fresh=this.engine.order(id);if(fresh.status!=='pending'||fresh.cryptoCheckout?.memo!==quote.memo)throw Error('Order changed. Refresh before cancelling.');
  delete fresh.cryptoCheckout;this.engine.orderUpdate(id,'cancel');return {cancelled:true};
 });}
 async verify(id,signature){return this.locked(id,async()=>{
  if(!this.status.configured)throw Error('Wallet checkout is not configured.');
  if(typeof signature!=='string'||! /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature))throw Error('Enter a Solana transaction signature.');
  let order=this.engine.order(id),quote=order.cryptoCheckout;
  if(order.cryptoPayment?.signature===signature)return {paid:true};
  if(order.status!=='pending'||order.mode!=='live'||!quote)throw Error('This order has no pending wallet checkout.');
  await this.network();
  const tx=await this.rpc('getTransaction',[signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:0}]);
  if(!tx)throw Error('Payment is not finalized yet. Keep this order reserved and retry verification.');
  const message=tx.transaction?.message,instructions=message?.instructions||[];
  const transfers=instructions.filter(i=>i.programId===TOKEN&&i.parsed?.type==='transferChecked');
  const info=transfers[0]?.parsed?.info;
  if(message?.recentBlockhash!==quote.blockhash||tx.meta?.err!==null||tx.transaction?.signatures?.[0]!==signature||transfers.length!==1||info?.mint!==USDC||info?.source!==quote.source||info?.destination!==quote.destination||info?.authority!==quote.payer||info?.tokenAmount?.amount!==quote.amountAtomic||info?.tokenAmount?.decimals!==6||!message.accountKeys.some(k=>k.pubkey===quote.payer&&k.signer)||!instructions.some(i=>i.programId===MEMO&&i.parsed===quote.memo)||!Number.isFinite(tx.blockTime)||tx.blockTime*1000<quote.createdAt-120000)throw Error('Transaction does not match this order payment.');
  const destinationIndex=message.accountKeys.findIndex(key=>(typeof key==='string'?key:key.pubkey)===quote.destination);
  const before=tx.meta.preTokenBalances?.find(balance=>balance.accountIndex===destinationIndex),after=tx.meta.postTokenBalances?.find(balance=>balance.accountIndex===destinationIndex);
  if(!after||after.mint!==USDC||after.owner!==quote.recipient||after.uiTokenAmount?.decimals!==6||BigInt(after.uiTokenAmount.amount)-BigInt(before?.uiTokenAmount?.amount||'0')!==BigInt(quote.amountAtomic))throw Error('Recipient USDC balance does not match this payment.');
  order=this.engine.order(id);if(order.status!=='pending'||order.cryptoCheckout?.memo!==quote.memo||order.checkoutId||order.checkoutCreated!=null||this.engine.state.orders.some(o=>o.id!==id&&o.cryptoPayment?.signature===signature))throw Error('Order or transaction already changed.');
  order.cryptoPayment={signature,network:quote.network,mint:USDC,amountAtomic:quote.amountAtomic,recipient:quote.recipient,slot:tx.slot,finalized:true};
  order.status='paid-external';order.paymentSource='reown';order.paidAt=this.engine.now();
  this.engine.activity(`${order.number}: USDC payment verified on Solana.`, 'payment');this.engine.commit();return {paid:true};
 });}
}

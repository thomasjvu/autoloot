const TOKEN_PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const GENESIS={ 'solana:devnet':'EtWTRABZaYq6iMfeYKouRu166VU2xqa1', 'solana:mainnet':'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' };
const TRANSFER_TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(value,size){if(typeof value!=='string'||value.length>100||!value.length)return false;let n=0n;for(const char of value){const i=alphabet.indexOf(char);if(i<0)return false;n=n*58n+BigInt(i);}const bytes=n===0n?0:Math.ceil(n.toString(16).length/2);return bytes+(value.match(/^1*/)?.[0].length||0)===size;}
const evm=chain=>/^eip155:[1-9][0-9]*$/.test(chain);
export function walletAddress(chain,value){if(typeof value!=='string')throw Error('A destination wallet is required.');value=value.trim();if(evm(chain)&&/^0x[0-9a-fA-F]{40}$/.test(value)&&!/^0x0{40}$/.test(value))return value.toLowerCase();if(Object.hasOwn(GENESIS,chain)&&base58(value,32)&&value!=='11111111111111111111111111111111')return value;throw Error('Invalid or unsupported destination wallet.');}
export function nftAsset(input){
 if(!input || input.type==='physical')return {type:'physical'};
 if(input.type!=='nft')throw Error('Unknown fulfillment type.');
 const chain=String(input.chain||''),sender=walletAddress(chain,input.sender);
 let asset;
 if(evm(chain)){
  const contract=walletAddress(chain,input.contract),tokenId=String(input.tokenId ?? '');
  if(!/^\d{1,78}$/.test(tokenId)||BigInt(tokenId)>=2n**256n)throw Error('Enter an ERC-721 token ID.');
  asset={type:'nft',standard:'erc721',chain,sender,contract,tokenId:BigInt(tokenId).toString()};
 }else{
  if(!Object.hasOwn(GENESIS,chain)||!base58(input.mint,32))throw Error('Enter a supported Solana SPL mint.');
  asset={type:'nft',standard:'spl-token',chain,sender,mint:input.mint};
 }
 return {...asset,provider:String(input.provider||'External provider').trim().slice(0,100)};
}
export const assetKey=a=>a?.type==='nft'?`${a.chain}:${a.mint || a.contract+':'+a.tokenId}`:null;
export const isNft=o=>o?.product?.fulfillment?.type==='nft';
export function transactionId(chain,id){if(typeof id!=='string'||(evm(chain)?!/^0x[0-9a-fA-F]{64}$/.test(id):!base58(id,64)))throw Error('Invalid transaction identifier for this chain.');return evm(chain)?id.toLowerCase():id;}
async function boundedJson(response){if(!response.ok)throw Error('External service request failed.');let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>2*1024*1024)throw Error('External response too large.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
export class NftDelivery {
 constructor(engine,{rpc={},adapter=null}={}){this.engine=engine;this.rpc=rpc;this.adapter=adapter;this.busy=false;}
 configured(chain){return typeof this.rpc[chain]==='string' && (evm(chain)||Object.hasOwn(GENESIS,chain));}
 status(){return {chains:Object.keys(this.rpc).filter(chain=>this.configured(chain)),walletAdapter:Boolean(this.adapter),verification:'finalized-chain-receipt'};}
 async call(chain,method,params){
  if(!this.configured(chain))throw Error('Chain verification is not configured.');
  try{const result=await boundedJson(await fetch(this.rpc[chain],{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)}));if(result.error)throw Error();return result.result;}
  catch{throw Error('Chain verification unavailable or rejected. Delivery remains unconfirmed.');}
 }
 setRecipient(id,address,confirmed){
  const o=this.engine.order(id);if(!isNft(o))throw Error('This is not an NFT order.');
  if(confirmed!==true)throw Error('Confirm the destination wallet before continuing.');
  if(o.delivery)throw Error('Delivery already authorized. The destination cannot change.');
  if(!['pending','paid','test-paid','paid-external'].includes(o.status))throw Error('This order cannot accept a destination wallet.');
  const a=o.product.fulfillment;address=walletAddress(a.chain,address);if(address===a.sender)throw Error('The recipient must differ from the source wallet.');
  o.recipientWallet=address;o.recipientConfirmedAt=this.engine.now();this.engine.commit();return o;
 }
 authorize(id,{allowTransfer=false,maxFeeAtomic='0',runId=null}={}){
  const o=this.engine.order(id);if(!isNft(o)||!['paid','test-paid','paid-external'].includes(o.status))throw Error('Only paid NFT orders can authorize delivery.');
  if(o.refundRequestedAt!=null)throw Error('Reconcile the requested refund before NFT delivery.');
  if(o.mode==='live'&&o.status==='paid'&&o.paymentLive!==true)throw Error('A Stripe test payment cannot authorize live NFT delivery.');
  if(o.delivery)return o.delivery;
  if(!o.recipientWallet)throw Error('The buyer must confirm a destination wallet first.');
  if(!/^(0|[1-9][0-9]{0,24})$/.test(String(maxFeeAtomic)))throw Error('Set a nonnegative native-atomic fee cap.');
  const a=o.product.fulfillment;
  if(o.mode==='live'&&!this.configured(a.chain))throw Error('Configure chain receipt verification before authorizing delivery.');
  o.delivery={id:`nft-${o.id}`,status:'queued',asset:structuredClone(a),recipient:o.recipientWallet,after:Math.max(o.paidAt||o.createdAt,o.recipientConfirmedAt),createdAt:this.engine.now(),expiresAt:runId?this.engine.state.run.expiresAt:this.engine.now()+15*60000,runId,allowTransfer:Boolean(allowTransfer),maxFeeAtomic:String(maxFeeAtomic),attempts:0,nextAttemptAt:0};
  this.engine.activity(`${o.number}: NFT delivery authorized to the buyer-confirmed wallet.`,'delivery');this.engine.commit();return o.delivery;
 }
 canTransfer(o){const d=o.delivery;if(o.refundRequestedAt!=null||(o.mode==='live'&&o.status==='paid'&&o.paymentLive!==true))return false;if(!d?.allowTransfer||this.engine.now()>=d.expiresAt)return false;if(!d.runId)return true;const r=this.engine.state.run;return r?.id===d.runId&&r.status==='running'&&r.allowNftTransfers&&this.engine.now()<r.expiresAt;}
 manifest(o){const d=o.delivery;return {id:d.id,orderId:o.id,asset:d.asset,recipient:d.recipient,maxFeeAtomic:d.maxFeeAtomic,after:d.after,expiresAt:d.expiresAt,canTransfer:this.canTransfer(o)};}
 submit(id,tx){
  const o=this.engine.order(id),d=o.delivery;if(!d||!['paid','paid-external','test-paid'].includes(o.status))throw Error('Authorize this paid NFT delivery first.');
  tx=transactionId(d.asset.chain,tx);
  if(d.transactionId&&d.transactionId!==tx)throw Error('A transaction is already recorded. Reconcile it before replacing it.');
  if(this.engine.state.orders.some(other=>other.id!==o.id&&other.delivery?.transactionId===tx&&assetKey(other.delivery.asset)===assetKey(d.asset)))throw Error('This asset transfer is already bound to another order.');
  d.transactionId=tx;d.status='submitted';d.nextAttemptAt=0;delete d.error;this.engine.commit();return d;
 }
 async verify(o){
  const d=o.delivery,a=d.asset,tx=d.transactionId;
  if(!tx)throw Error('No transfer transaction has been submitted.');
  let blockId,fee;
  if(evm(a.chain)){
   const chain=await this.call(a.chain,'eth_chainId',[]);if(BigInt(chain)!==BigInt(a.chain.split(':')[1]))throw Error('RPC chain does not match this order.');
   const receipt=await this.call(a.chain,'eth_getTransactionReceipt',[tx]);
   if(!receipt)return null;
   if(receipt.status!=='0x1'||receipt.transactionHash?.toLowerCase()!==tx)throw Error('NFT transfer transaction failed or mismatched.');
   const finalized=await this.call(a.chain,'eth_getBlockByNumber',['finalized',false]);if(!finalized||BigInt(finalized.number)<BigInt(receipt.blockNumber))return null;
   const block=await this.call(a.chain,'eth_getBlockByNumber',[receipt.blockNumber,false]);
   if(block?.hash!==receipt.blockHash||Number(BigInt(block.timestamp))*1000<Math.floor(d.after/1000)*1000)throw Error('Transfer block is noncanonical or predates authorization/payment.');
   const addressTopic=value=>'0x'+value.slice(2).padStart(64,'0');
   const match=receipt.logs?.some(log=>log.address?.toLowerCase()===a.contract&&log.removed!==true&&log.topics?.length===4&&log.topics[0]?.toLowerCase()===TRANSFER_TOPIC&&log.topics[1]?.toLowerCase()===addressTopic(a.sender)&&log.topics[2]?.toLowerCase()===addressTopic(d.recipient)&&BigInt(log.topics[3])===BigInt(a.tokenId));
   if(!match)throw Error('Receipt does not transfer the exact NFT from its listed source to the confirmed recipient.');
   const owner=await this.call(a.chain,'eth_call',[{to:a.contract,data:'0x6352211e'+BigInt(a.tokenId).toString(16).padStart(64,'0')},finalized.number]);
   if(typeof owner!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(owner)||'0x'+owner.slice(-40).toLowerCase()!==d.recipient)throw Error('Finalized NFT ownership is not confirmed for the recipient.');
   if(['eip155:8453','eip155:84532'].includes(a.chain)&&receipt.l1Fee==null)throw Error('RPC receipt is missing the Base L1 fee.');
   fee=BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)+BigInt(receipt.l1Fee??0);
   if(receipt.blobGasUsed!=null)fee+=BigInt(receipt.blobGasUsed)*BigInt(receipt.blobGasPrice);
   if(fee<0n)throw Error('RPC returned an invalid transaction fee.');
   blockId=receipt.blockHash;
  }else{
   if(await this.call(a.chain,'getGenesisHash',[])!==GENESIS[a.chain])throw Error('RPC network does not match this order.');
   const receipt=await this.call(a.chain,'getTransaction',[tx,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:0}]);
   if(!receipt)return null;
   if(receipt.meta?.err!==null||receipt.transaction?.signatures?.[0]!==tx||!Number.isInteger(receipt.blockTime)||receipt.blockTime<Math.floor(d.after/1000))throw Error('Transfer failed, mismatched or predates authorization/payment.');
   const mint=await this.call(a.chain,'getAccountInfo',[a.mint,{encoding:'jsonParsed',commitment:'finalized'}]);
   const info=mint?.value?.data?.parsed;
   if(mint?.value?.owner!==TOKEN_PROGRAM||info?.type!=='mint'||info.info.decimals!==0||info.info.supply!=='1')throw Error('Only single-supply, zero-decimal SPL NFTs are supported by this verifier.');
   const sum=(rows,owner)=>(rows||[]).filter(b=>b.mint===a.mint&&b.owner===owner&&b.uiTokenAmount?.decimals===0).reduce((n,b)=>n+BigInt(b.uiTokenAmount.amount),0n);
   if(sum(receipt.meta.preTokenBalances,a.sender)-sum(receipt.meta.postTokenBalances,a.sender)!==1n||sum(receipt.meta.postTokenBalances,d.recipient)-sum(receipt.meta.preTokenBalances,d.recipient)!==1n)throw Error('Token balances do not prove this asset transfer.');
   const holdings=await this.call(a.chain,'getTokenAccountsByOwner',[d.recipient,{mint:a.mint},{encoding:'jsonParsed',commitment:'finalized',minContextSlot:receipt.slot}]);
   if(!Number.isSafeInteger(holdings?.context?.slot)||holdings.context.slot<receipt.slot||!holdings?.value?.some(row=>row.account?.owner===TOKEN_PROGRAM&&row.account.data?.parsed?.info?.owner===d.recipient&&row.account.data.parsed.info.mint===a.mint&&row.account.data.parsed.info.tokenAmount?.amount==='1'&&row.account.data.parsed.info.tokenAmount.decimals===0))throw Error('Finalized recipient ownership is not confirmed.');
   if(!Number.isSafeInteger(receipt.meta.fee)||receipt.meta.fee<0)throw Error('Invalid network fee evidence.');
   fee=BigInt(receipt.meta.fee);blockId=String(receipt.slot);
  }
  if(fee>BigInt(d.maxFeeAtomic))throw Error('Observed network fee exceeds the authorized cap; operator review required.');
  return {transactionId:tx,chain:a.chain,assetKey:assetKey(a),recipient:d.recipient,blockId,feeAtomic:String(fee),finalized:true,verifiedAt:this.engine.now()};
 }
 async tick(){
  if(this.busy||this.engine.halted)return;this.busy=true;
  try{
   const o=this.engine.state.orders.find(o=>isNft(o)&&['paid','paid-external'].includes(o.status)&&o.delivery&&['queued','submitting','submitted','reconciling'].includes(o.delivery.status)&&!(o.delivery.status==='queued'&&!o.delivery.transactionId&&!this.canTransfer(o))&&this.engine.now()>=(o.delivery.nextAttemptAt||0));
   if(!o)return;const d=o.delivery;
   try{
    if(!d.transactionId&&d.allowTransfer&&this.adapter){
     let result;
     if(d.status==='queued') { d.status='submitting';d.attempts++;this.engine.commit();result=await this.adapter.transfer(this.manifest(o)); }
     else result=await this.adapter.lookup(this.manifest(o));
     if(result?.transactionId)this.submit(o.id,result.transactionId);
     else if(result?.status==='failed')throw Error('Wallet adapter reported failure; operator review required.');
    }
    if(this.engine.halted)return;
    if(d.transactionId){const proof=await this.verify(o);if(this.engine.halted)return;if(proof){this.complete(o,proof);return;}}
    d.nextAttemptAt=this.engine.now()+10000;this.engine.commit();
   }catch(error){if(this.engine.halted)return;d.status=d.transactionId?'submitted':'reconciling';d.error=String(error.message).slice(0,240);d.nextAttemptAt=this.engine.now()+30000;this.engine.commit();}
  }finally{this.busy=false;}
 }
 complete(o,proof){
  if(o.status==='delivered')return;
  if(!isNft(o)||!['paid','paid-external'].includes(o.status)||proof.finalized!==true||proof.assetKey!==assetKey(o.delivery.asset)||proof.recipient!==o.recipientWallet||proof.chain!==o.delivery.asset.chain||proof.transactionId!==o.delivery.transactionId)throw Error('Delivery proof does not match this paid NFT order.');
  o.delivery.proof=proof;o.delivery.status='confirmed';o.status='delivered';o.deliveredAt=this.engine.now();
  this.engine.activity(`${o.number}: exact NFT transfer finalized; digital fulfillment complete. Provider handles optional physical redemption.`,'delivery');this.engine.commit();
 }
 simulate(id){
  const o=this.engine.order(id);if(o.mode!=='demo'||o.status!=='test-paid'||!isNft(o)||!o.recipientWallet)throw Error('Only paid demo NFT orders can simulate delivery.');
  o.status='test-delivered';o.deliveredAt=this.engine.now();o.delivery={status:'simulated',simulated:true,recipient:o.recipientWallet};
  this.engine.activity(`${o.number}: simulated NFT delivery; no blockchain transaction occurred.`,'delivery');this.engine.commit();
 }
}

export function walletBridge(url,token) {
 if(!url)return null;
 const parsed=new URL(url);
 if(parsed.protocol!=='https:' && !(parsed.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)))throw Error('Wallet bridge requires HTTPS or local loopback HTTP.');
 if(!token)throw Error('Set a dedicated wallet-bridge credential.');
 const base=url.replace(/\/$/,'');
 const request=async(path,body)=>{
  try {return await boundedJson(await fetch(base+path,{method:body?'POST':'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(body?{'Idempotency-Key':body.id}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)}));}
  catch{throw Error('Wallet response is unavailable. Reconcile the stable delivery ID; do not send another transfer.');}
 };
 return {transfer:manifest=>request('/transfers',manifest),lookup:manifest=>request('/transfers/'+encodeURIComponent(manifest.id))};
}

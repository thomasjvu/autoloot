import {randomUUID} from 'node:crypto';
const LIMIT=1000,REQUEST_LIMIT=2000;
// Resolve distinct identities only. Direct offers are exact, binding public prices;
// ceilings authorize only the minimum required to beat another identity.
export function resolveMaximums(offers,{opening,increment,floor=0,blocked=[]}) {
 const ranked=offers.filter(o=>!blocked.includes(o.userId)).map(o=>{
  const proxy=(o.maxCents||0)>(o.directAmount||0);
  return {...o,willingness:Math.max(o.maxCents||0,o.directAmount||0),proxy,priority:proxy?o.maxSequence:o.directSequence};
 }).filter(o=>o.willingness>=opening).sort((a,b)=>b.willingness-a.willingness||a.priority-b.priority);
 if(!ranked.length)return null;
 const winner=ranked[0],second=ranked[1];
 const competitive=second?Math.min(winner.willingness,second.willingness+increment):opening;
 const amount=winner.proxy?Math.max(opening,floor,winner.directAmount||0,competitive):winner.directAmount;
 if(!Number.isSafeInteger(amount)||amount>winner.willingness||amount<floor)throw Error('Auction offers need operator review.');
 return {userId:winner.userId,username:winner.username,source:winner.source,amount};
}
function ledgerFor(engine){
 const a=engine.state.auction;
 if(engine.state.privateBids?.auctionId===a.id)return structuredClone(engine.state.privateBids);
 const ledger={auctionId:a.id,sequence:0,offers:[],requests:[],directMessages:[]};
 for(const b of [...engine.state.bids].reverse().filter(b=>!b.voided&&b.auctionId===a.id)){
  let offer=ledger.offers.find(o=>o.userId===b.userId);
  if(!offer){offer={userId:b.userId,username:b.username,source:b.source};ledger.offers.push(offer);}
  offer.directAmount=b.amount;offer.directSequence=++ledger.sequence;
 }
 return ledger;
}
function accepted(engine,ledger,{messageId,source},money){
 const a=engine.state.auction;
 const result=resolveMaximums(ledger.offers,{opening:a.product.price,increment:a.increment,floor:a.highest?.amount||0,blocked:engine.state.blocked.map(b=>b.userId)});
 const changed=result&&(a.highest?.userId!==result.userId||a.highest?.amount!==result.amount);
 if(changed){
  const bid={id:randomUUID(),auctionId:a.id,...result,at:engine.now(),source:result.source||source,messageId};
  a.highest=bid;a.bidCount++;engine.state.bids.unshift(bid);engine.state.bids=engine.state.bids.slice(0,2000);
  if(a.antiSnipe&&a.endsAt-engine.now()<10000){a.endsAt=engine.now()+10000;engine.activity('Late bid: clock extended to 10s.','auction');}
  engine.activity(`${bid.username} bid ${money(bid.amount)}.`,'bid');
  engine.say(`${money(bid.amount)} from ${bid.username}! Current high bid.`,'excited');
 }
 engine.state.privateBids=ledger;
 return result;
}
export function ownMaximum(state,session){
 const a=state.auction,ledger=state.privateBids;
 if(!session||!a||ledger?.auctionId!==a.id||(a.mode==='live'?session.kind!=='twitch':session.kind!=='demo'))return null;
 const offer=ledger.offers.find(o=>o.userId===session.id&&o.maxCents);
 return offer?{auctionId:a.id,maxCents:offer.maxCents,status:!['live','paused'].includes(a.status)?'ended':a.status==='paused'?'paused':a.highest?.userId===session.id?'leading':'outbid'}:null;
}
export function installMaxBids(Engine,{cents,money}){
 Engine.prototype.maximumBid=function({auctionId,requestId,userId,username,amount,source='demo'}){
  this.assertAuctionRunAuthorization();
  this.tick();const a=this.state.auction;
  if(!a||a.id!==auctionId)throw Error('This auction changed. Review the current lot.');
  if(!userId||!username||!['demo','twitch'].includes(source)||a.mode==='live'&&source!=='twitch')throw Error('Verified buyer identity required.');
  if(source==='twitch'&&!this.state.registrations.some(r=>r.userId===userId))throw Error('Register before bidding.');
  if(this.state.blocked.some(b=>b.userId===userId))throw Error('Bidding is disabled for this account.');
  if(typeof requestId!=='string'||!requestId||requestId.length>100)throw Error('A bid request ID is required.');
  const maximum=cents(amount),ledger=ledgerFor(this),existingRequest=ledger.requests.find(r=>r.userId===userId&&r.requestId===requestId);
  if(existingRequest){if(existingRequest.maximum!==maximum)throw Error('This request ID was used for a different maximum.');return structuredClone(existingRequest.result);}
  if(a.status!=='live')throw Error('There is no live auction accepting bids.');
  let offer=ledger.offers.find(o=>o.userId===userId);
  if(offer?.maxCents&&maximum<=offer.maxCents)throw Error('A maximum bid can only be raised; it cannot be lowered or withdrawn.');
  const minimum=a.highest?a.highest.amount+a.increment:a.product.price;
  if(a.highest?.userId!==userId&&maximum<minimum||a.highest?.userId===userId&&maximum<a.highest.amount)throw Error(`Maximum must be at least ${money(a.highest?.userId===userId?a.highest.amount:minimum)}.`);
  if(ledger.requests.length>=REQUEST_LIMIT||!offer&&ledger.offers.length>=LIMIT)throw Error('Auction bid capacity reached. Contact the seller.');
  if(!offer){offer={userId,username:String(username).slice(0,40),source};ledger.offers.push(offer);}
  Object.assign(offer,{username:String(username).slice(0,40),source,maxCents:maximum,maxSequence:++ledger.sequence});
  if(a.highest?.userId===userId)this.state.privateBids=ledger;
  else accepted(this,ledger,{messageId:randomUUID(),source},money);
  const result=ownMaximum(this.state,{id:userId,kind:source});
  ledger.requests.push({userId,requestId,maximum,result:structuredClone(result)});this.commit();return result;
 };
 Engine.prototype.resolveDirectBid=function({userId,username,price,source,messageId}){
  this.assertAuctionRunAuthorization();
  const ledger=ledgerFor(this);ledger.directMessages||=[];
  if(ledger.directMessages.some(r=>r.messageId===messageId))return {duplicate:true};
  if(ledger.directMessages.length>=REQUEST_LIMIT)throw Error('Auction bid capacity reached. Contact the seller.');
  let offer=ledger.offers.find(o=>o.userId===userId);
  if(!offer&&ledger.offers.length>=LIMIT)throw Error('Auction bid capacity reached. Contact the seller.');
  if(!offer){offer={userId,username:String(username).slice(0,40),source};ledger.offers.push(offer);}
  Object.assign(offer,{username:String(username).slice(0,40),source,directAmount:price,directSequence:++ledger.sequence});
  accepted(this,ledger,{messageId,source},money);ledger.directMessages.push({messageId,userId});this.commit();return this.state.auction.highest;
 };
}

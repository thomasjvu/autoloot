import {randomInt,randomUUID,createHash} from 'node:crypto';
function prizeAddress(input={}){
 const result={};for(const key of ['name','line1','line2','city','state','postal_code','country']){result[key]=String(input?.[key]||'').trim();if(result[key].length>150)throw Error('Prize address field is too long.');}
 for(const key of ['name','line1','city','state','postal_code'])if(!result[key])throw Error(`Prize address ${key} is required.`);
 if(result.country!=='US'||!/^[A-Z]{2}$/.test(result.state)||!/^\d{5}(-\d{4})?$/.test(result.postal_code))throw Error('Prize claims require a US address, two-letter state and valid ZIP code.');
 return result;
}
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
export function publicGiveaway(g){if(!g)return null;return {...pick(g,['id','title','rules','mode','status','endsAt','winner','claimDays']),count:g.entries?.length||0,draws:(g.draws||[]).map(d=>pick(d,['at','rosterHash','count','index','winner']))};}
export const giveawayRecords=state=>[state.giveaway,...(state.giveawayHistory||[])].filter(Boolean);
export function buyerPrizes(state,session,now=Date.now()){
 if(!session)return [];
 return giveawayRecords(state).filter(g=>g.winnerUserId===session.id && (g.mode==='live'?session.kind==='twitch':session.kind==='demo')).map(g=>({id:g.id,title:g.title,mode:g.mode,deadline:g.claimDeadline,status:g.claim?.status==='dispatched'?'dispatched':g.claim?.status|| (now>=g.claimDeadline?'expired':'unclaimed'),address:g.claim?.address||null,tracking:g.claim?.tracking||'',submittedAt:g.claim?.submittedAt||null}));
}
export function installGiveaways(Engine){
 Engine.prototype.giveaway=function(id){const g=giveawayRecords(this.state).find(g=>g.id===id);if(!g)throw Error('Giveaway not found.');return g;};
 Engine.prototype.openGiveaway=function({title,rules,duration,claimDays=7}){
  if(!this.features.giveaways)throw Error('Giveaways are coming soon.');
  if(['open','closed'].includes(this.state.giveaway?.status))throw Error('Draw or cancel the current giveaway first.');
  duration=Number(duration);if(!Number.isInteger(duration)||duration<30||duration>3600)throw Error('Duration must be 30–3600 seconds.');
  claimDays=Number(claimDays);if(![1,3,7,14].includes(claimDays))throw Error('Choose a claim deadline of 1, 3, 7 or 14 days.');
  if(!String(title||'').trim()||!String(rules||'').trim())throw Error('Add a prize and eligibility rules.');
  if(this.state.giveaway){this.state.giveawayHistory||=[];this.state.giveawayHistory.unshift(structuredClone(this.state.giveaway));}
  this.state.giveaway={id:randomUUID(),title:String(title).trim().slice(0,120),rules:String(rules).trim().slice(0,1000),mode:this.state.mode,status:'open',claimDays,endsAt:this.now()+duration*1000,entries:[],draws:[]};this.commit();
 };
 Engine.prototype.enterGiveaway=function({userId,username,source='twitch'}){
  if(!this.features.giveaways)throw Error('Giveaways are coming soon.');
  const g=this.state.giveaway;
  if(!g||g.status!=='open'||this.now()>=g.endsAt)throw Error('Giveaway entry is closed.');
  if(g.mode!==this.state.mode || (g.mode==='live'&&source!=='twitch'))throw Error('Verified Twitch entry required.');
  if(!userId||!username || this.state.blocked.some(b=>b.userId===userId))throw Error('Entry not eligible.');
  if(g.entries.some(e=>e.userId===userId))return false;
  if(g.entries.length>=10000)throw Error('Entry limit reached.');
  g.entries.push({userId,username:String(username).slice(0,40)});this.commit();return true;
 };
 Engine.prototype.closeGiveaway=function(cancel=false){const g=this.state.giveaway;if(!g||!(cancel?['open','closed']:['open']).includes(g.status))throw Error('No open giveaway.');g.status=cancel?'cancelled':'closed';this.commit();};
 Engine.prototype.drawGiveaway=function(){const g=this.state.giveaway;if(!g||!['open','closed'].includes(g.status))throw Error('No giveaway ready to draw.');if(g.status==='open'&&this.now()<g.endsAt)throw Error('Close entries before drawing.');if(!g.entries.length)throw Error('No entries. Cancel this giveaway instead.');const index=randomInt(g.entries.length),winner=g.entries[index];g.draws.push({at:this.now(),rosterHash:createHash('sha256').update(JSON.stringify(g.entries)).digest('hex'),count:g.entries.length,index,winner:winner.username});g.winner=winner.username;g.winnerUserId=winner.userId;g.claimDeadline=this.now()+(g.claimDays||7)*86400000;g.status='drawn';this.say(`Giveaway winner: @${g.winner}! Open Your prizes in the shop to claim ${g.title}.`,'celebrate');this.commit();};
 Engine.prototype.claimGiveaway=function(input,session){
  const g=this.giveaway(input.id);
  if(!session||!g.winnerUserId||session.id!==g.winnerUserId||(g.mode==='live'?session.kind!=='twitch':session.kind!=='demo'))throw Error('This prize belongs to another verified account.');
  if(g.status!=='drawn'||g.mode!==this.state.mode)throw Error('This giveaway is not accepting claims in the current mode.');
  if(!Number.isFinite(g.claimDeadline)||this.now()>=g.claimDeadline)throw Error('The prize claim deadline has passed. Contact the seller.');
  if(g.claim?.status==='dispatched')throw Error('This prize was already dispatched.');
  if(input.confirmed!==true)throw Error('Confirm the recipient address.');
  const recipient=prizeAddress(input.address);
  if(g.claim?.status==='submitted'&&JSON.stringify(g.claim.address)===JSON.stringify(recipient))return g;
  g.claim={status:'submitted',address:recipient,submittedAt:g.claim?.submittedAt||this.now(),updatedAt:this.now()};this.commit();return g;
 };
 Engine.prototype.dispatchGiveaway=function(input){
  const g=this.giveaway(input.id),tracking=String(input.tracking||'').trim();
  if(input.confirmed!==true||!tracking||tracking.length>150||/[\r\n]/.test(tracking))throw Error('Confirm handoff and enter a tracking reference up to 150 characters.');
  if(g.claim?.status==='dispatched'){if(g.claim.tracking===tracking)return g;throw Error('This prize was dispatched with another tracking reference.');}
  if(g.status!=='drawn'||!g.winnerUserId||g.mode!==this.state.mode||g.claim?.status!=='submitted'||!Number.isFinite(g.claimDeadline)||g.claim.submittedAt>=g.claimDeadline)throw Error('Choose an on-time submitted prize claim in the current mode.');
  g.claim.status='dispatched';g.claim.tracking=tracking;g.claim.dispatchedAt=this.now();g.claim.simulated=g.mode==='demo';this.commit();return g;
 };
}

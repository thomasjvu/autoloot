import {randomInt,randomUUID,createHash} from 'node:crypto';
export function publicGiveaway(g){if(!g)return null;const {entries,...rest}=g;return {...rest,count:entries.length};}
export function installGiveaways(Engine){
 Engine.prototype.openGiveaway=function({title,rules,duration}){
  if(['open','closed'].includes(this.state.giveaway?.status))throw Error('Draw or cancel the current giveaway first.');
  duration=Number(duration);if(!Number.isInteger(duration)||duration<30||duration>3600)throw Error('Duration must be 30–3600 seconds.');
  if(!String(title||'').trim()||!String(rules||'').trim())throw Error('Add a prize and eligibility rules.');
  this.state.giveaway={id:randomUUID(),title:String(title).trim().slice(0,120),rules:String(rules).trim().slice(0,1000),mode:this.state.mode,status:'open',endsAt:this.now()+duration*1000,entries:[],draws:[]};this.commit();
 };
 Engine.prototype.enterGiveaway=function({userId,username,source='twitch'}){
  const g=this.state.giveaway;
  if(!g||g.status!=='open'||this.now()>=g.endsAt)throw Error('Giveaway entry is closed.');
  if(g.mode!==this.state.mode || (g.mode==='live'&&source!=='twitch'))throw Error('Verified Twitch entry required.');
  if(!userId||!username || this.state.blocked.some(b=>b.userId===userId))throw Error('Entry not eligible.');
  if(g.entries.some(e=>e.userId===userId))return false;
  if(g.entries.length>=10000)throw Error('Entry limit reached.');
  g.entries.push({userId,username:String(username).slice(0,40)});this.commit();return true;
 };
 Engine.prototype.closeGiveaway=function(cancel=false){const g=this.state.giveaway;if(!g||!(cancel?['open','closed']:['open']).includes(g.status))throw Error('No open giveaway.');g.status=cancel?'cancelled':'closed';this.commit();};
 Engine.prototype.drawGiveaway=function(){const g=this.state.giveaway;if(!g||!['open','closed'].includes(g.status))throw Error('No giveaway ready to draw.');if(g.status==='open'&&this.now()<g.endsAt)throw Error('Close entries before drawing.');if(!g.entries.length)throw Error('No entries. Cancel this giveaway instead.');const index=randomInt(g.entries.length);g.draws.push({at:this.now(),rosterHash:createHash('sha256').update(JSON.stringify(g.entries)).digest('hex'),count:g.entries.length,index,winner:g.entries[index].username});g.winner=g.entries[index].username;g.status='drawn';this.say(`Giveaway winner: @${g.winner}! Contact the streamer to claim ${g.title}.`,'celebrate');this.commit();};
}

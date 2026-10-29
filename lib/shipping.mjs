import {physicalFundsVerified} from './engine.mjs';
import {createHash, randomUUID} from 'node:crypto';
const paid=['paid','paid-external','test-paid'];
const active=['purchasing','unknown','pending','purchased','refund-pending'];
export const shippingLiability=o=>Boolean(o.shipment?.packageId)||active.includes(o.shipment?.status);
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export function address(input={}) {
 const result={};
 for(const key of ['name','line1','line2','city','state','postal_code','country','phone','email']){
  result[key]=String(input[key]||'').trim();if(result[key].length>150)throw Error('Shipping address field is too long.');
 }
 for(const key of ['name','line1','city','state','postal_code'])if(!result[key])throw Error(`Shipping ${key} is required.`);
 if(result.country!=='US')throw Error('Label purchasing currently supports US domestic shipments only.');
 if(!/^[A-Z]{2}$/.test(result.state)||!/^\d{5}(-\d{4})?$/.test(result.postal_code))throw Error('Use a two-letter US state and a five-digit ZIP (optional ZIP+4).');
 return result;
}
export function parcel(input={}) {
 const result={};
 for(const key of ['length','width','height','weight']){
  const value=String(input[key]??'');if(!/^\d{1,4}(\.\d{1,3})?$/.test(value)||Number(value)<=0||Number(value)>(key==='weight'?2400:108))throw Error('Enter positive package dimensions (up to 108 inches) and weight (up to 2400 ounces).');
  result[key]=value;
 }
 return {...result,distance_unit:'in',mass_unit:'oz'};
}
const apiAddress=a=>({name:a.name,street1:a.line1,street2:a.line2,city:a.city,state:a.state,zip:a.postal_code,country:a.country,...(a.phone?{phone:a.phone}:{}),...(a.email?{email:a.email}:{})});
const destination=value=>JSON.stringify(['name','line1','line2','city','state','postal_code','country'].map(k=>String(address(value)[k]||'').trim().replace(/\s+/g,' ').toLowerCase()));
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export class Shipping {
 constructor(engine,{token='',fetcher=fetch,now=()=>Date.now()}={}) {this.engine=engine;this.token=token;this.fetcher=fetcher;this.now=now;this.locks=new Set();}
 status(){return {configured:Boolean(this.token),environment:this.token.startsWith('shippo_live_')?'live':'test',settings:this.engine.state.shippingSettings||null};}
 configure(input){const from=address(input.from),presets=(input.presets||[]);if(!Array.isArray(presets)||presets.length>12)throw Error('Save at most 12 package presets.');const settings={from,presets:presets.map(p=>{const name=String(p.name||'').trim();if(!name||name.length>60)throw Error('Name each package preset (up to 60 characters).');return {name,...parcel(p)};})};this.engine.state.shippingSettings=settings;this.engine.commit();}
 async request(path,body){
  if(!/^shippo_(test|live)_[A-Za-z0-9]+$/.test(this.token))throw Error('Configure a valid Shippo API token on the server.');
  let response;try{response=await this.fetcher('https://api.goshippo.com'+path,{method:body?'POST':'GET',headers:{Authorization:'ShippoToken '+this.token,'Content-Type':'application/json','SHIPPO-API-VERSION':'2018-02-08'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000),redirect:'error'});}catch{throw Error('Shippo request was interrupted. Refresh/reconcile the existing attempt before any label retry.');}
  if(!response.ok)throw Error(`Shippo returned HTTP ${response.status}. Check account, address and carrier setup in Shippo.`);
  try{return await response.json();}catch{throw Error('Shippo returned an unreadable response.');}
 }
 order(id){const o=this.engine.order(id);if(!o.shipment?.packageId)return o;const leader=this.engine.order(o.shipment.leaderId);if(leader.shipment?.packageId!==o.shipment.packageId||!leader.shipment.orderIds?.includes(id))throw Error('Package membership is inconsistent; review required.');return leader;}
 members(o){const s=o.shipment;if(!s?.packageId)return [o];const ids=s.orderIds;if(!Array.isArray(ids)||ids.length<2||ids.length>50||new Set(ids).size!==ids.length||ids[0]!==o.id||s.leaderId!==o.id)throw Error('Invalid package membership.');const members=ids.map(id=>this.engine.order(id));if(this.engine.state.orders.filter(x=>x.shipment?.packageId===s.packageId).length!==ids.length||members.some(x=>['packageId','leaderId','orderIds','ownerId','mode','destination'].some(key=>JSON.stringify(x.shipment?.[key])!==JSON.stringify(s[key]))))throw Error('Package membership changed.');return members;}
 validatePackage(o){const s=o.shipment;if(!s?.packageId)return;for(const m of this.members(o)){this.eligible(m);if(m.userId!==s.ownerId||m.mode!==s.mode||destination(m.shipping)!==s.destination)throw Error('Package buyer, mode or destination changed. Release and review this package.');}}
 persist(o){if(o.shipment?.packageId){for(const m of this.members(o))if(m.id!==o.id)m.shipment=structuredClone(o.shipment);}this.engine.commit();}
 createPackage(input){const ids=input.orderIds;if(input.confirmed!==true||!Array.isArray(ids)||ids.length<2||ids.length>50||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('Confirm 2–50 unique order IDs and unchanged buyer shipping charges.');const members=ids.map(id=>this.engine.order(id));for(const m of members){this.eligible(m);if(!m.userId||m.shipment?.packageId||shippingLiability(m)||this.locks.has(m.id))throw Error('Order is already held or its buyer identity is missing.');}const first=members[0],dest=destination(first.shipping);if(members.some(m=>m.userId!==first.userId||m.mode!==first.mode||destination(m.shipping)!==dest))throw Error('Choose orders for the same buyer, mode and recipient destination.');const shipment={status:'package-ready',packageId:randomUUID(),leaderId:first.id,orderIds:[...ids],ownerId:first.userId,mode:first.mode,destination:dest,createdAt:this.now()};for(const m of members){if(m.shipment)m.shipmentHistory=[...(m.shipmentHistory||[]),structuredClone(m.shipment)];m.shipment=structuredClone(shipment);}this.engine.activity(`Combined package created for ${ids.length} orders; buyer charges unchanged.`, 'shipping');this.engine.commit();return shipment;}
 releasePackage(input){const o=this.order(input.id),s=o.shipment;if(!s?.packageId||input.confirmed!==true)throw Error('Confirm release of the package.');const members=this.members(o);if(members.some(m=>this.locks.has(m.id))||s.dispatchedAt||!['package-ready','quoted','failed','voided'].includes(s.status)||s.attemptId&&!['failed','voided'].includes(s.status))throw Error('Resolve the existing package label before release.');for(const m of members){m.shipmentHistory=[...(m.shipmentHistory||[]),{...structuredClone(s),releasedAt:this.now()}];delete m.shipment;}this.engine.activity('Combined package released; label history retained.', 'shipping');this.engine.commit();}

 eligible(o, requireAddress=true){if(!physicalFundsVerified(o))throw Error('A Stripe test or unverified payment cannot fulfill a live physical order.');if(o.product.fulfillment?.type==='nft'||!paid.includes(o.status)||o.refundRequestedAt!=null)throw Error('Choose a paid physical order without a requested refund.');const test=o.mode==='demo';if(test!==(this.status().environment==='test'))throw Error('Demo orders require a Shippo test token; live orders require a live token.');if(!this.token)throw Error('Configure Shippo first.');if(requireAddress)address(o.shipping);}
 account(){return fingerprint(this.token);}
 async locked(id,task){const ids=this.members(this.order(id)).map(o=>o.id);if(ids.some(key=>this.locks.has(key)))throw Error('A shipping request is already running for this order or package.');ids.forEach(key=>this.locks.add(key));try{return await task();}finally{ids.forEach(key=>this.locks.delete(key));}}
 async quote(input){return this.locked(input.id,async()=>{
  let o=this.order(input.id);this.eligible(o);this.validatePackage(o);if(active.includes(o.shipment?.status))throw Error('Reconcile the existing label before requesting new rates.');
  const from=address(this.engine.state.shippingSettings?.from),to=address(o.shipping),box=parcel(input.parcel),snapshot=fingerprint({from,to,box}),account=this.account();
  const result=await this.request('/shipments/',{address_from:apiAddress(from),address_to:apiAddress(to),parcels:[box],async:false,metadata:`autoloot:${o.id}`});
  o=this.order(input.id);this.eligible(o);this.validatePackage(o);if(account!==this.account()||fingerprint(address(this.engine.state.shippingSettings?.from))!==fingerprint(from)||active.includes(o.shipment?.status)||fingerprint(address(o.shipping))!==fingerprint(to))throw Error('Order changed while rates loaded. Request rates again.');
  if(result.test!==(this.status().environment==='test'))throw Error('Shippo returned a shipment in the wrong environment.');
  const rates=(result.rates||[]).filter(r=>r.currency==='USD'&&/^\d+(\.\d{1,2})?$/.test(String(r.amount))&&Number(r.amount)>0&&Number(r.amount)<=10000&&r.object_id&&['USPS','UPS','FedEx'].includes(r.provider)).map(r=>({id:r.object_id,amount:Math.round(Number(r.amount)*100),currency:'USD',carrier:String(r.provider||''),service:String(r.servicelevel?.name||''),estimatedDays:Number.isFinite(r.estimated_days)?r.estimated_days:null}));
  if(!rates.length)throw Error('Shippo returned no eligible USD rates. Check address, parcel and carrier accounts in Shippo.');
  if(o.shipment?.attemptId){for(const m of this.members(o))m.shipmentHistory=[...(m.shipmentHistory||[]),structuredClone(o.shipment)];}
  const membership=o.shipment?.packageId?Object.fromEntries(['packageId','leaderId','orderIds','ownerId','mode','destination','createdAt'].map(k=>[k,o.shipment[k]])):{};
  o.shipment={...membership,status:'quoted',quoteId:randomUUID(),providerShipmentId:result.object_id,account,test:this.status().environment==='test',from,to,parcel:box,snapshot,rates,quotedAt:this.now(),expiresAt:this.now()+15*60000};this.persist(o);return o.shipment;
 });}
 async buy(input){return this.locked(input.id,async()=>{
  let o=this.order(input.id);this.eligible(o);this.validatePackage(o);let s=o.shipment;
  if(!s||s.status!=='quoted'||s.quoteId!==input.quoteId||s.expiresAt<=this.now())throw Error('Request fresh shipping rates before buying a label.');
  if(s.account!==this.account()||fingerprint(address(this.engine.state.shippingSettings?.from))!==fingerprint(s.from)||fingerprint(address(o.shipping))!==fingerprint(s.to))throw Error('Account or address changed. Request new rates.');
  const rate=s.rates.find(r=>r.id===input.rateId);if(!rate||input.confirmed!==true||input.amount!==rate.amount)throw Error('Confirm the selected rate and exact postage charge.');
  const attemptId=randomUUID();Object.assign(s,{status:'purchasing',attemptId,rate,startedAt:this.now()});this.engine.activity(`${o.number}: requested ${s.test?'test ':''}Shippo label, USD ${(rate.amount/100).toFixed(2)}.`, 'shipping');this.persist(o);
  let result;try{result=await this.request('/transactions/',{rate:rate.id,label_file_type:'PDF_4x6',async:false,metadata:`autoloot:${attemptId}`});}catch(error){s=this.order(input.id).shipment;s.status='unknown';s.error='Purchase outcome unknown. Reconcile in Shippo; do not purchase another label.';this.persist(this.order(input.id));throw error;}
  if(this.order(input.id).shipment?.attemptId!==attemptId)throw Error('Shipping intent changed; reconcile the provider transaction.');
  return this.record(input.id,result);
 });}
 record(id,result){
  const o=this.order(id),s=o.shipment;if(!s?.attemptId)throw Error('No label purchase attempt exists.');
  if(!result || typeof result!=='object'){s.status='unknown';s.error='Provider returned an unreadable transaction. Reconcile the existing attempt.';this.persist(o);throw Error(s.error);}
  const rateId=typeof result.rate==='string'?result.rate:result.rate?.object_id;
  if(result.metadata!==`autoloot:${s.attemptId}`||rateId!==s.rate.id||result.test!==s.test||!result.object_id||!/^[a-zA-Z0-9_-]{1,100}$/.test(result.object_id)){
   s.status='unknown';s.error='Provider transaction did not match the purchase intent. Reconcile in Shippo.';this.persist(o);throw Error(s.error);
  }
  if(s.transactionId&&s.transactionId!==result.object_id)throw Error('Transaction does not match the saved purchase.');
  if(s.providerStatus!==result.status)this.engine.activity(`${o.number}: Shippo label ${String(result.status||'pending')}.`, 'shipping');
  s.transactionId=result.object_id;s.providerStatus=result.status;s.checkedAt=this.now();delete s.error;
  if(result.status==='SUCCESS'){
   const url=safeUrl(result.label_url),tracking=String(result.tracking_number||'');
   if(!url||!tracking||tracking.length>100){s.status='pending';s.error='Label is not ready. Refresh its provider status.';}
   else Object.assign(s,{status:'purchased',labelUrl:url,trackingNumber:tracking,trackingUrl:safeUrl(result.tracking_url_provider),purchasedAt:s.purchasedAt||this.now()});
  }else if(result.status==='ERROR')s.status='failed';
  else if(result.status==='REFUNDED')s.status='voided';
  else if(result.status==='REFUNDPENDING')s.status='refund-pending';
  else if(result.status==='REFUNDREJECTED')s.status=s.labelUrl&&s.trackingNumber?'purchased':'pending';
  else s.status='pending';
  this.persist(o);return s;
 }
 async refresh(input){return this.locked(input.id,async()=>{
  const s=this.order(input.id).shipment;if(!s?.attemptId)throw Error('No label purchase to reconcile.');if(s.account!==this.account())throw Error('Restore the original Shippo account token to reconcile.');
  let id=s.transactionId||String(input.transactionId||'');
  if(!id){
   const data=await this.request('/transactions/?rate='+encodeURIComponent(s.rate.id)+'&results=100&page=1');
   const matches=(data.results||[]).filter(t=>t.metadata===`autoloot:${s.attemptId}`);
   if(matches.length!==1)throw Error('No unique original transaction found yet. Check Shippo and refresh again, or enter its original transaction ID. Another purchase remains blocked.');
   id=matches[0].object_id;
  }
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Find the original transaction in Shippo and enter its transaction ID. Never create another label for an unknown purchase.');
  return this.record(input.id,await this.request('/transactions/'+encodeURIComponent(id)+'/'));
 });}
 async track(input){return this.locked(input.id,async()=>{
  let s=this.order(input.id).shipment;if(!s?.trackingNumber||s.status!=='purchased')throw Error('No purchased label to track.');if(s.account!==this.account())throw Error('Restore the original Shippo account token.');
  const result=await this.request('/tracks/'+encodeURIComponent(s.rate.carrier.toLowerCase())+'/'+encodeURIComponent(s.trackingNumber)+'/');
  s=this.order(input.id).shipment;
  const status=String(result.tracking_status?.status||'UNKNOWN');if(!['UNKNOWN','PRE_TRANSIT','TRANSIT','DELIVERED','RETURNED','FAILURE'].includes(status))throw Error('Unrecognized carrier status.');
  s.trackingStatus=status;s.trackingCheckedAt=this.now();this.persist(this.order(input.id));return s;
 });}
 dispatch(input){const o=this.order(input.id),s=o.shipment;if(!s||s.status!=='purchased')throw Error('Purchase and verify a label before dispatch.');if(input.confirmed!==true)throw Error('Confirm actual package handoff.');if(this.members(o).some(m=>this.locks.has(m.id)))throw Error('Wait for the shipping request to finish.');if(!s.packageId){if(s.test&&o.mode!=='demo')throw Error('A test label cannot fulfill a live order.');return this.engine.orderUpdate(o.id,'ship',`${s.rate.carrier} · ${s.trackingNumber}`);}const members=this.members(o),tracking=`${s.rate.carrier} · ${s.trackingNumber}`;if(s.dispatchedAt&&members.every(m=>m.status==='shipped'&&m.tracking===tracking))return;this.validatePackage(o);if(!s.trackingNumber||!s.rate?.carrier||s.test!==(s.mode==='demo'))throw Error('Package label does not match shipment.');for(const m of members){if(m.status==='paid-external')m.paymentSource='external';m.status='shipped';m.tracking=tracking;}s.dispatchedAt=this.now();this.engine.activity(`Dispatched combined package containing ${members.length} orders.`, 'shipping');this.persist(o);}
}

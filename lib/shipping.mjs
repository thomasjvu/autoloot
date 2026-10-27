import {physicalFundsVerified} from './engine.mjs';
import {createHash, randomUUID} from 'node:crypto';
const paid=['paid','paid-external','test-paid'];
const active=['purchasing','unknown','pending','purchased','refund-pending'];
export const shippingLiability=o=>active.includes(o.shipment?.status);
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
 order(id){return this.engine.order(id);}
 eligible(o, requireAddress=true){if(!physicalFundsVerified(o))throw Error('A Stripe test or unverified payment cannot fulfill a live physical order.');if(o.product.fulfillment?.type==='nft'||!paid.includes(o.status)||o.refundRequestedAt!=null)throw Error('Choose a paid physical order without a requested refund.');const test=o.mode==='demo';if(test!==(this.status().environment==='test'))throw Error('Demo orders require a Shippo test token; live orders require a live token.');if(!this.token)throw Error('Configure Shippo first.');if(requireAddress)address(o.shipping);}
 account(){return fingerprint(this.token);}
 async locked(id,task){if(this.locks.has(id))throw Error('A shipping request is already running for this order.');this.locks.add(id);try{return await task();}finally{this.locks.delete(id);}}
 async quote(input){return this.locked(input.id,async()=>{
  let o=this.order(input.id);this.eligible(o);if(shippingLiability(o))throw Error('Reconcile the existing label before requesting new rates.');
  const from=address(this.engine.state.shippingSettings?.from),to=address(o.shipping),box=parcel(input.parcel),snapshot=fingerprint({from,to,box});
  const result=await this.request('/shipments/',{address_from:apiAddress(from),address_to:apiAddress(to),parcels:[box],async:false,metadata:`autoloot:${o.id}`});
  o=this.order(input.id);this.eligible(o);if(shippingLiability(o)||fingerprint(address(o.shipping))!==fingerprint(to))throw Error('Order changed while rates loaded. Request rates again.');
  if(result.test!==(this.status().environment==='test'))throw Error('Shippo returned a shipment in the wrong environment.');
  const rates=(result.rates||[]).filter(r=>r.currency==='USD'&&/^\d+(\.\d{1,2})?$/.test(String(r.amount))&&Number(r.amount)>0&&Number(r.amount)<=10000&&r.object_id&&['USPS','UPS','FedEx'].includes(r.provider)).map(r=>({id:r.object_id,amount:Math.round(Number(r.amount)*100),currency:'USD',carrier:String(r.provider||''),service:String(r.servicelevel?.name||''),estimatedDays:Number.isFinite(r.estimated_days)?r.estimated_days:null}));
  if(!rates.length)throw Error('Shippo returned no eligible USD rates. Check address, parcel and carrier accounts in Shippo.');
  if(o.shipment?.attemptId){o.shipmentHistory=[...(o.shipmentHistory||[]),o.shipment];}
  o.shipment={status:'quoted',quoteId:randomUUID(),providerShipmentId:result.object_id,account:this.account(),test:this.status().environment==='test',from,to,parcel:box,snapshot,rates,quotedAt:this.now(),expiresAt:this.now()+15*60000};this.engine.commit();return o.shipment;
 });}
 async buy(input){return this.locked(input.id,async()=>{
  let o=this.order(input.id);this.eligible(o);let s=o.shipment;
  if(!s||s.status!=='quoted'||s.quoteId!==input.quoteId||s.expiresAt<=this.now())throw Error('Request fresh shipping rates before buying a label.');
  if(s.account!==this.account()||fingerprint(address(this.engine.state.shippingSettings?.from))!==fingerprint(s.from)||fingerprint(address(o.shipping))!==fingerprint(s.to))throw Error('Account or address changed. Request new rates.');
  const rate=s.rates.find(r=>r.id===input.rateId);if(!rate||input.confirmed!==true||input.amount!==rate.amount)throw Error('Confirm the selected rate and exact postage charge.');
  const attemptId=randomUUID();Object.assign(s,{status:'purchasing',attemptId,rate,startedAt:this.now()});this.engine.activity(`${o.number}: requested ${s.test?'test ':''}Shippo label, USD ${(rate.amount/100).toFixed(2)}.`, 'shipping');this.engine.commit();
  let result;try{result=await this.request('/transactions/',{rate:rate.id,label_file_type:'PDF_4x6',async:false,metadata:`autoloot:${attemptId}`});}catch(error){s=this.order(input.id).shipment;s.status='unknown';s.error='Purchase outcome unknown. Reconcile in Shippo; do not purchase another label.';this.engine.commit();throw error;}
  if(this.order(input.id).shipment?.attemptId!==attemptId)throw Error('Shipping intent changed; reconcile the provider transaction.');
  return this.record(input.id,result);
 });}
 record(id,result){
  const o=this.order(id),s=o.shipment;if(!s?.attemptId)throw Error('No label purchase attempt exists.');
  if(!result || typeof result!=='object'){s.status='unknown';s.error='Provider returned an unreadable transaction. Reconcile the existing attempt.';this.engine.commit();throw Error(s.error);}
  const rateId=typeof result.rate==='string'?result.rate:result.rate?.object_id;
  if(result.metadata!==`autoloot:${s.attemptId}`||rateId!==s.rate.id||result.test!==s.test||!result.object_id||!/^[a-zA-Z0-9_-]{1,100}$/.test(result.object_id)){
   s.status='unknown';s.error='Provider transaction did not match the purchase intent. Reconcile in Shippo.';this.engine.commit();throw Error(s.error);
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
  this.engine.commit();return s;
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
  s.trackingStatus=status;s.trackingCheckedAt=this.now();this.engine.commit();return s;
 });}
 dispatch(input){const o=this.order(input.id),s=o.shipment;if(!s||s.status!=='purchased')throw Error('Purchase and verify a label before dispatch.');if(input.confirmed!==true)throw Error('Confirm actual package handoff.');if(s.test&&o.mode!=='demo')throw Error('A test label cannot fulfill a live order.');this.engine.orderUpdate(o.id,'ship',`${s.rate.carrier} · ${s.trackingNumber}`);}
}

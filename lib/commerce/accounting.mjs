// Seller annotations are separate from buyer-visible orders and never change payment state.
const fields=['itemCost','paymentFees','deliveryCost','otherCost'];
export function recordCosts(engine,input){
 if(!engine.state.orders.some(order=>order.id===input.id))throw Error('Order not found.');
 const costs={};
 for(const field of fields){const raw=String(input[field]??'').trim();if(!raw){costs[field]=null;continue;}if(!/^\d{1,7}(\.\d{1,2})?$/.test(raw))throw Error('Enter nonnegative USD costs with at most two decimals.');costs[field]=Math.round(Number(raw)*100);}
 engine.state.accounting||={};engine.state.accounting[input.id]={...costs,note:String(input.note||'').trim().slice(0,300),updatedAt:engine.now()};engine.commit();
}
// Derived from the current verified label only; never rewrite seller annotations.
export function postageCosts(state){
 const result=new Map(),orders=new Map(state.orders.map(o=>[o.id,o])),packageCounts=new Map();
 for(const o of state.orders)if(o.shipment?.packageId)packageCounts.set(o.shipment.packageId,(packageCounts.get(o.shipment.packageId)||0)+1);
 const valid=o=>{
  const s=o.shipment;
  return s?.status==='purchased' && ['SUCCESS','REFUNDREJECTED'].includes(s.providerStatus) && s.attemptId && s.transactionId && Number.isSafeInteger(s.rate?.amount) && s.rate.amount>0 && typeof s.test==='boolean' && s.test===(o.mode==='demo') && ['paid','paid-external','test-paid','shipped'].includes(o.status) && o.product?.fulfillment?.type!=='nft' && (o.mode==='demo'||o.status==='paid-external'||o.paymentLive===true||o.status==='shipped'&&o.paymentSource==='external');
 };
 const destination=a=>JSON.stringify(['name','line1','line2','city','state','postal_code','country'].map(key=>String(a?.[key]||'').trim().replace(/\s+/g,' ').toLowerCase()));
 const processed=new Set();
 for(const o of state.orders){
  if(!valid(o))continue;
  const s=o.shipment;
  if(!s.packageId){result.set(o.id,s.rate.amount);continue;}
  if(processed.has(s.packageId))continue;
  processed.add(s.packageId);
  const ids=s.orderIds;
  if(!Array.isArray(ids)||ids.length<2||ids.length>50||new Set(ids).size!==ids.length||ids[0]!==s.leaderId||!s.ownerId||!s.destination)continue;
  const keys=['packageId','leaderId','orderIds','ownerId','mode','destination','attemptId','transactionId','rate','test','status','providerStatus'];
  const members=ids.map(id=>orders.get(id));
  if(packageCounts.get(s.packageId)!==ids.length||members.some(m=>!m||!valid(m)||m.userId!==s.ownerId||m.mode!==s.mode||destination(m.shipping)!==s.destination||keys.some(key=>JSON.stringify(m.shipment[key])!==JSON.stringify(s[key]))))continue;
  const sorted=[...ids].sort(),base=Math.floor(s.rate.amount/ids.length),remainder=s.rate.amount%ids.length;
  sorted.forEach((id,index)=>result.set(id,base+(index<remainder?1:0)));
 }
 return result;
}
export function accountingRows(state){const automatic=postageCosts(state);return state.orders.map(order=>{
 const entered=state.accounting?.[order.id]||{},manual=Number.isSafeInteger(entered.deliveryCost),autoDeliveryCost=automatic.get(order.id)??null,costs={...entered,deliveryCost:manual?entered.deliveryCost:autoDeliveryCost},deliveryCostSource=manual?'manual':autoDeliveryCost!==null?'shippo':'unknown',test=order.mode==='demo'||order.paymentLive===false&&order.status!=='paid-external';
 const paid=['paid','paid-external','test-paid','shipped','delivered','test-delivered','refunded'].includes(order.status);
 const received=paid?(order.total??order.amount):0,refund=order.status==='refunded'?received:0;
 const complete=fields.every(field=>Number.isSafeInteger(costs[field]));
 const expenses=fields.reduce((sum,field)=>sum+(costs[field]||0),0);
 return {id:order.id,number:order.number,title:order.product.title,status:order.status,mode:test?'practice':'live',at:order.paidAt||order.createdAt,received,refund,net:received-refund,outstanding:['pending','processing'].includes(order.status)?order.total:0,expenses,complete,margin:paid?received-refund-expenses:null,...Object.fromEntries(fields.map(field=>[field,costs[field]??null])),note:costs.note||'',deliveryCostSource,autoDeliveryCost,manualDeliveryCost:manual?entered.deliveryCost:null};
 });}

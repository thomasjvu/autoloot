// Seller annotations are separate from buyer-visible orders and never change payment state.
const fields=['itemCost','paymentFees','deliveryCost','otherCost'];
export function recordCosts(engine,input){
 if(!engine.state.orders.some(order=>order.id===input.id))throw Error('Order not found.');
 const costs={};
 for(const field of fields){const raw=String(input[field]??'').trim();if(!raw){costs[field]=null;continue;}if(!/^\d{1,7}(\.\d{1,2})?$/.test(raw))throw Error('Enter nonnegative USD costs with at most two decimals.');costs[field]=Math.round(Number(raw)*100);}
 engine.state.accounting||={};engine.state.accounting[input.id]={...costs,note:String(input.note||'').trim().slice(0,300),updatedAt:engine.now()};engine.commit();
}
export function accountingRows(state){return state.orders.map(order=>{
 const costs=state.accounting?.[order.id]||{},test=order.mode==='demo'||order.paymentLive===false&&order.status!=='paid-external';
 const paid=['paid','paid-external','test-paid','shipped','delivered','test-delivered','refunded'].includes(order.status);
 const received=paid?(order.total??order.amount):0,refund=order.status==='refunded'?received:0;
 const complete=fields.every(field=>Number.isSafeInteger(costs[field]));
 const expenses=fields.reduce((sum,field)=>sum+(costs[field]||0),0);
 return {id:order.id,number:order.number,title:order.product.title,status:order.status,mode:test?'practice':'live',at:order.paidAt||order.createdAt,received,refund,net:received-refund,outstanding:['pending','processing'].includes(order.status)?order.total:0,expenses,complete,margin:paid?received-refund-expenses:null,...Object.fromEntries(fields.map(field=>[field,costs[field]??null])),note:costs.note||''};
 });}

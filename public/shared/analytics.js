import {esc,usd} from './presenters.js';
const DAY=86400000;
// Fixed UTC buckets keep boundaries and labels consistent across time zones.
export function salesBuckets(rows,{now=Date.now(),days=30}={}){
 const end=Math.floor(now/DAY)*DAY,start=end-(days-1)*DAY;
 const buckets=Array.from({length:days},(_,i)=>({at:start+i*DAY,received:0,refund:0,orders:0}));
 for(const row of rows){const index=Math.floor((row.at-start)/DAY);if(index<0||index>=days||!Number.isFinite(index))continue;const b=buckets[index];b.received+=row.received||0;b.refund+=row.refund||0;if(row.received>0)b.orders++;}
 return buckets;
}
export function salesChart(rows,{now=Date.now(),days=30}={}){
 const buckets=salesBuckets(rows,{now,days}),peak=Math.max(1,...buckets.map(b=>b.received));
 const date=at=>new Date(at).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
 return `<section class="panel activity-chart"><div class="chart-heading"><h2>Daily collections</h2><span>${days} days · UTC</span></div>${buckets.some(b=>b.orders)?`<div class="sales-bars" role="img" aria-label="Daily collected sales. Highest day ${esc(usd(peak))}.">${buckets.map(b=>`<div class="sales-bar-slot" tabindex="0" aria-label="${date(b.at)}: ${usd(b.received)}, ${b.orders} paid orders, ${usd(b.refund)} refunded"><span class="sales-bar" style="height:${Math.max(2,Math.round(b.received/peak*100))}%" data-empty="${!b.received}"></span><span class="chart-tooltip">${date(b.at)} · ${usd(b.received)}<br>${b.orders} paid · ${usd(b.refund)} refunded</span></div>`).join('')}</div><div class="chart-axis"><span>${date(buckets[0].at)}</span><span>Peak ${usd(peak)}</span><span>${date(buckets.at(-1).at)}</span></div>`:'<div class="chart-empty">No collections in this period.</div>'}</section>`;
}
export function orderStatusCounts(orders){
 const groups=[{label:'Unpaid',value:0},{label:'To fulfill',value:0},{label:'Fulfilled',value:0},{label:'Refunded',value:0},{label:'Canceled / other',value:0}];
 for(const o of orders){const i=['pending','processing'].includes(o.status)?0:['paid','paid-external','test-paid'].includes(o.status)?1:['shipped','delivered','test-delivered'].includes(o.status)?2:o.status==='refunded'?3:4;groups[i].value++;}return groups;
}
export function ordersChart(orders){
 // Test transactions never inflate the real-order overview.
 const live=orders.filter(o=>o.mode==='live'&&o.paymentLive!==false&& !o.status.startsWith('test-')),groups=orderStatusCounts(live),peak=Math.max(1,...groups.map(g=>g.value));
 return `<section class="panel activity-chart order-chart"><div class="chart-heading"><h2>Order overview</h2><span>${live.length} real orders · all time</span></div>${live.length?`<div class="status-bars">${groups.map(g=>`<div class="status-bar-row"><span>${g.label}</span><div class="status-bar-track"><i style="width:${g.value/peak*100}%"></i></div><strong>${g.value}</strong></div>`).join('')}</div>`:'<div class="chart-empty">Your order activity will appear here.</div>'}</section>`;
}

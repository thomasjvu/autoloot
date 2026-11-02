import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {parseCsv,encodeCsv,previewImport,applyImport,fulfillmentCsv,pirateShipCsv} from '../lib/commerce/csv.mjs';
const fresh=()=>new Engine(seed());
const inventory={kind:'inventory',csv:'sku,title,quantity,condition,price,buyNowPrice,image\r\nA,"Card, blue",2,Used,12.50,15.00,https://example.com/card.jpg'};
const apply=(e,input)=>{const p=previewImport(e,input);assert.equal(p.valid,true,JSON.stringify(p.rows));applyImport(e,{...input,fingerprint:p.fingerprint});return p;};
test('CSV handles BOM, escaped quotes and multiline cells, rejects malformed input and limits',()=>{
 assert.deepEqual(parseCsv('\uFEFFa,b\r\n"one\nline","say ""hi"""').rows,[['one\nline','say "hi"']]);
 for(const text of ['a,a\nx,y','a,b\nx','a\n"open','a\n"ok"bad','a\nx"bad'])assert.throws(()=>parseCsv(text));
 assert.throws(()=>parseCsv('a\n'+'x\n'.repeat(501)));
 assert.match(encodeCsv([[' =1','@foo','normal']]),/"' =1","'@foo","normal"/);
});
test('inventory preview is read only; apply is one durable save, unlisted and replay resistant',()=>{
 let saves=0;const e=new Engine(seed(),{save:()=>saves++});const before=structuredClone(e.state);
 const p=previewImport(e,inventory);assert.equal(p.valid,true);assert.deepEqual(e.state,before);
 applyImport(e,{...inventory,fingerprint:p.fingerprint});assert.equal(saves,1);
 const item=e.state.products.find(p=>p.sku==='A');assert.equal(item.price,1250);assert.equal(item.buyNowPrice,1500);assert.equal(item.listed,false);assert.equal(item.image,'https://example.com/card.jpg');
 assert.throws(()=>applyImport(e,{...inventory,fingerprint:p.fingerprint}));
});
test('mapping and update by SKU preserve identifiers, reject duplicate and invalid rows atomically',()=>{
 const e=fresh();apply(e,inventory);const item=e.state.products.at(-1),id=item.id;
 const update={kind:'inventory',mode:'update',csv:'Code,Name,Stock,State,USD\nA,Updated,3,Used,9.99',mapping:{sku:'Code',title:'Name',quantity:'Stock',condition:'State',price:'USD'}};
 apply(e,update);assert.equal(e.state.products.at(-1).id,id);assert.equal(e.state.products.at(-1).quantity,3);assert.equal(e.state.products.at(-1).buyNowPrice,1500);
 const before=structuredClone(e.state);const bad={kind:'inventory',csv:'sku,title,quantity,condition,price\nB,Valid,1,New,5\nC,Invalid,1,New,nope'};
 const p=previewImport(e,bad);assert.equal(p.valid,false);assert.throws(()=>applyImport(e,{...bad,fingerprint:p.fingerprint}));assert.deepEqual(e.state,before);
 assert.equal(previewImport(e,inventory).valid,false);
 assert.equal(previewImport(e,{...bad,csv:'sku,title,quantity,condition,price\nB,One,1,New,5\nB,Two,1,New,5'}).valid,false);
});
const order=(id,status='test-paid')=>({id,number:`AL-${id}`,product:{id:'p1',title:'Card',sku:'A'},status,reservationExpiresAt:Date.now()+60000,mode:'demo',amount:500,total:600,shippingPrice:100,buyer:'buyer',shipping:{name:'Sample',line1:'Test street',city:'NY',country:'US',postal_code:'00123'}});
test('tracking import uses fulfillment guards, rejects stale preview and is atomic',()=>{
 const e=fresh();e.state.orders=[order('1'),order('2','pending')];
 const input={kind:'tracking',csv:'Order,Carrier,Tracking\nAL-1,USPS,001234\nAL-2,UPS,567'};
 assert.equal(previewImport(e,input).valid,false);assert.equal(e.state.orders[0].status,'test-paid');
 const good={...input,csv:'Order ID,Carrier,Tracking\n1,USPS,001234'};const p=previewImport(e,good);
 e.state.orders[0].refundRequestedAt=1;assert.throws(()=>applyImport(e,{...good,fingerprint:p.fingerprint}));delete e.state.orders[0].refundRequestedAt;
 apply(e,good);assert.equal(e.state.orders[0].status,'shipped');assert.equal(e.state.orders[0].tracking,'USPS · 001234');
 apply(e,good);assert.equal(e.state.orders[0].tracking,'USPS · 001234');
 e.state.orders[0].product.fulfillment={type:'nft'};e.state.orders[0].status='test-paid';assert.equal(previewImport(e,good).valid,false);
});
test('shipping export includes addresses and stable IDs, omits unpaid/refund/digital orders',()=>{
 const refund=order('4');refund.refundRequestedAt=1;const nft=order('3');nft.product.fulfillment={type:'nft'};
 const {headers,rows}=parseCsv(fulfillmentCsv([order('1'),order('2','pending'),nft,refund]));
 assert.equal(rows.length,1);assert.equal(rows[0][headers.indexOf('Postal code')],'00123');assert.equal(rows[0][headers.indexOf('Order ID')],'1');assert.equal(rows[0][headers.indexOf('Mode')],'demo');
});

test('fulfillment exports and tracking imports exclude live Stripe test payments',()=>{
 const e=fresh();const o=e.buyNow({productId:'p4',userId:'demo-buyer',username:'buyer',requestId:'funds'});
 Object.assign(o,{mode:'live',status:'paid',paymentLive:false});
 assert.equal(fulfillmentCsv([o]).includes(o.id),false);assert.equal(pirateShipCsv([o]).includes(o.id),false);
 const preview=previewImport(e,{kind:'tracking',csv:`Order,Carrier,Tracking\n${o.id},USPS,123`});assert.equal(preview.valid,false);assert.equal(o.status,'paid');
});

test('external payment provenance survives shipping and restart and remains exportable',()=>{
 const e=fresh();const o=e.buyNow({productId:'p4',userId:'demo-buyer',username:'buyer',requestId:'external'});o.mode='live';
 e.orderUpdate(o.id,'confirm-paid');e.orderUpdate(o.id,'ship','USPS · 123');
 const restarted=new Engine(JSON.parse(JSON.stringify(e.state)));const saved=restarted.order(o.id);
 assert.equal(saved.paymentSource,'external');assert.equal(saved.status,'shipped');assert.equal(fulfillmentCsv([saved]).includes(saved.id),true);
 const legacy={...saved};delete legacy.paymentSource;assert.equal(fulfillmentCsv([legacy]).includes(legacy.id),true);
});

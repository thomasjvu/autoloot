import {createHash} from 'node:crypto';
import {Engine,physicalFundsVerified} from './engine.mjs';

export function parseCsv(text) {
  if(typeof text!=='string' || Buffer.byteLength(text)>200000) throw Error('Choose a CSV smaller than 200 KB.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[]; let row=[],cell='',quoted=false,closed=false;
  const endCell=()=>{row.push(cell);cell='';closed=false;};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) {if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell || closed)throw Error('Unexpected quote in CSV.');quoted=true;}
    else if(c===',')endCell();
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;endCell();if(row.some(v=>v!==''))rows.push(row);row=[];}
    else {if(closed)throw Error('Unexpected text after closing quote.');cell+=c;}
  }
  if(quoted)throw Error('Unclosed CSV quote.');
  endCell();if(row.some(v=>v!==''))rows.push(row);
  if(rows.length<2)throw Error('Include a header and at least one data row.');
  if(rows.length>501)throw Error('Import at most 500 rows at a time.');
  const headers=rows.shift().map(v=>v.trim());
  if(headers.some(v=>!v)||new Set(headers).size!==headers.length)throw Error('Column headers must be nonempty and unique.');
  if(rows.some(r=>r.length!==headers.length))throw Error('Every row must have the same number of columns as the header.');
  return {headers,rows};
}
export const inventoryFields=['sku','title','description','quantity','condition','price','buyNowPrice','image'];
export const trackingFields=['order','carrier','tracking'];
const aliases={sku:['sku','variant sku'],title:['title','name'],description:['description','body (html)'],quantity:['quantity','stock','variant inventory qty'],condition:['condition'],price:['price','opening price','regular price','variant price'],buyNowPrice:['buynowprice','buy now price','sale price'],image:['image','image url','image src','images'],order:['order','order id','order_id','order #'],carrier:['carrier'],tracking:['tracking','tracking number','tracking_number','tracking #']};
export function encodeCsv(rows){return rows.map(row=>row.map(v=>'"'+String(v??'').replace(/^[\s\u0000-\u001f]*[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');}
export function previewImport(engine,input) {
  if(!['inventory','tracking'].includes(input.kind))throw Error('Choose inventory or tracking.');
  const {headers,rows}=parseCsv(input.csv),fields=input.kind==='inventory'?inventoryFields:trackingFields;
  const mapping=Object.fromEntries(fields.map(f=>[f,input.mapping ? (input.mapping[f]||'') : headers.find(h=>aliases[f].includes(h.toLowerCase()))||'']));
  if(Object.values(mapping).some(h=>h&&!headers.includes(h)))throw Error('Mapped column does not exist.');
  const mode=input.mode==='update'?'update':'create';
  const clone=new Engine(structuredClone(engine.state),{now:engine.now});
  const seen=new Set(),results=[];
  for(const [i,row] of rows.entries()) {
    const v=Object.fromEntries(fields.map(f=>[f,mapping[f]?row[headers.indexOf(mapping[f])].trim():'']));
    try {
      let action;
      if(input.kind==='inventory') {
        if(!v.title||!v.price||!v.quantity||!v.condition)throw Error('Title, opening price, quantity and confirmed condition are required.');
        if(v.title.length>100 || v.condition.length>40 || v.description.length>1000)throw Error('Title, condition or description exceeds the field limit.');
        if(!/^\d+$/.test(v.quantity))throw Error('Quantity must be a whole number.');
        if(v.sku && seen.has(v.sku))throw Error('Duplicate SKU in this file.');
        if(v.sku)seen.add(v.sku);
        const matches=v.sku?clone.state.products.filter(p=>p.sku===v.sku):[];
        if(matches.length>1)throw Error('SKU matches multiple products. Resolve duplicates first.');
        const existing=matches[0];
        if(existing&&mode!=='update')throw Error('SKU already exists. Choose update by SKU.');
        if(existing?.fulfillment?.type==='nft')throw Error('NFT inventory must be edited individually.');
        if(existing&&clone.state.orders.some(o=>o.product.id===existing.id&&['pending','processing'].includes(o.status)))throw Error('Resolve reserved orders before replacing stock.');
        if(v.image&&!/^https:\/\//.test(v.image)&&!/^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(v.image))throw Error('Image must be a single HTTPS URL or uploaded /media path.');
        if(v.image){const u=new URL(v.image,'http://localhost');if(u.username||u.password)throw Error('Image URL cannot contain credentials.');}
        const defaults=existing?{...existing,price:(existing.price/100).toFixed(2),buyNowPrice:existing.buyNowPrice?(existing.buyNowPrice/100).toFixed(2):''}:{};
        const data={...defaults,...Object.fromEntries(Object.entries(v).filter(([k])=>mapping[k])),listed:false};
        const p=existing?clone.editProduct(existing.id,data):clone.addProduct(data);
        p.sku=v.sku;if(v.image)p.image=v.image;else if(mapping.image)delete p.image;
        action=existing?'Update':'Create';
      }else {
        if(!v.order||!v.tracking||!v.carrier)throw Error('Order, carrier and tracking number are required.');
        const matches=clone.state.orders.filter(o=>o.id===v.order||o.number===v.order);
        if(matches.length!==1)throw Error('Order must identify exactly one existing order.');
        const o=matches[0];if(seen.has(o.id))throw Error('Duplicate order in this file.');seen.add(o.id);
        const tracking=`${v.carrier} · ${v.tracking}`;
        if(tracking.length>150)throw Error('Carrier and tracking must fit within 150 characters.');
        if(o.status==='shipped'&&o.tracking===tracking)action='Already shipped';
        else {clone.orderUpdate(o.id,'ship',tracking);action='Mark shipped';}
      }
      results.push({row:i+2,values:v,action});
    }catch(e){results.push({row:i+2,values:v,error:e.message});}
  }
  const fingerprint=createHash('sha256').update(JSON.stringify({csv:input.csv,mapping,mode,kind:input.kind,products:engine.state.products,orders:engine.state.orders,auction:engine.state.auction,run:engine.state.run})).digest('hex');
  return {headers,fields,mapping,mode,rows:results,valid:results.every(r=>!r.error),fingerprint,state:clone.state};
}
export function applyImport(engine,input) {
  const preview=previewImport(engine,input);
  if(!preview.valid)throw Error('Fix every row before importing. No rows were saved.');
  if(preview.fingerprint!==input.fingerprint)throw Error('Data changed since preview. Preview again before importing.');
  engine.state=preview.state;
  engine.activity(`Imported ${preview.rows.length} ${input.kind} CSV rows.`);
  engine.commit();
  return preview.rows.length;
}
export function fulfillmentCsv(orders) {
  return encodeCsv([['Order','Order ID','SKU','Product','Quantity','Buyer','Name','Address 1','Address 2','City','State','Postal code','Country','Subtotal USD','Shipping USD','Total USD','Status','Mode','Tracking'],...orders.filter(o=>physicalFundsVerified(o)&&['paid','paid-external','test-paid','shipped'].includes(o.status)&&o.product.fulfillment?.type!=='nft'&&o.refundRequestedAt==null).map(o=>[o.number,o.id,o.product.sku,o.product.title,1,o.buyer,...['name','line1','line2','city','state','postal_code','country'].map(k=>o.shipping?.[k]||''),(o.amount/100).toFixed(2),((o.shippingPrice||0)/100).toFixed(2),((o.total??o.amount)/100).toFixed(2),o.status,o.mode,o.tracking])]);
}

export function pirateShipCsv(orders) {
 const eligible=orders.filter(o=>physicalFundsVerified(o)&&['paid','paid-external','test-paid'].includes(o.status)&&o.product.fulfillment?.type!=='nft'&&o.refundRequestedAt==null&&!o.shipment?.packageId&&!['purchasing','unknown','pending','purchased','refund-pending'].includes(o.shipment?.status));
 if(eligible.some(o=>!o.shipping || ['name','line1','city','postal_code','country'].some(k=>!o.shipping[k])))throw Error('Add missing recipient addresses before exporting to Pirate Ship.');
 return encodeCsv([['Order ID','Name','Address 1','Address 2','City','State','Zip','Country','SKU','Product','Mode'],...eligible.map(o=>[o.id,...['name','line1','line2','city','state','postal_code','country'].map(k=>o.shipping[k]||''),o.product.sku,o.product.title,o.mode])]);
}

// Explicit test-process preload only. Never loaded by the application itself.
const nativeFetch=globalThis.fetch;
const transactions=new Map();
globalThis.fetch=async(url,options={})=>{
 if(!String(url).startsWith('https://api.goshippo.com/'))return nativeFetch(url,options);
 const path=new URL(url).pathname,input=options.body?JSON.parse(options.body):{};
 if(path==='/shipments/')return Response.json({object_id:'fixture_shipment',test:true,rates:[{object_id:'fixture_rate',provider:'USPS',servicelevel:{name:'Ground Advantage'},currency:'USD',amount:'4.25',estimated_days:3}]});
 if(path==='/transactions/'&&options.method==='POST'){
  const transaction={object_id:'fixture_transaction',status:'SUCCESS',test:true,metadata:input.metadata,rate:input.rate,label_url:'https://labels.example.invalid/fixture.pdf',tracking_number:'9400000000000000000001',tracking_url_provider:'https://tracking.example.invalid/fixture'};
  transactions.set(transaction.object_id,transaction);return Response.json(transaction);
 }
 if(path==='/transactions/'&&options.method==='GET')return Response.json({results:[...transactions.values()]});
 if(path.startsWith('/transactions/')){const t=transactions.get(path.split('/')[2]);return t?Response.json(t):Response.json({}, {status:404});}
 if(path.startsWith('/tracks/'))return Response.json({tracking_status:{status:'TRANSIT'}});
 return Response.json({}, {status:404});
};

import {Hono} from 'hono';
import {fulfillmentCsv,pirateShipCsv} from '../csv.mjs';
export function createExports({engine}) {
 const router=new Hono();
  for(const path of ['/api/pirateship.csv','/api/fulfillment.csv','/api/orders.csv'])router.all(path,handle);
 return router;
 async function handle(c){
  const req=c.get('request'),{adminAccess,session}=c.get('prepared'),url=new URL(c.req.url),path=url.pathname;

    if(path === "/api/pirateship.csv") {
      if(!adminAccess)return c.json({error:'Streamer access required.'},403);
      return c.body(pirateShipCsv(engine.state.orders),200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="autoloot-pirateship.csv"','Cache-Control':'no-store'});
    }
    if (path === "/api/fulfillment.csv") {
      if (!adminAccess) return c.json( {error:"Streamer access required."},403);
      return c.body(fulfillmentCsv(engine.state.orders),200,{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="autoloot-fulfillment.csv"',"Cache-Control":"no-store"});
    }
    if (path === "/api/orders.csv") {
      if (!adminAccess)
        return c.json( { error: "Streamer access required." }, 403);
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+\-@]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const rows = [
        [
          "Order",
          "Product",
          "Buyer",
          "Subtotal USD",
          "Shipping USD",
          "Total USD",
          "Status",
          "Mode",
          "Tracking",
        ],
        ...engine.state.orders.map((o) => [
          o.number,
          o.product.title,
          o.buyer,
          (o.amount / 100).toFixed(2),
          ((o.shippingPrice || 0) / 100).toFixed(2),
          ((o.total || o.amount) / 100).toFixed(2),
          o.status,
          o.mode,
          o.tracking,
        ]),
      ];
      return c.body(rows.map((r) => r.map(cell).join(",")).join("\r\n"),200,{
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="autoloot-orders.csv"',
      });
    }
 }
}

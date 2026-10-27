import {fulfillmentCsv,pirateShipCsv} from '../csv.mjs';
import {json} from './response.mjs';
export function createExports({engine}) {
 return async function handle({req,res,path,adminAccess}) {
  if(!(['/api/pirateship.csv','/api/fulfillment.csv','/api/orders.csv'].includes(path)))return false;
  await dispatch();
  return true;
  async function dispatch() {
    if(path === "/api/pirateship.csv") {
      if(!adminAccess)return json(res,{error:'Streamer access required.'},403);
      res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="autoloot-pirateship.csv"','Cache-Control':'no-store'});
      return res.end(pirateShipCsv(engine.state.orders));
    }
    if (path === "/api/fulfillment.csv") {
      if (!adminAccess) return json(res, {error:"Streamer access required."},403);
      res.writeHead(200,{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="autoloot-fulfillment.csv"',"Cache-Control":"no-store"});
      return res.end(fulfillmentCsv(engine.state.orders));
    }
    if (path === "/api/orders.csv") {
      if (!adminAccess)
        return json(res, { error: "Streamer access required." }, 403);
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
      res.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="autoloot-orders.csv"',
      });
      return res.end(rows.map((r) => r.map(cell).join(",")).join("\r\n"));
    }
  }
 };
}

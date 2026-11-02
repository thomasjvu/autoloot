import {fetch} from '../../tests/helpers/admin-client.mjs';
// Exercises the public/creator/buyer contract using a disposable workspace.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";
const socket = createServer();
await new Promise((r) => socket.listen(0, "127.0.0.1", r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const dir = mkdtempSync(join(tmpdir(), "autoloot-demo-"));
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    DATA_DIR: dir,
    METADATA_MODE: 'demo',
        AUTOLOOT_DEMO: '1',
    PUBLIC_URL: `http://localhost:${port}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(Error("Demo server did not start")),
      10000,
    );
    server.stdout.once("data", () => {
      clearTimeout(timeout);
      resolve();
    });
    server.once("error", reject);
  });
  const base = `http://localhost:${port}`,
    bootstrap = await (await fetch(base + "/api/bootstrap")).json();
  const call = async (path, data, extra = {}) => {
    const response = await fetch(base + path, {
      method: data ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Autoloot-Admin": bootstrap.admin,
        ...extra,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    return result;
  };
  const status=await call('/api/metadata/status');
  assert.equal(status.mode,'demo');assert.equal(typeof status.keyConfigured,'boolean');
  assert.equal(Object.hasOwn(status,'key'),false);
  const anonymousStatus=await fetch(base+'/api/metadata/status');
  assert.equal(anonymousStatus.status,403);
  const unauthorizedSearch=await fetch(base+'/api/catalog/search',{method:'POST',body:'{}'});
  assert.equal(unauthorizedSearch.status,403);
  const malformedSearch=await fetch(base+'/api/catalog/search',{method:'POST',headers:{'Content-Type':'application/json','X-Autoloot-Admin':bootstrap.admin},body:'{'});
  assert.equal(malformedSearch.status,400);
  assert.equal(malformedSearch.headers.get('cache-control'),'no-store');
  assert.equal((await malformedSearch.json()).error,'Invalid JSON request.');
  const crossOriginSearch=await fetch(base+'/api/catalog/search',{method:'POST',headers:{Origin:'https://untrusted.example','X-Autoloot-Admin':bootstrap.admin},body:'{}'});
  assert.equal(crossOriginSearch.status,403);
  const catalogSearch=await call('/api/catalog/search',{game:'pokemon'});
  assert.equal(catalogSearch.state.catalog.total,34);
  assert.match(catalogSearch.state.catalog.source,/Bundled Metadata demo/);
  const card=catalogSearch.state.catalog.items[0];
  const catalogSelection=await call('/api/catalog/select',{id:card.id});
  assert.equal(catalogSelection.state.catalog.selected.id,card.id);
  const catalogAdd=await call('/api/catalog/add',{id:card.id,price:'5.00',quantity:1,condition:'Raw · demo'});
  const demoLot=catalogAdd.state.products.find(p=>p.metadata?.id===card.id);
  assert.ok(demoLot);assert.equal(demoLot.listed,false);assert.equal(demoLot.price,500);
  console.log('PASS: bundled Metadata search → review → seller-priced unlisted inventory, without API access.');
  await call("/api/vote/open", {
    productIds: ["p1", "p2", "p3"],
    duration: 30,
  });
  await call("/api/vote/demo", { username: "viewer_one", option: 2 });
  await call("/api/vote/demo", { username: "viewer_two", option: 2 });
  await call("/api/vote/demo", { username: "viewer_three", option: 1 });
  const closed = await call("/api/vote/close", {});
  assert.equal(closed.state.vote.winner, "p2");
  await call("/api/auction/start", { productId: closed.state.vote.winner });
  await call("/api/demo/bid", { username: "viewer_one", amount: "35" });
  await call("/api/demo/bid", { username: "viewer_two", amount: "36" });
  const finish = await call("/api/auction/finish", {}),
    order = finish.state.orders[0];
  assert.equal(order.buyer, "viewer_two");
  assert.equal(order.amount, 3600);
  await call("/api/order", { id: order.id, action: "test-pay" });
  const shipped = await call("/api/order", {
    id: order.id,
    action: "ship",
    tracking: "DEMO-TRACKING",
  });
  assert.equal(shipped.state.orders[0].status, "shipped");
  const login = await fetch(base + "/api/viewer/demo-login", {
      method: "POST",
      body: "{}",
    }),
    cookie = login.headers.get("set-cookie").split(";")[0];
  const buy = await call(
    "/api/viewer/buy",
    { productId: "p4", requestId: "walkthrough-buy" },
    { Cookie: cookie },
  );
  await call(
    "/api/viewer/shipping",
    {
      id: buy.orderId,
      shipping: {
        name: "Demo Buyer",
        line1: "123 Fiction Street",
        city: "Test City",
        postal_code: "10001",
        country: "US",
      },
    },
    { Cookie: cookie },
  );
  await call("/api/viewer/demo-pay", { id: buy.orderId }, { Cookie: cookie });
  const receipt = await call("/api/receipt?id=" + buy.orderId, null, {
    Cookie: cookie,
  });
  assert.equal(receipt.status, "test-paid");
  const anonymous = await (await fetch(base + "/api/state")).json();
  assert.equal(anonymous.orders, undefined);
  assert.equal(anonymous.vote.ballots, undefined);
  assert.equal(JSON.stringify(anonymous).includes("Fiction Street"), false);
  console.log(
    "PASS: chat vote → creator approval → auction → winning bid → demo payment → shipment.",
  );
  console.log(
    "PASS: demo buyer → direct purchase → private shipping → demo payment → receipt.",
  );
  console.log(
    "PASS: public snapshots exclude orders, addresses and vote identities.",
  );
  console.log(
    "No real Twitch or Stripe requests were made; temporary demo data will be removed.",
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((r) =>
    server.exitCode !== null ? r() : server.once("exit", r),
  );
  rmSync(dir, { recursive: true, force: true });
}

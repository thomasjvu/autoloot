import {fetch} from './helpers/admin-client.mjs';
import { request } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
test("HTTP lifecycle, authorization, public privacy and persistence", async () => {
  const free = createServer();
  await new Promise((r) => free.listen(0, "127.0.0.1", r));
  const port = free.address().port;
  await new Promise((r) => free.close(r));
  const dir = mkdtempSync(join(tmpdir(), "loot-test-"));
  const fakeCodex = join(dir, "codex-fixture");
  writeFileSync(
    fakeCodex,
    `#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv;const output=args[args.indexOf('--output-last-message')+1];const image=args[args.indexOf('--image')+1];if(!args.includes('--image')||!fs.existsSync(image))process.exit(2);fs.writeFileSync(output,JSON.stringify({message:'Photo draft ready.',action:'draft-product',productId:null,draftProduct:{title:'Fixture photo product',description:'Visible product.',price:'999.00',quantity:9,category:'Collectibles',condition:'New',art:'box',buyNowPrice:'999',listed:true}}));`,
    { mode: 0o700 },
  );
  let child;
  const launch = async () => {
    child = spawn(process.execPath, ["server.mjs"], {
      env: {
        ...process.env,
        PORT: String(port),
        DATA_DIR: dir,
        AUTOLOOT_DEMO: '1',
        CODEX_BIN: fakeCodex,
        PUBLIC_URL: `http://localhost:${port}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Error("Startup timeout")), 10000);
      child.stdout.on("data", () => {
        clearTimeout(t);
        resolve();
      });
      child.on("error", reject);
      child.on("exit", (c) => {
        clearTimeout(t);
        reject(Error("Server exited " + c));
      });
    });
  };
  const stop = async () => {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
  };
  try {
    await launch();
    const base = `http://localhost:${port}`;
    const boot = await (await fetch(base + "/api/bootstrap")).json();
    const token = boot.admin;
    const post = async (path, data = {}, headers = {}) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Autoloot-Admin": token,
          ...headers,
        },
        body: JSON.stringify(data),
      });
    assert.equal((await fetch(base + "/")).status, 200);
    assert.equal((await fetch(base + "/shop")).status, 200);
    assert.equal((await fetch(base + "/overlay")).status, 200);
    assert.equal(
      (await fetch(base + "/api/products", { method: "POST", body: "{}" }))
        .status,
      403,
    );
    assert.equal(
      (await post("/api/demo/chat", {}, { Origin: "https://evil.example" }))
        .status,
      403,
    );
    const rebound = await new Promise((resolve, reject) => {
      const r = request(
        base + "/api/bootstrap",
        { headers: { Host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      r.on("error", reject);
      r.end();
    });
    assert.equal(rebound, 403);
    const badImage = await fetch(base + "/api/upload", {
      method: "POST",
      headers: { "X-Autoloot-Admin": token },
      body: "<svg>untrusted</svg>",
    });
    assert.equal(badImage.status, 400);
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII=",
      "base64",
    );
    const uploaded = await (
      await fetch(base + "/api/upload", {
        method: "POST",
        headers: { "X-Autoloot-Admin": token },
        body: image,
      })
    ).json();
    assert.match(uploaded.image, /^\/media\/[a-f0-9]+\.png$/);
    assert.equal(
      (await fetch(base + uploaded.image)).headers.get("content-type"),
      "image/png",
    );
    assert.equal(
      (
        await post("/api/products/edit", {
          id: "p2",
          title: "Edited console",
          price: "39",
          quantity: 2,
          image: uploaded.image,
        })
      ).status,
      200,
    );

    assert.equal(
      (await post("/api/auction/start", { productId: "p1" })).status,
      200,
    );
    assert.equal(
      (await post("/api/demo/bid", { username: "alice", amount: "45" })).status,
      200,
    );
    assert.equal((await post("/api/auction/finish")).status, 200);
    let s = await (
      await fetch(base + "/api/state", {
        headers: { "X-Autoloot-Admin": token },
      })
    ).json();
    assert.equal(s.orders.length, 1);
    assert.equal(s.orders[0].buyer, "alice");
    const pub = await (await fetch(base + "/api/state")).json();
    assert.equal(pub.orders, undefined);
    assert.equal(pub.registrations, undefined);
    assert.equal(pub.auction.highest.userId, undefined);
    assert.equal(
      (await post("/api/order", { id: s.orders[0].id, action: "test-pay" }))
        .status,
      200,
    );
    assert.equal(
      (
        await post("/api/order", {
          id: s.orders[0].id,
          action: "ship",
          tracking: "USPS DEMO",
        })
      ).status,
      200,
    );
    assert.equal((await fetch(base + "/api/orders.csv")).status, 403);
    assert.match(
      await (
        await fetch(base + "/api/orders.csv", {
          headers: { "X-Autoloot-Admin": token },
        })
      ).text(),
      /USPS DEMO/,
    );
    await stop();
    await launch();
    s = await (await fetch(base + "/api/bootstrap")).json();
    assert.equal(s.state.orders[0].status, "shipped");
    assert.equal(s.state.products[0].quantity, 1);
    const nextToken = s.admin;
    const photoPost = (path, value) =>
      fetch(base + path, {
        method: "POST",
        headers: { "X-Autoloot-Admin": nextToken },
        body: JSON.stringify(value),
      });
    await photoPost("/api/companion/settings", { provider: "codex" });
    const draftResult = await (
      await photoPost("/api/companion/photo", {
        image: uploaded.image,
        price: "20",
        quantity: 1,
        condition: "Used",
        notes: "A test product",
      })
    ).json();
    assert.equal(draftResult.state.proposal.draftProduct.price, "20.00");
    assert.equal(draftResult.state.proposal.draftProduct.quantity, 1);
    assert.equal(draftResult.state.proposal.draftProduct.condition, "Used");
    assert.equal(draftResult.state.proposal.draftProduct.listed, false);
    assert.equal(draftResult.state.proposal.draftProduct.image, uploaded.image);
    const proposalId = draftResult.state.proposal.id;
    const applied = await (
      await photoPost("/api/companion/apply", {
        id: proposalId,
        draftProduct: {
          title: "Edited photo title",
          price: "25.00",
          quantity: 1,
          condition: "Used",
          art: "box",
          listed: false,
        },
      })
    ).json();
    assert.ok(
      applied.state.products.some(
        (p) =>
          p.title === "Edited photo title" &&
          p.price === 2500 &&
          p.image === uploaded.image,
      ),
    );
    assert.equal(applied.state.proposal, null);
    assert.equal(
      (await photoPost("/api/companion/apply", { id: proposalId })).status,
      400,
    );
    await photoPost("/api/companion/settings", { provider: "demo" });

    const votePost = (path, value) =>
      fetch(base + path, {
        method: "POST",
        headers: { "X-Autoloot-Admin": nextToken },
        body: JSON.stringify(value),
      });
    assert.equal(
      (
        await votePost("/api/vote/open", {
          productIds: ["p1", "p3"],
          duration: 10,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await votePost("/api/vote/demo", {
          username: "private_voter",
          option: 2,
        })
      ).status,
      200,
    );
    const votePublic = await (await fetch(base + "/api/state")).json();
    assert.equal(votePublic.vote.voters, 1);
    assert.equal(votePublic.vote.ballots, undefined);
    assert.equal(
      JSON.stringify(votePublic.vote).includes("private_voter"),
      false,
    );
    await votePost("/api/vote/close", {});
    const winner = await (await fetch(base + "/api/state")).json();
    assert.equal(winner.vote.winner, "p3");
    assert.equal(
      (
        await fetch(base + "/api/companion/photo", {
          method: "POST",
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await votePost("/api/companion/photo", {
          image: "/etc/passwd",
          price: "20",
          quantity: 1,
        })
      ).status,
      400,
    );

    const buyerLogin = await fetch(base + "/api/viewer/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const cookie = buyerLogin.headers.get("set-cookie").split(";")[0];
    const buyerPost = (path, value) =>
      fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(value),
      });
    const user = await (
      await fetch(base + "/api/viewer", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(user.user.kind, "demo");
    const purchase = await (
      await buyerPost("/api/viewer/buy", {
        productId: "p4",
        requestId: "http-repeat",
      })
    ).json();
    assert.ok(purchase.orderId);
    const repeat = await (
      await buyerPost("/api/viewer/buy", {
        productId: "p4",
        requestId: "http-repeat",
      })
    ).json();
    assert.equal(purchase.orderId, repeat.orderId);
    assert.equal(
      (await fetch(base + "/api/receipt?id=" + purchase.orderId)).status,
      403,
    );
    const otherLogin = await fetch(base + "/api/viewer/demo-login", {
      method: "POST",
      body: "{}",
    });
    const otherCookie = otherLogin.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (
        await fetch(base + "/api/viewer/demo-pay", {
          method: "POST",
          headers: { Cookie: otherCookie },
          body: JSON.stringify({ id: purchase.orderId }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await buyerPost("/api/viewer/demo-pay", { id: purchase.orderId }))
        .status,
      400,
    );
    assert.equal(
      (
        await buyerPost("/api/viewer/shipping", {
          id: purchase.orderId,
          shipping: {
            name: "Demo Buyer",
            line1: "123 Fiction St",
            city: "Test City",
            postal_code: "12345",
            country: "US",
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (await buyerPost("/api/viewer/demo-pay", { id: purchase.orderId }))
        .status,
      200,
    );
    const receipt = await (
      await fetch(base + "/api/receipt?id=" + purchase.orderId, {
        headers: { Cookie: cookie },
      })
    ).json();
    assert.equal(receipt.status, "test-paid");
    const anonymous = JSON.stringify(
      await (await fetch(base + "/api/state")).json(),
    );
    assert.equal(anonymous.includes("Fiction St"), false);
    assert.equal(anonymous.includes("Demo Buyer"), false);
    const blockedLive = await fetch(base + "/api/mode", {
      method: "POST", headers: { "X-Autoloot-Admin": nextToken },
      body: JSON.stringify({ mode: "live" }),
    });
    assert.equal(blockedLive.status,400,'sample stock cannot enter live sales');
    const cleared=await fetch(base+'/api/workspace/demo',{method:'POST',headers:{'X-Autoloot-Admin':nextToken},body:JSON.stringify({enabled:false})});
    assert.equal(cleared.status,200);
    const added=await fetch(base+'/api/products',{method:'POST',headers:{'X-Autoloot-Admin':nextToken},body:JSON.stringify({title:'Owned card',price:'5',buyNowPrice:'10',listed:true,quantity:1,condition:'Used'})});
    const realItem=(await added.json()).state.products.find(p=>p.title==='Owned card');
    assert.ok(realItem);
    assert.equal(
      (
        await buyerPost("/api/viewer/buy", {
          productId: realItem.id,
          requestId: "live-spoof",
        })
      ).status,
      400,
    );
  } finally {
    if (child?.exitCode === null) await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});

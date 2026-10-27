import {DropEvents,dropHero,lineupMarkup,reactToDrop} from './drop-shop.js';
import {nextBid,reservationDeadline} from './integration.js';
export function createStorefront(ctx, { $,esc,usd,isNftOrder,statusBadge,modal,api,toast,brand,visual,assetDescription,votePanel,sellerSummary,icon,confirmAction }) {
function reservationNotice(o) {
  const deadline = reservationDeadline(o);
  if (deadline != null) return `<p class="reservation-notice">${o.mode === "demo" ? "Practice reservation" : "Reserved"} until ${esc(new Date(deadline).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}))}. ${o.mode === "demo" ? "Simulate payment" : "Start checkout or have the seller confirm external payment"} within <strong data-reservation-clock="${deadline}">${reservationClock(deadline)}</strong>.</p>`;
  if (o.expiryReason === "reservation-timeout") return '<p class="reservation-notice">The reservation expired before checkout. Stock was released. Contact the seller or place a new order if the item is still available.</p>';
  if (o.status === "pending" && o.checkoutCreated != null && !o.checkoutId) return '<p class="reservation-notice">Checkout was requested; its outcome needs confirmation. Retry payment to recover the checkout. Your item remains reserved.</p>';
  if (o.status === "pending" && o.checkoutId) return '<p class="reservation-notice">Checkout started. Your item stays reserved until the payment provider confirms payment or expiry.</p>';
  return '';
}
function reservationClock(deadline) {
  if (!ctx.liveConnection) return "—";
  const seconds = Math.max(0, Math.ceil((deadline - Date.now() + ctx.serverOffset) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function purchasePolicy(o) {
 const p = o.sellerPolicy;
 if (!p?.name) return '';
 return `<details class="purchase-policy"><summary>Seller policies recorded for this order</summary><p>${esc(p.name)} · ${esc(p.email)}</p><h4>Shipping and fulfillment</h4><p class="policy-copy">${esc(p.shipping)}</p><h4>Returns, refunds and disputes</h4><p class="policy-copy">${esc(p.returns)}</p><small>Software notice version ${esc(p.version)}. This record does not establish acceptance or waive mandatory rights.</small></details>`;
}
function nftOrderDetails(o, admin = false) {
 if(!isNftOrder(o))return '';
 const a=o.product.fulfillment,d=o.delivery;
 return `<div class="nft-order"><span class="pill">NFT delivery · ${esc(a.chain)}</span><p>${esc(a.provider)} · Your purchase is fulfilled by transfer of this NFT. Optional physical redemption is handled separately by its provider.</p><details><summary>Asset & delivery evidence</summary><p class="policy-copy">Asset: ${esc(a.mint || a.contract+' / '+a.tokenId)}<br>Source: ${esc(a.sender)}<br>Destination: ${esc(o.recipientWallet || 'Not confirmed yet')}<br>Status: ${esc(d?.status || 'Waiting for destination / payment')}</p>${d?.transactionId ? `<p class="policy-copy">Transaction: ${esc(d.transactionId)}</p>`:''}${d?.proof ? `<p>Finalized block: ${esc(d.proof.blockId)} · Network fee: ${esc(d.proof.feeAtomic)} native atomic units.</p>`:''}${d?.simulated ? '<p>Simulation only. No asset moved.</p>':''}</details>${d?.error ? `<p class="error-box">${esc(d.error)}</p>`:''}${!d && !admin && ['pending','paid','test-paid','paid-external'].includes(o.status) ? `<button class="btn small" data-wallet="${o.id}">${o.recipientWallet ? 'Change' : 'Confirm'} destination wallet</button>`:''}${!admin && o.mode==='demo'&&o.status==='test-paid' ? `<button class="btn small" data-nft-demo="${o.id}" ${!o.recipientWallet?'disabled':''}>Simulate NFT delivery</button>`:''}</div>`;
}
function buyerOrder(o) {
 const nftOrder=isNftOrder(o),canPay=ctx.liveConnection&&(!nftOrder||o.recipientWallet);
 const demoControls=nftOrder ? '' : `<button class="btn small" data-buyer-shipping="${o.id}">${o.shipping?'Edit':'Add'} test address</button>`;
 return `<article class="viewer-order"><div class="order-heading"><strong>${esc(o.number)}</strong>${statusBadge(o.status)}</div><h3>${esc(o.product.title)}</h3>${nftOrderDetails(o)}${purchasePolicy(o)}${reservationNotice(o)}${o.status==='processing'?'<p>Payment is processing. Wait for provider confirmation.</p>':''}<div class="order-total"><span>Item ${usd(o.amount)}${nftOrder?' · NFT delivery; no shipping charge':` + shipping ${usd(o.shippingPrice||0)}`}</span><strong>${usd(o.total||o.amount)}</strong></div>${o.shipment?`<p>${o.shipment.test?"Practice label":"Shipping label"}: ${esc(o.shipment.status)}${o.shipment.trackingStatus?" · Carrier: "+esc(o.shipment.trackingStatus):""}. Label purchase is separate from dispatch.</p>`:""}${o.tracking?`<p>Tracking: ${esc(o.tracking)}</p>`:''}${o.status==='pending' && o.mode!=='demo'?`<p class="buyer-payment-note">${ctx.viewer.payments.configured?'Pay securely through Stripe. Shipping details are collected at checkout.':'Online checkout is not available. Contact the seller to arrange payment.'}</p>`:''}${o.status==='pending'?`<div class="row-actions">${o.mode==='demo'?`${demoControls}<button class="btn primary small" data-buyer-pay="${o.id}" ${canPay&&(nftOrder||o.shipping)?'':'disabled'}>Simulate payment</button>`:`<button class="btn primary small" data-checkout="${o.id}" ${canPay&&ctx.viewer.payments.configured?'':'disabled'}>${o.checkoutId?'Resume checkout ·':o.checkoutCreated!=null?'Recover checkout ·':'Continue to payment ·'} ${usd(o.total||o.amount)} ↗</button>`}<button class="text-btn danger-text" data-buyer-cancel="${o.id}">Cancel</button></div>`:''}${['paid','shipped','test-paid','delivered','test-delivered'].includes(o.status)?`<a class="text-btn" href="/api/receipt?id=${o.id}" target="_blank" rel="noopener">Receipt ↗</a>`:''}</article>`;
}
function walletDialog(id) {
 const o=ctx.viewer.orders.find(o=>o.id===id);
 modal(`<h2>Confirm NFT destination</h2><p>Chain: ${esc(o.product.fulfillment.chain)}. Transfers may be irreversible. Enter a compatible wallet you intend to receive this NFT; this confirms your chosen destination, not ownership of that wallet.</p><form id="wallet-form" class="stack-form"><label>Destination wallet<input name="address" value="${esc(o.recipientWallet||'')}" autocomplete="off" spellcheck="false" required></label><label>Repeat destination<input name="repeat" autocomplete="off" spellcheck="false" required></label><label class="consent"><input name="confirmed" type="checkbox" required> I confirm this exact destination and understand that the provider handles any later physical redemption.</label><button class="btn primary">Confirm destination</button></form>`);
 $('#wallet-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form),button=form.querySelector('button');button.disabled=true;try{if(String(data.get('address')).trim()!==String(data.get('repeat')).trim())throw Error('The wallet addresses must match.');await api('/api/viewer/wallet',{id,address:data.get('address'),confirmed:data.has('confirmed')});$('#modal').close();ctx.viewer=await api('/api/viewer');renderShop();}catch(error){toast(error.message);button.disabled=false;}};
}
const dropEvents=new DropEvents();
function buyerSignIn(){
 modal(`<h2>Sign in to buy or bid</h2><p>Your Twitch account links bids and purchases to your private orders. Streamer access is separate.</p>${ctx.state.mode==='demo'?'<button class="btn primary full" id="buyer-practice">Continue as practice buyer</button>':`<label class="consent"><input type="checkbox" id="buyer-consent"> I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and listed price and condition, and have read the <a href="/shop#shop-policies" target="_blank" rel="noopener">seller policies</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>.</label><button class="btn primary full" id="buyer-authorize" disabled>Continue with Twitch</button>${!ctx.viewer?.configured?'<p class="error-box">The seller has not connected Twitch sign-in yet.</p>':''}`}`);
 $('#buyer-consent')?.addEventListener('change',e=>{$('#buyer-authorize').disabled=!e.target.checked||!ctx.viewer?.configured;});
 $('#buyer-authorize')?.addEventListener('click',()=>{location.href='/auth/twitch';});
 $('#buyer-practice')?.addEventListener('click',async()=>{try{await api('/api/viewer/demo-login',{});ctx.viewer=await api('/api/viewer');$('#modal').close();renderShop();}catch(e){toast(e.message);}});
}
function renderShop() {
  document.body.className = "shop-body";
  const a = ctx.state.auction;
  const dropEvent=dropEvents.observe(ctx.state,ctx.liveConnection);
  const consentChecked=$('#agree')?.checked||false;
  const detailsOpen=$('.drop-product-details')?.open||false;
  const bidFocused=document.activeElement?.hasAttribute('data-copy-bid');
  $("#app").innerHTML =
    `<header class="shop-header"><a class="brand" href="/shop">${brand()}</a><span class="shop-channel">${esc(ctx.state.show.title)}</span><span class="pill ${ctx.state.mode === "live" ? "green" : ""}">${ctx.state.mode==='demo'?'Practice':''}</span></header><main class="shop-main"><div class="drop-shop-heading"><div><h1>${esc(ctx.state.show.title)}</h1></div><a class="drop-room-pass" href="#shop-orders">Your orders <span>${ctx.viewer?.orders.length||0}</span> ↗</a></div><div class="shop-grid"><section class="panel shop-lot drop-stage" aria-label="Current drop">${dropHero({state:ctx.state,viewer:ctx.viewer,connected:ctx.liveConnection,now:Date.now()-ctx.serverOffset,esc,usd,visual,assetDescription,nextBid})}</section><div class="shop-account"><section class="panel settings-panel buyer-account"><h2>${ctx.viewer?.user?'@'+esc(ctx.viewer.user.login):'Buying or bidding?'}</h2>${ctx.viewer?.user?'<button class="text-btn" id="viewer-logout">Sign out</button>':'<button class="btn primary full" id="open-buyer-login">Sign in with Twitch</button>'}</section><section class="panel settings-panel viewer-orders" id="shop-orders"><h2>Your orders <span class="soft-count">${ctx.viewer?.orders.length || 0}</span></h2>${ctx.viewer?.orders.length ? ctx.viewer.orders.map(buyerOrder).join("") : ctx.viewer?.user?"<p>Purchases and auction wins appear here.</p>":"<p>Sign in to view your purchases.</p>"}</section></div></div>${lineupMarkup(ctx.state,{esc,usd,visual})}${ctx.state.vote ? votePanel(true) : ""}<div class="page-heading shop-catalog-heading"><div><h2>Buy now</h2></div><span class="muted">${usd(ctx.state.show.shippingPrice || 0)} shipping / order</span></div><div class="store-grid">${

      ctx.state.products
        .filter((p) => p.listed && p.buyNowPrice)
        .map(
          (p) =>
            `<article class="panel store-card"><div class="inventory-image art-${p.art}">${visual(p, true)}</div><div class="inventory-card-body"><h3>${esc(p.title)}</h3><p>${esc(p.condition)} / ${p.quantity} available</p>${assetDescription(p)}<div class="store-price"><strong>${usd(p.buyNowPrice)}</strong><button class="btn primary" data-buy="${p.id}" ${!ctx.liveConnection || p.quantity < 1 || (a?.productId === p.id && ["live", "paused"].includes(a.status)) ? "disabled" : ""}>${p.quantity < 1 ? "Sold out" : "Buy now"} ${icon("arrow", 14)}</button></div></div></article>`,
        )
        .join("") || '<p class="empty-chat">No items available.</p>'
    }</div><p class="section-note">${ctx.state.mode === "demo" ? "Demo environment. Use fictional shipping details. No funds move." : "Bids use the server receive time. Follow this page’s timer; video can be delayed. Payment is confirmed by the server."}</p><details class="drop-seller-info" id="shop-policies"><summary>Seller details, shipping & policies ↗</summary>${sellerSummary()}</details></main>`;
  $('#open-buyer-login')?.addEventListener('click',buyerSignIn);
  if($('#agree')){$('#agree').checked=consentChecked;$('#viewer-login').disabled=!consentChecked||!ctx.viewer?.configured;}
  if($('.drop-product-details'))$('.drop-product-details').open=detailsOpen;
  if(bidFocused)document.querySelector('[data-copy-bid]')?.focus({preventScroll:true});
  reactToDrop(dropEvent,ctx.state,ctx.liveConnection);
  document.querySelectorAll('[data-wallet]').forEach(button=>button.onclick=()=>walletDialog(button.dataset.wallet));
  document.querySelectorAll('[data-nft-demo]').forEach(button=>button.onclick=async()=>{try{await api('/api/viewer/demo-deliver',{id:button.dataset.nftDemo});ctx.viewer=await api('/api/viewer');renderShop();}catch(error){toast(error.message);}});
  document.querySelectorAll('[data-copy-bid]').forEach(button => button.onclick = async () => {
    try { await navigator.clipboard.writeText(button.dataset.copyBid); toast('Bid command copied. Paste it into Twitch chat. A copied command is not a bid.'); }
    catch { toast('Copy unavailable. Type the displayed command in Twitch chat.'); }
  });
  $("#agree")?.addEventListener(
    "change",
    (e) =>
      ($("#viewer-login").disabled = !e.target.checked || !ctx.viewer.configured),
  );
  $("#viewer-login")?.addEventListener(
    "click",
    () => (location.href = "/auth/twitch"),
  );
  $("#demo-login")?.addEventListener("click", async () => {
    try {
      await api("/api/viewer/demo-login", {});
      ctx.viewer = await api("/api/viewer");
      renderShop();
    } catch (e) {
      toast(e.message);
    }
  });
  $("#viewer-logout")?.addEventListener("click", async () => {
    await api("/api/viewer/logout", {});
    ctx.viewer = await api("/api/viewer");
    renderShop();
  });
  document.querySelectorAll("[data-buy]").forEach(
    (el) =>
      (el.onclick = () => {
        if(!ctx.viewer?.user){buyerSignIn();return;}
        const p = ctx.state.products.find((p) => p.id === el.dataset.buy);
        const requestId = crypto.randomUUID();
        confirmAction(
          `Buy ${p.title}?`,
          `${usd(p.buyNowPrice)} + ${usd(p.fulfillment?.type==='nft'?0:ctx.state.show.shippingPrice || 0)} shipping. This reserves one unit for 15 minutes. Start checkout from Your orders before the deadline. Once checkout starts, the provider controls its payment window.`,
          async () => {
            await api("/api/viewer/buy", {
              productId: p.id,
              requestId,
            });
            ctx.viewer = await api("/api/viewer");
            renderShop();
            document.getElementById("shop-orders")?.scrollIntoView({behavior:"smooth",block:"start"});
            toast("Item reserved. Continue to payment.");
          },
        );
      }),
  );
  document.querySelectorAll("[data-checkout]").forEach(
    (el) =>
      (el.onclick = async () => {
        el.disabled = true;
        try {
          const r = await api("/api/viewer/checkout", {
            id: el.dataset.checkout,
          });
          location.href = r.url;
        } catch (e) {
          toast(e.message);
          el.disabled = false;
        }
      }),
  );
  document
    .querySelectorAll("[data-buyer-shipping]")
    .forEach(
      (el) => (el.onclick = () => shippingDialog(el.dataset.buyerShipping)),
    );
  document.querySelectorAll("[data-buyer-pay]").forEach(
    (el) =>
      (el.onclick = () =>
        confirmAction(
          "Simulate payment?",
          "Test only. No funds move.",
          async () => {
            await api("/api/viewer/demo-pay", { id: el.dataset.buyerPay });
            ctx.viewer = await api("/api/viewer");
            renderShop();
          },
        )),
  );
  document.querySelectorAll("[data-buyer-cancel]").forEach(
    (el) =>
      (el.onclick = () =>
        confirmAction(
          "Cancel this order?",
          "Any open checkout is expired before stock is released.",
          async () => {
            await api("/api/viewer/cancel", { id: el.dataset.buyerCancel });
            ctx.viewer = await api("/api/viewer");
            renderShop();
          },
        )),
  );
}
function shippingDialog(id) {
  const o = ctx.viewer.orders.find((o) => o.id === id);
  modal(
    `<h2>Test shipping address</h2><p>Use fictional details in this demo.</p><form class="stack-form" id="shipping-form">${[
      ["name", "Name"],
      ["line1", "Address"],
      ["line2", "Address line 2"],
      ["city", "City"],
      ["state", "State / region"],
      ["postal_code", "Postal code"],
    ]
      .map(
        ([name, label]) =>
          `<label>${label}<input name="${name}" value="${esc(o.shipping?.[name] || "")}" maxlength="150" ${["name", "line1", "city", "postal_code"].includes(name) ? "required" : ""}></label>`,
      )
      .join(
        "",
      )}<label>Country<select name="country">${ctx.viewer.payments.countries.map((c) => `<option ${o.shipping?.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><button class="btn primary">Save address</button></form>`,
  );
  $("#shipping-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/viewer/shipping", {
        id,
        shipping: Object.fromEntries(new FormData(e.target)),
      });
      $("#modal").close();
      ctx.viewer = await api("/api/viewer");
      renderShop();
    } catch (e) {
      toast(e.message);
    }
  };
}

return {renderShop,reservationNotice,reservationClock,nftOrderDetails,disconnect:()=>dropEvents.observe(ctx.state,false)};
}

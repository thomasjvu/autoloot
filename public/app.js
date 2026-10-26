import {pullWidget} from '/overlay-widgets.js';
import {accountingPage,wireAccounting} from '/accounting.js';
import {studioWidgets,setupChecklist} from '/studio-widgets.js';
import {workspaceNavigation} from '/workspace-navigation.js';
import {notifications,notificationFeed,activityFeed} from '/activity-feed.js';
import {mountTutorial,tutorialStatus} from '/tutorial.js';
import {DropEvents, dropHero, lineupMarkup, updateDropClock, reactToDrop} from '/drop-shop.js';
import {shippingSettingsDialog, shippingOrderDialog} from '/shipping.js';
import { icon } from "/icons.js";
import { enterSection, openDialog } from "/motion.js";
import { catalogPage, wireCatalog } from "/catalog.js";
import { ripPage, wireRip, disposeRip } from "/rip.js";
import { CohostPlayer } from "/showtime.js";
import { widgetPresets, widgetType, widgetUrl, nextBid, reservationDeadline } from "/integration.js";
const isNftOrder = o => o.product?.fulfillment?.type === 'nft';
const cohostPlayer = new CohostPlayer();
const overlayType = widgetType(location.search);
let selectedWidget = "full";
try { selectedWidget = widgetType("?widget=" + encodeURIComponent(localStorage.getItem("autoloot-widget") || "full")); } catch {}
let liveConnection = true;
const cohostState = () => !liveConnection || ['auction','vote','pull','ribbon'].includes(overlayType)
  ? { ...state, companion: { ...state.companion, enabled: false, overlayVoice: false } } : state;
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const usd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (n || 0) / 100,
  );
function productArt(kind, large = false) {
  const keyboard = `<ellipse cx="160" cy="155" rx="121" ry="19" fill="#000" opacity=".12"/><g transform="translate(29 55) rotate(-9 130 55)"><path d="M0 14 25 0h222l15 14v78l-18 13H16L0 92Z" fill="#7b6ca4"/><rect y="8" width="260" height="86" rx="10" fill="#d1c6e8"/><rect x="6" y="14" width="248" height="70" rx="7" fill="#8a7baf"/>${Array.from({ length: 4 }, (_, r) => Array.from({ length: 13 }, (_, c) => `<rect x="${10 + c * 18.5}" y="${18 + r * 16}" width="15.5" height="12" rx="2.7" fill="${r === 0 || c > 10 ? "#a28acb" : (r + c) % 4 === 0 ? "#eee5fa" : "#dcd2ec"}"/><path d="m${14 + c * 18.5} ${22 + r * 16}h3" stroke="#7e6e9b" opacity=".5"/>`).join("")).join("")}<rect x="64" y="67" width="106" height="12" rx="3" fill="#ede5fa"/><rect x="235" y="18" width="15" height="12" rx="3" fill="#b2e3b9"/></g>`;
  const console = `<ellipse cx="160" cy="166" rx="73" ry="14" fill="#000" opacity=".1"/><g transform="translate(100 17) rotate(12 60 80)"><rect width="120" height="165" rx="19" fill="#cf889f"/><rect x="2" width="116" height="157" rx="18" fill="#f3bbca"/><rect x="12" y="13" width="96" height="75" rx="8" fill="#8b667d"/><rect x="20" y="21" width="80" height="55" rx="3" fill="#b3d3c1"/><path d="m25 65 18-19 14 10 18-24 20 33Z" fill="#8caf9d"/><path d="M37 99v30m-15-15h30" stroke="#88677c" stroke-width="10"/><circle cx="89" cy="107" r="7" fill="#b77698"/><circle cx="73" cy="123" r="7" fill="#b77698"/><path d="M42 144h12m10 0h12" stroke="#bc8da7" stroke-width="4" stroke-linecap="round"/></g>`;
  const headphones = `<ellipse cx="160" cy="171" rx="88" ry="12" fill="#000" opacity=".1"/><path d="M91 111V90a69 69 0 0 1 138 0v21" fill="none" stroke="#ac9d88" stroke-width="21"/><path d="M91 104V88a69 69 0 0 1 138 0v16" fill="none" stroke="#f8efdb" stroke-width="15"/><g transform="rotate(-8 91 130)"><rect x="72" y="98" width="35" height="63" rx="16" fill="#b8ac97"/><rect x="79" y="97" width="35" height="63" rx="16" fill="#eee4d1"/></g><g transform="rotate(8 229 130)"><rect x="213" y="98" width="35" height="63" rx="16" fill="#b8ac97"/><rect x="207" y="97" width="35" height="63" rx="16" fill="#eee4d1"/></g>`;
  const mushroom = `<ellipse cx="160" cy="170" rx="65" ry="12" fill="#000" opacity=".12"/><path d="m136 92-10 59c-3 29 70 29 67 0l-10-59Z" fill="#f3e5c8"/><path d="M136 107q21 13 47 0v12q-25 16-50 0Z" fill="#d3c29e"/><path d="M79 99c9-45 43-75 80-75 39 0 76 31 84 75 5 32-170 32-164 0Z" fill="#c98976"/><path d="M81 99c12-43 45-71 78-71 36 0 72 30 80 71-15 15-142 15-158 0Z" fill="#e0a58d"/><ellipse cx="125" cy="68" rx="16" ry="12" transform="rotate(-25 125 68)" fill="#fae8c7"/><ellipse cx="180" cy="52" rx="11" ry="9" fill="#fae8c7"/><ellipse cx="204" cy="85" rx="13" ry="11" transform="rotate(25 204 85)" fill="#fae8c7"/><circle cx="150" cy="144" r="3" fill="#635640"/><circle cx="172" cy="144" r="3" fill="#635640"/><path d="M156 153q5 5 10 0" fill="none" stroke="#635640" stroke-width="2"/>`;
  const pack = `<ellipse cx="160" cy="181" rx="62" ry="9" fill="#000" opacity=".12"/><g transform="rotate(-10 160 100)"><path d="M107 15h106v168H107Z" fill="#7653d5"/><path d="M107 15h106v17H107zm0 150h106v18H107Z" fill="#e4dbff"/><path d="m107 39 106 69v48l-106-69Z" fill="#ffca61"/><circle cx="160" cy="98" r="29" fill="#fff4d8"/><path d="m160 74 7 17 18 7-18 7-7 17-7-17-18-7 18-7Z" fill="#7653d5"/><text x="160" y="53" text-anchor="middle" fill="white" font-size="11" font-family="monospace">PACK PARTY</text><text x="160" y="151" text-anchor="middle" fill="white" font-size="10" font-family="monospace">DEMO BOOSTER</text></g>`;
  const card = `<g transform="rotate(9 160 100)"><rect x="104" y="13" width="112" height="176" rx="10" fill="#ffce5b"/><rect x="112" y="23" width="96" height="156" rx="6" fill="#fff3bf"/><text x="120" y="41" font-size="12" font-family="monospace" fill="#35312c">PIKACHU</text><rect x="119" y="50" width="82" height="75" rx="6" fill="#b8e7da"/><path d="m143 85-8-23 15 13m20 10 12-23-4 28" fill="#e3b82f"/><ellipse cx="160" cy="99" rx="23" ry="21" fill="#f7ce4c"/><circle cx="151" cy="95" r="3"/><circle cx="170" cy="95" r="3"/><circle cx="145" cy="104" r="4" fill="#ed8c7b"/><circle cx="177" cy="104" r="4" fill="#ed8c7b"/><path d="M122 141h66m-66 10h45" stroke="#c2af7a" stroke-width="4"/><text x="160" y="170" text-anchor="middle" font-size="8" font-family="monospace">DEMO ILLUSTRATION</text></g>`;
  const sleeves = `<rect x="87" y="36" width="110" height="142" rx="12" fill="#6d89bf" transform="rotate(-12 142 107)"/><rect x="122" y="23" width="110" height="150" rx="12" fill="#e8f7ff" stroke="#7ca4bc" stroke-width="4"/><rect x="133" y="35" width="88" height="125" rx="7" fill="#bbdce9"/><path d="m177 66 12 24 26 5-19 19 4 27-23-12-23 12 4-27-19-19 26-5Z" fill="#fff2a9"/>`;
  const box = `<path d="m80 58 80-30 80 30v100l-80 30-80-30Z" fill="#c5afe8"/><path d="m80 58 80 32 80-32M160 90v98" stroke="#8e70b5" stroke-width="3"/><path d="m120 44 80 31v40l-20 7V84l-80-32" fill="#e8dff5"/>`;
  return `<svg class="product-art ${large ? "large" : ""}" viewBox="0 0 320 200" aria-label="${esc(kind)} illustration" role="img">${{ pack, card, sleeves, keyboard, console, headphones, mushroom, box }[kind] || box}</svg>`;
}
function assetDescription(p) {
 const a=p.fulfillment;if(a?.type!=='nft')return '';
 return `<details class="asset-description"><summary>NFT entitlement · ${esc(a.chain)}</summary><p class="policy-copy">Provider: ${esc(a.provider)}<br>Asset: ${esc(a.mint || a.contract+' / '+a.tokenId)}<br>Source wallet: ${esc(a.sender)}</p><p>Delivery ends at confirmed NFT transfer. Optional physical redemption and its fees are handled by the provider. A provider label is the seller’s claim, not independent authentication.</p></details>`;
}
function visual(p, large = false) {
  return p.image
    ? `<img class="product-photo" src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" decoding="async">`
    : productArt(p.art, large);
}
const companionName=()=>state?.companion?.name||'Munny';
const companionAvatar=()=>state?.companion?.avatar||'/characters/mochi-street-v3.png';
function mochi() {
  return `<img class="mochi mochi-vtuber" src="${esc(companionAvatar())}" alt="${esc(companionName())}, your cohost" width="320" height="400" decoding="async">`;
}

let state,
  adminToken = "",
  overlayUrl = "",
  viewerUrl = "",
  tab = "studio",
  search = "",
  filter = "all",
  lastSpoken = "",
  serverOffset = 0;
const isOverlay = location.pathname === "/overlay",
  isShop = location.pathname === "/shop";
let viewer = null;
async function api(path, data) {
  const r = await fetch(path, {
    method: data ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { "X-Autoloot-Admin": adminToken } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error || "Request failed.");
  return result;
}
function setLiveConnection(connected) {
  liveConnection = connected;
  document.documentElement.classList.toggle("connection-stale", !connected);
  const notice = $("#live-connection");
  notice.hidden = connected;
  notice.textContent = connected ? "" : "Live updates interrupted. Prices and orders may be out of date. Reconnecting…";
  if (!connected) {
    if(isShop){dropEvents.observe(state,false);updateDropClock(state,Date.now()-serverOffset,false);}
    cohostPlayer.arm(false);
    document.querySelectorAll('[data-copy-bid], [data-buy], [data-checkout], [data-buyer-pay]').forEach(button => button.disabled = true);
    document.querySelectorAll('[data-clock], [data-vote-clock], [data-reservation-clock]').forEach(clock => clock.textContent = "—");
  }
}
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function statusBadge(status) {
  return `<span class="pill ${["live", "sold", "shipped", "paid-external", "test-paid", "paid"].includes(status) ? "green" : ""}">${esc({ "delivered":"NFT delivered", "test-delivered":"Demo NFT delivered", "test-paid": "Demo paid", "paid-external": "Payment confirmed", live: "Bidding open", unsold: "No bids", pending: "Awaiting payment", standby: "Ready" }[status] || status?.replaceAll("-", " ") || "Ready")}</span>`;
}
const active = () => ["live", "paused"].includes(state.auction?.status);
const brand = () => `<span class="brand-mark" aria-hidden="true"><img src="/icon-192.png" width="40" height="40" alt=""></span><span class="wordmark">autoloot</span>`;
let mobileMenuOpen=false;
function header(){return state.mode==='demo'?'<div class="practice-strip">Practice mode · no real payments</div>':'';}
function heading(title, subtitle = "", action = "") {
  return `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</div>`;
}
function stats() {
  const orders = state.orders.filter(
    (o) => !["cancelled", "expired", "refunded"].includes(o.status),
  );
  const toShip = orders.filter((o) =>
    ["paid", "test-paid", "paid-external"].includes(o.status),
  ).length;
  return `<div class="stats-grid" aria-label="Show summary"><div class="stat"><span>Sales ${state.mode === "demo" ? "in demo" : ""}</span><strong>${usd(orders.reduce((n, o) => n + o.amount, 0))}</strong></div><div class="stat"><span>Items sold</span><strong>${orders.length}</strong></div><button class="stat stat-link" data-tab="orders"><span>Ready to fulfill</span><strong>${toShip} ${icon("arrow", 14)}</strong></button></div>`;
}
function auctionCard() {
  const a = state.auction,
    p = a?.product || state.products.find((p) => p.quantity > 0);
  return `<section class="panel auction-panel"><div class="panel-header"><h2>${active() ? "On the block" : "Ready for your next auction"}</h2>${statusBadge(a?.status || "ready")}</div>${p ? `<div class="auction-body"><div class="hero-product art-${p.art}">${visual(p, true)}<span class="condition-stamp">${esc(p.condition)}</span></div><div class="auction-info"><h3>${esc(p.title)}</h3><p class="description">${esc(p.description)}</p>${assetDescription(p)}<div class="bid-price"><div><span>${a?.highest ? "Current bid" : "Starting price"}</span><strong>${usd(a?.highest?.amount || p.price)}</strong></div><div class="countdown-wrap"><span>${a?.status === "paused" ? "Paused" : "Time left"}</span><strong data-clock>${a ? clock(a) : String(Math.floor((state.show.bidDuration || 60) / 60)).padStart(2, "0") + ":" + String((state.show.bidDuration || 60) % 60).padStart(2, "0")}</strong></div></div><div class="bidder-line">${a?.highest ? `<span class="bidder-avatar">${esc(a.highest.username[0])}</span><strong>${esc(a.highest.username)}</strong> is leading · ${a.bidCount} ${a.bidCount === 1 ? "bid" : "bids"}` : a?.status === "paused" ? "Take your time. Bidding is paused." : "Your first bidder could be next."}</div><div class="auction-controls">${active() ? `<button class="btn primary" data-action="${a.status === "paused" ? "resume" : "pause"}">${icon(a.status === "paused" ? "play" : "pause", 16)} ${a.status === "paused" ? "Resume auction" : "Pause auction"}</button><button class="btn" data-action="finish">End auction ${icon("check", 16)}</button>` : `<button class="btn primary" data-start="${p.id}" ${state.products.find((i) => i.id === p.id)?.quantity < 1 ? "disabled" : ""}>${icon("play", 16)} Start auction</button><button class="btn" data-action="auction-settings" aria-label="Auction settings">${icon("settings", 17)} Settings</button>`}</div><div class="auction-footnote"><span>${icon("check", 13)} ${a?.antiSnipe === false ? "💀 Sudden death · fixed deadline" : "Standard · late bids reset to 10s"}</span>${active() ? '<button class="text-btn muted" data-action="cancel">Cancel auction</button>' : `<span>${usd(a?.increment || state.show.increment || 100)} bid steps</span>`}</div></div></div>` : '<div class="empty"><h3>Your first find goes here.</h3><p>Add a product and we’ll get it ready for the spotlight.</p><button class="btn primary" data-action="add-product">Add a product</button></div>'}</section>`;
}
function queue() {
  return `<section class="panel lineup-panel"><div class="panel-header"><h2>Up next <span class="soft-count">${state.products.length}</span></h2><button class="text-btn" data-tab="inventory">Manage products ${icon("arrow", 14)}</button></div><div class="queue-list">${state.products.map((p) => `<div class="queue-item ${active() && state.auction.productId === p.id ? "selected" : ""}"><div class="thumb art-${p.art}">${visual(p)}</div><div class="queue-text"><strong>${esc(p.title)}</strong><small>${p.quantity} available ${active() && state.auction.productId === p.id ? "· On the block" : ""}</small></div><strong class="queue-price">${usd(p.price)}</strong><button class="btn small" aria-label="Start auction for ${esc(p.title)}" data-start="${p.id}" ${active() || p.quantity < 1 ? "disabled" : ""}>Start ${icon("play", 12)}</button></div>`).join("")}</div><button class="add-lineup" data-action="add-product">${icon("plus", 17)} Add another product</button></section>`;
}
function companionCard(full = false,{formId='companion-form',draft=''}={}) {
  const c = state.companion;
  return `<section class="panel companion-panel ${full ? "companion-full" : ""}"><div class="panel-header"><h2><span class="mini-mochi" aria-hidden="true"><img src="${esc(companionAvatar())}" alt=""></span> ${esc(companionName())} <span class="soft-count">${c.provider === "codex" ? "Codex" : c.provider === "demo" ? "Demo" : "Offline"}</span></h2><label class="toggle"><input aria-label="Show companion" type="checkbox" data-setting="enabled" ${c.enabled ? "checked" : ""}><span></span></label></div>${full ? `<div class="companion-stage ${c.enabled ? "" : "disabled-companion"}">${mochi()}<span class="mochi-name">${esc(companionName())} · your cohost</span></div>` : ""}<div class="companion-content">${state.companionBusy ? `<div class="companion-thinking" role="status">${esc(companionName())} is thinking…</div>` : ''}<div class="munny-message-row"><span class="munny-message-avatar" aria-hidden="true"><img src="${esc(companionAvatar())}" alt=""></span><div class="munny-message-bubble"><span class="sr-only">${esc(companionName())} says: </span><p class="mochi-message">${esc(c.message)}</p></div></div>${
    state.proposal
      ? `<div class="proposal"><strong>Proposed: ${esc(state.proposal.action.replaceAll("-", " "))}</strong>${
          state.proposal.draftProduct
            ? `<div class="draft-preview">${state.proposal.draftProduct.image ? `<img class="draft-photo" src="${esc(state.proposal.draftProduct.image)}" alt="Uploaded product photo">` : ""}<strong>${esc(state.proposal.draftProduct.title)}</strong><p>${esc(state.proposal.draftProduct.description)}</p><dl>${Object.entries(
                state.proposal.draftProduct,
              )
                .filter(([k]) => !["title", "description"].includes(k))
                .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
                .join("")}</dl></div>`
            : ""
        }<div><button class="btn primary small" data-action="apply-proposal">Apply ${icon("check", 13)}</button>${state.proposal.draftProduct ? '<button class="text-btn" data-action="edit-draft">Edit draft</button>' : ""}<button class="text-btn" data-action="dismiss-proposal">Dismiss</button></div></div>`
      : ""
  }<div class="quick-prompts"><button data-prompt="Start the next auction">Next auction</button><button data-prompt="Recap orders">Order recap</button></div><form id="${formId}" class="ask-form"><label class="composer-label" for="${formId}-message">Message ${esc(companionName())}</label><div class="composer-field"><input id="${formId}-message" name="prompt" value="${esc(draft)}" placeholder="Ask a question or plan your next lot…" aria-label="Message ${esc(companionName())}" maxlength="2000" required ${state.companionBusy ? "disabled" : ""}><button aria-label="Send to ${esc(companionName())}" ${state.companionBusy ? "disabled" : ""}>${icon("arrow", 17)}<span>Send</span></button></div></form><a class="chat-info-link" href="/terms" target="_blank" rel="noopener">${c.provider === "demo" ? "Demo replies" : "AI can make mistakes"}</a></div></section>`;
}
function chatPanel() {
  return `<section class="panel chat-panel"><div class="panel-header"><h2>${state.mode === "demo" ? "Test chat" : "Twitch chat"}</h2><span class="pill">${state.mode}</span></div><div class="chat-stream">${
    state.chat.length
      ? state.chat
          .slice(-8)
          .map(
            (m) =>
              `<div class="chat-row"><span class="chat-user">${esc(m.username)}</span><span>${esc(m.text)}</span></div>`,
          )
          .join("")
      : '<p class="empty-chat">No messages yet.</p>'
  }</div>${state.mode === "demo" ? `<form id="bid-form"><div class="demo-inputs"><input name="username" placeholder="Username" aria-label="Demo bidder name" value="testbuyer" required maxlength="30" pattern="[A-Za-z0-9_]{2,30}"><div class="money-input"><span>$</span><input name="amount" aria-label="Bid in USD" type="number" min="0.01" step="0.01" value="${((state.auction?.highest ? state.auction.highest.amount + state.auction.increment : state.auction?.product.price || 100) / 100).toFixed(2)}" required></div></div><button class="btn full" ${state.auction?.status !== "live" ? "disabled" : ""}>Submit test bid ${icon("arrow", 15)}</button><small class="demo-notice">Simulation. No funds move.</small></form>` : `<div class="chat-help">Bid syntax <code>!bid 25</code><br>Viewers register at <code>/shop</code></div>`}</section>`;
}
function bidHistory() {
  return `<section class="panel"><div class="panel-header"><h2>Bid feed</h2>${state.auction?.status === "paused" && state.auction.highest ? '<button class="text-btn danger-text" data-action="void-bid">Void last bid</button>' : ""}</div><div class="bid-feed">${
    state.bids.length
      ? state.bids
          .slice(0, 8)
          .map(
            (b) =>
              `<div class="feed-row ${b.voided ? "voided" : ""}"><time>${time(b.at)}</time><span>@${esc(b.username)} ${b.voided ? "[void]" : ""}</span><strong>${usd(b.amount)}</strong></div>`,
          )
          .join("")
      : '<p class="empty-chat">Accepted bids appear here.</p>'
  }</div></section>`;
}
const time = (at) =>
  new Date(at).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
function log() {
  return `<section class="panel log-panel"><div class="panel-header"><h2>Show log</h2><span class="muted">REC ●</span></div><div class="event-log">${
    state.activity
      .slice(0, 9)
      .map(
        (e) =>
          `<div class="log-row"><time>${time(e.at)}</time><span class="log-type">${esc(e.type)}</span><span>${esc(e.text)}</span></div>`,
      )
      .join("") || '<p class="empty-chat">System ready.</p>'
  }</div></section>`;
}
function votePanel(readOnly = false) {
  const v = state.vote;
  return `<section class="panel vote-panel"><div class="panel-header"><h2>Chat picks the next drop</h2>${v ? statusBadge(v.status) : ""}</div><div class="vote-content">${v ? `<p>${v.status === "open" ? "Type !vote 1, 2 or 3 in Twitch chat. You can change your vote." : v.status === "cancelled" ? "This vote was cancelled." : v.winner ? "Chat made its choice." : "No votes this time. Pick any product."}</p><div class="vote-options">${v.options.map((o, i) => `<div class="vote-option ${v.winner === o.productId ? "vote-winner" : ""}"><span class="vote-number">${o.number}</span><div class="thumb art-${o.product.art}">${visual(o.product)}</div><strong>${esc(o.product.title)}</strong><span>${v.counts[i]} ${v.counts[i] === 1 ? "vote" : "votes"}</span></div>`).join("")}</div><div class="vote-footer"><small>${v.voters} voters · ${v.status === "open" ? "<span data-vote-clock></span> remaining" : "Tie-break: earliest listed option"}</small>${!readOnly && v.status === "open" ? '<button class="text-btn" data-action="close-vote">Close vote</button>' : ""}${!readOnly && v.status === "closed" && v.winner ? `<button class="btn primary small" data-start="${v.winner}" ${active() ? "disabled" : ""}>Auction the winner ${icon("play", 12)}</button>` : ""}</div>${!readOnly && v.status === "open" && state.mode === "demo" ? `<form id="demo-vote-form" class="demo-vote-form"><input name="username" aria-label="Demo voter" placeholder="Test voter" value="viewer_one" required><select name="option" aria-label="Vote choice">${v.options.map((o) => `<option value="${o.number}">${o.number}</option>`).join("")}</select><button class="btn small">Test vote</button></form>` : ""}` : "<p>Let everyone in chat have a say—even if they’re just here to watch.</p>"}${!readOnly && v?.status !== "open" ? '<button class="btn" data-action="open-vote">Choose products & start a vote</button>' : ""}</div></section>`;
}
function showRecap() {
  const orders = state.orders.filter(
    (o) => !["cancelled", "expired", "refunded"].includes(o.status),
  );
  const paid = orders.filter((o) =>
    ["paid", "test-paid", "paid-external", "shipped", "delivered", "test-delivered"].includes(o.status),
  );
  return `<details class="show-recap"><summary>Show recap ${icon("arrow", 14)}</summary><div class="recap-grid"><div><strong>${state.history.filter((a) => a.status === "sold").length}</strong><span>Lots sold</span></div><div><strong>${usd(paid.reduce((n, o) => n + (o.total || o.amount), 0))}</strong><span>${state.mode === "demo" ? "Simulated + recorded funds" : "Collected + confirmed"}</span></div><div><strong>${orders.filter((o) => o.status === "pending").length}</strong><span>Awaiting payment</span></div><div><strong>${new Set(state.history.flatMap((a) => (a.highest ? [a.highest.userId] : []))).size}</strong><span>Auction winners</span></div></div><button class="text-btn" data-tab="orders">Open fulfillment queue ${icon("arrow", 14)}</button></details>`;
}
function voteDialog() {
  const eligible = state.products.filter(
    (p) => p.quantity > 0 && !(active() && state.auction.productId === p.id),
  );
  modal(
    `<h2>Let chat choose.</h2><p>Select two or three products. Each Twitch account gets one vote, and can change its mind.</p><form id="vote-form" class="stack-form"><div class="vote-select">${eligible.map((p, i) => `<label class="consent"><input type="checkbox" name="productId" value="${p.id}" ${i < 3 ? "checked" : ""}>${esc(p.title)}</label>`).join("")}</div><label>Voting time<select name="duration"><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option></select></label><button class="btn primary" ${eligible.length < 2 ? "disabled" : ""}>Start vote</button></form>`,
  );
  $("#vote-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/api/vote/open", {
        productIds: f.getAll("productId"),
        duration: Number(f.get("duration")),
      });
      $("#modal").close();
    } catch (e) {
      toast(e.message);
    }
  };
}
function photoDialog() {
  modal(
    `<h2>Photo → next drop.</h2><p>Munny drafts the details. You review before anything is added.</p><form id="photo-draft-form" class="stack-form"><label>Product photo<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required></label><div class="form-row"><label>Opening price (USD)<input type="number" name="price" min="0.01" step="0.01" value="20.00" required></label><label>Quantity<input name="quantity" type="number" min="1" max="10000" value="1" required></label></div><label>Confirmed condition<select name="condition"><option>Used</option><option>New</option><option>Like new</option><option>Open box</option></select></label><label>Your notes<textarea name="notes" maxlength="1500" placeholder="What is it? Any defects or included accessories?"></textarea></label><p class="field-help">This photo and your notes are sent to your connected Codex provider. Use a product-only photo without private information. Price and condition stay exactly as you enter them.</p><button class="btn primary">Draft with Codex</button><p id="photo-error" role="alert"></p></form>`,
  );
  $("#photo-draft-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      button = e.target.querySelector("button");
    button.disabled = true;
    button.textContent = "Munny is looking…";
    try {
      const upload = await fetch("/api/upload", {
        method: "POST",
        headers: { "X-Autoloot-Admin": adminToken },
        body: f.get("photo"),
      });
      const result = await upload.json();
      if (!upload.ok) throw Error(result.error);
      await api("/api/companion/photo", {
        image: result.image,
        price: f.get("price"),
        quantity: Number(f.get("quantity")),
        condition: f.get("condition"),
        notes: f.get("notes"),
      });
      $("#modal").close();
      tab = "companion";
      render();
      toast("Draft ready. Review every field before Apply.");
    } catch (e) {
      $("#photo-error").textContent = e.message;
    } finally {
      button.disabled = false;
      button.textContent = "Draft with Codex";
    }
  };
}
function runPanel() {
 const r = state.run, armed = r && ['running','paused'].includes(r.status);
 const labels = {'waiting-review':'Ready for your review','ready':'Ready for next item','auction':'Auction in progress','selling':'Fixed-price listing open','waiting-payment':'Waiting for verified payment','waiting-nft-delivery':'Waiting for finalized NFT delivery','waiting-fulfillment':'Waiting for fulfillment','completed':'Queue reconciled','stopped':'Stopped'};
 return `<section class="panel settings-panel run-panel"><div class="panel-header"><h2>Agent-led run</h2>${statusBadge(r?.status || 'not armed')}</div><p>Choose your lineup. Munny keeps the show moving at your pace.</p>${r ? `<div class="run-summary"><strong>${Math.min(r.index + 1, r.steps.length)} / ${r.steps.length} · ${esc(r.status === 'paused' ? 'Paused' : labels[r.phase] || r.phase)}</strong><p>${esc(r.steps[r.index]?.product.title || 'All queued items processed.')}</p><small>Armed until ${esc(new Date(r.expiresAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))} · ${esc(r.mode)}</small></div>${r.reason ? `<p class="error-box">${esc(r.reason)}</p>` : ''}` : ''}<div class="heading-actions">${armed ? `${r.phase==='waiting-review'?'<button class="btn primary" data-action="run-approve">Approve this lot</button>':''}${r.status === 'running' ? '<button class="btn" data-action="run-pause">Pause run</button>' : '<button class="btn primary" data-action="run-resume">Resume run</button>'}<button class="btn" data-action="run-stop">Stop run</button>${r.phase === 'waiting-payment' || r.phase === 'waiting-fulfillment' || r.phase === 'waiting-nft-delivery' ? '<button class="btn" data-tab="orders">Open orders →</button>' : ''}` : '<button class="btn primary" data-action="run-configure">Configure run</button>'}</div>${r ? `<details class="run-audit"><summary>Run audit · ${r.events.length} events</summary><ol>${r.events.slice(-20).map(event => `<li><time>${esc(new Date(event.at).toLocaleTimeString())}</time> ${esc(event.text)}</li>`).join('')}</ol></details>` : ''}<p class="field-help">One unit per product. Restart, disconnect, expiry or an unexpected order outcome pauses the run. NFT orders complete at verified transfer. A human still records physical fulfillment.</p></section>`;
}
function runDialog() {
 const products = state.products.filter(p => p.quantity === 1);
 if (!products.length) { toast('Add a product with exactly one unit in stock before arming a run.'); return; }
 modal(`<h2>Arm an agent-led run</h2><p>Select up to 20 single-unit products. They run in inventory order. Prices, condition, shipping and auction terms are frozen until you stop the run.</p><form id="run-form" class="stack-form"><div class="run-products">${products.map(p => `<div class="run-product"><label><input type="checkbox" name="productId" value="${esc(p.id)}"> ${esc(p.title)}<small>Auction from ${usd(p.price)}${p.buyNowPrice ? ' · Fixed price '+usd(p.buyNowPrice) : ''}</small></label><label>Format<select data-run-format="${esc(p.id)}"><option value="auction">Auction</option>${p.buyNowPrice ? '<option value="buy-now">Buy now</option>' : ''}</select></label></div>`).join('')}</div><label class="consent"><input type="checkbox" name="reviewEachLot" ${state.automation?.mode==='review'?'checked':''}> Ask me before opening each lot</label><label>Run for (minutes)<input type="number" name="minutes" min="1" max="240" value="30" required></label><p>${esc(state.mode)} mode · ${state.show.bidDuration}s auctions · ${usd(state.show.increment)} bid increments · ${usd(state.show.shippingPrice)} shipping per order.</p><details><summary>NFT transfer authorization</summary><label class="consent"><input type="checkbox" name="allowNftTransfers"> Authorize transfers of the queued NFTs to buyer-confirmed wallets after payment.</label><label>Maximum total network fee per transfer (native atomic units)<input name="maxNftFeeAtomic" value="0" pattern="[0-9]+" required></label><p>Each chain uses its own native units (for example lamports or wei). The wallet service must enforce the cap before signing. Unknown outcomes are reconciled, not blindly resubmitted.</p></details><label class="consent"><input type="checkbox" required> I authorize this queue to sell under these terms, with no inventory purchasing and only the separately authorized NFT transfers. I am responsible for the listings and fulfillment and have reviewed the <a href="/terms" target="_blank" rel="noopener">automation and AI disclosures</a>.</label><button class="btn primary">Arm run</button></form>`);
 const requestId = crypto.randomUUID();
 $('#run-form').onsubmit = async event => {
   event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true;
   try {
     const data = new FormData(form);
     await api('/api/run/arm', { requestId, reviewEachLot:data.has('reviewEachLot'), minutes:Number(data.get('minutes')), allowNftTransfers:data.has('allowNftTransfers'),maxNftFeeAtomic:data.get('maxNftFeeAtomic'), steps:data.getAll('productId').map(id => ({productId:id,format:form.querySelector(`[data-run-format="${CSS.escape(id)}"]`).value})) });
     $('#modal').close(); state = await api('/api/state'); render(); toast('Run armed. Autoloot will start the next authorized sale.');
   } catch (error) { toast(error.message); button.disabled = false; }
 };
}
function studio() {
  if(!state.products.length)return `<section class="panel welcome-panel" aria-labelledby="welcome-title"><div class="welcome-copy"><h1 id="welcome-title">Add your first lot</h1><div class="heading-actions"><button class="btn primary" data-tab="catalog">Browse catalog</button><button class="btn" data-action="add-product">Add a lot</button><button class="text-btn" data-tab="connections">Set up your channel →</button></div></div><img class="welcome-mochi" src="/characters/mochi-hero-welcome.png" alt="Munny welcomes you with an open hand" decoding="async"></section>${setupChecklist(state,tutorialStatus())}${studioWidgets(state)}`;
  return `${setupChecklist(state,tutorialStatus())}<div class="studio-actions heading-actions"><button class="btn" data-action="viewer">${icon("bag", 16)} Storefront</button><button class="btn" data-action="overlay">${icon("external", 16)} Stream overlay</button></div><div class="show-bar"><span class="show-avatar">✳</span><div><strong>${esc(state.show.title)}</strong><small>${state.mode === "demo" ? "Practice mode · no real payments" : "Live auctions"}</small></div><button class="text-btn" data-action="edit-show">Edit show ${icon("settings", 14)}</button></div><div class="studio-grid"><div class="main-column">${runPanel()}${auctionCard()}${stats()}${queue()}${votePanel()}${showRecap()}<details class="activity-details" id="show-activity"><summary>${icon("clock", 16)} Show activity <span>Bid history & event log</span></summary>${bidHistory()}${log()}<div class="reorder-tools"><p>Arrange your lineup</p>${state.products.map((p, i) => `<div><span>${esc(p.title)}</span><button class="text-btn" data-move="${p.id}" ${i === 0 ? "disabled" : ""}>Move up ↑</button></div>`).join("")}</div></details></div><div class="right-column">${companionCard()}${chatPanel()}<div class="studio-tip">${icon("check", 16)}<p>${state.mode === "demo" ? "You’re in demo mode. Try a bid, explore your orders, and make yourself at home." : "Your viewers bid in Twitch chat. Autoloot keeps the clock, stock and orders in sync."}</p></div></div></div>`;
}
let inventoryView='owned';
function inventoryTabs(){return `<div class="filter-tabs inventory-sections"><button data-inventory-view="owned" class="${inventoryView==='owned'?'active':''}">Your inventory</button><button data-inventory-view="catalog" class="${inventoryView==='catalog'?'active':''}">Browse catalog</button></div>`;}
function inventory() {
 if(inventoryView==='catalog')return `${heading('Inventory')}${inventoryTabs()}${catalogPage(state,{showHeading:false})}`;

  const products = state.products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );
  return `${heading("Inventory", `${state.products.length} lots`, `<div class="heading-actions"><button class="btn" data-action="import-inventory">Import CSV</button><button class="btn" data-tab="catalog">Browse catalog</button><button class="btn" data-action="photo-draft">Photo → listing ${icon("spark", 16)}</button><button class="btn primary" data-action="add-product">${icon("plus", 16)} Add product</button></div>`)}${inventoryTabs()}<div class="inventory-tools"><input id="search" value="${esc(search)}" placeholder="Find a product…" aria-label="Search inventory"><span class="muted">USD / ${state.products.reduce((n, p) => n + p.quantity, 0)} units</span></div><div class="inventory-grid">${products.map((p, i) => `<article class="panel inventory-card"><div class="inventory-image art-${p.art}"><span class="lot-stamp">${String(i + 1).padStart(3, "0")}</span>${visual(p, true)}<span class="condition-stamp">${esc(p.condition)}</span></div><div class="inventory-card-body"><div class="product-tags"><span>${esc(p.category)}</span><span>${p.quantity} units</span></div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="inventory-price"><div><small>Auction from</small><strong>${usd(p.price)}</strong></div><div><small>${p.listed ? "Buy now" : "Unlisted"}</small><strong>${p.buyNowPrice ? usd(p.buyNowPrice) : "—"}</strong></div></div><div class="inventory-actions"><button class="btn full" data-start="${p.id}" ${p.quantity < 1 || active() ? "disabled" : ""}>Auction ${icon("play", 14)}</button><button class="icon-btn" aria-label="Edit ${esc(p.title)}" data-edit="${p.id}">${icon("settings", 16)}</button><button class="icon-btn" aria-label="Remove ${esc(p.title)}" data-remove="${p.id}">${icon("trash", 16)}</button></div>${p.listed && p.buyNowPrice && state.mode === "demo" ? `<button class="text-btn" data-demo-buy="${p.id}" ${p.quantity < 1 ? "disabled" : ""}>Test direct purchase ↗</button>` : ""}</div></article>`).join("") || '<p class="empty">No matching products.</p>'}</div>`;
}
const physicalFundsVerified=o=>o.mode!=='live'||o.status==='paid-external'||(['paid','shipped'].includes(o.status)&&o.paymentLive===true)||(o.status==='shipped'&&(o.paymentSource==='external'||(o.paymentLive===undefined&&!o.checkoutId&&!o.paymentIntent)));
function shippingAction(o) {return physicalFundsVerified(o)&&!isNftOrder(o)&&(['paid','paid-external','test-paid'].includes(o.status)||o.status==='shipped'&&o.shipment)?`<button class="btn small" data-shipping-order="${esc(o.id)}">${o.shipment?`Shipping · ${esc(o.shipment.status)}`:'Create shipping label'}</button>`:'';}
function orderActions(o) {
  if(o.mode==='live' && (o.status==='pending' && o.checkoutCreated && !o.checkoutId || o.status==='paid' && o.refundRequestedAt && !o.refundId))return `<button class="btn small" data-order="${o.id}" data-order-action="${o.status==='pending'?'reconcile-checkout':'reconcile-refund'}">Reconcile with Stripe</button>`;
  if (o.status === "pending")
    return `<div class="row-actions">${o.mode === "demo" ? `<button class="btn small" data-order="${o.id}" data-order-action="test-pay">Test payment</button>` : !state.payments.configured && !o.checkoutId ? `<button class="btn small" data-order="${o.id}" data-order-action="confirm-paid">Confirm external payment</button>` : '<span class="muted">Awaiting checkout</span>'}<button class="text-btn danger-text" data-order="${o.id}" data-order-action="cancel">Cancel</button></div>`;
  if (["paid", "test-paid", "paid-external"].includes(o.status))
    if (isNftOrder(o)) return `${nftOrderDetails(o,true)}${o.mode==='demo'?`<button class="btn small" data-nft-order="${o.id}">Simulate NFT delivery</button>`:!o.delivery?`<button class="btn small" data-nft-authorize="${o.id}">Authorize NFT delivery</button>`:`<span class="muted">Waiting for finalized transfer</span>`}`;
    else return physicalFundsVerified(o)?`<div class="row-actions"><button class="btn small" data-order="${o.id}" data-order-action="ship">Ship ${icon("arrow", 13)}</button>${o.status !== "paid-external" ? `<button class="text-btn danger-text" data-order="${o.id}" data-order-action="refund">${o.refundId ? "Check refund" : "Refund"}</button>` : ""}</div>`:`<span class="muted">Test payment · physical fulfillment unavailable</span><button class="text-btn danger-text" data-order="${o.id}" data-order-action="refund">${o.refundId ? 'Check refund' : 'Refund'}</button>`;
  if (["delivered","test-delivered"].includes(o.status)) return nftOrderDetails(o,true);
  return o.status === "shipped"
    ? `<span class="tracking">${esc(o.tracking)}</span>`
    : "—";
}
function orders() {
  const list = state.orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "ready" && physicalFundsVerified(o) && ["paid","paid-external","test-paid"].includes(o.status) && !isNftOrder(o) && o.refundRequestedAt == null) ||
      (filter === "pending"
        ? ["pending", "processing"].includes(o.status)
        : filter === "shipped"
          ? ["shipped","delivered","test-delivered"].includes(o.status)
          : filter === "paid" && ["paid", "paid-external", "test-paid"].includes(o.status)),
  );
  return `${heading("Your orders", "", `<div class="heading-actions shipping-order-tools"><button class="btn" data-action="export-fulfillment">Export shipping CSV</button><button class="btn" data-action="export-pirateship">Pirate Ship CSV</button><button class="btn" data-action="import-tracking">Import tracking</button><button class="btn" data-action="export">Export all orders</button></div>`)}<div class="filter-tabs">${[
    ["all", "All"],
    ["pending", "Unpaid"],
    ["ready", "Ready to ship"],
    ["paid", "All paid / digital delivery"],
    ["shipped", "Fulfilled"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${filter === k ? "active" : ""}" data-filter="${k}">${l}</button>`,
    )
    .join(
      "",
    )}</div><section class="panel orders-panel"><div class="table-scroll"><table><thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>${list.map((o) => `<tr><td><small>${esc(o.number)} / ${esc(o.kind || "auction")} / ${o.mode}</small><strong>${esc(o.product.title)}</strong>${reservationNotice(o)}${!isNftOrder(o) && ["paid","paid-external","test-paid"].includes(o.status) && !o.shipping ? '<small>Shipping address missing — verify before shipment</small>' : ""}${o.shipping ? `<button class="text-btn" data-address="${o.id}">Shipping details ↗</button>` : ""}</td><td>@${esc(o.buyer)}</td><td><strong>${usd(o.total || o.amount)}</strong><small>+${usd(o.shippingPrice || 0)} shipping</small></td><td>${statusBadge(o.status)}${o.refundStatus && o.refundStatus !== "succeeded" ? `<small>Refund ${esc(o.refundStatus)}</small>` : ""}</td><td>${shippingAction(o)}${orderActions(o)}</td></tr>`).join("")}</tbody></table></div>${!list.length ? '<div class="empty"><h3>No orders.</h3><p>Sold lots and direct purchases appear here.</p></div>' : ""}</section><p class="section-note">${state.payments.configured ? `Stripe / ${state.payments.environment} environment. Payment is confirmed by signed webhooks.` : "Checkout is not configured. Live payments must be confirmed externally."} Demo payments are simulated.</p>`;
}
function audience() {
  return `${heading("Bidders", "")}<section class="panel bidders-panel"><div class="table-scroll"><table><thead><tr><th>Account</th><th>Registered</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.registrations.map((r) => `<tr><td>@${esc(r.username)}</td><td>${new Date(r.at).toLocaleDateString()}</td><td>${statusBadge(r.blocked ? "blocked" : "active")}</td><td><button class="btn small" data-bidder="${esc(r.userId)}" data-blocked="${!r.blocked}">${r.blocked ? "Unblock" : "Block"}</button></td></tr>`).join("")}</tbody></table></div>${!state.registrations.length ? '<div class="empty">No registered bidders. Share your storefront to get started.</div>' : ""}</section>`;
}
async function auditHistoryDialog(before){
 const page=await api('/api/audit'+(before?'?before='+encodeURIComponent(before):''));
 modal(`<h2>Admin audit</h2><p class="field-help">Local streamer actions and request outcomes. A completed request does not by itself verify payment or delivery.</p>${activityFeed({audit:page.events,activity:[]},{historyButton:false})}<div class="heading-actions"><button class="text-btn" id="audit-newest">Newest</button>${page.nextBefore?'<button class="btn" id="audit-earlier">Earlier actions</button>':''}</div>`);
 $('#audit-newest').onclick=()=>auditHistoryDialog().catch(error=>toast(error.message));
 $('#audit-earlier')?.addEventListener('click',()=>auditHistoryDialog(page.nextBefore).catch(error=>toast(error.message)));
}
function companionProfileDialog(){
 const c=state.companion;
 modal(`<h2>Your companion</h2><form id="companion-profile-form" class="stack-form"><label>Name<input name="name" maxlength="40" value="${esc(c.name||'Munny')}" required></label><label>Tone<select name="tone">${['warm','concise','playful','calm'].map(tone=>`<option ${tone===(c.tone||'warm')?'selected':''}>${tone}</option>`).join('')}</select></label><label>Preferences<textarea name="instructions" maxlength="1000" placeholder="e.g. Keep replies short and focus on TCG listings.">${esc(c.instructions||'')}</textarea></label><label>Avatar (optional)<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="field-help">Personalize the voice and look. Payment, listing and approval rules stay the same.</p><button class="btn primary">Save companion</button><button type="button" class="text-btn" id="restore-munny">Restore Munny</button></form>`);
 $('#restore-munny').onclick=async()=>{try{await api('/api/companion/profile',{reset:true});$('#modal').close();state=await api('/api/state');render();}catch(error){toast(error.message);}};
 $('#companion-profile-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const data=new FormData(event.target);let avatar=c.avatar||'/characters/mochi-street-v3.png';const file=data.get('avatarFile');if(file?.size){const response=await fetch('/api/upload',{method:'POST',headers:{'X-Autoloot-Admin':adminToken},body:file});const result=await response.json();if(!response.ok)throw Error(result.error);avatar=result.image;}await api('/api/companion/profile',{name:data.get('name'),tone:data.get('tone'),instructions:data.get('instructions'),avatar});$('#modal').close();state=await api('/api/state');render();}catch(error){toast(error.message);button.disabled=false;}};
}
function companionPage() {
  return `${heading(esc(companionName()), "", '<button class="btn" data-action="companion-profile">Customize companion</button>')}<p class="ai-disclosure">Your companion is software. LLM output can be incorrect or misleading. You are responsible for reviewing listings, card matches, data rights and the actions you authorize. Do not enter secrets or unnecessary personal data. <a href="/privacy" target="_blank" rel="noopener">AI data handling ↗</a></p><div class="companion-layout">${companionCard(true)}<div class="main-column"><section class="panel settings-panel"><h2>On-stream cohost</h2><div class="setting-row"><div><strong>Overlay voice</strong><small>Speak new auction events in the OBS Browser Source.</small></div><label class="toggle"><input type="checkbox" aria-label="Overlay voice" data-setting="overlayVoice" ${state.companion.overlayVoice ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><strong>Reduced motion</strong><small>Keep the avatar still.</small></div><label class="toggle"><input type="checkbox" aria-label="Reduced companion motion" data-setting="reducedMotion" ${state.companion.reducedMotion ? "checked" : ""}><span></span></label></div><p class="field-help">OBS browser speech depends on its installed voices and audio settings. Preview the overlay, enable audio there if required, and select “Control audio via OBS.”</p><h2>Runtime</h2><label class="field-label" for="provider">Provider</label><select id="provider"><option value="offline" ${state.companion.provider === "offline" ? "selected" : ""}>Offline</option>${state.mode==='demo'?`<option value="demo" ${state.companion.provider === "demo" ? "selected" : ""}>Demo / scripted replies</option>`:''}<option value="codex" ${state.companion.provider === "codex" ? "selected" : ""}>Codex / local CLI login</option></select><p>Run <code>codex login</code> in your terminal, then select Codex. The companion uses that account’s plan or API allowance.</p><div class="setting-row"><div><strong>OBS avatar</strong><small>Show your companion in the stream overlay.</small></div><label class="toggle"><input type="checkbox" aria-label="On-stream companion" data-setting="enabled" ${state.companion.enabled ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><strong>Voice</strong><small>Read replies in this browser.</small></div><label class="toggle"><input type="checkbox" aria-label="Browser voice" data-setting="voice" ${state.companion.voice ? "checked" : ""}><span></span></label></div></section><section class="panel settings-panel"><h2>Available commands</h2><div class="command-row"><code>find Pikachu in the catalog</code><span>Search catalog, then ask your companion to choose a result. Review it in Inventory before adding.</span></div><div class="command-row"><code>draft a listing</code><span>Prepare a product from your details.</span></div><div class="command-row"><code>next lot</code><span>Propose the next auction.</span></div><div class="command-row"><code>pause / resume</code><span>Control the current auction.</span></div><div class="command-row"><code>recap orders</code><span>Check sales and unpaid orders.</span></div><p class="section-note">Action proposals need your Apply click. Bids, prices, winners and payment states stay controlled by the server.</p></section></div></div>`;
}
function advancedConnections() {
 return `<section class="panel settings-panel"><h2>Show preferences</h2><div class="heading-actions"><button class="btn" data-action="edit-show">Edit show</button><button class="btn" data-action="auction-settings">Auction preferences</button><label>Show mode<select id="mode"><option value="live" ${state.mode==='live'?'selected':''}>Live</option><option value="demo" ${state.mode==='demo'?'selected':''}>Practice</option></select></label></div><p><a href="/help">Setup & documentation ↗</a></p></section>`;
}
function operatorSettings() {
 const o=state.operator||{},ready=['name','email','shipping','returns','retention'].every(key=>o[key]);
 return settingsCard('seller','Seller details',ready?'Published':'Finish setup',ready?esc(o.name):'Your public contact, shipping and returns.',`<button class="btn" data-action="operator-settings">${ready?'Edit details':'Add details'}</button>`);
}
function operatorDialog() {
 const o = state.operator || {};
 modal(`<h2>Publish seller policies</h2><p>All fields below are public. Use your business/operator identity and a public contact, not private credentials. These notices must reflect your actual practices.</p><form id="operator-form" class="stack-form"><label>Seller / operator name<input name="name" maxlength="160" value="${esc(o.name || '')}" required></label><label>Public support and privacy email<input type="email" name="email" maxlength="254" value="${esc(o.email || '')}" required></label><label>Shipping and fulfillment policy<textarea name="shipping" maxlength="3000" rows="3" required>${esc(o.shipping || '')}</textarea></label><label>Returns, refunds and dispute policy<textarea name="returns" maxlength="3000" rows="3" required>${esc(o.returns || '')}</textarea></label><label>Data retention notice<textarea name="retention" maxlength="1500" rows="3" required>${esc(o.retention || '')}</textarea></label><p class="field-help">There is no automatic personal-data deletion schedule. You must carry out the retention/deletion practices you publish, including backups and exports. Mandatory buyer and privacy rights still apply.</p><label class="consent"><input type="checkbox" name="acknowledged" required> I operate this installation and am responsible for the policies, listings, permissions and automation I authorize. I have reviewed the <a href="/terms" target="_blank" rel="noopener">Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>, including AI limitations.</label><button class="btn primary">Publish policies</button></form>`);
 $('#operator-form').onsubmit = async event => {
   event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true;
   try {
     await api('/api/operator', {...Object.fromEntries(new FormData(form)), acknowledged:new FormData(form).has('acknowledged')});
     $('#modal').close(); state = await api('/api/state'); render(); toast('Seller policies published.');
   } catch (error) { toast(error.message); button.disabled = false; }
 };
}
function sellerSummary() {
 const o = state.operator || {}, ready = ['name','email','shipping','returns','retention'].every(key => o[key]);
 return `<section class="panel settings-panel seller-summary"><h2>${o.name ? 'Sold by '+esc(o.name) : 'Seller policies'}</h2><p>${ready ? `Support and privacy requests: ${esc(o.email)}` : 'Seller details are incomplete. Ask the streamer for their identity, contact, shipping and returns policies before making a real purchase.'}</p><p>Autoloot provides software and data tools. The seller operates the sale and handles fulfillment and support. AI cohost messages may be inaccurate; verify important claims with the seller.</p>${ready ? `<details><summary>Shipping & returns</summary><h3>Shipping and fulfillment</h3><p class="policy-copy">${esc(o.shipping)}</p><h3>Returns, refunds and disputes</h3><p class="policy-copy">${esc(o.returns)}</p></details>` : ''}<nav aria-label="Storefront legal"><a href="/terms" target="_blank" rel="noopener">Terms ↗</a> · <a href="/privacy" target="_blank" rel="noopener">Privacy ↗</a> · <a href="/help" target="_blank" rel="noopener">Help & contact ↗</a></nav></section>`;
}
function settingsCard(symbol,title,status,copy,action,brand=false) {
 return `<section class="panel preference-card ${brand ? 'service-card service-card-'+symbol : ''}"><div class="preference-top"><span class="service-icon">${brand?`<img src="/brand/services/${symbol}.svg" alt="">`:icon(symbol,26)}</span><span class="preference-status">${status}</span></div><h2>${title}</h2><p>${copy}</p><div class="preference-actions">${action}</div></section>`;
}
function widgetSettings() {
 const preset=widgetPresets[selectedWidget];
 return `<section class="panel settings-panel widget-settings"><div class="section-title">${icon('studio',24)}<div><h2>On your stream</h2><p>Choose a layout for OBS.</p></div></div><div class="widget-controls"><label>Layout<select id="widget-preset">${Object.entries(widgetPresets).map(([key,p])=>`<option value="${key}" ${key===selectedWidget?'selected':''}>${p.label}</option>`).join('')}</select></label><span class="muted">${preset.width} × ${preset.height}</span><button class="btn primary" data-action="copy-widget">${icon('link',16)} Copy OBS link</button><button class="btn" data-action="preview-widget">Preview ${icon('external',16)}</button></div></section>`;
}
function backendSettings() {
 const db=state.storage,nft=state.nft;
 return `<section class="panel settings-panel"><h2>System details</h2><p>Storage: ${db?.healthy?'Healthy':'Needs attention'} · Latest backup: ${db?.lastBackupAt?esc(new Date(db.lastBackupAt).toLocaleString()):'Not recorded'}</p>${db?.backupError?`<p class="error-box">${esc(db.backupError)}</p>`:''}<p>NFT delivery: ${nft?.walletAdapter&&nft?.chains?.length?'Online':'Offline'}</p><p><a href="/help">Installation & troubleshooting ↗</a></p></section>`;
}
function automationSettings() {
 const mode=state.automation?.mode||'manual',running=['running','paused'].includes(state.run?.status);
 return `<section class="panel automation-settings"><div class="section-title">${icon('spark',26)}<div><h2>How your companion runs the show</h2><p>Choose your pace. You can always pause.</p></div></div><div class="automation-options" role="group" aria-label="Automation style">${[['manual','play','I lead','You start each lot. Munny helps when asked.'],['review','check','Check with me','Review each queued lot before it opens.'],['automatic','spark','Keep it moving','Approve a queue once. Munny runs it within your limits.']].map(([value,symbol,title,copy])=>`<button class="automation-option ${mode===value?'selected':''}" data-automation="${value}" aria-pressed="${mode===value}" ${running?'disabled':''}>${icon(symbol,23)}<strong>${title}</strong><span>${copy}</span>${mode===value?'<small>Selected</small>':''}</button>`).join('')}</div><div class="automation-footer"><span>${running?'Stop your current run to change styles.':'Applies to your next run. Prices and wallet permissions stay yours.'}</span><button class="text-btn" data-tab="studio">Open Studio →</button></div></section>`;
}
function connections(){
 const t=state.twitch,p=state.payments;
 return `${heading('Settings','', '<div class="heading-actions"><button class="btn" data-start-tutorial>Take a tour</button><a class="btn" href="/help">Help & setup '+icon('external',16)+'</a></div>')}<div class="preference-grid">${settingsCard('twitch','Twitch',t.connected?'Online':'Offline',t.error?esc(t.error):t.connected?'@'+esc(t.channel):'Bring your chat into the show.',`${t.configured?'<button class="btn primary" data-action="connect-twitch">'+(t.connected?'Reconnect':'Connect Twitch')+'</button>':'<a class="btn primary" href="/twitch-setup.html">Connect Twitch</a>'}${t.connected?'<button class="text-btn" data-action="disconnect-twitch">Disconnect</button>':''}`,true)}${settingsCard('stripe','Payments',p.configured?(p.environment==='live'?'Online':'Online · Test'):'Offline','Checkout and refunds, handled by Stripe.','<button class="btn" data-action="payment-help">'+(p.configured?'View payment setup':'Set up payments')+'</button>',true)}${operatorSettings()}${settingsCard('shipping','Shipping',state.shippingProvider?.configured?(state.shippingProvider.environment==='live'?'Online':'Online · Test'):'Offline','Shippo labels, saved package presets and Pirate Ship CSV.','<button class="btn" data-action="shipping-settings">Set up shipping</button>')}${settingsCard('companion',esc(companionName()),state.companion.enabled?'Here to help':'Resting','Voice, personality and cohost preferences.','<button class="btn" data-tab="companion">Meet your cohost</button>')}</div>${automationSettings()}${widgetSettings()}<div class="settings-bottom"><details class="settings-disclosure"><summary>${icon('play',18)} Practice show</summary><div><p>Try sample lots without real payments.</p><button class="btn" id="load-demo">Load sample lots</button><button class="btn" id="remove-demo">Clear practice content</button></div></details><details class="advanced-settings settings-disclosure"><summary>${icon('settings',18)} Show & system</summary>${advancedConnections()}${backendSettings()}</details></div>`;
}
function clock(a) {
  if (!liveConnection) return "—";
  const n =
    a.status === "paused"
      ? a.remaining
      : a.status === "live"
        ? Math.max(0, a.endsAt - Date.now() + serverOffset)
        : 0;
  const seconds = Math.ceil(n / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
let mochiQuickOpen=false, mochiQuickDraft='', munnyPanelTab='chat';
const bellIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
function mochiQuick(){
 const items=notifications(state);
 const content=munnyPanelTab==='chat'?companionCard(false,{formId:'mochi-quick-form',draft:mochiQuickDraft}):munnyPanelTab==='notifications'?notificationFeed(items):activityFeed(state);
 return `${mochiQuickOpen?`<div class="munny-backdrop" id="munny-backdrop"></div><section id="mochi-quick-panel" class="munny-drawer" role="dialog" aria-modal="true" aria-labelledby="munny-panel-title"><header class="munny-drawer-header"><span class="munny-avatar"><img src="${esc(companionAvatar())}" alt=""></span><div><h2 id="munny-panel-title">${esc(companionName())}</h2></div><button class="icon-btn" id="mochi-quick-close" aria-label="Close companion panel">${icon('close',20)}</button></header><div class="munny-tabs" role="tablist" aria-label="Companion panel">${[['chat','chat','Chat'],['notifications','orders','Notifications'],['activity','clock','Activity']].map(([id,symbol,label])=>`<button role="tab" id="munny-tab-${id}" data-munny-tab="${id}" aria-selected="${munnyPanelTab===id}" aria-controls="munny-panel-content" tabindex="${munnyPanelTab===id?'0':'-1'}">${id==='notifications'?bellIcon:icon(symbol,17)}${label}${id==='notifications'&&items.length?`<span>${items.length}</span>`:''}</button>`).join('')}</div><div class="munny-panel-content" id="munny-panel-content" role="tabpanel" aria-labelledby="munny-tab-${munnyPanelTab}" tabindex="0">${content}</div></section>`:''}<div class="mochi-quick"><button id="mochi-quick-toggle" class="mochi-quick-toggle" aria-label="Open ${esc(companionName())} panel${items.length?', '+items.length+' notifications':''}" aria-expanded="${mochiQuickOpen}" aria-controls="mochi-quick-panel" ${mochiQuickOpen?'hidden':''}><span class="mochi-quick-face"><img src="${esc(companionAvatar())}" alt="" draggable="false"></span>${items.length?`<span class="munny-count-badge" aria-hidden="true">${items.length}</span>`:''}</button></div>`;
}
let runAuditExpanded = false;
function render() {
  if(tab!=='rip')disposeRip();
  if (!state) return;
  serverOffset = Date.now() - state.serverTime;
  if (isOverlay) return renderOverlay();
  if (isShop) return renderShop();
  const activityExpanded = $("#show-activity")?.open || false;
  $("#app").innerHTML =
    `${workspaceNavigation({tab,mobileMenuOpen,twitch:state.twitch,brand:brand()})}<div class="workspace-main">${header()}<main>${{ studio, inventory, orders, audience, companion: companionPage, connections, rip: () => ripPage(state), catalog: () => inventory(), accounting:()=>accountingPage(state) }[tab]()}</main></div><footer class="app-footer"><span>© ${new Date().getFullYear()} Autoloot. All rights reserved.</span><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/help">Help</a></nav></footer>${mochiQuick()}`;
  if ($("#show-activity")) $("#show-activity").open = activityExpanded;
  if ($(".run-audit")) $(".run-audit").open = runAuditExpanded;
  if(mochiQuickOpen) {
    for(const element of document.querySelectorAll('.sidebar,.mobile-header,.workspace-main,.app-footer,.nav-backdrop'))element.inert=true;
  }
  wire();
  mountTutorial(section=>{tab=section;mobileMenuOpen=false;mochiQuickOpen=false;render();},render);
  enterSection(tab, $(".workspace-main main"));
  if (
    state.companion.voice &&
    state.companion.message !== lastSpoken &&
    "speechSynthesis" in window
  ) {
    lastSpoken = state.companion.message;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lastSpoken);
    speechSynthesis.speak(u);
  }
}
let lastVisualEvent = null;
function renderOverlay() {
  const react =
    lastVisualEvent !== null && lastVisualEvent !== state.companion.eventId;
  lastVisualEvent = state.companion.eventId;
  document.documentElement.classList.add("overlay-root");
  document.body.className = `overlay-body widget-${overlayType}`;
  cohostPlayer.update(cohostState(), serverOffset);
  const a = state.auction;
  $("#app").innerHTML =
    `<div class="overlay-canvas">${['pull','ribbon'].includes(overlayType)?pullWidget(state.pulls,overlayType,liveConnection):''}<button class="overlay-audio-toggle" id="overlay-audio-toggle">${state.companion.overlayVoice ? "Enable / test voice" : "Voice off"}</button>${["full", "vote"].includes(overlayType) && state.vote ? `<div class="overlay-vote">${votePanel(true)}</div>` : ""}${["full", "mochi"].includes(overlayType) && state.companion.enabled ? `<div class="overlay-mochi ${react ? "cohost-react" : ""}"><div class="overlay-bubble">${esc(state.companion.message)}</div>${mochi()}<div class="overlay-name">${esc(companionName())} / ${state.companion.provider === "codex" ? "AI cohost · may make mistakes" : "Software cohost"}</div></div>` : ""}${["full", "auction"].includes(overlayType) ? `<div class="overlay-auction">${a ? `<div class="overlay-thumb art-${a.product.art}">${visual(a.product)}</div><div class="overlay-info"><small>${state.mode === "demo" ? "DEMO" : esc(a.status.toUpperCase())} / AUTOLOOT</small><h2>${esc(a.product.title)}</h2><p>${a.highest ? "@" + esc(a.highest.username) : "!bid " + (a.product.price / 100).toFixed(2)}</p></div><div class="overlay-price"><strong>${usd(a.highest?.amount || a.product.price)}</strong><span data-clock>${clock(a)}</span></div>` : `<strong>AUTOLOOT / ${esc(state.show.title)}</strong><span>Next lot loading_</span>`}</div>` : ""}</div>`;
  $("#overlay-audio-toggle").hidden = !["full", "mochi"].includes(overlayType);
  $("#overlay-audio-toggle").onclick = () => {
    if (!state.companion.overlayVoice) {
      toast("Enable Overlay voice in Companion settings first.");
      return;
    }
    cohostPlayer.arm(true);
    cohostPlayer.speak(`${companionName()} is ready. Let’s run the drop!`);
  };
}
function reservationNotice(o) {
  const deadline = reservationDeadline(o);
  if (deadline != null) return `<p class="reservation-notice">${o.mode === "demo" ? "Practice reservation" : "Reserved"} until ${esc(new Date(deadline).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}))}. ${o.mode === "demo" ? "Simulate payment" : "Start checkout or have the seller confirm external payment"} within <strong data-reservation-clock="${deadline}">${reservationClock(deadline)}</strong>.</p>`;
  if (o.expiryReason === "reservation-timeout") return '<p class="reservation-notice">The reservation expired before checkout. Stock was released. Contact the seller or place a new order if the item is still available.</p>';
  if (o.status === "pending" && o.checkoutCreated != null && !o.checkoutId) return '<p class="reservation-notice">Checkout was requested; its outcome needs confirmation. Retry payment to recover the checkout. Your item remains reserved.</p>';
  if (o.status === "pending" && o.checkoutId) return '<p class="reservation-notice">Checkout started. Your item stays reserved until the payment provider confirms payment or expiry.</p>';
  return '';
}
function reservationClock(deadline) {
  if (!liveConnection) return "—";
  const seconds = Math.max(0, Math.ceil((deadline - Date.now() + serverOffset) / 1000));
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
 const nftOrder=isNftOrder(o),canPay=liveConnection&&(!nftOrder||o.recipientWallet);
 const demoControls=nftOrder ? '' : `<button class="btn small" data-buyer-shipping="${o.id}">${o.shipping?'Edit':'Add'} test address</button>`;
 return `<article class="viewer-order"><div class="order-heading"><strong>${esc(o.number)}</strong>${statusBadge(o.status)}</div><h3>${esc(o.product.title)}</h3>${nftOrderDetails(o)}${purchasePolicy(o)}${reservationNotice(o)}${o.status==='processing'?'<p>Payment is processing. Wait for provider confirmation.</p>':''}<div class="order-total"><span>Item ${usd(o.amount)}${nftOrder?' · NFT delivery; no shipping charge':` + shipping ${usd(o.shippingPrice||0)}`}</span><strong>${usd(o.total||o.amount)}</strong></div>${o.shipment?`<p>${o.shipment.test?"Practice label":"Shipping label"}: ${esc(o.shipment.status)}${o.shipment.trackingStatus?" · Carrier: "+esc(o.shipment.trackingStatus):""}. Label purchase is separate from dispatch.</p>`:""}${o.tracking?`<p>Tracking: ${esc(o.tracking)}</p>`:''}${o.status==='pending'?`<div class="row-actions">${o.mode==='demo'?`${demoControls}<button class="btn primary small" data-buyer-pay="${o.id}" ${canPay&&(nftOrder||o.shipping)?'':'disabled'}>Simulate payment</button>`:`<button class="btn primary small" data-checkout="${o.id}" ${canPay&&viewer.payments.configured?'':'disabled'}>${o.checkoutId?'Resume checkout ·':o.checkoutCreated!=null?'Recover checkout ·':'Pay'} ${usd(o.total||o.amount)} ↗</button>`}<button class="text-btn danger-text" data-buyer-cancel="${o.id}">Cancel</button></div>`:''}${['paid','shipped','test-paid','delivered','test-delivered'].includes(o.status)?`<a class="text-btn" href="/api/receipt?id=${o.id}" target="_blank" rel="noopener">Receipt ↗</a>`:''}</article>`;
}
function walletDialog(id) {
 const o=viewer.orders.find(o=>o.id===id);
 modal(`<h2>Confirm NFT destination</h2><p>Chain: ${esc(o.product.fulfillment.chain)}. Transfers may be irreversible. Enter a compatible wallet you intend to receive this NFT; this confirms your chosen destination, not ownership of that wallet.</p><form id="wallet-form" class="stack-form"><label>Destination wallet<input name="address" value="${esc(o.recipientWallet||'')}" autocomplete="off" spellcheck="false" required></label><label>Repeat destination<input name="repeat" autocomplete="off" spellcheck="false" required></label><label class="consent"><input name="confirmed" type="checkbox" required> I confirm this exact destination and understand that the provider handles any later physical redemption.</label><button class="btn primary">Confirm destination</button></form>`);
 $('#wallet-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form),button=form.querySelector('button');button.disabled=true;try{if(String(data.get('address')).trim()!==String(data.get('repeat')).trim())throw Error('The wallet addresses must match.');await api('/api/viewer/wallet',{id,address:data.get('address'),confirmed:data.has('confirmed')});$('#modal').close();viewer=await api('/api/viewer');renderShop();}catch(error){toast(error.message);button.disabled=false;}};
}
const dropEvents=new DropEvents();
function renderShop() {
  document.body.className = "shop-body";
  const a = state.auction;
  const dropEvent=dropEvents.observe(state,liveConnection);
  const consentChecked=$('#agree')?.checked||false;
  const detailsOpen=$('.drop-product-details')?.open||false;
  const bidFocused=document.activeElement?.hasAttribute('data-copy-bid');
  $("#app").innerHTML =
    `<header class="shop-header"><a class="brand" href="/shop">${brand()}</a><span class="shop-channel">${esc(state.show.title)}</span><span class="pill ${state.mode === "live" ? "green" : ""}">${state.mode}</span></header><main class="shop-main"><div class="drop-shop-heading"><div><span class="drop-eyebrow">${state.mode==='demo'?'Practice show · no money moves':'The live drop room'}</span><h1>${esc(state.show.title)}</h1><p>One drop. Your chat. The next great find.</p></div><a class="drop-room-pass" href="#shop-orders">Your orders <span>${viewer?.orders.length||0}</span> ↗</a></div><div class="shop-grid"><section class="panel shop-lot drop-stage" aria-label="Current drop">${dropHero({state,viewer,connected:liveConnection,now:Date.now()-serverOffset,esc,usd,visual,assetDescription,nextBid})}</section><div class="shop-account"><section class="panel settings-panel"><h2>${viewer?.user ? "@" + esc(viewer.user.login) : "Join the drop."}</h2>${viewer?.user ? `<p>${viewer.user.kind === "demo" ? "Demo buyer / simulated purchases only." : "Twitch account verified. Place bids in the stream chat."}</p><button class="text-btn" id="viewer-logout">Sign out</button>` : `<p>Sign in before bidding or buying.</p>${state.mode === "demo" ? '<button class="btn primary full" id="demo-login">Enter as demo buyer →</button>' : `<label class="consent"><input type="checkbox" id="agree"> Bids are offers to buy in USD. Physical shipping is ${usd(state.show.shippingPrice || 0)} per physical order; NFT delivery has no shipping charge here. Provider redemption fees may apply separately. Reservations expire after 15 minutes unless checkout has started or payment is confirmed. I agree to the listed price and condition and the <a href="/terms" target="_blank" rel="noopener">Terms</a>. I have read the seller policies and <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>.</label><button class="btn primary full" id="viewer-login" disabled ${!viewer?.configured ? 'data-unconfigured="true"' : ""}>Sign in with Twitch →</button>`}`}</section><section class="panel settings-panel viewer-orders" id="shop-orders"><h2>Your orders <span class="soft-count">${viewer?.orders.length || 0}</span></h2>${viewer?.orders.length ? viewer.orders.map(buyerOrder).join("") : "<p>No orders yet. If you win, your private order appears here. Complete payment from this page.</p>"}</section></div></div>${lineupMarkup(state,{esc,usd,visual})}${state.vote ? votePanel(true) : ""}<div class="page-heading shop-catalog-heading"><div><h2>Buy now</h2><p>Fixed price. No bidding.</p></div><span class="muted">${usd(state.show.shippingPrice || 0)} shipping / order</span></div><div class="store-grid">${
      state.products
        .filter((p) => p.listed && p.buyNowPrice)
        .map(
          (p) =>
            `<article class="panel store-card"><div class="inventory-image art-${p.art}">${visual(p, true)}</div><div class="inventory-card-body"><h3>${esc(p.title)}</h3><p>${esc(p.condition)} / ${p.quantity} available</p>${assetDescription(p)}<div class="store-price"><strong>${usd(p.buyNowPrice)}</strong><button class="btn primary" data-buy="${p.id}" ${!liveConnection || !viewer?.user || p.quantity < 1 || (a?.productId === p.id && ["live", "paused"].includes(a.status)) ? "disabled" : ""}>${p.quantity < 1 ? "Sold out" : "Buy now"} ${icon("arrow", 14)}</button></div></div></article>`,
        )
        .join("") || '<p class="empty-chat">No direct-purchase listings.</p>'
    }</div><p class="section-note">${state.mode === "demo" ? "Demo environment. Use fictional shipping details. No funds move." : "Bids use the server receive time. Follow this page’s timer; video can be delayed. Payment is confirmed by the server."}</p><details class="drop-seller-info" id="shop-policies"><summary>Seller details, shipping & policies ↗</summary>${sellerSummary()}</details></main>`;
  if($('#agree')){$('#agree').checked=consentChecked;$('#viewer-login').disabled=!consentChecked||!viewer?.configured;}
  if($('.drop-product-details'))$('.drop-product-details').open=detailsOpen;
  if(bidFocused)document.querySelector('[data-copy-bid]')?.focus({preventScroll:true});
  reactToDrop(dropEvent,state,liveConnection);
  document.querySelectorAll('[data-wallet]').forEach(button=>button.onclick=()=>walletDialog(button.dataset.wallet));
  document.querySelectorAll('[data-nft-demo]').forEach(button=>button.onclick=async()=>{try{await api('/api/viewer/demo-deliver',{id:button.dataset.nftDemo});viewer=await api('/api/viewer');renderShop();}catch(error){toast(error.message);}});
  document.querySelectorAll('[data-copy-bid]').forEach(button => button.onclick = async () => {
    try { await navigator.clipboard.writeText(button.dataset.copyBid); toast('Bid command copied. Paste it into Twitch chat. A copied command is not a bid.'); }
    catch { toast('Copy unavailable. Type the displayed command in Twitch chat.'); }
  });
  $("#agree")?.addEventListener(
    "change",
    (e) =>
      ($("#viewer-login").disabled = !e.target.checked || !viewer.configured),
  );
  $("#viewer-login")?.addEventListener(
    "click",
    () => (location.href = "/auth/twitch"),
  );
  $("#demo-login")?.addEventListener("click", async () => {
    try {
      await api("/api/viewer/demo-login", {});
      viewer = await api("/api/viewer");
      renderShop();
    } catch (e) {
      toast(e.message);
    }
  });
  $("#viewer-logout")?.addEventListener("click", async () => {
    await api("/api/viewer/logout", {});
    viewer = await api("/api/viewer");
    renderShop();
  });
  document.querySelectorAll("[data-buy]").forEach(
    (el) =>
      (el.onclick = () => {
        const p = state.products.find((p) => p.id === el.dataset.buy);
        const requestId = crypto.randomUUID();
        confirmAction(
          `Buy ${p.title}?`,
          `${usd(p.buyNowPrice)} + ${usd(p.fulfillment?.type==='nft'?0:state.show.shippingPrice || 0)} shipping. This reserves one unit for 15 minutes. Start checkout from Your orders before the deadline. Once checkout starts, the provider controls its payment window.`,
          async () => {
            await api("/api/viewer/buy", {
              productId: p.id,
              requestId,
            });
            viewer = await api("/api/viewer");
            renderShop();
            toast("Reserved. Complete checkout under Your orders.");
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
            viewer = await api("/api/viewer");
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
            viewer = await api("/api/viewer");
            renderShop();
          },
        )),
  );
}
function shippingDialog(id) {
  const o = viewer.orders.find((o) => o.id === id);
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
      )}<label>Country<select name="country">${viewer.payments.countries.map((c) => `<option ${o.shipping?.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><button class="btn primary">Save address</button></form>`,
  );
  $("#shipping-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/viewer/shipping", {
        id,
        shipping: Object.fromEntries(new FormData(e.target)),
      });
      $("#modal").close();
      viewer = await api("/api/viewer");
      renderShop();
    } catch (e) {
      toast(e.message);
    }
  };
}

function modal(content) {
  $("#modal").classList.remove("shipping-dialog");
  $("#modal").innerHTML =
    `<button class="modal-close icon-btn" aria-label="Close dialog">${icon("close")}</button>${content}`;
  $("#modal").showModal();
  openDialog($("#modal"));
  $(".modal-close").onclick = () => $("#modal").close();
}
function addProduct(editId, draft = null) {
  const draftId = draft ? state.proposal?.id : null;
  const existing = draft
    ? {
        ...draft,
        price: Number(draft.price) * 100,
        buyNowPrice: draft.buyNowPrice ? Number(draft.buyNowPrice) * 100 : null,
      }
    : state.products.find((p) => p.id === editId);
  modal(
    `<h2>${existing ? "Edit product" : "Add a new find"}</h2><p>A few details, and it’s ready for your show.</p><form id="product-form" class="stack-form"><label>SKU (optional)<input name="sku" maxlength="100" placeholder="Your unique inventory reference"></label><label>What are you selling?<input name="title" required maxlength="100" placeholder="e.g. Pokémon booster pack"></label><div class="form-row"><label>Starting price (USD)<input name="price" type="number" min="0.01" step="0.01" required value="10.00"></label><label>How many?<input name="quantity" type="number" min="1" max="10000" required value="1"></label></div><details class="form-details"><summary>Fulfillment type · physical or NFT</summary><label>Fulfillment<select name="fulfillmentType"><option value="physical">Physical shipment</option><option value="nft">NFT transfer</option></select></label><p>NFT orders end at verified digital transfer. The provider handles optional physical redemption. Standard ERC-721 and standard SPL NFTs are supported by the verifiers; compressed, Token-2022 and ERC-1155 assets are not supported.</p><label>Chain<select name="nftChain"><option value="eip155:8453">Base</option><option value="eip155:84532">Base Sepolia</option><option value="solana:mainnet">Solana mainnet</option><option value="solana:devnet">Solana devnet</option></select></label><label>Provider name<input name="nftProvider" maxlength="100" placeholder="Beezie, Phygitals, or your provider"></label><label>Source wallet<input name="nftSender" autocomplete="off" spellcheck="false"></label><label>ERC-721 contract (EVM)<input name="nftContract" autocomplete="off" spellcheck="false"></label><label>Token ID (EVM)<input name="nftTokenId" inputmode="numeric"></label><label>Mint address (Solana)<input name="nftMint" autocomplete="off" spellcheck="false"></label></details><label>Product photo <span class="field-help">Optional · PNG, JPEG or WebP · up to 3 MB</span><input type="file" name="photo" accept="image/png,image/jpeg,image/webp"></label><label>Anything buyers should know?<textarea name="description" rows="2" maxlength="1000" placeholder="Condition, what’s included, and any little details."></textarea></label><details class="form-details"><summary>Buy now & more details</summary><div class="form-detail-fields"><div class="form-row"><label>Buy-now price (USD)<input name="buyNowPrice" type="number" min="0.01" step="0.01" placeholder="Optional"></label><label class="consent"><input name="listed" type="checkbox"> Show in storefront</label></div><div class="form-row"><label>Category<input name="category" value="Pokémon / TCG" maxlength="60"></label><label>Condition<select name="condition"><option>New</option><option>Like new</option><option>Open box</option><option>Used</option></select></label></div><label>Placeholder illustration<select name="art"><option value="pack">Booster pack</option><option value="card">Single card</option><option value="sleeves">Card supplies</option><option value="box">Gift box</option><option value="keyboard">Keyboard</option><option value="console">Console</option><option value="headphones">Headphones</option><option value="mushroom">Mushroom</option></select></label></div></details><button class="btn primary full">${icon("plus", 16)} Add product</button></form>`,
  );
  if (existing) {
    $("#modal h2").textContent = "Edit product";
    for (const name of [
      "title",
      "description",
      "category",
      "quantity",
      "condition",
      "art",
      "buyNowPrice",
    ])
      $("#product-form").elements[name].value = existing[name];
    $("#product-form").elements.buyNowPrice.value = existing.buyNowPrice
      ? (existing.buyNowPrice / 100).toFixed(2)
      : "";
    $("#product-form").elements.listed.checked = Boolean(existing.listed);
    $("#product-form").elements.price.value = (existing.price / 100).toFixed(2);
    const asset=existing.fulfillment||{type:'physical'},form=$('#product-form');
    form.elements.fulfillmentType.value=asset.type;
    if(form.elements.sku)form.elements.sku.value=existing.sku || "";
    for(const [field,key] of [['nftChain','chain'],['nftSender','sender'],['nftContract','contract'],['nftTokenId','tokenId'],['nftMint','mint'],['nftProvider','provider']])if(asset[key]!=null)form.elements[field].value=asset[key];
    $("#product-form").elements.quantity.min = "0";
    $("#product-form button").textContent = "Save product";
  }
  $("#product-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      const f = new FormData(e.target);
      const values = Object.fromEntries(f);
      delete values.photo;
      values.fulfillment=values.fulfillmentType==='nft'?{type:'nft',chain:values.nftChain,sender:values.nftSender,contract:values.nftContract,tokenId:values.nftTokenId,mint:values.nftMint,provider:values.nftProvider}:{type:'physical'};
      for(const field of ['fulfillmentType','nftChain','nftSender','nftContract','nftTokenId','nftMint','nftProvider'])delete values[field];
      values.listed = f.has("listed");
      if (f.get("photo")?.size) {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "X-Autoloot-Admin": adminToken },
          body: f.get("photo"),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        values.image = result.image;
      }
      await api(
        draft
          ? "/api/companion/apply"
          : existing
            ? "/api/products/edit"
            : "/api/products",
        draft
          ? { id: draftId, draftProduct: values }
          : {
              ...values,
              ...(existing ? { id: existing.id } : {}),
            },
      );
      $("#modal").close();
      toast(existing ? "Product updated." : "Product added.");
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  };
}
function startDialog(id) {
  const p = state.products.find((p) => p.id === id);
  if (!p) return;
  modal(
    `<div class="start-preview art-${p.art}">${visual(p)}</div><h2>Ready to start?</h2><p>${esc(p.title)} starts at <strong>${usd(p.price)}</strong>.</p><form id="start-form" class="stack-form"><div class="auction-summary"><span>${state.show.bidDuration || 60} seconds</span><span>${usd(state.show.increment || 100)} bid steps</span></div><details class="form-details"><summary>Adjust auction settings</summary><div class="form-detail-fields"><div class="form-row"><label>Duration (seconds)<input name="duration" type="number" min="10" max="3600" value="${state.show.bidDuration || 60}" required></label><label>Bid increment (USD)<input name="increment" type="number" min="0.01" step="0.01" value="${((state.show.increment || 100) / 100).toFixed(2)}" required></label></div><label class="consent"><input name="antiSnipe" type="checkbox" ${state.show.antiSnipe !== false ? "checked" : ""}> Standard · late bids reset the clock to 10 seconds</label><p>Uncheck for 💀 Sudden death: bids never extend the deadline.</p></div></details><div class="notice">${state.mode === "demo" ? "Just a practice run. No real bids or payments." : "Viewers bid in Twitch chat. The winner can check out from their orders page."}</div><button class="btn primary full">${icon("play", 16)} Start auction</button></form>`,
  );
  $("#start-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/api/auction/start", {
        productId: id,
        duration: Number(f.get("duration")),
        increment: f.get("increment"),
        antiSnipe: f.has("antiSnipe"),
      });
      $("#modal").close();
      toast("Auction started.");
    } catch (e) {
      toast(e.message);
    }
  };
}
function confirmAction(title, description, callback) {
  modal(
    `<h2>${esc(title)}</h2><p>${esc(description)}</p><div class="dialog-actions"><button class="btn" id="never-mind">Back</button><button class="btn primary" id="confirm-action">Confirm ${icon("check", 15)}</button></div>`,
  );
  $("#never-mind").onclick = () => $("#modal").close();
  $("#confirm-action").onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await callback();
      $("#modal").close();
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  };
}
function importDialog(kind) {
  let csv='', preview=null, generation=0;
  modal(`<h2>${kind==='inventory'?'Import inventory':'Import shipment tracking'}</h2><p>${kind==='inventory'?'Import your products with USD prices and confirmed condition. SKU updates replace available stock. Products stay unlisted for review.':'Use Order or Order ID, Carrier and Tracking columns. Pirate Ship Order ID / Tracking Number headers are recognized; preserve Order ID as a passthrough when uploading there. Only mark orders actually shipped; demo payments remain labeled in exports.'}</p><p><a class="text-btn" href="/templates/${kind==='inventory'?'inventory':'tracking'}.csv" download>Download example CSV</a></p><form id="csv-form" class="stack-form"><label>CSV file · up to 200 KB / 500 rows<input id="csv-file" type="file" accept=".csv,text/csv" required></label>${kind==='inventory'?'<label>Existing SKUs<select id="csv-mode"><option value="create">Create only; reject existing SKUs</option><option value="update">Update matching SKUs; create new ones</option></select></label>':''}<div id="csv-mapping"></div><button class="btn" type="submit">Preview import</button><div id="csv-preview" aria-live="polite"></div><button id="csv-apply" type="button" class="btn primary" disabled>${kind==='inventory'?'Import inventory':'Confirm shipped and import'}</button><p id="csv-error" role="alert"></p></form>`);
  const form=$('#csv-form'), apply=$('#csv-apply'), error=$('#csv-error');
  const invalidate=()=>{generation++;preview=null;apply.disabled=true;$('#csv-preview').textContent='Preview again after changing your selection.';};
  $('#csv-file').onchange=()=>{csv='';$('#csv-mapping').replaceChildren();invalidate();};
  $('#csv-mode')?.addEventListener('change',invalidate);
  const input=()=>({kind,csv,mode:$('#csv-mode')?.value||'create',...($('#csv-mapping select')?{mapping:Object.fromEntries([...form.querySelectorAll('[data-csv-field]')].map(el=>[el.dataset.csvField,el.value]))}:{})});
  form.onsubmit=async e=>{
    e.preventDefault();const requestGeneration=++generation;apply.disabled=true;error.textContent='';
    try {
      const file=$('#csv-file').files[0];if(!file || file.size>200000)throw Error('Choose a CSV smaller than 200 KB.');
      const contents=await file.text();
      if(requestGeneration!==generation)return;
      csv=contents;
      const result=await api('/api/import/preview',input());
      if(requestGeneration!==generation)return;
      preview=result;
      $('#csv-mapping').innerHTML=`<details ${preview.valid?'':'open'}><summary>Column mapping · adjust fields</summary><div class="csv-mapping-grid">`+preview.fields.map(field=>`<label>${esc(field)}<select data-csv-field="${esc(field)}"><option value="">Ignore / not mapped</option>${preview.headers.map(h=>`<option value="${esc(h)}" ${preview.mapping[field]===h?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`).join('')+'</div></details>';
      form.querySelectorAll('[data-csv-field]').forEach(el=>el.onchange=invalidate);
      $('#csv-preview').innerHTML=`<p>${preview.rows.length} rows · ${preview.rows.filter(r=>r.error).length} errors. No rows saved yet.</p><div class="table-scroll csv-preview-table"><table><thead><tr><th>Row</th><th>Item / order</th><th>Result</th></tr></thead><tbody>${preview.rows.map(r=>`<tr><td>${r.row}</td><td>${esc(r.values.title||r.values.order)}</td><td>${esc(r.error||r.action)}</td></tr>`).join('')}</tbody></table></div>`;
      apply.disabled=!preview.valid;
    }catch(e){if(requestGeneration===generation){preview=null;error.textContent=e.message;}}
  };
  apply.onclick=async()=>{
    if(!preview)return;apply.disabled=true;error.textContent='';
    try{await api('/api/import/apply',{...input(),fingerprint:preview.fingerprint});$('#modal').close();toast('CSV import saved.');}
    catch(e){preview=null;error.textContent=e.message+' Preview again to retry.';}
  };
}
async function action(name) {
  try {
    if(name === 'shipping-settings') shippingSettingsDialog({state,api,modal,refresh:async()=>{state=await api('/api/state');render();}});
    else if (name === "operator-settings") operatorDialog();
    else if (name === "run-configure") runDialog();
    else if (name === "run-approve") await api('/api/run/approve',{runId:state.run.id,index:state.run.index});
    else if (name === "run-pause") await api('/api/run/pause', {});
    else if (name === "run-resume") await api('/api/run/resume', {});
    else if (name === "run-stop") confirmAction('Stop this run?', 'New run sales stop and its listings are unpublished. Any active auction stays paused. Existing orders still need payment, refund or fulfillment review.', () => api('/api/run/stop', {}));
    else if (name === "edit-draft") addProduct(null, state.proposal.draftProduct);
    else if (name === "audit-history") await auditHistoryDialog();
    else if (name === "companion-profile") companionProfileDialog();
    else if (name === "photo-draft") photoDialog();
    else if (name === "open-vote") voteDialog();
    else if (name === "close-vote") await api("/api/vote/close", {});
    else if (name === "void-bid")
      confirmAction(
        "Void the leading bid?",
        "The previous valid bid becomes the leader. Auction stays paused.",
        () => api("/api/auction/void", {}),
      );
    else if (["pause", "resume"].includes(name))
      await api("/api/auction/" + name, {});
    else if (name === "finish")
      confirmAction(
        "Close bidding now?",
        state.auction?.highest
          ? `${state.auction.highest.username} will win at ${usd(state.auction.highest.amount)}. We’ll create their order.`
          : "There aren’t any bids yet. The product will stay in stock.",
        () => api("/api/auction/finish", {}),
      );
    else if (name === "cancel")
      confirmAction(
        "Cancel this auction?",
        "No winner or order will be created. The product stays in stock.",
        () => api("/api/auction/cancel", {}),
      );

    else if (name === "add-product") addProduct();
    else if (name === "auction-settings")
      startDialog(state.auction?.productId || state.products[0]?.id);
    else if (name === "payment-help") modal(`<h2>Payments with Stripe</h2><p>${state.payments.configured?'Your checkout is connected in '+esc(state.payments.environment)+' mode.':'Connect Stripe once during installation to accept checkout payments.'}</p><p><a class="btn primary" href="/help#payments">Open payment setup ${icon('external',16)}</a></p><p class="field-help">Credentials stay on your server.</p>`);
    else if (name === "open-advanced") {
      const settings = $(".advanced-settings");
      settings.open = true;
      settings.scrollIntoView({ block: "start" });
      settings.querySelector("summary").focus();
    }
    else if (name === "overlay") window.open(overlayUrl, "_blank", "noopener");
    else if (name === "viewer") window.open(viewerUrl || "/shop", "_blank", "noopener");
    else if (name === "copy-viewer") {
      await navigator.clipboard.writeText(viewerUrl);
      toast("Storefront URL copied. Test it on a second device before sharing.");
    } else if (name === "copy-widget") {
      await navigator.clipboard.writeText(widgetUrl(overlayUrl, selectedWidget));
      toast("Widget URL copied. Use the preset dimensions in OBS.");
    } else if (name === "preview-widget") {
      const p = widgetPresets[selectedWidget];
      window.open(widgetUrl(overlayUrl, selectedWidget), "_blank", `noopener,width=${p.width},height=${p.height}`);
    }
    else if (name === "copy-overlay") {
      await navigator.clipboard.writeText(overlayUrl);
      toast("Overlay URL copied. Paste it into an OBS Browser Source.");
    } else if (name === "connect-twitch")
      location.href =
        "/auth/twitch?role=streamer&admin=" + encodeURIComponent(adminToken);
    else if (name === "disconnect-twitch")
      await api("/api/twitch/disconnect", {});
    else if (name === "import-inventory") importDialog("inventory");
    else if (name === "import-tracking") importDialog("tracking");
    else if (name === "export" || name === "export-fulfillment" || name === "export-pirateship") {
      const r = await fetch(name === "export-pirateship" ? "/api/pirateship.csv" : name === "export-fulfillment" ? "/api/fulfillment.csv" : "/api/orders.csv", {
        headers: { "X-Autoloot-Admin": adminToken },
      });
      if (!r.ok) {const error=await r.json();throw Error(error.error || "Export failed.");}
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name === "export-pirateship" ? "autoloot-pirateship.csv" : name === "export-fulfillment" ? "autoloot-fulfillment.csv" : "autoloot-orders.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (name === "apply-proposal")
      await api("/api/companion/apply", { id: state.proposal.id });
    else if (name === "dismiss-proposal")
      await api("/api/companion/dismiss", {});
    else if (name === "edit-show") {
      modal(
        `<h2>Show settings</h2><form id="show-form" class="stack-form"><label>Show title<input name="title" value="${esc(state.show.title)}" maxlength="100" required></label><div class="form-row"><label>Default timer (seconds)<input name="duration" type="number" min="10" max="3600" value="${state.show.bidDuration || 60}" required></label><label>Bid increment (USD)<input name="increment" type="number" min="0.01" step="0.01" value="${((state.show.increment || 100) / 100).toFixed(2)}" required></label></div><label>Shipping per order (USD)<input name="shippingPrice" type="number" min="0" step="0.01" value="${((state.show.shippingPrice || 0) / 100).toFixed(2)}" required></label><label class="consent"><input name="antiSnipe" type="checkbox" ${state.show.antiSnipe !== false ? "checked" : ""}> Standard auction · late bids reset to 10 seconds</label><p>Uncheck for 💀 Sudden death (fixed deadline).</p><button class="btn primary">Save settings</button></form>`,
      );
      $("#show-form").onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api("/api/show", {
            ...Object.fromEntries(new FormData(e.target)),
            antiSnipe: new FormData(e.target).has("antiSnipe"),
          });
          $("#modal").close();
        } catch (e) {
          toast(e.message);
        }
      };
    }
  } catch (e) {
    toast(e.message);
  }
}
async function ask(prompt) {
  try {
    await api("/api/companion/ask", { prompt });
  } catch (e) {
    toast(e.message);
  }
}
function wire() {
 document.querySelectorAll('[data-inventory-view]').forEach(button=>button.onclick=()=>{inventoryView=button.dataset.inventoryView;render();});

 wireAccounting({state,api,modal,toast,refresh:async(fetchState=false)=>{if(fetchState)state=await api('/api/state');render();}});
 $('#mobile-menu-toggle')?.addEventListener('click',()=>{mobileMenuOpen=!mobileMenuOpen;render();});
 $('#nav-backdrop')?.addEventListener('click',()=>{mobileMenuOpen=false;render();});
 $('.sidebar')?.addEventListener('keydown',event=>{if(event.key==='Escape'){mobileMenuOpen=false;render();$('#mobile-menu-toggle')?.focus();}});

  document.querySelectorAll('[data-shipping-order]').forEach(button=>button.onclick=()=>shippingOrderDialog({id:button.dataset.shippingOrder,getState:()=>state,api,modal,refresh:async()=>{state=await api('/api/state');render();}}));
 document.querySelectorAll('[data-automation]').forEach(button=>button.onclick=async()=>{try{await api('/api/automation',{mode:button.dataset.automation});state=await api('/api/state');render();toast('Automation style saved.');}catch(error){toast(error.message);}});

 document.querySelectorAll('[data-nft-authorize]').forEach(button=>button.onclick=()=>{
   modal(`<h2>Authorize NFT transfer</h2><p>This authorizes the exact purchased asset to the buyer-confirmed destination after payment.</p><form id="nft-authorize-form" class="stack-form"><label>Maximum network fee (native atomic units)<input name="maxFeeAtomic" value="0" pattern="[0-9]+" required></label><label class="consent"><input name="allowTransfer" type="checkbox"> Allow the configured wallet agent to submit this transfer automatically.</label><button class="btn primary">Authorize delivery</button></form>`);
   $('#nft-authorize-form').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/api/nft/authorize',{id:button.dataset.nftAuthorize,maxFeeAtomic:data.get('maxFeeAtomic'),allowTransfer:data.has('allowTransfer')});$('#modal').close();state=await api('/api/state');render();}catch(error){toast(error.message);}};
 });
 document.querySelectorAll('[data-nft-order]').forEach(button=>button.onclick=async()=>{try{await api('/api/nft/demo-deliver',{id:button.dataset.nftOrder});state=await api('/api/state');render();}catch(error){toast(error.message);}});
  $(".run-audit")?.addEventListener("toggle", event => { runAuditExpanded = event.currentTarget.open; });
  $("#widget-preset")?.addEventListener("change", e => { selectedWidget = e.target.value; try { localStorage.setItem("autoloot-widget", selectedWidget); } catch {} render(); });

  const more=$('.nav-more');
  if(more)more.addEventListener('keydown',e=>{if(e.key==='Escape'){more.open=false;more.querySelector('summary').focus();}});

  for(const [id,enabled] of [['load-demo',true],['remove-demo',false]]) $('#'+id)?.addEventListener('click',async e=>{e.target.disabled=true;try{await api('/api/workspace/demo',{enabled});state=await api('/api/state');render();toast(enabled?'Sample lots loaded. Practice mode on.':'Demo content removed.');}catch(error){toast(error.message);e.target.disabled=false;}});

  const closeMunny=()=>{mochiQuickOpen=false;render();$('#mochi-quick-toggle')?.focus();};
  $('#mochi-quick-toggle')?.addEventListener('click',()=>{mochiQuickOpen=true;mobileMenuOpen=false;render();$('#mochi-quick-close')?.focus();});
  $('#mochi-quick-close')?.addEventListener('click',closeMunny);
  $('#munny-backdrop')?.addEventListener('click',closeMunny);
  $('#mochi-quick-panel')?.addEventListener('keydown',event=>{
    if(event.key==='Escape') {event.preventDefault();event.stopPropagation();closeMunny();return;}
    if(event.key==='Tab') {
      const focusable=[...event.currentTarget.querySelectorAll('button:not(:disabled):not([tabindex="-1"]),a,input:not(:disabled),select,textarea,[tabindex="0"]')].filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  document.querySelectorAll('[data-munny-tab]').forEach(button=>{
    button.onclick=()=>{munnyPanelTab=button.dataset.munnyTab;render();$('#munny-tab-'+munnyPanelTab)?.focus();};
    button.onkeydown=event=>{
      const tabs=['chat','notifications','activity'],index=tabs.indexOf(munnyPanelTab);
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        event.preventDefault();munnyPanelTab=event.key==='Home'?tabs[0]:event.key==='End'?tabs[2]:tabs[(index+(event.key==='ArrowRight'?1:2))%3];render();$('#munny-tab-'+munnyPanelTab)?.focus();
      }
    };
  });
  $('#mochi-quick-form input')?.addEventListener('input',event=>{mochiQuickDraft=event.target.value;});
  $('#mochi-quick-form')?.addEventListener('submit',event=>{event.preventDefault();const prompt=new FormData(event.target).get('prompt');mochiQuickDraft='';ask(prompt);});

  wireCatalog({api,state,toast,refresh:async()=>{state=await api("/api/state");render();}});
  wireRip({api, token:adminToken, toast, state, refresh:async()=>{state=await api("/api/state");render();}});
  $("#demo-vote-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/vote/demo", Object.fromEntries(new FormData(e.target)));
    } catch (e) {
      toast(e.message);
    }
  });

  document.querySelectorAll("[data-move]").forEach(
    (el) =>
      (el.onclick = async () => {
        try {
          await api("/api/products/reorder", {
            id: el.dataset.move,
            direction: "up",
          });
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document.querySelectorAll("[data-bidder]").forEach(
    (el) =>
      (el.onclick = () =>
        confirmAction(
          el.dataset.blocked === "true" ? "Block bidder?" : "Unblock bidder?",
          "This controls bidding and direct purchases in this workspace.",
          () =>
            api("/api/bidder", {
              userId: el.dataset.bidder,
              blocked: el.dataset.blocked === "true",
            }),
        )),
  );
  document.querySelectorAll("[data-demo-buy]").forEach(
    (el) =>
      (el.onclick = async () => {
        try {
          await api("/api/demo/buy", {
            productId: el.dataset.demoBuy,
            requestId: crypto.randomUUID(),
            username: "testbuyer",
          });
          toast("Demo order created. Open Orders to continue.");
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document.querySelectorAll("[data-address]").forEach(
    (el) =>
      (el.onclick = () => {
        const o = state.orders.find((o) => o.id === el.dataset.address);
        modal(
          `<h2>${esc(o.number)} / ship to</h2><div class="address-lines">${[
            "name",
            "line1",
            "line2",
            "city",
            "state",
            "postal_code",
            "country",
          ]
            .map((k) => esc(o.shipping[k]))
            .filter(Boolean)
            .join("<br>")}</div>${o.email ? `<p>${esc(o.email)}</p>` : ""}`,
        );
      }),
  );

  document.querySelectorAll("[data-tab]").forEach(
    (el) =>
      (el.onclick = () => {
        if(el.dataset.tab==='catalog'){inventoryView='catalog';tab='inventory';}else tab=el.dataset.tab;
        mobileMenuOpen=false;mochiQuickOpen=false;
        render();
        window.scrollTo(0, 0);
        const heading=$('.workspace-main h1')||$('.workspace-main main');
        if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((el) => (el.onclick = () => action(el.dataset.action)));
  document
    .querySelectorAll("[data-start]")
    .forEach((el) => (el.onclick = () => startDialog(el.dataset.start)));
  document
    .querySelectorAll("[data-edit]")
    .forEach((el) => (el.onclick = () => addProduct(el.dataset.edit)));
  document
    .querySelectorAll("[data-remove]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          confirmAction(
            "Remove product?",
            "Existing orders keep their product details.",
            () => api("/api/products/remove", { id: el.dataset.remove }),
          )),
    );
  document.querySelectorAll("[data-setting]").forEach(
    (el) =>
      (el.onchange = async () => {
        try {
          await api("/api/companion/settings", {
            [el.dataset.setting]: el.checked,
          });
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document
    .querySelectorAll("[data-prompt]")
    .forEach((el) => (el.onclick = () => ask(el.dataset.prompt)));
  document.querySelectorAll("[data-filter]").forEach(
    (el) =>
      (el.onclick = () => {
        filter = el.dataset.filter;
        render();
      }),
  );
  $("#search")?.addEventListener("input", (e) => {
    search = e.target.value;
    const pos = e.target.selectionStart;
    render();
    $("#search").focus();
    $("#search").setSelectionRange(pos, pos);
  });
  $("#provider")?.addEventListener("change", async (e) => {
    try {
      await api("/api/companion/settings", { provider: e.target.value });
    } catch (e) {
      toast(e.message);
    }
  });
  $("#mode")?.addEventListener("change", async (e) => {
    try {
      await api("/api/mode", { mode: e.target.value });
    } catch (e) {
      toast(e.message);
      render();
    }
  });
  $("#companion-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(new FormData(e.target).get("prompt"));
  });
  $("#bid-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/demo/bid", Object.fromEntries(new FormData(e.target)));
      toast("Test bid accepted.");
    } catch (e) {
      toast(e.message);
    }
  });
  document.querySelectorAll("[data-order]").forEach(
    (el) =>
      (el.onclick = () => {
        const id = el.dataset.order,
          ac = el.dataset.orderAction;
        if(ac.startsWith('reconcile-')){
          const field=ac==='reconcile-checkout'?'sessionId':'refundId';
          modal(`<h2>Reconcile with Stripe</h2><p>Copy the matching ${field==='sessionId'?'Checkout session':'refund'} ID from Stripe. The server verifies the order and amount before changing its status.</p><form id="reconcile-form" class="stack-form"><label>Stripe ID<input name="reference" required></label><button class="btn primary">Verify and reconcile</button></form>`);
          $('#reconcile-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/payments/'+ac,{id,[field]:new FormData(event.target).get('reference')});$('#modal').close();}catch(error){toast(error.message);}};
        } else if (ac === "ship") {
          modal(
            `<h2>Mark shipped</h2><form id="tracking-form" class="stack-form"><label>Carrier and tracking reference<input name="tracking" required maxlength="150" placeholder="USPS · 9400…"></label><button class="btn primary">Mark shipped</button></form>`,
          );
          $("#tracking-form").onsubmit = async (e) => {
            e.preventDefault();
            try {
              await api("/api/order", {
                id,
                action: ac,
                tracking: new FormData(e.target).get("tracking"),
              });
              $("#modal").close();
            } catch (e) {
              toast(e.message);
            }
          };
        } else
          confirmAction(
            ac === "test-pay"
              ? "Simulate payment?"
              : ac === "refund"
                ? "Refund this order?"
                : ac === "cancel"
                  ? "Cancel this order?"
                  : "Confirm you received payment?",
            ac === "test-pay"
              ? "This updates a demo order. No money will be charged."
              : ac === "refund"
                ? "This requests a full refund. Stock is restored only after the provider confirms success. Demo refunds are simulated."
                : ac === "cancel"
                  ? "Any open checkout is expired before stock is released."
                  : "Only confirm after verifying the funds with your payment provider. Verify funds with the external payment provider.",
            () => api("/api/order", { id, action: ac }),
          );
      }),
  );
}
async function init() {
  try {
    if (isOverlay || isShop) {
      state = await api("/api/state");
      if (isShop) viewer = await api("/api/viewer");
    } else {
      const data = await api("/api/bootstrap");
      adminToken = data.admin;
      overlayUrl = data.overlayUrl;
      viewerUrl = data.viewerUrl;
      state = data.state;
    }
    render();
    function connectEvents() {
      let messageVersion = 0;
      const events = new EventSource(
        "/api/events" +
          (adminToken ? "?admin=" + encodeURIComponent(adminToken) : ""),
      );
      events.onmessage = async (e) => {
        const version = ++messageVersion;
        const focused = document.activeElement;
        const drawerFocus=focused?.closest?.('.munny-drawer') ? {id:focused.id,quickInput:focused.matches('#mochi-quick-form input'),start:focused.selectionStart,end:focused.selectionEnd} : null;
        const draft =
          focused?.tagName === "INPUT"
            ? { name: focused.name, value: focused.value }
            : null;
        try {
          const freshState = JSON.parse(e.data);
          const freshViewer = isShop ? await api("/api/viewer") : null;
          if (version !== messageVersion || events.readyState !== EventSource.OPEN) return;
          state = freshState;
          if (isShop) viewer = freshViewer;
          setLiveConnection(true);
        } catch {
          if (version === messageVersion) setLiveConnection(false);
          return;
        }
        render();
        if(drawerFocus&&mochiQuickOpen){
          const target=drawerFocus.quickInput?$('#mochi-quick-form input'):drawerFocus.id?document.getElementById(drawerFocus.id):null;
          target?.focus();
          if(drawerFocus.quickInput&&target)target.setSelectionRange(drawerFocus.start,drawerFocus.end);
        }
        if (draft?.name && !drawerFocus) {
          const input = document.querySelector(
            `input[name="${CSS.escape(draft.name)}"]`,
          );
          if (input) {
            input.value = draft.value;
            input.focus();
          }
        }
      };
      let recovering = false;
      events.onerror = async () => {
        messageVersion++;
        setLiveConnection(false);
        if (recovering) return;
        recovering = true;
        try {
          if (adminToken) {
            const fresh = await api("/api/bootstrap");
            if (fresh.admin !== adminToken) {
              events.close();
              adminToken = fresh.admin;
              overlayUrl = fresh.overlayUrl;
              viewerUrl = fresh.viewerUrl;
              state = fresh.state;
              render();
              connectEvents();
              return;
            }
          }
        } catch {}
        toast("Connection interrupted. Reconnecting…");
        recovering = false;
      };
    }
    connectEvents();
  } catch (e) {
    $("#app").innerHTML =
      `<div class="startup-error"><h1>Connection error.</h1><p>${esc(e.message)}</p><a class="btn" href="/">Try again</a></div>`;
  }
}
setInterval(() => {
  if(state&&isShop)updateDropClock(state,Date.now()-serverOffset,liveConnection);
  if (state && liveConnection) {
    document.querySelectorAll("[data-reservation-clock]").forEach(el => el.textContent = reservationClock(Number(el.dataset.reservationClock)));
    if (isOverlay) cohostPlayer.update(cohostState(), serverOffset);
    const v = state.vote;
    document
      .querySelectorAll("[data-vote-clock]")
      .forEach(
        (el) =>
          (el.textContent = v
            ? Math.max(
                0,
                Math.ceil((v.endsAt - Date.now() + serverOffset) / 1000),
              ) + "s"
            : ""),
      );
  }
  if (state?.auction && liveConnection)
    document.querySelectorAll("[data-clock]").forEach((el) => {
      el.textContent = clock(state.auction);
      el.classList.toggle(
        "urgent",
        state.auction.status === "live" &&
          state.auction.endsAt - Date.now() + serverOffset < 10000,
      );
    });
}, 200);
init();

// Dismiss secondary navigation without moving focus during ordinary clicks.
document.addEventListener('click',e=>{const more=document.querySelector('.nav-more[open]');if(more && !more.contains(e.target))more.open=false;});

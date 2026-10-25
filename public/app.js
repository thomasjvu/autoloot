import { icon } from "/icons.js";
import { enterSection, openDialog } from "/motion.js";
import { catalogPage, wireCatalog } from "/catalog.js";
import { ripPage, wireRip } from "/rip.js";
import { CohostPlayer } from "/showtime.js";
const cohostPlayer = new CohostPlayer();
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
function visual(p, large = false) {
  return p.image
    ? `<img class="product-photo" src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" decoding="async">`
    : productArt(p.art, large);
}
function mochi() {
  return '<img class="mochi mochi-vtuber" src="/characters/mochi-street-v3.png" alt="Mochi, your streetwear cat cohost" width="320" height="400" decoding="async">';
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
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function statusBadge(status) {
  return `<span class="pill ${["live", "sold", "shipped", "paid-external", "test-paid", "paid"].includes(status) ? "green" : ""}">${esc({ "test-paid": "Demo paid", "paid-external": "Payment confirmed", live: "Bidding open", unsold: "No bids", pending: "Awaiting payment", standby: "Ready" }[status] || status?.replaceAll("-", " ") || "Ready")}</span>`;
}
const active = () => ["live", "paused"].includes(state.auction?.status);
const brand = () => `<span class="brand-mark" aria-hidden="true"><img src="/icon-192.png" width="40" height="40" alt=""></span><span class="wordmark">autoloot</span>`;
function sidebar(){
 const primary=[['studio','Studio'],['inventory','Inventory'],['orders','Orders']];
 const secondary=[['rip','Rip studio'],['catalog','Catalog'],['audience','Bidders'],['companion','Companion'],['roadmap','Next up'],['connections','Settings']];
 const inMore=secondary.some(([id])=>id===tab);
 return `<aside class="sidebar"><a class="brand" href="/" aria-label="Autoloot home">${brand()}</a><nav aria-label="Main navigation">${primary.map(([id,label])=>`<button class="nav-item ${tab===id?'active':''}" data-tab="${id}" ${tab===id?'aria-current="page"':''}>${label}${id==='orders' && state.orders.some(o=>o.status==='pending')?`<span class="count">${state.orders.filter(o=>o.status==='pending').length}</span>`:''}</button>`).join('')}<details class="nav-more"><summary class="nav-item ${inMore?'active':''}">${inMore?secondary.find(([id])=>id===tab)[1]:'More'} <span aria-hidden="true">⌄</span></summary><div class="nav-more-menu">${secondary.map(([id,label])=>`<button data-tab="${id}" ${tab===id?'aria-current="page"':''}>${label}</button>`).join('')}</div></details></nav><button class="header-settings icon-btn" data-tab="connections" aria-label="Settings">${icon('settings',20)}</button></aside>`;
}
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
  return `<div class="stats-grid" aria-label="Show summary"><div class="stat"><span>Sales ${state.mode === "demo" ? "in demo" : ""}</span><strong>${usd(orders.reduce((n, o) => n + o.amount, 0))}</strong></div><div class="stat"><span>Items sold</span><strong>${orders.length}</strong></div><button class="stat stat-link" data-tab="orders"><span>Ready to ship</span><strong>${toShip} ${icon("arrow", 14)}</strong></button></div>`;
}
function auctionCard() {
  const a = state.auction,
    p = a?.product || state.products.find((p) => p.quantity > 0);
  return `<section class="panel auction-panel"><div class="panel-header"><h2>${active() ? "On the block" : "Ready for your next auction"}</h2>${statusBadge(a?.status || "ready")}</div>${p ? `<div class="auction-body"><div class="hero-product art-${p.art}">${visual(p, true)}<span class="condition-stamp">${esc(p.condition)}</span></div><div class="auction-info"><h3>${esc(p.title)}</h3><p class="description">${esc(p.description)}</p><div class="bid-price"><div><span>${a?.highest ? "Current bid" : "Starting price"}</span><strong>${usd(a?.highest?.amount || p.price)}</strong></div><div class="countdown-wrap"><span>${a?.status === "paused" ? "Paused" : "Time left"}</span><strong data-clock>${a ? clock(a) : String(Math.floor((state.show.bidDuration || 60) / 60)).padStart(2, "0") + ":" + String((state.show.bidDuration || 60) % 60).padStart(2, "0")}</strong></div></div><div class="bidder-line">${a?.highest ? `<span class="bidder-avatar">${esc(a.highest.username[0])}</span><strong>${esc(a.highest.username)}</strong> is leading · ${a.bidCount} ${a.bidCount === 1 ? "bid" : "bids"}` : a?.status === "paused" ? "Take your time. Bidding is paused." : "Your first bidder could be next."}</div><div class="auction-controls">${active() ? `<button class="btn primary" data-action="${a.status === "paused" ? "resume" : "pause"}">${icon(a.status === "paused" ? "play" : "pause", 16)} ${a.status === "paused" ? "Resume auction" : "Pause auction"}</button><button class="btn" data-action="finish">End auction ${icon("check", 16)}</button>` : `<button class="btn primary" data-start="${p.id}" ${state.products.find((i) => i.id === p.id)?.quantity < 1 ? "disabled" : ""}>${icon("play", 16)} Start auction</button><button class="btn" data-action="auction-settings" aria-label="Auction settings">${icon("settings", 17)} Settings</button>`}</div><div class="auction-footnote"><span>${icon("check", 13)} ${a?.antiSnipe === false ? "💀 Sudden death · fixed deadline" : "Standard · late bids reset to 10s"}</span>${active() ? '<button class="text-btn muted" data-action="cancel">Cancel auction</button>' : `<span>${usd(a?.increment || state.show.increment || 100)} bid steps</span>`}</div></div></div>` : '<div class="empty"><h3>Your first find goes here.</h3><p>Add a product and we’ll get it ready for the spotlight.</p><button class="btn primary" data-action="add-product">Add a product</button></div>'}</section>`;
}
function queue() {
  return `<section class="panel lineup-panel"><div class="panel-header"><h2>Up next <span class="soft-count">${state.products.length}</span></h2><button class="text-btn" data-tab="inventory">Manage products ${icon("arrow", 14)}</button></div><div class="queue-list">${state.products.map((p) => `<div class="queue-item ${active() && state.auction.productId === p.id ? "selected" : ""}"><div class="thumb art-${p.art}">${visual(p)}</div><div class="queue-text"><strong>${esc(p.title)}</strong><small>${p.quantity} available ${active() && state.auction.productId === p.id ? "· On the block" : ""}</small></div><strong class="queue-price">${usd(p.price)}</strong><button class="btn small" aria-label="Start auction for ${esc(p.title)}" data-start="${p.id}" ${active() || p.quantity < 1 ? "disabled" : ""}>Start ${icon("play", 12)}</button></div>`).join("")}</div><button class="add-lineup" data-action="add-product">${icon("plus", 17)} Add another product</button></section>`;
}
function companionCard(full = false) {
  const c = state.companion;
  return `<section class="panel companion-panel ${full ? "companion-full" : ""}"><div class="panel-header"><h2><span class="mini-mochi" aria-hidden="true"><img src="/characters/mochi-street-v3.png" alt=""></span> Mochi <span class="soft-count">${c.provider === "codex" ? "Codex" : "Demo"}</span></h2><label class="toggle"><input aria-label="Show companion" type="checkbox" data-setting="enabled" ${c.enabled ? "checked" : ""}><span></span></label></div>${full ? `<div class="companion-stage ${c.enabled ? "" : "disabled-companion"}">${mochi()}<span class="mochi-name">Mochi · your cohost</span></div>` : ""}<div class="companion-content"><div class="companion-status"><span class="status-dot ${state.companionBusy ? "thinking" : ""}"></span>${state.companionBusy ? "Processing…" : "Ready"}</div><p class="mochi-message">${esc(c.message)}</p>${
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
  }<div class="quick-prompts"><button data-prompt="Start the next auction">Next auction</button><button data-prompt="Recap orders">Order recap</button></div><form id="companion-form" class="ask-form"><input name="prompt" placeholder="Message Mochi…" aria-label="Message Mochi" maxlength="2000" required ${state.companionBusy ? "disabled" : ""}><button aria-label="Send to Mochi" ${state.companionBusy ? "disabled" : ""}>${icon("arrow", 17)}</button></form><small class="companion-foot">${c.provider === "demo" ? "Scripted demo / select Codex for AI" : "Local Codex / actions require Apply"}</small></div></section>`;
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
    ["paid", "test-paid", "paid-external", "shipped"].includes(o.status),
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
    `<h2>Photo → next drop.</h2><p>Mochi drafts the details. You review before anything is added.</p><form id="photo-draft-form" class="stack-form"><label>Product photo<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required></label><div class="form-row"><label>Opening price (USD)<input type="number" name="price" min="0.01" step="0.01" value="20.00" required></label><label>Quantity<input name="quantity" type="number" min="1" max="10000" value="1" required></label></div><label>Confirmed condition<select name="condition"><option>Used</option><option>New</option><option>Like new</option><option>Open box</option></select></label><label>Your notes<textarea name="notes" maxlength="1500" placeholder="What is it? Any defects or included accessories?"></textarea></label><p class="field-help">This photo and your notes are sent to your connected Codex provider. Use a product-only photo without private information. Price and condition stay exactly as you enter them.</p><button class="btn primary">Draft with Codex</button><p id="photo-error" role="alert"></p></form>`,
  );
  $("#photo-draft-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      button = e.target.querySelector("button");
    button.disabled = true;
    button.textContent = "Mochi is looking…";
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
function studio() {
  if(!state.products.length)return `${heading("Studio","")}<section class="panel welcome-panel"><div><span class="pill">Your workspace</span><h2>Add your first lot</h2><p>Browse the catalog or add an item manually.</p><div class="heading-actions"><button class="btn primary" data-tab="catalog">Browse Metadata</button><button class="btn" data-action="add-product">Add a lot</button><button class="text-btn" data-tab="connections">Set up your channel →</button></div></div>${mochi()}</section>`;
  return `${heading("Studio", "", `<div class="heading-actions"><button class="btn" data-action="viewer">${icon("bag", 16)} Storefront</button><button class="btn" data-action="overlay">${icon("external", 16)} Stream overlay</button></div>`)}<div class="show-bar"><span class="show-avatar">✳</span><div><strong>${esc(state.show.title)}</strong><small>${state.mode === "demo" ? "Practice mode · no real payments" : "Live auctions"}</small></div><button class="text-btn" data-action="edit-show">Edit show ${icon("settings", 14)}</button></div><div class="studio-grid"><div class="main-column">${auctionCard()}${stats()}${queue()}${votePanel()}${showRecap()}<details class="activity-details" id="show-activity"><summary>${icon("clock", 16)} Show activity <span>Bid history & event log</span></summary>${bidHistory()}${log()}<div class="reorder-tools"><p>Arrange your lineup</p>${state.products.map((p, i) => `<div><span>${esc(p.title)}</span><button class="text-btn" data-move="${p.id}" ${i === 0 ? "disabled" : ""}>Move up ↑</button></div>`).join("")}</div></details></div><div class="right-column">${companionCard()}${chatPanel()}<div class="studio-tip">${icon("check", 16)}<p>${state.mode === "demo" ? "You’re in demo mode. Try a bid, explore your orders, and make yourself at home." : "Your viewers bid in Twitch chat. Autoloot keeps the clock, stock and orders in sync."}</p></div></div></div>`;
}
function inventory() {
  const products = state.products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );
  return `${heading("Inventory", `${state.products.length} lots`, `<div class="heading-actions"><button class="btn" data-tab="catalog">Browse Metadata</button><button class="btn" data-action="photo-draft">Photo → listing ${icon("spark", 16)}</button><button class="btn primary" data-action="add-product">${icon("plus", 16)} Add product</button></div>`)}<div class="inventory-tools"><input id="search" value="${esc(search)}" placeholder="Find a product…" aria-label="Search inventory"><span class="muted">USD / ${state.products.reduce((n, p) => n + p.quantity, 0)} units</span></div><div class="inventory-grid">${products.map((p, i) => `<article class="panel inventory-card"><div class="inventory-image art-${p.art}"><span class="lot-stamp">${String(i + 1).padStart(3, "0")}</span>${visual(p, true)}<span class="condition-stamp">${esc(p.condition)}</span></div><div class="inventory-card-body"><div class="product-tags"><span>${esc(p.category)}</span><span>${p.quantity} units</span></div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="inventory-price"><div><small>Auction from</small><strong>${usd(p.price)}</strong></div><div><small>${p.listed ? "Buy now" : "Unlisted"}</small><strong>${p.buyNowPrice ? usd(p.buyNowPrice) : "—"}</strong></div></div><div class="inventory-actions"><button class="btn full" data-start="${p.id}" ${p.quantity < 1 || active() ? "disabled" : ""}>Auction ${icon("play", 14)}</button><button class="icon-btn" aria-label="Edit ${esc(p.title)}" data-edit="${p.id}">${icon("settings", 16)}</button><button class="icon-btn" aria-label="Remove ${esc(p.title)}" data-remove="${p.id}">${icon("trash", 16)}</button></div>${p.listed && p.buyNowPrice && state.mode === "demo" ? `<button class="text-btn" data-demo-buy="${p.id}" ${p.quantity < 1 ? "disabled" : ""}>Test direct purchase ↗</button>` : ""}</div></article>`).join("") || '<p class="empty">No matching products.</p>'}</div>`;
}
function orderActions(o) {
  if (o.status === "pending")
    return `<div class="row-actions">${o.mode === "demo" ? `<button class="btn small" data-order="${o.id}" data-order-action="test-pay">Test payment</button>` : !state.payments.configured && !o.checkoutId ? `<button class="btn small" data-order="${o.id}" data-order-action="confirm-paid">Confirm external payment</button>` : '<span class="muted">Awaiting checkout</span>'}<button class="text-btn danger-text" data-order="${o.id}" data-order-action="cancel">Cancel</button></div>`;
  if (["paid", "test-paid", "paid-external"].includes(o.status))
    return `<div class="row-actions"><button class="btn small" data-order="${o.id}" data-order-action="ship">Ship ${icon("arrow", 13)}</button>${o.status !== "paid-external" ? `<button class="text-btn danger-text" data-order="${o.id}" data-order-action="refund">${o.refundId ? "Check refund" : "Refund"}</button>` : ""}</div>`;
  return o.status === "shipped"
    ? `<span class="tracking">${esc(o.tracking)}</span>`
    : "—";
}
function orders() {
  const list = state.orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "pending"
        ? ["pending", "processing"].includes(o.status)
        : filter === "shipped"
          ? o.status === "shipped"
          : ["paid", "paid-external", "test-paid"].includes(o.status)),
  );
  return `${heading("Your orders", "Every find, on its way to someone new.", `<button class="btn" data-action="export">Export CSV ${icon("download", 15)}</button>`)}<div class="filter-tabs">${[
    ["all", "All"],
    ["pending", "Unpaid"],
    ["paid", "To ship"],
    ["shipped", "Shipped"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${filter === k ? "active" : ""}" data-filter="${k}">${l}</button>`,
    )
    .join(
      "",
    )}</div><section class="panel orders-panel"><div class="table-scroll"><table><thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>${list.map((o) => `<tr><td><small>${esc(o.number)} / ${esc(o.kind || "auction")} / ${o.mode}</small><strong>${esc(o.product.title)}</strong>${o.shipping ? `<button class="text-btn" data-address="${o.id}">Shipping details ↗</button>` : ""}</td><td>@${esc(o.buyer)}</td><td><strong>${usd(o.total || o.amount)}</strong><small>+${usd(o.shippingPrice || 0)} shipping</small></td><td>${statusBadge(o.status)}${o.refundStatus && o.refundStatus !== "succeeded" ? `<small>Refund ${esc(o.refundStatus)}</small>` : ""}</td><td>${orderActions(o)}</td></tr>`).join("")}</tbody></table></div>${!list.length ? '<div class="empty"><h3>No orders.</h3><p>Sold lots and direct purchases appear here.</p></div>' : ""}</section><p class="section-note">${state.payments.configured ? `Stripe / ${state.payments.environment} environment. Payment is confirmed by signed webhooks.` : "Checkout is not configured. Live payments must be confirmed externally."} Demo payments are simulated.</p>`;
}
function audience() {
  return `${heading("Bidders", "Registered Twitch accounts")}<section class="panel bidders-panel"><div class="table-scroll"><table><thead><tr><th>Account</th><th>Registered</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.registrations.map((r) => `<tr><td>@${esc(r.username)}</td><td>${new Date(r.at).toLocaleDateString()}</td><td>${statusBadge(r.blocked ? "blocked" : "active")}</td><td><button class="btn small" data-bidder="${esc(r.userId)}" data-blocked="${!r.blocked}">${r.blocked ? "Unblock" : "Block"}</button></td></tr>`).join("")}</tbody></table></div>${!state.registrations.length ? '<div class="empty">No registered bidders. Share your storefront to get started.</div>' : ""}</section>`;
}
function companionPage() {
  return `${heading("Meet Mochi", "Your cohost")}<div class="companion-layout">${companionCard(true)}<div class="main-column"><section class="panel settings-panel"><h2>On-stream cohost</h2><div class="setting-row"><div><strong>Overlay voice</strong><small>Speak new auction events in the OBS Browser Source.</small></div><label class="toggle"><input type="checkbox" aria-label="Overlay voice" data-setting="overlayVoice" ${state.companion.overlayVoice ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><strong>Reduced motion</strong><small>Keep the avatar still.</small></div><label class="toggle"><input type="checkbox" aria-label="Reduced companion motion" data-setting="reducedMotion" ${state.companion.reducedMotion ? "checked" : ""}><span></span></label></div><p class="field-help">OBS browser speech depends on its installed voices and audio settings. Preview the overlay, enable audio there if required, and select “Control audio via OBS.”</p><h2>Runtime</h2><label class="field-label" for="provider">Provider</label><select id="provider"><option value="demo" ${state.companion.provider === "demo" ? "selected" : ""}>Demo / scripted replies</option><option value="codex" ${state.companion.provider === "codex" ? "selected" : ""}>Codex / local CLI login</option></select><p>Run <code>codex login</code> in your terminal, then select Codex. The companion uses that account’s plan or API allowance.</p><div class="setting-row"><div><strong>OBS avatar</strong><small>Show Mochi in the stream overlay.</small></div><label class="toggle"><input type="checkbox" aria-label="On-stream companion" data-setting="enabled" ${state.companion.enabled ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><strong>Voice</strong><small>Read replies in this browser.</small></div><label class="toggle"><input type="checkbox" aria-label="Browser voice" data-setting="voice" ${state.companion.voice ? "checked" : ""}><span></span></label></div></section><section class="panel settings-panel"><h2>Available commands</h2><div class="command-row"><code>find Pikachu in the catalog</code><span>Search Metadata, then ask Mochi to choose a result. Review it in Catalog before adding.</span></div><div class="command-row"><code>draft a listing</code><span>Prepare a product from your details.</span></div><div class="command-row"><code>next lot</code><span>Propose the next auction.</span></div><div class="command-row"><code>pause / resume</code><span>Control the current auction.</span></div><div class="command-row"><code>recap orders</code><span>Check sales and unpaid orders.</span></div><p class="section-note">Action proposals need your Apply click. Bids, prices, winners and payment states stay controlled by the server.</p></section></div></div>`;
}
function roadmap() {
  const cards = [
    ["Demo ready", "Standard auctions", "Late bids reset the remaining clock to 10 seconds. The server decides bid order and the winner.", "mint"],
    ["Demo ready", "💀 Sudden death", "A fixed deadline. Bids never extend the clock. Select sudden death when starting an auction.", "yellow"],
    ["Demo ready", "Buy now", "Fixed-price lots, private buyer orders and checkout. Practice mode simulates payment.", "mint"],
    ["Prototype", "Rip companion", "Share a camera or screen, scan a Pokémon reveal, review the Metadata match and let Mochi announce the confirmed pull. Metadata access and real-card validation are still needed.", "pink"],
    ["Coming soon", "Private max bids", "Set a private ceiling. Autoloot would bid only the next required increment, with clear tie rules and a full bid audit trail.", "purple"],
    ["Coming soon", "Pre-bids", "Explore upcoming lots and bid before the show. A scheduled lot would carry eligible bids into its live auction.", "yellow"],
    ["Coming soon", "Giveaways", "Free entry, clear eligibility, one entry per verified viewer, and a recorded random draw. No purchase required.", "pink"],
    ["Coming soon", "Offers + flash sales", "Send an offer on a buy-now lot or catch a timed fixed-price drop. Stock stays reserved through checkout.", "purple"],
    ["Coming soon", "Hands-free rip hosting", "Continuous reveal tracking, explicit duplicate-card handling, richer reactions and a durable collection history, after recognition is validated.", "mint"],
  ];
  return `${heading("Next up", "")}<section class="panel roadmap-focus"><h2>The hackathon cut</h2><p>Chat picks a TCG lot → streamer opens bidding → viewers bid → winner checks out. Then show a card reveal, review the match, and let Mochi host the pull.</p><div class="heading-actions"><button class="btn primary" data-tab="studio">Open studio</button><button class="btn" data-tab="rip">Rip a pack</button></div><p>Coming-soon cards describe the plan. They do not accept bids, budgets, entries or purchases.</p></section><div class="roadmap-grid">${cards.map(([status,title,body,color],i)=>`<article class="panel roadmap-card roadmap-${color}"><img class="roadmap-hero" src="/art/next-${i+1}.webp" alt="" loading="lazy"><span class="pill">${status}</span><h2>${title}</h2><p>${body}</p></article>`).join("")}</div>`;
}
function advancedConnections() {
  return `${heading("Advanced settings", "")}<div class="connections-grid"><section class="panel settings-panel"><div class="integration-heading"><h2>Twitch</h2>${statusBadge(state.twitch.connected ? "connected" : "offline")}</div><p>Read bids and announce results as the broadcaster.</p>${state.twitch.error ? `<p class="error-box">${esc(state.twitch.error)}</p>` : ""}<div class="connection-details"><div><span>Channel</span><strong>${state.twitch.channel ? "@" + esc(state.twitch.channel) : "—"}</strong></div><div><span>App credentials</span><strong>${state.twitch.configured ? "Configured" : "Missing"}</strong></div></div><button class="btn primary" data-action="connect-twitch">${state.twitch.connected ? "Reconnect" : "Connect"} Twitch ${icon("arrow", 15)}</button>${state.twitch.connected ? '<button class="text-btn" data-action="disconnect-twitch">Disconnect</button>' : ""}<p><a class="btn" href="/twitch-setup.html">Configure Twitch app</a></p><details><summary>Environment setup (optional)</summary><p>Copy <code>.env.example</code> to <code>.env</code>. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET. Register <code>http://localhost:4173/auth/twitch/callback</code> as the redirect, then restart.</p><p>For remote viewers, configure an HTTPS PUBLIC_URL tunnel and register its callback too. Keep the dashboard on localhost.</p></details></section><section class="panel settings-panel"><div class="integration-heading"><h2>Stripe</h2>${statusBadge(state.payments.configured ? state.payments.environment + " ready" : "not configured")}</div><p>Hosted checkout, shipping collection, verified payment events and full refunds before shipping.</p><div class="connection-details"><div><span>Environment</span><strong>${state.payments.environment}</strong></div><div><span>Ships to</span><strong>${state.payments.countries.join(" / ")}</strong></div></div><details open><summary>Setup</summary><p>Set <code>STRIPE_API_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> in .env. Prefer a restricted key with Checkout, Payment Intents and Refunds permissions.</p><p>Forward events to <code>/api/stripe/webhook</code>. Configure <code>SHIPPING_COUNTRIES</code> for your destinations. Automatic tax is not enabled.</p></details></section><section class="panel settings-panel"><div class="integration-heading"><h2>Codex</h2><span class="pill">${state.companion.provider}</span></div><p>Local CLI authentication. No ChatGPT credentials are collected by Autoloot.</p><div class="code-snippet">npm install -g @openai/codex<br>codex login</div><button class="btn" data-tab="companion">Configure companion ${icon("arrow", 15)}</button></section><section class="panel settings-panel"><h2>Output</h2><div class="output-row"><div><strong>OBS overlay</strong><p>Transparent / 1280 × 720</p></div><button class="btn small" data-action="copy-overlay">Copy URL</button><button class="icon-btn" aria-label="Open OBS overlay" data-action="overlay">${icon("external", 15)}</button></div><div class="output-row"><div><strong>Storefront</strong><p>Registration / buy now / orders</p></div><button class="btn small" data-action="viewer">Open ${icon("external", 14)}</button></div></section></div><section class="panel settings-panel mode-settings"><div><h2>Show mode</h2><p>Demo is a rehearsal. Live mode accepts registered Twitch buyers.</p></div><select id="mode" aria-label="Show mode"><option value="demo" ${state.mode === "demo" ? "selected" : ""}>Demo</option><option value="live" ${state.mode === "live" ? "selected" : ""}>Live / Twitch</option></select></section>`;
}
function connections(){
 const t=state.twitch;
 return `${heading("Settings","")}<div class="setup-steps"><section class="panel settings-panel"><span class="setup-number">01</span><h2>Connect your channel</h2><p>${t.connected?'Connected as @'+esc(t.channel):'Link Twitch to read bids and announce your winners.'}</p><a class="btn primary" href="/twitch-setup.html">${t.configured?'Manage Twitch app':'Set up Twitch'}</a>${t.configured?'<button class="btn" data-action="connect-twitch">Authorize channel</button>':''}</section><section class="panel settings-panel"><span class="setup-number">02</span><h2>Add your first lot</h2><p>Choose a card from Metadata or add an item you own. You set the price and condition.</p><button class="btn primary" data-tab="catalog">Browse cards</button><button class="btn" data-action="add-product">Add manually</button></section><section class="panel settings-panel"><span class="setup-number">03</span><h2>Meet your cohost</h2><p>Mochi can help run your show. Choose Codex for AI, or keep simple local replies.</p><button class="btn" data-tab="companion">Set up Mochi</button></section></div><section class="panel settings-panel demo-controls"><div><h2>Try a practice show</h2><p>Load sample card lots, or remove sample lots and simulated activity. Your own inventory, real orders and connections stay in place.</p></div><div class="heading-actions"><button class="btn" id="load-demo">Load sample lots</button><button class="btn" id="remove-demo">Remove demo content</button></div></section><details class="advanced-settings"><summary>Payments, output & advanced settings</summary>${advancedConnections()}</details>`;
}
function clock(a) {
  const n =
    a.status === "paused"
      ? a.remaining
      : a.status === "live"
        ? Math.max(0, a.endsAt - Date.now() + serverOffset)
        : 0;
  const seconds = Math.ceil(n / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
let mochiQuickOpen=false, mochiQuickDraft='';
function mochiQuick(){
 return `<div class="mochi-quick">${mochiQuickOpen?`<section id="mochi-quick-panel" class="mochi-quick-panel" aria-label="Quick chat with Mochi"><div class="mochi-quick-heading"><strong>Mochi / your cohost</strong><button class="icon-btn" id="mochi-quick-close" aria-label="Close Mochi chat">${icon('close',18)}</button></div>${companionCard().replace('id="companion-form"','id="mochi-quick-form"').replace('name="prompt" placeholder=','name="prompt" value="'+esc(mochiQuickDraft)+'" placeholder=')}</section>`:''}<button id="mochi-quick-toggle" class="mochi-quick-toggle" aria-label="${mochiQuickOpen?'Close':'Talk to'} Mochi" aria-expanded="${mochiQuickOpen}" ${mochiQuickOpen?'aria-controls="mochi-quick-panel"':''}><span class="mochi-quick-face"><img src="/characters/mochi-street-v3.png" alt="" draggable="false"></span><span class="mochi-quick-dot" aria-hidden="true"></span></button></div>`;
}
function render() {
  if (!state) return;
  serverOffset = Date.now() - state.serverTime;
  if (isOverlay) return renderOverlay();
  if (isShop) return renderShop();
  const activityExpanded = $("#show-activity")?.open || false;
  $("#app").innerHTML =
    `${sidebar()}<div class="workspace-main">${header()}<main>${{ studio, inventory, orders, audience, companion: companionPage, connections, rip: () => ripPage(state), catalog: () => catalogPage(state), roadmap }[tab]()}</main></div><footer class="app-footer"><span>© ${new Date().getFullYear()} Autoloot. All rights reserved.</span><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/help">Help</a></nav></footer>${mochiQuick()}`;
  if ($("#show-activity")) $("#show-activity").open = activityExpanded;
  wire();
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
  cohostPlayer.update(state, serverOffset);
  document.body.className = "overlay-body";
  const a = state.auction;
  $("#app").innerHTML =
    `<div class="overlay-canvas"><button class="overlay-audio-toggle" id="overlay-audio-toggle">${state.companion.overlayVoice ? "Enable / test voice" : "Voice off"}</button>${state.vote ? `<div class="overlay-vote">${votePanel(true)}</div>` : ""}${state.companion.enabled ? `<div class="overlay-mochi ${react ? "cohost-react" : ""}"><div class="overlay-bubble">${esc(state.companion.message)}</div>${mochi()}<div class="overlay-name">Mochi / Autoloot</div></div>` : ""}<div class="overlay-auction">${a ? `<div class="overlay-thumb art-${a.product.art}">${visual(a.product)}</div><div class="overlay-info"><small>${state.mode === "demo" ? "DEMO" : esc(a.status.toUpperCase())} / AUTOLOOT</small><h2>${esc(a.product.title)}</h2><p>${a.highest ? "@" + esc(a.highest.username) : "!bid " + (a.product.price / 100).toFixed(2)}</p></div><div class="overlay-price"><strong>${usd(a.highest?.amount || a.product.price)}</strong><span data-clock>${clock(a)}</span></div>` : `<strong>AUTOLOOT / ${esc(state.show.title)}</strong><span>Next lot loading_</span>`}</div></div>`;
  $("#overlay-audio-toggle").onclick = () => {
    if (!state.companion.overlayVoice) {
      toast("Enable Overlay voice in Companion settings first.");
      return;
    }
    cohostPlayer.arm(true);
    cohostPlayer.speak("Mochi is ready. Let’s run the drop!");
  };
}
function buyerOrder(o) {
  return `<article class="viewer-order"><div class="order-heading"><strong>${esc(o.number)}</strong>${statusBadge(o.status)}</div><h3>${esc(o.product.title)}</h3><div class="order-total"><span>Item ${usd(o.amount)} + shipping ${usd(o.shippingPrice || 0)}</span><strong>${usd(o.total || o.amount)}</strong></div>${o.shipping ? `<p>${esc(o.shipping.name)} / ${esc(o.shipping.city)} / ${esc(o.shipping.country)}</p>` : ""}${o.tracking ? `<p>Tracking: ${esc(o.tracking)}</p>` : ""}${o.status === "pending" ? `<div class="row-actions">${o.mode === "demo" ? `<button class="btn small" data-buyer-shipping="${o.id}">${o.shipping ? "Edit" : "Add"} test address</button><button class="btn primary small" data-buyer-pay="${o.id}" ${o.shipping ? "" : "disabled"}>Simulate payment</button>` : `<button class="btn primary small" data-checkout="${o.id}" ${viewer.payments.configured ? "" : "disabled"}>Pay ${usd(o.total || o.amount)} ${icon("external", 13)}</button>`}<button class="text-btn danger-text" data-buyer-cancel="${o.id}">Cancel</button></div>` : ""}${o.status === "paid" || o.status === "shipped" || o.status === "test-paid" ? `<a class="text-btn" href="/api/receipt?id=${o.id}" target="_blank" rel="noopener">Receipt ↗</a>` : ""}</article>`;
}
function renderShop() {
  document.body.className = "shop-body";
  const a = state.auction;
  $("#app").innerHTML =
    `<header class="shop-header"><a class="brand" href="/shop">${brand()}</a><span class="shop-channel">${esc(state.show.title)}</span><span class="pill ${state.mode === "live" ? "green" : ""}">${state.mode}</span></header><main class="shop-main"><div class="page-heading"><div><h1>Find your next favorite.</h1><p>Watch together. Find something you love.</p></div></div><div class="shop-grid"><section class="panel shop-lot">${a ? `<div class="shop-art art-${a.product.art}"><span class="lot-stamp">${a.status.toUpperCase()}</span>${visual(a.product, true)}</div><div class="settings-panel"><h2>${esc(a.product.title)}</h2><p>${esc(a.product.description)}</p><div class="bid-price"><div><span>${a.highest ? "High bid" : "Opening bid"}</span><strong>${usd(a.highest?.amount || a.product.price)}</strong></div><div class="countdown-wrap"><span>${a.antiSnipe === false ? "💀 Sudden death" : "Standard auction"}</span><strong data-clock>${clock(a)}</strong></div></div><div class="bid-command">Bid in Twitch chat <code>!bid ${((a.highest ? a.highest.amount + a.increment : a.product.price) / 100).toFixed(2)}</code></div></div>` : '<div class="empty"><h2>Next lot loading_</h2><p>The auction will appear here when it opens.</p></div>'}</section><div class="shop-account"><section class="panel settings-panel"><h2>${viewer?.user ? "@" + esc(viewer.user.login) : "Join the drop."}</h2>${viewer?.user ? `<p>${viewer.user.kind === "demo" ? "Demo buyer / simulated purchases only." : "Twitch account verified. Place bids in the stream chat."}</p><button class="text-btn" id="viewer-logout">Sign out</button>` : `<p>Sign in before bidding or buying.</p>${state.mode === "demo" ? '<button class="btn primary full" id="demo-login">Enter as demo buyer →</button>' : `<label class="consent"><input type="checkbox" id="agree"> Bids are offers to buy in USD. Shipping is ${usd(state.show.shippingPrice || 0)} per order. I agree to the listed price and condition.</label><button class="btn primary full" id="viewer-login" disabled ${!viewer?.configured ? 'data-unconfigured="true"' : ""}>Sign in with Twitch →</button>`}`}</section><section class="panel settings-panel viewer-orders"><h2>Your orders <span class="soft-count">${viewer?.orders.length || 0}</span></h2>${viewer?.orders.length ? viewer.orders.map(buyerOrder).join("") : "<p>No orders yet.</p>"}</section></div></div>${state.vote ? votePanel(true) : ""}<div class="page-heading shop-catalog-heading"><div><h2>Buy now</h2><p>Fixed price. No bidding.</p></div><span class="muted">${usd(state.show.shippingPrice || 0)} shipping / order</span></div><div class="store-grid">${
      state.products
        .filter((p) => p.listed && p.buyNowPrice)
        .map(
          (p) =>
            `<article class="panel store-card"><div class="inventory-image art-${p.art}">${visual(p, true)}</div><div class="inventory-card-body"><h3>${esc(p.title)}</h3><p>${esc(p.condition)} / ${p.quantity} available</p><div class="store-price"><strong>${usd(p.buyNowPrice)}</strong><button class="btn primary" data-buy="${p.id}" ${!viewer?.user || p.quantity < 1 || (a?.productId === p.id && ["live", "paused"].includes(a.status)) ? "disabled" : ""}>${p.quantity < 1 ? "Sold out" : "Buy now"} ${icon("arrow", 14)}</button></div></div></article>`,
        )
        .join("") || '<p class="empty-chat">No direct-purchase listings.</p>'
    }</div><p class="section-note">${state.mode === "demo" ? "Demo environment. Use fictional shipping details. No funds move." : "Bids use the server receive time. Follow this page’s timer; video can be delayed. Payment is confirmed by the server."}</p></main>`;
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
          `${usd(p.buyNowPrice)} + ${usd(state.show.shippingPrice || 0)} shipping. This reserves one unit; complete payment in your orders.`,
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
    `<h2>${existing ? "Edit product" : "Add a new find"}</h2><p>A few details, and it’s ready for your show.</p><form id="product-form" class="stack-form"><label>What are you selling?<input name="title" required maxlength="100" placeholder="e.g. Pokémon booster pack"></label><div class="form-row"><label>Starting price (USD)<input name="price" type="number" min="0.01" step="0.01" required value="10.00"></label><label>How many?<input name="quantity" type="number" min="1" max="10000" required value="1"></label></div><label>Product photo <span class="field-help">Optional · PNG, JPEG or WebP · up to 3 MB</span><input type="file" name="photo" accept="image/png,image/jpeg,image/webp"></label><label>Anything buyers should know?<textarea name="description" rows="2" maxlength="1000" placeholder="Condition, what’s included, and any little details."></textarea></label><details class="form-details"><summary>Buy now & more details</summary><div class="form-detail-fields"><div class="form-row"><label>Buy-now price (USD)<input name="buyNowPrice" type="number" min="0.01" step="0.01" placeholder="Optional"></label><label class="consent"><input name="listed" type="checkbox"> Show in storefront</label></div><div class="form-row"><label>Category<input name="category" value="Pokémon / TCG" maxlength="60"></label><label>Condition<select name="condition"><option>New</option><option>Like new</option><option>Open box</option><option>Used</option></select></label></div><label>Placeholder illustration<select name="art"><option value="pack">Booster pack</option><option value="card">Single card</option><option value="sleeves">Card supplies</option><option value="box">Gift box</option><option value="keyboard">Keyboard</option><option value="console">Console</option><option value="headphones">Headphones</option><option value="mushroom">Mushroom</option></select></label></div></details><button class="btn primary full">${icon("plus", 16)} Add product</button></form>`,
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
async function action(name) {
  try {
    if (name === "edit-draft") addProduct(null, state.proposal.draftProduct);
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
    else if (name === "overlay") window.open(overlayUrl, "_blank", "noopener");
    else if (name === "viewer") window.open("/shop", "_blank", "noopener");
    else if (name === "copy-overlay") {
      await navigator.clipboard.writeText(overlayUrl);
      toast("Overlay URL copied. Paste it into an OBS Browser Source.");
    } else if (name === "connect-twitch")
      location.href =
        "/auth/twitch?role=streamer&admin=" + encodeURIComponent(adminToken);
    else if (name === "disconnect-twitch")
      await api("/api/twitch/disconnect", {});
    else if (name === "export") {
      const r = await fetch("/api/orders.csv", {
        headers: { "X-Autoloot-Admin": adminToken },
      });
      if (!r.ok) throw Error("Export failed.");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "autoloot-orders.csv";
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
  const more=$('.nav-more');
  if(more)more.addEventListener('keydown',e=>{if(e.key==='Escape'){more.open=false;more.querySelector('summary').focus();}});

  for(const [id,enabled] of [['load-demo',true],['remove-demo',false]]) $('#'+id)?.addEventListener('click',async e=>{e.target.disabled=true;try{await api('/api/workspace/demo',{enabled});state=await api('/api/state');render();toast(enabled?'Sample lots loaded. Practice mode on.':'Demo content removed.');}catch(error){toast(error.message);e.target.disabled=false;}});

  const toggleMochi=()=>{mochiQuickOpen=!mochiQuickOpen;render();if(mochiQuickOpen)$('#mochi-quick-form input')?.focus();else $('#mochi-quick-toggle')?.focus();};
  $('#mochi-quick-toggle')?.addEventListener('click',toggleMochi);
  $('#mochi-quick-close')?.addEventListener('click',toggleMochi);
  $('#mochi-quick-panel')?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();mochiQuickOpen=false;render();$('#mochi-quick-toggle')?.focus();}});
  $('#mochi-quick-form input')?.addEventListener('input',e=>{mochiQuickDraft=e.target.value;});
  $('#mochi-quick-form')?.addEventListener('submit',e=>{e.preventDefault();const prompt=new FormData(e.target).get('prompt');mochiQuickDraft='';ask(prompt);});

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
        tab = el.dataset.tab;
        render();
        window.scrollTo(0, 0);
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
        if (ac === "ship") {
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
      const events = new EventSource(
        "/api/events" +
          (adminToken ? "?admin=" + encodeURIComponent(adminToken) : ""),
      );
      events.onmessage = async (e) => {
        const focused = document.activeElement;
        const draft =
          focused?.tagName === "INPUT"
            ? { name: focused.name, value: focused.value }
            : null;
        state = JSON.parse(e.data);
        if (isShop) viewer = await api("/api/viewer");
        render();
        if (draft?.name) {
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
  if (state) {
    if (isOverlay) cohostPlayer.update(state, serverOffset);
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
  if (state?.auction)
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

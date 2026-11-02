import {CHAT_COMMANDS,commandEnabled} from '/shared/chat-commands.js';
import {companionAsset} from '/shared/companion-asset.js';
import {animateSetupProgress} from '/progress-bar.js';
import {policyPresets,applyPolicyPreset} from '/policy-presets.js';
import {createStudioViews} from '/workspace/studio.js';
import {createProductDialogs} from '/workspace/product-dialogs.js';
import {createLiveConnection} from '/lifecycle/connection.js';
import {captureDraftFocus,restoreDraftFocus} from '/lifecycle/focus.js';
import {companionPortrait,companionCard as companionCardMarkup,companionPage as companionPageMarkup} from '/workspace/companion.js';
import {createCompanionControls} from '/workspace/companion-controls.js';
import {inventoryPage} from '/workspace/inventory.js';
import {ordersPage} from '/workspace/orders.js';
import {settingsPage,settingsPanel} from '/workspace/settings.js';
import {wireInventory,wireOrders} from '/workspace/commerce-controls.js';
import {esc,usd,productArt,assetDescription,cardFormat,visual,statusBadge,brand,heading,time} from '/shared/presenters.js';
import {createStorefront} from '/storefront.js';
import {giveawaysPage,wireGiveaways} from "/giveaways.js";

import {pullWidget} from '/overlay-widgets.js';
import {accountingPage,wireAccounting} from '/accounting.js';
import {workspaceNavigation} from '/workspace-navigation.js';
import {notifications,notificationFeed,activityFeed} from '/activity-feed.js';
import {mountTutorial,tutorialStatus} from '/tutorial.js';
import {updateDropClock} from '/drop-shop.js';
import {shippingSettingsDialog, shippingOrderDialog, shippingPackageDialog} from '/shipping.js';
import { icon } from "/icons.js";
import { enterSection, openDialog, closeDrawer } from "/motion.js";
import { catalogPage, wireCatalog } from "/catalog.js";
import { ripPage, wireRip, disposeRip } from "/rip.js";
import { CohostPlayer } from "/showtime.js";
import { widgetPresets, widgetType, widgetUrl, nextBid } from "/integration.js";
const isNftOrder = o => o.product?.fulfillment?.type === 'nft';
const cohostPlayer = new CohostPlayer();
const overlayPreset = widgetType(location.search);
const overlayType = widgetPresets[overlayPreset].type || overlayPreset;
let selectedWidget = "full";
try { selectedWidget = widgetType("?widget=" + encodeURIComponent(localStorage.getItem("autoloot-widget") || "full")); } catch {}
let liveConnection = true;
const cohostState = () => !liveConnection || ['auction','vote','pull','ribbon'].includes(overlayType)
  ? { ...state, companion: { ...state.companion, enabled: false, overlayVoice: false } } : state;
const $ = (s, r = document) => r.querySelector(s);
const companionName=()=>state?.companion?.name||'Munny';
const companionAvatar=()=>companionAsset(state?.companion?.avatar);
const mochi=()=>companionPortrait(state);
const companionCard=(...args)=>companionCardMarkup(state,...args);
const companionPage=()=>companionPageMarkup(state);
let state,
  adminToken = "",
  overlayUrl = "",
  viewerUrl = "",
  tab = "studio",
  search = "",
  filter = "all",
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
  if(r.status===401 && !isShop && !isOverlay)location.assign('/admin-login.html');
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
    if(isShop){storefront.disconnect();updateDropClock(state,Date.now()-serverOffset,false);}
    cohostPlayer.arm(false);
    document.querySelectorAll('[data-copy-bid], [data-buy], [data-checkout], [data-buyer-pay], [data-wallet-checkout]').forEach(button => button.disabled = true);
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
const active = () => ["live", "paused"].includes(state.auction?.status);
let mobileMenuOpen=false;
function header(){return state.mode==='demo'?'<div class="practice-strip">Practice mode · no real payments</div>':'';}
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
function runDialog() {
 const products = state.products.filter(p => p.quantity === 1);
 if (!products.length) { toast('Add a product with exactly one unit in stock before arming a run.'); return; }
 modal(`<h2>Arm an agent-led run</h2><p>Select up to 20 single-unit products. They run in inventory order. Prices, condition, shipping and auction terms are frozen until you stop the run.</p><form id="run-form" class="stack-form"><div class="run-products">${products.map(p => `<div class="run-product"><label><input type="checkbox" name="productId" value="${esc(p.id)}"> ${esc(p.title)}<small>Auction from ${usd(p.price)}${p.buyNowPrice ? ' · Fixed price '+usd(p.buyNowPrice) : ''}</small></label><label>Format<select data-run-format="${esc(p.id)}"><option value="auction">Auction</option>${p.buyNowPrice ? '<option value="buy-now">Buy now</option>' : ''}</select></label></div>`).join('')}</div><label class="consent"><input type="checkbox" name="reviewEachLot" ${state.automation?.mode==='review'?'checked':''}> Ask me before opening each lot</label><label>Run for (minutes)<input type="number" name="minutes" min="1" max="240" value="30" required></label><p>${esc(state.mode)} mode · ${state.show.bidDuration}s auctions · ${usd(state.show.increment)} bid increments · ${usd(state.show.shippingPrice)} shipping per order.</p><details><summary>NFT transfer authorization</summary><label class="consent"><input type="checkbox" name="allowNftTransfers"> Authorize transfers of the queued NFTs to buyer-confirmed wallets after payment.</label><label>Maximum total network fee per transfer (native atomic units)<input name="maxNftFeeAtomic" value="0" pattern="[0-9]+" required></label><p>Each chain uses its own native units (for example lamports or wei). The wallet service must enforce the cap before signing. Unknown outcomes are reconciled, not blindly resubmitted.</p></details><label class="consent"><input type="checkbox" required> I authorize this queue to sell under these terms, with no inventory purchasing and only the separately authorized NFT transfers. I am responsible for the listings and fulfillment and have reviewed the <a href="/terms" target="_blank" rel="noopener">automation and AI disclosures</a>.</label><button class="btn primary">Arm run</button></form>`);
 const requestId = crypto.randomUUID();
 $('#run-form').onsubmit = async event => {
   event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button[type="submit"]'); button.disabled = true;
   try {
     const data = new FormData(form);
     await api('/api/run/arm', { requestId, reviewEachLot:data.has('reviewEachLot'), minutes:Number(data.get('minutes')), allowNftTransfers:data.has('allowNftTransfers'),maxNftFeeAtomic:data.get('maxNftFeeAtomic'), steps:data.getAll('productId').map(id => ({productId:id,format:form.querySelector(`[data-run-format="${CSS.escape(id)}"]`).value})) });
     $('#modal').close(); state = await api('/api/state'); render(); toast('Run armed. Autoloot will start the next authorized sale.');
   } catch (error) { toast(error.message); button.disabled = false; }
 };
}
const {studio,showPage,votePanel}=createStudioViews({getState:()=>state,clock,companionCard,tutorialStatus});
let inventoryView='owned';
function inventory(){return inventoryPage(state,{search,inventoryView});}
function orders(){return ordersPage(state,{filter},{nftOrderDetails,reservationNotice});}
function audience() {
  return `${heading("Bidders", "")}<section class="panel bidders-panel"><div class="table-scroll"><table><thead><tr><th>Account</th><th>Registered</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.registrations.map((r) => `<tr><td>@${esc(r.username)}</td><td>${new Date(r.at).toLocaleDateString()}</td><td>${statusBadge(r.blocked ? "blocked" : "active")}</td><td><button class="btn small" data-bidder="${esc(r.userId)}" data-blocked="${!r.blocked}">${r.blocked ? "Unblock" : "Block"}</button></td></tr>`).join("")}</tbody></table></div>${!state.registrations.length ? '<div class="empty">No registered bidders. Share your storefront to get started.</div>' : ""}</section>`;
}
async function auditHistoryDialog(before){
 const page=await api('/api/audit'+(before?'?before='+encodeURIComponent(before):''));
 modal(`<h2>Admin audit</h2><p class="field-help">Local streamer actions and request outcomes. A completed request does not by itself verify payment or delivery.</p>${activityFeed({audit:page.events,activity:[]},{historyButton:false})}<div class="heading-actions"><button class="text-btn" id="audit-newest">Newest</button>${page.nextBefore?'<button class="btn" id="audit-earlier">Earlier actions</button>':''}</div>`);
 $('#audit-newest').onclick=()=>auditHistoryDialog().catch(error=>toast(error.message));
 $('#audit-earlier')?.addEventListener('click',()=>auditHistoryDialog(page.nextBefore).catch(error=>toast(error.message)));

}
const companionControls=createCompanionControls({getState:()=>state,getToken:()=>adminToken,refresh:async()=>{state=await api('/api/state');render();},api,modal,toast,document,fetch});
const ask=prompt=>companionControls.ask(prompt);
function connections(){return settingsPage(state,{selectedWidget});}
function openSettingsPanel(kind){
 modal(settingsPanel(state,kind,{selectedWidget}));
 const dialog=$('#modal');
 dialog.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>action(button.dataset.action));
 dialog.querySelector('[data-tab="studio"]')?.addEventListener('click',()=>{dialog.close();tab='studio';render();});
 dialog.querySelectorAll('[data-settings-automation]').forEach(button=>button.onclick=async()=>{try{await api('/api/automation',{mode:button.dataset.settingsAutomation});state=await api('/api/state');render();openSettingsPanel(kind);toast('Run style saved.');}catch(error){toast(error.message);}});
 dialog.querySelector('#settings-widget-preset')?.addEventListener('change',event=>{selectedWidget=event.target.value;try{localStorage.setItem('autoloot-widget',selectedWidget);}catch{}openSettingsPanel(kind);});
 dialog.querySelector('#settings-mode')?.addEventListener('change',async event=>{try{await api('/api/mode',{mode:event.target.value});state=await api('/api/state');render();openSettingsPanel(kind);}catch(error){toast(error.message);event.target.value=state.mode;}});
 for(const [id,enabled]of [['settings-load-demo',true],['settings-remove-demo',false]])dialog.querySelector('#'+id)?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await api('/api/workspace/demo',{enabled});state=await api('/api/state');render();openSettingsPanel(kind);toast(enabled?'Practice content loaded.':'Practice content cleared.');}catch(error){toast(error.message);button.disabled=false;}});
}
function operatorDialog() {
 const o = state.operator || {};
 modal(`<h2>Publish seller policies</h2><p>All fields below are public. Use your business/operator identity and a public contact, not private credentials. These notices must reflect your actual practices.</p><form id="operator-form" class="stack-form"><details class="form-details"><summary>Start from a policy preset</summary><label>Preset<select id="policy-preset">${Object.entries(policyPresets).map(([id,p])=>`<option value="${id}">${esc(p.label)}</option>`).join('')}</select></label><label class="consent"><input type="checkbox" id="replace-policy-draft"> Replace existing policy text</label><button type="button" class="btn" id="apply-policy-preset">Fill draft</button><p class="field-help">Edit the draft and replace bracketed details before publishing. Your seller name and email stay yours.</p></details><label>Seller / operator name<input name="name" maxlength="160" value="${esc(o.name || '')}" required></label><label>Public support and privacy email<input type="email" name="email" maxlength="254" value="${esc(o.email || '')}" required></label><label>Shipping and fulfillment policy<textarea name="shipping" maxlength="3000" rows="3" required>${esc(o.shipping || '')}</textarea></label><label>Returns, refunds and dispute policy<textarea name="returns" maxlength="3000" rows="3" required>${esc(o.returns || '')}</textarea></label><label>Data retention notice<textarea name="retention" maxlength="1500" rows="3" required>${esc(o.retention || '')}</textarea></label><p class="field-help">There is no automatic personal-data deletion schedule. You must carry out the retention/deletion practices you publish, including backups and exports. Mandatory buyer and privacy rights still apply.</p><label class="consent"><input type="checkbox" name="acknowledged" required> I operate this installation and am responsible for the policies, listings, permissions and automation I authorize. I have reviewed the <a href="/terms" target="_blank" rel="noopener">Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>, including AI limitations.</label><button type="submit" class="btn primary">Publish policies</button></form>`);
 $('#apply-policy-preset').onclick=()=>{
  const form=$('#operator-form'),current=Object.fromEntries(new FormData(form)),draft=applyPolicyPreset(current,$('#policy-preset').value,{replace:$('#replace-policy-draft').checked});
  for(const field of ['shipping','returns','retention'])form.elements[field].value=draft[field];
  form.elements.acknowledged.checked=false;toast('Draft filled. Review and edit before publishing.');
 };
 $('#operator-form').onsubmit = async event => {
   event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button[type="submit"]'); button.disabled = true;
   try {
     await api('/api/operator', {...Object.fromEntries(new FormData(form)), acknowledged:new FormData(form).has('acknowledged')});
     $('#modal').close(); state = await api('/api/state'); render(); toast('Seller policies published.');
   } catch (error) { toast(error.message); button.disabled = false; }
 };
}
function sellerSummary() {
 const o = state.operator || {}, ready = ['name','email','shipping','returns','retention'].every(key => o[key]);
 return `<section class="panel settings-panel seller-summary"><h2>${o.name ? 'Sold by '+esc(o.name) : 'Seller policies'}</h2><p>${ready ? `Support and privacy requests: ${esc(o.email)}` : 'Seller details are incomplete. Ask the streamer for their identity, contact, shipping and returns policies before making a real purchase.'}</p><p>Autoloot provides software and data tools. The seller operates the sale and handles fulfillment and support. AI cohost messages may be inaccurate; verify important claims with the seller.</p>${ready ? `<details><summary>Shipping & returns</summary><h3>Shipping and fulfillment</h3><p class="policy-copy">${esc(o.shipping)}</p><h3>Returns, refunds and disputes</h3><p class="policy-copy">${esc(o.returns)}</p></details>` : ''}<nav aria-label="Storefront legal"><a href="/terms" target="_blank" rel="noopener">Terms ↗</a> · <a href="/privacy" target="_blank" rel="noopener">Privacy ↗</a> · <a href="/docs/getting-started/faq" target="_blank" rel="noopener">Help & contact ↗</a></nav></section>`;
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
  if(tab!=='rip'||!state.features?.ripStudio)disposeRip();
  if (!state) return;
  serverOffset = Date.now() - state.serverTime;
  if (isOverlay) return renderOverlay();
  if (isShop) return renderShop();
  const activityExpanded = $("#show-activity")?.open || false;
  $("#app").innerHTML =
    `${workspaceNavigation({features:state.features,tab,mobileMenuOpen,adminAccount:state.adminAccount,twitch:state.twitch,companion:state.companion,companionError:state.companionError,brand:brand()})}<div class="workspace-main">${header()}<main>${{ studio, show: showPage, inventory, orders, audience, giveaways:()=>giveawaysPage(state), companion: companionPage, connections, rip: () => state.features?.ripStudio ? ripPage(state) : `<div class="page-heading"><h1>Rip studio</h1></div><section class="panel"><h2>Coming soon</h2><p>Scan and review card reveals from your camera or shared screen.</p></section>`, catalog: () => inventory(), accounting:()=>accountingPage(state) }[tab]()}</main></div><footer class="app-footer"><span>© ${new Date().getFullYear()} Autoloot. All rights reserved.</span><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/docs/getting-started/faq">Docs</a></nav></footer>${mochiQuick()}`;

  $("#app").dataset.draftSurface=JSON.stringify([tab,state.mode]);
  if ($("#show-activity")) $("#show-activity").open = activityExpanded;
  if ($(".run-audit")) $(".run-audit").open = runAuditExpanded;
  if(mochiQuickOpen) {
    for(const element of document.querySelectorAll('.sidebar,.mobile-header,.workspace-main,.app-footer,.nav-backdrop'))element.inert=true;
  }
  wire();
  mountTutorial(section=>{tab=section;mobileMenuOpen=false;mochiQuickOpen=false;render();},render);
  enterSection(tab, $(".workspace-main main"));
  cohostPlayer.updateWorkspace(state, tab === 'companion' || (mochiQuickOpen && munnyPanelTab === 'chat'), liveConnection);
}
let lastVisualEvent = null;
function renderOverlay() {
  const react =
    lastVisualEvent !== null && lastVisualEvent !== state.companion.eventId;
  lastVisualEvent = state.companion.eventId;
  document.documentElement.classList.add("overlay-root");
  document.body.className = `overlay-body widget-${overlayType}${widgetPresets[overlayPreset].theme === 'chalk' ? ' overlay-chalk' : ''}`;
  cohostPlayer.update(cohostState(), serverOffset);
  const a = state.auction;
  $("#app").innerHTML =
    `<div class="overlay-canvas">${['pull','ribbon'].includes(overlayType)?pullWidget(state.pulls,overlayType,liveConnection):''}<button class="overlay-audio-toggle" id="overlay-audio-toggle">${state.companion.overlayVoice ? "Enable / test voice" : "Voice off"}</button>${["full", "vote"].includes(overlayType) && state.vote ? `<div class="overlay-vote">${votePanel(true)}</div>` : ""}${["full", "mochi"].includes(overlayType) && state.companion.enabled ? `<div class="overlay-mochi ${react ? "cohost-react" : ""}"><div class="overlay-bubble">${esc(state.companion.message)}</div>${mochi()}<div class="overlay-name">${esc(companionName())} / ${state.companion.provider === "codex" ? "AI cohost · may make mistakes" : "Software cohost"}</div></div>` : ""}${["full", "auction"].includes(overlayType) ? `<div class="overlay-auction">${a ? `<div class="overlay-thumb art-${a.product.art}">${visual(a.product)}</div><div class="overlay-info"><h2>${esc(a.product.title)}</h2><p class="overlay-format">${esc(cardFormat(a.product))}</p></div><div class="overlay-price"><span data-clock>${clock(a)}</span><div class="overlay-bid-row"><strong>${overlayPreset.startsWith('chalk-')?usd(a.highest?.amount || a.product.price).replace(/\.00$/,''):usd(a.highest?.amount || a.product.price)}</strong><span class="overlay-bidder">${a.highest ? "Bid by " + esc(a.highest.username) : "Opening bid"}</span></div></div>` : `<strong>AUTOLOOT / ${esc(state.show.title)}</strong><span>Next lot loading_</span>`}</div>` : ""}</div>`;
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
const storefront=createStorefront({get state(){return state;},get viewer(){return viewer;},set viewer(value){viewer=value;},get liveConnection(){return liveConnection;},get serverOffset(){return serverOffset;}},{$,esc,usd,isNftOrder,statusBadge,modal,api,toast,brand,visual,assetDescription,votePanel,sellerSummary,icon,confirmAction});
const {renderShop,reservationNotice,reservationClock,nftOrderDetails}=storefront;

function modal(content) {
  const drawer=$("#modal");
  drawer.classList.remove("shipping-dialog");
  delete drawer.dataset.closing;
  drawer.innerHTML=`<div class="drawer-top"><span class="drawer-label">autoloot / studio</span><button class="modal-close icon-btn" aria-label="Close panel">${icon("close")}</button></div><div class="drawer-content">${content}</div>`;
  const title=drawer.querySelector('h2');
  if(title){title.id='drawer-title';drawer.setAttribute('aria-labelledby','drawer-title');drawer.removeAttribute('aria-label');}
  else{drawer.removeAttribute('aria-labelledby');drawer.setAttribute('aria-label','Autoloot panel');}
  if(!drawer.open)drawer.showModal();
  openDialog(drawer);
  drawer.querySelector('.modal-close').onclick=()=>closeDrawer(drawer);
  drawer.oncancel=e=>{e.preventDefault();closeDrawer(drawer);};
  drawer.onclick=e=>{if(e.target!==drawer)return;const r=drawer.getBoundingClientRect();if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)closeDrawer(drawer);};
}

const {addProduct,startDialog}=createProductDialogs({getState:()=>state,getToken:()=>adminToken,$,modal,api,toast,fetch,openCatalog:()=>{inventoryView="catalog";tab="inventory";render();document.querySelector("#catalog-query")?.focus();}});
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
  if(name==='admin-logout'){await api('/api/admin/logout',{});location.assign('/admin-login.html');return;}
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
    else if (name === "companion-profile") companionControls.profile();
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

    else if(name==='link-admin-twitch') location.href='/auth/twitch?role=admin-link&admin='+encodeURIComponent(adminToken);
    else if(name==='unlink-admin-twitch'){await api('/api/admin/twitch/unlink',{});location.href='/admin-login.html';}
    else if(name==='store-settings'){
      modal(`<h2>Store access</h2><form id="store-access-form" class="stack-form"><label class="consent"><input name="draft" type="checkbox" ${state.store?.draft?'checked':''}> Draft mode</label><p class="field-help">Pause new sales and fulfillment. Existing payments and refunds can still be reconciled.</p><label>Store password<input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" placeholder="${state.store?.passwordProtected?'Leave blank to keep current password':'Optional · at least 8 characters'}"></label>${state.store?.passwordProtected?'<label class="consent"><input name="removePassword" type="checkbox"> Remove store password</label>':''}<button class="btn primary">Save store access</button></form>`);
      $('#store-access-form').onsubmit=async event=>{event.preventDefault();const f=new FormData(event.target);try{await api('/api/store/settings',{draft:f.has('draft'),password:f.get('password'),removePassword:f.has('removePassword')});$('#modal').close();state=await api('/api/state');render();}catch(error){toast(error.message);}};
    }
    else if(name==='chat-commands'){
      modal(`<h2>Twitch commands</h2><form id="chat-command-form" class="stack-form">${CHAT_COMMANDS.map(command=>`<label class="consent"><input type="checkbox" name="${command.id}" ${commandEnabled(state.chatCommands,command.id)?'checked':''}><span>${command.label} <code>${command.usage}</code></span></label>`).join('')}<button class="btn primary">Save commands</button></form>`);
      $('#chat-command-form').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.target);try{await api('/api/chat/commands',Object.fromEntries(CHAT_COMMANDS.map(command=>[command.id,form.has(command.id)])));$('#modal').close();state=await api('/api/state');render();}catch(error){toast(error.message);}};
    }
    else if (name === "add-product") addProduct();
    else if (name === "auction-settings")
      startDialog(state.auction?.productId || state.products[0]?.id);
    else if (name === "payment-help") modal(`<h2>Set up payments</h2><p>${state.payments.configured?'Stripe is configured in '+esc(state.payments.environment)+' mode.':'Use your own Stripe account. Payments go directly to your business.'}</p><ol class="payment-setup-steps"><li><strong>Set up your Stripe account</strong><p>Stripe handles business verification and bank details.</p><a class="btn" href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">Open Stripe ${icon('external',16)}</a></li><li><strong>Configure this installation</strong><p>Add your restricted API key and webhook signing secret to the server environment.</p><a class="text-btn" href="/docs/getting-started/faq#payments" target="_blank" rel="noopener noreferrer">Installation instructions →</a></li><li><strong>Test checkout</strong><p>Complete a sandbox payment and verify the webhook before accepting real orders.</p></li></ol><p class="field-help">No Autoloot platform account required. Opening Stripe does not automatically connect this installation.</p>`);
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
function wire() {
  animateSetupProgress();
  companionControls.wire();
 document.querySelectorAll('[data-settings-panel]').forEach(button=>button.onclick=()=>openSettingsPanel(button.dataset.settingsPanel));
  wireInventory({document,$,startDialog,addProduct,confirmAction,api,setFilter:value=>filter=value,setSearch:value=>search=value,render});
  wireOrders({document,$,modal,api,toast,confirmAction});
  wireGiveaways({api,toast,refresh:async()=>{state=await api("/api/state");render();}});

 document.querySelectorAll('[data-inventory-view]').forEach(button=>button.onclick=()=>{inventoryView=button.dataset.inventoryView;render();});

 wireAccounting({state,api,modal,toast,refresh:async(fetchState=false)=>{if(fetchState)state=await api('/api/state');render();}});
 $('#mobile-menu-toggle')?.addEventListener('click',()=>{mobileMenuOpen=!mobileMenuOpen;render();});
 $('#nav-backdrop')?.addEventListener('click',()=>{mobileMenuOpen=false;render();});
 $('.sidebar')?.addEventListener('keydown',event=>{if(event.key==='Escape'){mobileMenuOpen=false;render();$('#mobile-menu-toggle')?.focus();}});

  document.querySelectorAll('[data-shipping-package]').forEach(button=>button.onclick=()=>shippingPackageDialog({orderIds:JSON.parse(button.dataset.shippingPackage),getState:()=>state,api,modal,refresh:async()=>{state=await api('/api/state');render();}}));
  document.querySelectorAll('[data-shipping-order]').forEach(button=>button.onclick=()=>shippingOrderDialog({id:button.dataset.shippingOrder,getState:()=>state,api,modal,refresh:async()=>{state=await api('/api/state');render();}}));
 document.querySelectorAll('[data-automation]').forEach(button=>button.onclick=async()=>{try{await api('/api/automation',{mode:button.dataset.automation});state=await api('/api/state');render();toast('Automation style saved.');}catch(error){toast(error.message);}});

 document.querySelectorAll('[data-nft-authorize]').forEach(button=>button.onclick=()=>{
   modal(`<h2>Authorize NFT transfer</h2><p>This authorizes the exact purchased asset to the buyer-confirmed destination after payment.</p><form id="nft-authorize-form" class="stack-form"><label>Maximum network fee (native atomic units)<input name="maxFeeAtomic" value="0" pattern="[0-9]+" required></label><label class="consent"><input name="allowTransfer" type="checkbox"> Allow the configured wallet agent to submit this transfer automatically.</label><button class="btn primary">Authorize delivery</button></form>`);
   $('#nft-authorize-form').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/api/nft/authorize',{id:button.dataset.nftAuthorize,maxFeeAtomic:data.get('maxFeeAtomic'),allowTransfer:data.has('allowTransfer')});$('#modal').close();state=await api('/api/state');render();}catch(error){toast(error.message);}};
 });
 document.querySelectorAll('[data-nft-order]').forEach(button=>button.onclick=async()=>{try{await api('/api/nft/demo-deliver',{id:button.dataset.nftOrder});state=await api('/api/state');render();}catch(error){toast(error.message);}});
  $(".run-audit")?.addEventListener("toggle", event => { runAuditExpanded = event.currentTarget.open; });
  $("#widget-preset")?.addEventListener("change", e => { selectedWidget = e.target.value; try { localStorage.setItem("autoloot-widget", selectedWidget); } catch {} render(); });


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
  if(state.features?.ripStudio)wireRip({api, token:adminToken, toast, state, refresh:async()=>{state=await api("/api/state");render();}});
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
  $("#mode")?.addEventListener("change", async (e) => {
    try {
      await api("/api/mode", { mode: e.target.value });
    } catch (e) {
      toast(e.message);
      render();
    }
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

}
const connection=createLiveConnection({
 getViewer:()=>viewer,
 surface:isShop?'shop':isOverlay?'overlay':'workspace',api,getAdminToken:()=>adminToken,
 applyBootstrap:data=>{adminToken=data.admin;overlayUrl=data.overlayUrl;viewerUrl=data.viewerUrl;state=data.state;},
 applySnapshot:(freshState,freshViewer)=>{state=freshState;if(isShop)viewer=freshViewer;},
 setConnected:setLiveConnection,render,captureDraft:()=>captureDraftFocus(document),
 restoreDraft:draft=>restoreDraftFocus(document,draft,{quickOpen:mochiQuickOpen,escape:CSS.escape}),notify:toast,
});
async function init(){
 try{await connection.start();}
 catch(error){$('#app').innerHTML=`<div class="startup-error"><h1>Connection error.</h1><p>${esc(error.message)}</p><a class="btn" href="/">Try again</a></div>`;}
}
window.addEventListener('pagehide',()=>connection.close());
window.addEventListener('pageshow',event=>{if(event.persisted)init();});
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

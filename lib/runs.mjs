import { randomUUID } from 'node:crypto';
import {isNft} from './nft.mjs';
export const runActive = run => ['running', 'paused'].includes(run?.status);
export const runOwns = (state, id) => runActive(state.run) && state.run.steps.some(step => step.productId === id);

// The runner chooses only the next pre-authorized command. The engine remains authoritative.
export class Runs {
  constructor(engine, { connected = () => false, checkoutReady = () => false, nftReady = () => false, deliverNft = () => {} } = {}) {
    this.engine = engine;
    this.connected = connected;
    this.checkoutReady = checkoutReady;
    this.nftReady=nftReady;this.deliverNft=deliverNft;
  }
  record(text) {
    const run = this.engine.state.run;
    run.events.push({ at: this.engine.now(), text });
    run.events = run.events.slice(-200);
    this.engine.activity(`Agent run: ${text}`, 'run');
  }
  phase(value) {
    const run = this.engine.state.run;
    if (run.phase !== value) {
      run.phase = value;
      this.record({"waiting-payment":"Waiting for verified payment.", "waiting-fulfillment":"Payment recorded; waiting for fulfillment."}[value] || `Stage changed: ${value}.`);
      this.engine.commit();
    }
  }
  arm({ steps, minutes = 30, requestId, allowNftTransfers = false, maxNftFeeAtomic = "0", reviewEachLot }) {
    const s = this.engine.state;
    if (!requestId || typeof requestId !== 'string' || requestId.length > 100) throw Error('A run request ID is required.');
    if (s.run?.requestId === requestId) return s.run;
    const previous = s.runHistory?.find(run => run.requestId === requestId);
    if (previous) return previous;
    if (runActive(s.run)) throw Error('Stop the current run before arming another.');
    if (['live', 'paused'].includes(s.auction?.status) || s.vote?.status === 'open') throw Error('Finish the auction and close voting before arming.');
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw Error('Arm for 1–240 minutes.');
    if (!Array.isArray(steps) || !steps.length || steps.length > 20) throw Error('Choose 1–20 run steps.');
    if(reviewEachLot!==undefined&&typeof reviewEachLot!=='boolean')throw Error('Choose a valid review preference.');
    const review=reviewEachLot ?? (this.engine.state.automation?.mode==='review');
    const ids = new Set();
    const queue = steps.map(step => {
      if (!['auction', 'buy-now'].includes(step.format)) throw Error('Only auction and buy-now runs are implemented.');
      if (ids.has(step.productId)) throw Error('Each product can appear only once.');
      ids.add(step.productId);
      const p = this.engine.product(step.productId);
      if (p.quantity !== 1) throw Error('Run products must have exactly one unit in stock. Split a multi-unit listing before arming.');
      if (s.orders.some(o => o.product.id === p.id && ['pending', 'processing'].includes(o.status))) throw Error('Resolve existing reservations for each run product first.');
      if (step.format === 'buy-now' && !p.buyNowPrice) throw Error('Set a buy-now price before arming.');
      return { productId: p.id, format: step.format, product: structuredClone(p) };
    });
    if(queue.some(step=>step.product.fulfillment?.type==='nft')) {
      if(allowNftTransfers!==true)throw Error('Explicitly authorize NFT delivery for this queue.');
      if(!/^(0|[1-9][0-9]{0,24})$/.test(String(maxNftFeeAtomic)))throw Error('Set a valid native-atomic network fee cap.');
      if(s.mode==='live' && queue.some(step=>step.product.fulfillment?.type==='nft' && !this.nftReady(step.product.fulfillment.chain)))throw Error('Configure an agent-wallet adapter and chain verification before a live NFT run.');
    }
    if (s.mode === 'live' && (!this.connected() || (queue.some(x => x.format === 'buy-now') && !this.checkoutReady())))
      throw Error('Live runs need Twitch connected and buy-now steps need configured checkout.');
    if (s.mode === 'live' && queue.some(x => ['p1','p2','p3','p4'].includes(x.productId))) throw Error('Sample products are for practice runs only.');
    if (s.run) s.runHistory = [structuredClone(s.run), ...(s.runHistory || [])].slice(0, 20);
    s.run = { id: randomUUID(), requestId, status: 'running', phase: 'ready', mode: s.mode,
      steps: queue, reviewEachLot:review, approvedIndex:null, allowNftTransfers:Boolean(allowNftTransfers), maxNftFeeAtomic:String(maxNftFeeAtomic), index: 0, createdAt: this.engine.now(), expiresAt: this.engine.now() + minutes * 60000,
      settings: structuredClone(s.show), maxSpendCents: 0, events: [] };
    // Only the runner can activate these listings while the session is armed.
    for (const step of queue) this.engine.product(step.productId).listed = false;
    this.record(`Armed ${queue.length} steps for ${minutes} minutes; ${allowNftTransfers ? "queued NFT transfers authorized within the native fee cap; no inventory purchasing" : "no purchasing or wallet transfers authorized"}.`);
    this.engine.commit();
    return s.run;
  }
  pause(reason = 'Operator paused the run.') {
    const s = this.engine.state, run = s.run;
    if (!runActive(run)) throw Error('No active run.');
    run.status = 'paused'; run.reason = reason;
    for (const step of run.steps) { const p = s.products.find(p => p.id === step.productId); if (p) p.listed = false; }
    this.record(reason);
    if (s.auction?.runId === run.id && s.auction.status === 'live') this.engine.pause();
    else this.engine.commit();
  }
  resume() {
    const s = this.engine.state, run = s.run;
    if (run?.status !== 'paused') throw Error('No paused run.');
    if (this.engine.now() >= run.expiresAt) throw Error('Arming window expired. Stop this run and review before arming another.');
    if (s.mode !== run.mode) throw Error('Show mode changed. Stop and re-arm.');
    if (s.mode === 'live' && (!this.connected() || (run.steps.slice(run.index).some(x => x.format === 'buy-now') && !this.checkoutReady()))) throw Error('Reconnect Twitch and checkout before resuming.');
    if(s.mode==='live' && run.steps.slice(run.index).some(step=>step.product.fulfillment?.type==='nft'&&!this.nftReady(step.product.fulfillment.chain)))throw Error('Reconnect the NFT wallet and chain verifier before resuming.');
    run.status = 'running'; run.reason = null;
    this.record('Operator resumed the run.');
    if (s.auction?.runId === run.id && s.auction.status === 'paused') this.engine.resume();
    else this.engine.commit();
  }
  stop() {
    const run = this.engine.state.run;
    if (!runActive(run)) throw Error('No active run.');
    this.pause('Operator stopped the run. Existing orders still need payment/refund and fulfillment reconciliation.');
    run.status = 'stopped'; run.phase = 'stopped';
    this.engine.commit();
  }
  recover() {
    if (this.engine.state.run?.status === 'running') this.pause('Server restarted. Review the run and explicitly resume.');
  }
  approve({runId,index}={}) {
    const run=this.engine.state.run;
    if(run?.id!==runId || run.index!==index || run.status!=='running' || run.phase!=='waiting-review')throw Error('This review is no longer current.');
    if(this.engine.now()>=run.expiresAt)throw Error('Run expired.');
    run.approvedIndex=index;run.phase='ready';this.record(`Operator approved lot ${index+1}.`);this.engine.commit();
  }
  tick() {
    const s = this.engine.state, run = s.run;
    if (run?.status !== 'running') return;
    try {
      if (this.engine.now() >= run.expiresAt) return this.pause('Arming window expired; no further sales will start.');
      if (s.mode !== run.mode) return this.pause('Show mode changed; review required.');
      if (s.mode === 'live' && !this.connected()) return this.pause('Twitch disconnected; explicit resume required.');
      const step = run.steps[run.index];
      if (!step) {
        run.status = 'completed'; run.phase = 'completed'; this.record('All run steps reconciled.'); this.engine.commit(); return;
      }
      const orders = s.orders.filter(o => o.runId === run.id && o.runStep === run.index);
      if (orders.length) {
        if (orders.length !== 1) return this.pause('Unexpected duplicate order; review required.');
        const order = orders[0];
        if (isNft(order) ? (order.status === 'delivered' || (order.mode === 'demo' && order.status === 'test-delivered')) : order.status === 'shipped') return this.advance(isNft(order) ? 'NFT fulfillment complete; physical redemption remains with its provider.' : 'Fulfillment recorded.');
        if(isNft(order) && order.delivery?.error) return this.pause('NFT transfer needs reconciliation. Inspect the order before resuming.');
        if (['pending', 'processing'].includes(order.status)) return this.phase('waiting-payment');
        if (['paid', 'test-paid', 'paid-external'].includes(order.status)) {
          if(isNft(order) && order.mode==='live' && !order.delivery && order.recipientWallet) this.deliverNft(order.id,{allowTransfer:run.allowNftTransfers,maxFeeAtomic:run.maxNftFeeAtomic,runId:run.id});
          return this.phase(isNft(order) ? 'waiting-nft-delivery' : 'waiting-fulfillment');
        }
        return this.pause(`Order ${order.number} is ${order.status}; operator review required.`);
      }
      const p = this.engine.product(step.productId);
      if (p.quantity !== 1) return this.pause('Inventory changed; review required.');
      if(JSON.stringify(p.fulfillment)!==JSON.stringify(step.product.fulfillment)) return this.pause('NFT entitlement changed; review required.');
      for (const key of ['title', 'description', 'condition', 'price', 'buyNowPrice', 'image'])
        if (p[key] !== step.product[key]) return this.pause('Listing terms changed; review required.');
      const alreadyActive=s.auction?.runId===run.id&&s.auction.runStep===run.index;
      if(run.reviewEachLot && run.approvedIndex!==run.index && !alreadyActive && !p.listed)return this.phase('waiting-review');
      if (step.format === 'auction') {
        const a = s.auction;
        if (a?.runId === run.id && a.runStep === run.index) {
          if (a.status === 'unsold') return this.advance('Auction ended without bids.');
          if (a.status === 'live') return this.phase('auction');
          return this.pause(`Auction is ${a.status}; operator review required.`);
        }
        if (['live','paused'].includes(a?.status)) return this.pause('Another auction is active.');
        run.phase = 'auction'; this.record(`Starting auction: ${p.title}.`);
        this.engine.start({ productId:p.id, runId:run.id, runStep:run.index,
          duration:run.settings.bidDuration, increment:String(run.settings.increment / 100), antiSnipe:run.settings.antiSnipe });
      } else {
        if (s.mode === 'live' && !this.checkoutReady()) return this.pause('Checkout unavailable; listing paused.');
        if (!p.listed) {
          p.listed = true; run.phase = 'selling'; this.record(`Listed at fixed price: ${p.title}.`);
          this.engine.say(`${p.title} is available for ${'$'}${(p.buyNowPrice / 100).toFixed(2)} in the storefront.`, 'excited');
          this.engine.commit();
        }
      }
    } catch (error) { this.pause(error.message); }
  }
  advance(text) {
    const run = this.engine.state.run, step = run.steps[run.index];
    const p = this.engine.state.products.find(p => p.id === step.productId);
    if (p) p.listed = false;
    this.record(`Step ${run.index + 1}: ${text}`);
    run.index++; run.phase = 'ready'; this.engine.commit();
  }
}

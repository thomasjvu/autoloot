import {createHmac,randomBytes} from 'node:crypto';
import {publicGiveaway} from '../giveaways.mjs';
import {publicCompanion,publicPulls} from '../public-state.mjs';
import {accountingRows} from '../accounting.mjs';
import {publicVote} from '../voting.mjs';
import {operatorProfile} from '../legal.mjs';
export function createProjections({engine,nft,shipping,storage,payments,twitch,rip,catalog,metadata,companion}) {
// Process-local HMAC prevents guessing private values from the public invalidation token.
const viewerRevisionKey=randomBytes(32);
const prizeRevision=g=>g?Object.fromEntries(['id','title','mode','status','winnerUserId','claimDeadline','claim'].map(key=>[key,g[key]])):null;
function viewerRevision(){
 return createHmac('sha256',viewerRevisionKey).update(JSON.stringify({orders:engine.state.orders,registrations:engine.state.registrations,payments:payments.status,nft:nft?.status(),configured:twitch.status.configured,giveaway:prizeRevision(engine.state.giveaway),giveawayHistory:engine.state.giveawayHistory?.map(prizeRevision),privateBids:engine.state.privateBids})).digest('hex');
}
function publicState() {
  const s = engine.state;
  return {
    viewerRevision:viewerRevision(),
    mode: s.mode,
    vote: publicVote(s.vote),
    giveaway:publicGiveaway(s.giveaway),
    show: s.show,
    operator: operatorProfile(s.operator),
    products: s.products,
    auction: s.auction
      ? {
          ...s.auction,
          highest: s.auction.highest
            ? {
                username: s.auction.highest.username,
                amount: s.auction.highest.amount,
              }
            : null,
        }
      : null,
    bids: s.bids.map((b) => ({
      id: b.id,
      username: b.username,
      amount: b.amount,
      at: b.at,
      source: b.source,
      voided: Boolean(b.voided),
    })),
    companion: publicCompanion(s.companion),
    pulls:publicPulls(s.pulls),
    serverTime: Date.now(),
  };
}
function stateFor(role) {
  return role === "admin"
    ? {
        ...engine.state,
        accountingRows:accountingRows(engine.state),
        vote: publicVote(engine.state.vote),
        orders: engine.state.orders.map(({ claim, ...o }) => o),
        registrations: engine.state.registrations.map((r) => ({
          ...r,
          blocked: engine.state.blocked.some((b) => b.userId === r.userId),
        })),
        nft: nft?.status(),
        shippingProvider: shipping?.status(),
        storage: storage.status(),
        payments: payments.status,
        twitch: twitch.status,
        proposal:companion.proposal,
        companionBusy: companion.busy,
        companionError: engine.state.companion.lastError || null,

        audit:storage.auditPage().events,
        rip: rip.snapshot(),
        catalog: {...catalog.state, source:metadata.base},
        serverTime: Date.now(),
      }
    : publicState();
}
return stateFor;
}

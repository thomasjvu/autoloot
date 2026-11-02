import test from "node:test";
import assert from "node:assert/strict";
import { Engine, seed } from "../lib/commerce/engine.mjs";
import { Twitch } from "../lib/integrations/twitch.mjs";
function setup() {
  const e = new Engine(seed());
  e.setMode("live");
  e.start({ productId: "p1" });
  const t = new Twitch(e);
  t.user = { id: "channel", login: "creator" };
  const messages = [];
  t.send = async (text) => messages.push(text);
  const event = (text) => ({
    broadcaster_user_id: "channel",
    chatter_user_id: "viewer",
    chatter_user_name: "viewer",
    chatter_user_login: "viewer",
    message_id: "message",
    message: { text },
  });
  return { e, t, messages, event };
}
test("Twitch bids require registration and parse explicit bid command only", async () => {
  const { e, t, messages, event } = setup();
  await t.onChat(event("!bid 45"));
  assert.equal(e.state.auction.bidCount, 0);
  assert.match(messages[0], /Register/);
  e.register({ id: "viewer", login: "viewer" });
  await t.onChat(event("I would pay $100"));
  assert.equal(e.state.auction.bidCount, 0);
  await t.onChat(event("!bid $45.00"));
  assert.equal(e.state.auction.highest.amount, 4500);
  await t.onChat(event("!bid $45.00"));
  assert.equal(e.state.auction.bidCount, 1);
});
test("shared chat and unrelated channel events cannot place bids", async () => {
  const { e, t, event } = setup();
  e.register({ id: "viewer", login: "viewer" });
  await t.onChat({ ...event("!bid 45"), broadcaster_user_id: "other" });
  await t.onChat({ ...event("!bid 45"), source_broadcaster_user_id: "other" });
  assert.equal(e.state.auction.bidCount, 0);
  assert.equal(e.state.chat.length, 0);
});
test("invalid bid forms explain syntax, demo mode never accepts Twitch bids", async () => {
  const { e, t, event, messages } = setup();
  await t.onChat(event("!bid one hundred"));
  assert.match(messages[0], /Use !bid/);
  e.finish(true);
  e.setMode("demo");
  e.start({ productId: "p1" });
  await t.onChat(event("!bid 45"));
  assert.equal(e.state.auction.bidCount, 0);
});
test("chat voting uses verified event identity and does not create bids", async () => {
  const { e, t, event } = setup();
  e.openVote({ productIds: ["p2", "p3"] });
  await t.onChat(event("!vote 2"));
  assert.equal(e.state.vote.counts[1], 1);
  await t.onChat({ ...event("!vote 1"), message_id: "second" });
  assert.deepEqual(e.state.vote.counts, [1, 0]);
  assert.equal(e.state.auction.bidCount, 0);
});

// No Twitch credentials or network calls: exercise the adapter lifecycle itself.
function lifecycle(t) {
  const engine = new Engine(seed());
  engine.setMode('live');
  engine.start({ productId: 'p1' });
  const twitch = new Twitch(engine);
  twitch.client = 'test-client';
  twitch.secret = 'test-secret';
  twitch.status.configured = true;
  twitch.base = 'https://show.example';
  twitch.user = { id: 'channel', login: 'creator' };
  const sockets = [];
  class Socket extends EventTarget {
    constructor(url) { super(); this.url = url; sockets.push(this); }
    packet(type, payload) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ metadata: { message_type: type }, payload }) })); }
    close() { this.closed = true; this.dispatchEvent(new Event('close')); }
  }
  const originalSocket = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = originalSocket; });
  t.after(() => { twitch.tokens = null; for (const socket of sockets) socket.close(); });
  const welcome = socket => socket.packet('session_welcome', { session: { id: 'socket-session', keepalive_timeout_seconds: 30 } });
  return { engine, twitch, sockets, welcome };
}
test('OAuth rejects expired/replayed state and validates identity before creating a session', async t => {
  const { twitch } = lifecycle(t);
  const state = new URL(twitch.login('viewer','a'.repeat(64))).searchParams.get('state');
  t.mock.method(globalThis, 'fetch', async url => new Response(JSON.stringify(String(url).endsWith('/token')
    ? { access_token: 'fixture-token' }
    : { client_id: 'test-client', user_id: 'buyer', login: 'buyer' }), { status: 200 }));
  await assert.rejects(twitch.callback('fixture-code',state),/browser/);
  await assert.rejects(twitch.callback('fixture-code',state,'b'.repeat(64)),/browser/);
  assert.equal(globalThis.fetch.mock.callCount(),0,'wrong-browser callbacks never exchange credentials');
  const result = await twitch.callback('fixture-code', state,'a'.repeat(64));
  assert.equal(twitch.session(`autoloot_session=${result.session}`).id, 'buyer');
  await assert.rejects(twitch.callback('fixture-code', state,'a'.repeat(64)), /expired/);
  const expired = new URL(twitch.login('viewer','a'.repeat(64))).searchParams.get('state');
  twitch.pending.get(expired).at = Date.now() - 600001;
  await assert.rejects(twitch.callback('fixture-code', expired,'a'.repeat(64)), /expired/);
  const invalid = new URL(twitch.login('viewer','a'.repeat(64))).searchParams.get('state');
  globalThis.fetch.mock.mockImplementation(async url => new Response(JSON.stringify(String(url).endsWith('/token') ? { access_token: 'fixture' } : { client_id: 'wrong-client' })));
  await assert.rejects(twitch.callback('fixture-code', invalid,'a'.repeat(64)), /identity validation/);
});
test('API refreshes an expired token and retries with the replacement token', async t => {
  const { twitch } = lifecycle(t);
  twitch.tokens = { access_token: 'old-fixture', refresh_token: 'refresh-fixture' };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith('/token')) return new Response(JSON.stringify({ access_token: 'new-fixture', refresh_token: 'next-fixture' }));
    if (options.headers.Authorization === 'Bearer old-fixture') return new Response('{}', { status: 401 });
    return new Response(JSON.stringify({ data: [{ id: 'channel' }] }));
  });
  assert.deepEqual(await twitch.api('users'), { data: [{ id: 'channel' }] });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.headers.Authorization, 'Bearer new-fixture');
});
test('EventSub subscribes on welcome and migration preserves a running auction', async t => {
  const { engine, twitch, sockets, welcome } = lifecycle(t);
  const subscriptions = [];
  t.mock.method(twitch, 'api', async (path, body) => { subscriptions.push({ path, body }); return {}; });
  const initial = twitch.connect();
  welcome(sockets[0]);
  await initial;
  assert.equal(twitch.status.connected, true);
  assert.equal(subscriptions[0].body.type, 'channel.chat.message');
  assert.equal(subscriptions[0].body.transport.session_id, 'socket-session');
  const received = [];
  t.mock.method(twitch, 'onChat', async event => received.push(event));
  const migration = twitch.connect('wss://eventsub.wss.twitch.tv/ws?reconnect=fixture', true);
  sockets[0].packet('notification', { event: { message: { text: '!lot' } } });
  assert.equal(received.length, 1, 'old connection remains active until migration completes');
  welcome(sockets[1]);
  await migration;
  assert.equal(sockets[0].closed, true);
  assert.equal(subscriptions.length, 1);
  assert.equal(engine.state.auction.status, 'live');
  assert.throws(() => twitch.connect('wss://untrusted.example/ws'), /Unexpected/);
  sockets[1].close();
  assert.equal(engine.state.auction.status, 'paused');
  assert.equal(twitch.status.connected, false);
});
test('EventSub revocation and failed validation pause bidding', async t => {
  const { engine, twitch, sockets, welcome } = lifecycle(t);
  t.mock.method(twitch, 'api', async () => ({}));
  const connected = twitch.connect();
  welcome(sockets[0]);
  await connected;
  sockets[0].packet('revocation', {});
  assert.equal(engine.state.auction.status, 'paused');
  assert.match(twitch.status.error, /revoked/);
  engine.resume();
  twitch.tokens = { access_token: 'fixture' };
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 403 }));
  await twitch.validate();
  assert.equal(engine.state.auction.status, 'paused');
  assert.equal(twitch.tokens, null);
  assert.match(twitch.status.error, /validation failed/);
});
test('unexpected disconnect retries EventSub while keeping the auction paused', async t => {
  const { engine, twitch, sockets, welcome } = lifecycle(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => t.mock.timers.reset());
  twitch.tokens = { access_token: 'fixture' };
  t.mock.method(twitch, 'api', async () => ({}));
  const connected = twitch.connect();
  welcome(sockets[0]);
  await connected;
  sockets[0].close();
  assert.equal(engine.state.auction.status, 'paused');
  t.mock.timers.tick(2000);
  assert.equal(sockets.length, 2);
  welcome(sockets[1]);
  await Promise.resolve();
  assert.equal(twitch.status.connected, true);
  assert.equal(engine.state.auction.status, 'paused');
});
test('manual disconnect cancels a queued reconnect', async t => {
  const { twitch, sockets, welcome } = lifecycle(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => t.mock.timers.reset());
  twitch.tokens = { access_token: 'fixture' };
  t.mock.method(twitch, 'api', async () => ({}));
  const connected = twitch.connect();
  welcome(sockets[0]);
  await connected;
  sockets[0].close();
  assert.ok(twitch.retryTimer);
  twitch.disconnect();
  t.mock.timers.tick(60000);
  assert.equal(sockets.length, 1);
  assert.equal(twitch.retryTimer, null);
  assert.equal(twitch.status.connected, false);
});
test('a late subscription response cannot reconnect after manual disconnect', async t => {
  const { twitch, sockets, welcome } = lifecycle(t);
  twitch.tokens = { access_token: 'fixture' };
  let finishSubscription;
  t.mock.method(twitch, 'api', () => new Promise(resolve => { finishSubscription = resolve; }));
  const outcome = twitch.connect().catch(error => error);
  welcome(sockets[0]);
  twitch.disconnect();
  finishSubscription({});
  await Promise.resolve();
  assert.match((await outcome).message, /closed before it was ready/);
  assert.equal(twitch.status.connected, false);
  assert.equal(twitch.tokens, null);
});
test('an EventSub close before welcome rejects immediately', async t => {
  const { twitch, sockets } = lifecycle(t);
  const outcome = twitch.connect().catch(error => error);
  sockets[0].close();
  assert.match((await outcome).message, /closed before it was ready/);
  assert.equal(twitch.status.connected, false);
});

test('disabled Twitch commands are ignored before executing or sending replies',async()=>{
 const {e,t,event,messages}=setup();
 e.state.chatCommands={bid:false,register:false,lot:false,vote:false,enter:false};
 for(const command of ['!bid 100','!register','!lot','!vote 1','!enter'])await t.onChat(event(command));
 assert.equal(e.state.bids.length,0);assert.deepEqual(messages,[]);
 e.state.chatCommands.lot=true;await t.onChat(event('!lot'));assert.equal(messages.length,1);
});

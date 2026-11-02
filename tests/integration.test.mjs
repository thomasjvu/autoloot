import test from 'node:test';
import assert from 'node:assert/strict';
import { widgetType, widgetUrl, goLiveChecks, publicStorefront } from '../public/integration.js';

test('widget URLs accept only supported layouts and remove unrelated URL capabilities', () => {
  assert.equal(widgetType('?widget=vote'), 'vote');
  for (const input of ['', '?widget=constructor', '?widget=__proto__', '?widget=unknown']) assert.equal(widgetType(input), 'full');
  assert.equal(widgetUrl('http://localhost:4173/overlay?admin=private#secret', 'auction'), 'http://localhost:4173/overlay?widget=auction');
  assert.equal(widgetUrl('http://localhost:4173/overlay', 'unknown'), 'http://localhost:4173/overlay');
});
test('readiness never treats sample inventory or a localhost URL as live-ready', () => {
  const state = { twitch: { connected: false }, products: [{ id: 'p1', quantity: 1 }], payments: { configured: false }, mode: 'demo' };
  assert.ok(goLiveChecks(state, 'http://localhost:4173/shop').every(c => !c.ready));
  state.products.push({ id: 'owned-product', quantity: 1 });
  state.twitch = { connected: true, channel: 'creator' };
  state.payments = { configured: true, environment: 'test' };
  state.mode = 'live';
  state.operator = {name:'Fixture seller',email:'support@example.invalid',shipping:'Practice shipping',returns:'Contact seller',retention:'Delete test data'};
  assert.equal(goLiveChecks(state, 'https://show.example/shop').find(c=>c.label==='Payment setup').ready,false);
  state.payments.environment='live';
  assert.ok(goLiveChecks(state, 'https://show.example/shop').every(c => c.ready));
  for (const url of ['https://localhost/shop', 'https://127.0.0.1/shop', 'https://[::1]/shop', 'invalid']) assert.equal(publicStorefront(url), false);
});
test('reservation guidance hides local deadlines once provider checkout owns the reservation', async () => {
  const { reservationDeadline } = await import('../public/integration.js');
  const order = {status:'pending', reservationExpiresAt:12345};
  assert.equal(reservationDeadline(order), 12345);
  assert.equal(reservationDeadline({...order, checkoutCreated:0}), null);
  assert.equal(reservationDeadline({...order, checkoutId:'session'}), null);
  assert.equal(reservationDeadline({...order, status:'expired'}), null);
});

test('chalk presets produce public browser-source URLs with reusable dimensions',async()=>{
 const {widgetPresets}=await import('../public/integration.js');
 for(const [id,type,width,height] of [['chalk-auction','auction',960,500],['chalk-vote','vote',1000,550]]){
  assert.equal(widgetType('?widget='+id),id);assert.equal(widgetPresets[id].type,type);
  assert.equal(widgetPresets[id].width,width);assert.equal(widgetPresets[id].height,height);
  assert.equal(widgetUrl('https://show.example/overlay?admin=secret',id),'https://show.example/overlay?widget='+id);
 }
});

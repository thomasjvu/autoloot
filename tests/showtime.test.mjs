import test from "node:test";
import assert from "node:assert/strict";
import { CohostPlayer } from "../public/showtime.js";
function setup() {
  const spoken = [], utterances=[], classes = new Map();
  const rig={src:"/characters/munny-idle.svg",getAttribute(){return this.src;},setAttribute(name,value){this.src=value;}};
  const custom={...rig,src:"/media/custom.png"};
  globalThis.window = {};
  globalThis.Audio=class {
    constructor(url){this.url=url;utterances.push(this);spoken.push('vn-message');}
    play(){return Promise.resolve();}
    pause(){}
    removeAttribute(){}
  };
  globalThis.document = { querySelectorAll:()=>[rig,custom], body: { dataset: {}, classList: { toggle:(name,value)=>classes.set(name,value) } } };
  const player = new CohostPlayer();
  return { player, spoken, classes, utterances,rig,custom, cleanup: () => clearTimeout(player.voiceTimer) };
}
test("cohost ignores initial history and speaks each fresh event once", () => {
  const { player, spoken, cleanup } = setup();
  try {
    const s = {
      companion: {
        enabled: true,
        overlayVoice: true,
        eventId: "old",
        at: Date.now(),
        message: "Old message",
      },
    };
    player.update(s);
    assert.equal(spoken.length, 0);
    s.companion = { ...s.companion, eventId: "new", message: "New bid!" };
    player.update(s);
    player.update(s);
    assert.deepEqual(spoken, ["vn-message"]);
    s.companion = {
      ...s.companion,
      eventId: "stale",
      at: Date.now() - 60000,
      message: "Late",
    };
    player.update(s);
    assert.equal(spoken.length, 1);
  } finally {
    cleanup();
  }
});
test("cohost countdown resets after a clock extension", t => {
  const { player, spoken, cleanup } = setup();
  try {
    let now=100000;
    t.mock.method(Date,'now',()=>now);
    const s = {
      companion: {
        enabled: true,
        overlayVoice: true,
        eventId: "start",
        at: Date.now(),
      },
      auction: { id: "a", status: "live", endsAt: Date.now() + 2500 },
    };
    player.update(s);
    player.update(s);
    assert.equal(spoken.length,1);
    s.auction.endsAt = Date.now() + 2000;
    player.update(s);
    assert.equal(spoken.length,2);
    s.auction.endsAt=now+10000;player.update(s);
    now+=7500;player.update(s);player.update(s);
    assert.equal(spoken.length,3);
  } finally {
    cleanup();
  }
});
test("avatar-only mode never speaks and reduced motion is reflected", () => {
  const { player, spoken, classes, cleanup } = setup();
  try {
    const s = {
      companion: {
        enabled: true,
        overlayVoice: false,
        reducedMotion: true,
        eventId: "old",
        at: Date.now(),
      },
      auction: { id: "a", status: "paused" },
    };
    player.update(s);
    s.companion.eventId = "new";
    player.update(s);
    assert.equal(spoken.length, 0);
    assert.equal(document.body.dataset.mood, "paused");
    assert.equal(classes.get("reduce-cohost-motion"),true);
  } finally {
    cleanup();
  }
});

test('mouth follows utterance lifecycle and leaves custom avatars unchanged',()=>{
 const {player,utterances,rig,custom,cleanup}=setup();
 try{player.arm(true);player.speak('Hello');assert.equal(rig.src,'/characters/munny-idle.svg');utterances[0].onplaying();assert.equal(rig.src,'/characters/munny-idle.svg#talk');assert.equal(custom.src,'/media/custom.png');utterances[0].onended();assert.equal(rig.src,'/characters/munny-idle.svg');player.speak('Again');utterances[1].onplaying();player.arm(false);assert.equal(rig.src,'/characters/munny-idle.svg');}finally{cleanup();}
});

test('workspace stays silent on Studio login and does not replay hidden conversation messages',()=>{
 const {player,spoken,utterances,rig,cleanup}=setup();
 const state={companion:{enabled:true,voice:true,message:'Welcome back'}};
 try{
  player.updateWorkspace(state,false);assert.equal(spoken.length,0);
  state.companion.message='An auction update';player.updateWorkspace(state,false);
  player.updateWorkspace(state,true);assert.equal(spoken.length,0);
  state.companion.message='Fresh visible reply';player.updateWorkspace(state,true);assert.equal(spoken.length,1);
  utterances[0].onplaying();assert.equal(rig.src,'/characters/munny-idle.svg#talk');
  player.updateWorkspace(state,false);assert.equal(player.audio,null);assert.equal(rig.src,'/characters/munny-idle.svg');
  state.companion.message='Hidden reply';player.updateWorkspace(state,false);player.updateWorkspace(state,true);assert.equal(spoken.length,1);
  state.companion.message='Disconnected reply';player.updateWorkspace(state,true,false);assert.equal(spoken.length,1);
  player.updateWorkspace(state,true,true);assert.equal(spoken.length,1);
  state.companion.voice=false;state.companion.message='Muted';player.updateWorkspace(state,true);assert.equal(spoken.length,1);
 }finally{cleanup();}
});

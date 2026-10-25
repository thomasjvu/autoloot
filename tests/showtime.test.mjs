import test from "node:test";
import assert from "node:assert/strict";
import { CohostPlayer } from "../public/showtime.js";
function setup() {
  const spoken = [];
  globalThis.window = {
    speechSynthesis: {
      cancel() {},
      speak: (u) => {
        spoken.push(u.text);
      },
    },
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  globalThis.document = { body: { dataset: {}, classList: { toggle() {} } } };
  const player = new CohostPlayer();
  return { player, spoken, cleanup: () => clearTimeout(player.voiceTimer) };
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
    assert.deepEqual(spoken, ["New bid!"]);
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
test("cohost countdown is deterministic and resets after clock extension", () => {
  const { player, spoken, cleanup } = setup();
  try {
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
    assert.deepEqual(spoken, ["3"]);
    s.auction.endsAt = Date.now() + 2000;
    player.update(s);
    assert.equal(spoken.at(-1), "2");
  } finally {
    cleanup();
  }
});
test("avatar-only mode never speaks and reduced motion is reflected", () => {
  const { player, spoken, cleanup } = setup();
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
  } finally {
    cleanup();
  }
});

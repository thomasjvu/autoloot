/* Browser speech is optional, local and never authoritative for auction timing. */
export class CohostPlayer {
  constructor() {
    this.lastEvent = null;
    this.lastAuction = null;
    this.counted = new Set();
    this.enabled = false;
    this.speaking = false;
    this.voiceTimer = null;
    this.sequence = 0;
    this.lastCountdownEnd = null;
  }
  arm(enabled) {
    const changed = this.enabled !== enabled;
    this.enabled = enabled;
    if (!enabled && changed) {
      this.sequence++;
      window.speechSynthesis?.cancel();
      clearTimeout(this.voiceTimer);
      this.setSpeaking(false);
    }
  }
  setSpeaking(value) {
    this.speaking = value;
    document.body.classList.toggle("cohost-speaking", value);
  }
  speak(text) {
    if (!this.enabled || !("speechSynthesis" in window)) return;
    const sequence = ++this.sequence;
    window.speechSynthesis.cancel();
    this.setSpeaking(false);
    clearTimeout(this.voiceTimer);
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.06;
    u.pitch = 1.15;
    u.onstart = () => {
      if (sequence === this.sequence) this.setSpeaking(true);
    };
    u.onend = u.onerror = () => {
      if (sequence !== this.sequence) return;
      clearTimeout(this.voiceTimer);
      this.setSpeaking(false);
    };
    this.voiceTimer = setTimeout(() => this.setSpeaking(false), 20000);
    window.speechSynthesis.speak(u);
  }
  update(state, offset = 0) {
    const c = state.companion,
      a = state.auction;
    this.arm(Boolean(c.enabled && c.overlayVoice));
    if (a?.id !== this.lastAuction) {
      this.lastAuction = a?.id;
      this.counted.clear();
    }
    if (c.eventId !== this.lastEvent) {
      const first = this.lastEvent === null;
      this.lastEvent = c.eventId;
      if (!first && Date.now() - offset - (c.at || 0) < 15000)
        this.speak(c.message);
    }
    document.body.dataset.mood = c.mood || "happy";
    document.body.classList.toggle(
      "reduce-cohost-motion",
      Boolean(c.reducedMotion),
    );
    if (a?.status === "live") {
      const remaining = Math.ceil((a.endsAt - Date.now() + offset) / 1000);
      if (this.lastCountdownEnd !== a.endsAt) {
        this.lastCountdownEnd = a.endsAt;
        this.counted.clear();
      }
      if (remaining > 0 && remaining <= 3 && !this.counted.has(remaining)) {
        this.counted.add(remaining);
        this.speak(String(remaining));
      }
    }
    if (a?.status === "paused") document.body.dataset.mood = "paused";
  }
}

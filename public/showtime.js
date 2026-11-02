import {createObjectUrl} from './vendor/vn-tts/index.js';
import {setCompanionSpeaking} from './shared/companion-asset.js';
/* Local VN audio is optional and never authoritative for auction timing. */
export class CohostPlayer {
  constructor() {
    this.audio=null;
    this.audioUrl=null;
    this.lastEvent = null;
    this.lastAuction = null;
    this.counted = new Set();
    this.enabled = false;
    this.speaking = false;
    this.voiceTimer = null;
    this.sequence = 0;
    this.lastCountdownEnd = null;
    this.workspaceMessage = null;
    this.workspaceVisible = false;
  }
  arm(enabled) {
    const changed = this.enabled !== enabled;
    this.enabled = enabled;
    if (!enabled && changed) {
      this.sequence++;
      this.stopAudio();
      clearTimeout(this.voiceTimer);
      this.setSpeaking(false);
    }
  }
  setSpeaking(value) {
    this.speaking = value;
    setCompanionSpeaking(value);
    document.body.classList.toggle("cohost-speaking", value);
  }
  stopAudio(){
    if(this.audio){this.audio.onplaying=this.audio.onended=this.audio.onerror=null;this.audio.pause();this.audio.removeAttribute('src');this.audio=null;}
    if(this.audioUrl){URL.revokeObjectURL(this.audioUrl);this.audioUrl=null;}
    clearTimeout(this.voiceTimer);this.setSpeaking(false);
  }
  speak(text) {
    if(!this.enabled)return;
    const sequence=++this.sequence;
    this.stopAudio();
    const message=String(text||'').trim().slice(0,350);
    if(!message)return;
    try{
      this.audioUrl=createObjectUrl({text:message,pitch:1.25,speed:1.65,baseFrequency:250,vowelVolume:.24,consonantVolume:.16});
      const audio=this.audio=new Audio(this.audioUrl);
      const done=()=>{if(sequence===this.sequence)this.stopAudio();};
      audio.onplaying=()=>{if(sequence===this.sequence)this.setSpeaking(true);};
      audio.onended=audio.onerror=done;
      this.voiceTimer=setTimeout(done,30000);
      const playing=audio.play();playing?.catch(done);
    }catch{this.stopAudio();}
  }
  updateWorkspace(state, visible, connected = true) {
    const c = state.companion;
    const message = String(c.message || '');
    const active = Boolean(visible && connected && c.enabled && c.voice);
    const fresh = this.workspaceVisible && this.workspaceMessage !== null && message !== this.workspaceMessage;
    this.workspaceMessage = message;
    this.workspaceVisible = active;
    this.arm(active);
    // Opening a conversation establishes a baseline; it never replays history.
    if (active && fresh) this.speak(message);
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

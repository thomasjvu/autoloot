import {companionAsset} from '../shared/companion-asset.js';
import {esc,heading} from '../shared/presenters.js';
import {icon} from '../icons.js';
const companionName=state=>state?.companion?.name||'Munny';
const companionAvatar=state=>companionAsset(state?.companion?.avatar);
export function companionPortrait(state) {
  return `<img class="mochi mochi-vtuber" src="${esc(companionAvatar(state))}" alt="${esc(companionName(state))}, your cohost" width="320" height="480" decoding="async">`;

}

export function companionCard(state,full = false,{formId='companion-form',draft=''}={}) {
  const c = state.companion;
  return `<section class="panel companion-panel ${full ? "companion-full" : ""}"><div class="panel-header"><h2><span class="mini-mochi" aria-hidden="true"><img src="${esc(companionAvatar(state))}" alt=""></span> ${esc(companionName(state))} <span class="soft-count">${c.provider === "codex" ? "Codex" : c.provider === "demo" ? "Demo" : "Offline"}</span></h2><label class="toggle"><input aria-label="Show companion" type="checkbox" data-setting="enabled" ${c.enabled ? "checked" : ""}><span></span></label></div>${full ? `<div class="companion-stage ${c.enabled ? "" : "disabled-companion"}">${companionPortrait(state)}<span class="mochi-name">${esc(companionName(state))} · your cohost</span></div>` : ""}<div class="companion-content">${state.companionBusy ? `<div class="companion-thinking" role="status">${esc(companionName(state))} is thinking…</div>` : ''}<div class="munny-message-row"><span class="munny-message-avatar" aria-hidden="true"><img src="${esc(companionAvatar(state))}" alt=""></span><div class="munny-message-bubble"><span class="sr-only">${esc(companionName(state))} says: </span><p class="mochi-message">${esc(c.message)}</p></div></div>${
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
  }<div class="quick-prompts"><button data-prompt="Start the next auction">Next auction</button><button data-prompt="Recap orders">Order recap</button></div><form id="${formId}" class="ask-form"><div class="composer-field"><input id="${formId}-message" name="prompt" value="${esc(draft)}" placeholder="Ask a question or plan your next lot…" aria-label="Message ${esc(companionName(state))}" maxlength="2000" required ${state.companionBusy ? "disabled" : ""}><button aria-label="Send to ${esc(companionName(state))}" ${state.companionBusy ? "disabled" : ""}>${icon("arrow", 17)}<span>Send</span></button></div></form><a class="chat-info-link" href="/terms" target="_blank" rel="noopener">${c.provider === "demo" ? "Demo replies" : "AI can make mistakes"}</a></div></section>`;
}
export function companionPage(state) {
  const c=state.companion;
  const toggle=(label,key)=>`<div class="setting-row"><strong>${label}</strong><label class="toggle"><input type="checkbox" aria-label="${label}" data-setting="${key}" ${c[key]?'checked':''}><span></span></label></div>`;
  return `${heading(esc(companionName(state)), "", '<button class="btn" data-action="companion-profile">Customize</button>')}<div class="companion-simple"><div class="companion-conversation">${companionCard(state,true)}</div><aside class="companion-options"><section class="panel settings-panel companion-codex-card"><div class="studio-widget-title"><span class="studio-widget-icon"><img src="/brand/services/codex.svg" alt="" width="26" height="26"></span><h2>Codex</h2></div><p class="field-help">${c.provider==='codex'?'Codex selected. Your account stays managed by Codex on this computer.':'Use your Codex account to enable your cohost.'}</p><div class="heading-actions"><button class="btn primary" data-codex-connect>${c.provider==='codex'?'Manage Codex':'Connect Codex'}</button>${c.provider==='codex'?'<button class="text-btn" data-codex-disconnect>Disconnect</button>':''}</div>${state.mode==='demo'?`<label class="field-label" for="provider">Practice provider</label><select id="provider"><option value="offline" ${c.provider==='offline'?'selected':''}>Offline</option><option value="demo" ${c.provider==='demo'?'selected':''}>Practice replies</option><option value="codex" ${c.provider==='codex'?'selected':''}>Codex</option></select>`:''}${toggle('Munny voice','voice')}</section><details class="panel companion-disclosure"><summary>About AI & data</summary><div><p>Replies and card matches can be wrong. Review listings and actions before applying them. Keep secrets and unnecessary personal information out of chat.</p><a href="/privacy">Data handling ↗</a></div></details></aside></div>`;
}

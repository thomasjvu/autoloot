import {productImage} from './practice-images.js';
import {icon} from '../icons.js';
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const usd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (n || 0) / 100,
  );
export function productArt(kind, large = false) {
  const keyboard = `<ellipse cx="160" cy="155" rx="121" ry="19" fill="#000" opacity=".12"/><g transform="translate(29 55) rotate(-9 130 55)"><path d="M0 14 25 0h222l15 14v78l-18 13H16L0 92Z" fill="#7b6ca4"/><rect y="8" width="260" height="86" rx="10" fill="#d1c6e8"/><rect x="6" y="14" width="248" height="70" rx="7" fill="#8a7baf"/>${Array.from({ length: 4 }, (_, r) => Array.from({ length: 13 }, (_, c) => `<rect x="${10 + c * 18.5}" y="${18 + r * 16}" width="15.5" height="12" rx="2.7" fill="${r === 0 || c > 10 ? "#a28acb" : (r + c) % 4 === 0 ? "#eee5fa" : "#dcd2ec"}"/><path d="m${14 + c * 18.5} ${22 + r * 16}h3" stroke="#7e6e9b" opacity=".5"/>`).join("")).join("")}<rect x="64" y="67" width="106" height="12" rx="3" fill="#ede5fa"/><rect x="235" y="18" width="15" height="12" rx="3" fill="#b2e3b9"/></g>`;
  const console = `<ellipse cx="160" cy="166" rx="73" ry="14" fill="#000" opacity=".1"/><g transform="translate(100 17) rotate(12 60 80)"><rect width="120" height="165" rx="19" fill="#cf889f"/><rect x="2" width="116" height="157" rx="18" fill="#f3bbca"/><rect x="12" y="13" width="96" height="75" rx="8" fill="#8b667d"/><rect x="20" y="21" width="80" height="55" rx="3" fill="#b3d3c1"/><path d="m25 65 18-19 14 10 18-24 20 33Z" fill="#8caf9d"/><path d="M37 99v30m-15-15h30" stroke="#88677c" stroke-width="10"/><circle cx="89" cy="107" r="7" fill="#b77698"/><circle cx="73" cy="123" r="7" fill="#b77698"/><path d="M42 144h12m10 0h12" stroke="#bc8da7" stroke-width="4" stroke-linecap="round"/></g>`;
  const headphones = `<ellipse cx="160" cy="171" rx="88" ry="12" fill="#000" opacity=".1"/><path d="M91 111V90a69 69 0 0 1 138 0v21" fill="none" stroke="#ac9d88" stroke-width="21"/><path d="M91 104V88a69 69 0 0 1 138 0v16" fill="none" stroke="#f8efdb" stroke-width="15"/><g transform="rotate(-8 91 130)"><rect x="72" y="98" width="35" height="63" rx="16" fill="#b8ac97"/><rect x="79" y="97" width="35" height="63" rx="16" fill="#eee4d1"/></g><g transform="rotate(8 229 130)"><rect x="213" y="98" width="35" height="63" rx="16" fill="#b8ac97"/><rect x="207" y="97" width="35" height="63" rx="16" fill="#eee4d1"/></g>`;
  const mushroom = `<ellipse cx="160" cy="170" rx="65" ry="12" fill="#000" opacity=".12"/><path d="m136 92-10 59c-3 29 70 29 67 0l-10-59Z" fill="#f3e5c8"/><path d="M136 107q21 13 47 0v12q-25 16-50 0Z" fill="#d3c29e"/><path d="M79 99c9-45 43-75 80-75 39 0 76 31 84 75 5 32-170 32-164 0Z" fill="#c98976"/><path d="M81 99c12-43 45-71 78-71 36 0 72 30 80 71-15 15-142 15-158 0Z" fill="#e0a58d"/><ellipse cx="125" cy="68" rx="16" ry="12" transform="rotate(-25 125 68)" fill="#fae8c7"/><ellipse cx="180" cy="52" rx="11" ry="9" fill="#fae8c7"/><ellipse cx="204" cy="85" rx="13" ry="11" transform="rotate(25 204 85)" fill="#fae8c7"/><circle cx="150" cy="144" r="3" fill="#635640"/><circle cx="172" cy="144" r="3" fill="#635640"/><path d="M156 153q5 5 10 0" fill="none" stroke="#635640" stroke-width="2"/>`;
  const pack = `<ellipse cx="160" cy="181" rx="62" ry="9" fill="#000" opacity=".12"/><g transform="rotate(-10 160 100)"><path d="M107 15h106v168H107Z" fill="#7653d5"/><path d="M107 15h106v17H107zm0 150h106v18H107Z" fill="#e4dbff"/><path d="m107 39 106 69v48l-106-69Z" fill="#ffca61"/><circle cx="160" cy="98" r="29" fill="#fff4d8"/><path d="m160 74 7 17 18 7-18 7-7 17-7-17-18-7 18-7Z" fill="#7653d5"/><text x="160" y="53" text-anchor="middle" fill="white" font-size="11" font-family="monospace">PACK PARTY</text><text x="160" y="151" text-anchor="middle" fill="white" font-size="10" font-family="monospace">DEMO BOOSTER</text></g>`;
  const card = `<g transform="rotate(9 160 100)"><rect x="104" y="13" width="112" height="176" rx="10" fill="#ffce5b"/><rect x="112" y="23" width="96" height="156" rx="6" fill="#fff3bf"/><text x="120" y="41" font-size="12" font-family="monospace" fill="#35312c">PIKACHU</text><rect x="119" y="50" width="82" height="75" rx="6" fill="#b8e7da"/><path d="m143 85-8-23 15 13m20 10 12-23-4 28" fill="#e3b82f"/><ellipse cx="160" cy="99" rx="23" ry="21" fill="#f7ce4c"/><circle cx="151" cy="95" r="3"/><circle cx="170" cy="95" r="3"/><circle cx="145" cy="104" r="4" fill="#ed8c7b"/><circle cx="177" cy="104" r="4" fill="#ed8c7b"/><path d="M122 141h66m-66 10h45" stroke="#c2af7a" stroke-width="4"/><text x="160" y="170" text-anchor="middle" font-size="8" font-family="monospace">DEMO ILLUSTRATION</text></g>`;
  const sleeves = `<rect x="87" y="36" width="110" height="142" rx="12" fill="#6d89bf" transform="rotate(-12 142 107)"/><rect x="122" y="23" width="110" height="150" rx="12" fill="#e8f7ff" stroke="#7ca4bc" stroke-width="4"/><rect x="133" y="35" width="88" height="125" rx="7" fill="#bbdce9"/><path d="m177 66 12 24 26 5-19 19 4 27-23-12-23 12 4-27-19-19 26-5Z" fill="#fff2a9"/>`;
  const box = `<path d="m80 58 80-30 80 30v100l-80 30-80-30Z" fill="#c5afe8"/><path d="m80 58 80 32 80-32M160 90v98" stroke="#8e70b5" stroke-width="3"/><path d="m120 44 80 31v40l-20 7V84l-80-32" fill="#e8dff5"/>`;
  return `<svg class="product-art ${large ? "large" : ""}" viewBox="0 0 320 200" aria-label="${esc(kind)} illustration" role="img">${{ pack, card, sleeves, keyboard, console, headphones, mushroom, box }[kind] || box}</svg>`;
}
export function assetDescription(p) {
 const a=p.fulfillment;if(a?.type!=='nft')return '';
 return `<details class="asset-description"><summary>NFT entitlement · ${esc(a.chain)}</summary><p class="policy-copy">Provider: ${esc(a.provider)}<br>Asset: ${esc(a.mint || a.contract+' / '+a.tokenId)}<br>Source wallet: ${esc(a.sender)}</p><p>Delivery ends at confirmed NFT transfer. Optional physical redemption and its fees are handled by the provider. A provider label is the seller’s claim, not independent authentication.</p></details>`;
}
export function productDescription(p) {
  return String(p.description || '');
}
export function visual(p, large = false) {
  const image = productImage(p);
  return image
    ? `<img class="product-photo" src="${esc(image)}" alt="${esc(p.title)}" loading="lazy" decoding="async">`
    : productArt(p.art, large);
}
export function statusBadge(status) {
  return `<span class="pill ${["live", "sold", "shipped", "paid-external", "test-paid", "paid"].includes(status) ? "green" : ""}">${esc({ "delivered":"NFT delivered", "test-delivered":"Demo NFT delivered", "test-paid": "Demo paid", "paid-external": "Payment confirmed", live: "Bidding open", unsold: "No bids", pending: "Awaiting payment", standby: "Ready" }[status] || status?.replaceAll("-", " ") || "Ready")}</span>`;
}
export const brand = () => `<span class="brand-mark" aria-hidden="true"><img src="/icon-192.png" width="40" height="40" alt=""></span><span class="wordmark">autoloot</span>`;
export function heading(title, subtitle = "", action = "") {
  return `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</div>`;
}
export const time = (at) =>
  new Date(at).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export function cardFormat(p) {
 const text=[p.category,p.title,p.condition].filter(Boolean).join(' ');
 if(/\b(slabs?|graded|PSA|BGS|CGC|SGC)\b/i.test(text))return /unverified/i.test(text)?'GRADED / UNVERIFIED':'GRADED';
 return /\b(card|cards|singles|Pokémon|Pokemon|TCG|raw)\b/i.test(text)||p.art==='card'?'RAW':'';
}

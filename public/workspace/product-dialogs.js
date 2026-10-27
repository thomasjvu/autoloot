import {esc,usd,visual} from '../shared/presenters.js';
import {icon} from '../icons.js';
export function createProductDialogs({getState,getToken,$,modal,api,toast,fetch}) {
function addProduct(editId, draft = null) {
  const state=getState(),adminToken=getToken();
  const draftId = draft ? state.proposal?.id : null;
  const existing = draft
    ? {
        ...draft,
        price: Number(draft.price) * 100,
        buyNowPrice: draft.buyNowPrice ? Number(draft.buyNowPrice) * 100 : null,
      }
    : state.products.find((p) => p.id === editId);
  modal(
    `<h2>${existing ? "Edit product" : "Add a new find"}</h2><p>A few details, and it’s ready for your show.</p><form id="product-form" class="stack-form"><label>SKU (optional)<input name="sku" maxlength="100" placeholder="Your unique inventory reference"></label><label>What are you selling?<input name="title" required maxlength="100" placeholder="e.g. Pokémon booster pack"></label><div class="form-row"><label>Starting price (USD)<input name="price" type="number" min="0.01" step="0.01" required value="10.00"></label><label>How many?<input name="quantity" type="number" min="1" max="10000" required value="1"></label></div><details class="form-details"><summary>Fulfillment type · physical or NFT</summary><label>Fulfillment<select name="fulfillmentType"><option value="physical">Physical shipment</option><option value="nft">NFT transfer</option></select></label><p>NFT orders end at verified digital transfer. The provider handles optional physical redemption. Standard ERC-721 and standard SPL NFTs are supported by the verifiers; compressed, Token-2022 and ERC-1155 assets are not supported.</p><label>Chain<select name="nftChain"><option value="eip155:8453">Base</option><option value="eip155:84532">Base Sepolia</option><option value="solana:mainnet">Solana mainnet</option><option value="solana:devnet">Solana devnet</option></select></label><label>Provider name<input name="nftProvider" maxlength="100" placeholder="Beezie, Phygitals, or your provider"></label><label>Source wallet<input name="nftSender" autocomplete="off" spellcheck="false"></label><label>ERC-721 contract (EVM)<input name="nftContract" autocomplete="off" spellcheck="false"></label><label>Token ID (EVM)<input name="nftTokenId" inputmode="numeric"></label><label>Mint address (Solana)<input name="nftMint" autocomplete="off" spellcheck="false"></label></details><label>Product photo <span class="field-help">Optional · PNG, JPEG or WebP · up to 3 MB</span><input type="file" name="photo" accept="image/png,image/jpeg,image/webp"></label><label>Anything buyers should know?<textarea name="description" rows="2" maxlength="1000" placeholder="Condition, what’s included, and any little details."></textarea></label><details class="form-details"><summary>Buy now & more details</summary><div class="form-detail-fields"><div class="form-row"><label>Buy-now price (USD)<input name="buyNowPrice" type="number" min="0.01" step="0.01" placeholder="Optional"></label><label class="consent"><input name="listed" type="checkbox"> Show in storefront</label></div><div class="form-row"><label>Category<input name="category" value="Pokémon / TCG" maxlength="60"></label><label>Condition<select name="condition"><option>New</option><option>Like new</option><option>Open box</option><option>Used</option></select></label></div><label>Placeholder illustration<select name="art"><option value="pack">Booster pack</option><option value="card">Single card</option><option value="sleeves">Card supplies</option><option value="box">Gift box</option><option value="keyboard">Keyboard</option><option value="console">Console</option><option value="headphones">Headphones</option><option value="mushroom">Mushroom</option></select></label></div></details><button class="btn primary full">${icon("plus", 16)} Add product</button></form>`,
  );
  if (existing) {
    $("#modal h2").textContent = "Edit product";
    for (const name of [
      "title",
      "description",
      "category",
      "quantity",
      "condition",
      "art",
      "buyNowPrice",
    ])
      $("#product-form").elements[name].value = existing[name];
    $("#product-form").elements.buyNowPrice.value = existing.buyNowPrice
      ? (existing.buyNowPrice / 100).toFixed(2)
      : "";
    $("#product-form").elements.listed.checked = Boolean(existing.listed);
    $("#product-form").elements.price.value = (existing.price / 100).toFixed(2);
    const asset=existing.fulfillment||{type:'physical'},form=$('#product-form');
    form.elements.fulfillmentType.value=asset.type;
    if(form.elements.sku)form.elements.sku.value=existing.sku || "";
    for(const [field,key] of [['nftChain','chain'],['nftSender','sender'],['nftContract','contract'],['nftTokenId','tokenId'],['nftMint','mint'],['nftProvider','provider']])if(asset[key]!=null)form.elements[field].value=asset[key];
    $("#product-form").elements.quantity.min = "0";
    $("#product-form button").textContent = "Save product";
  }
  $("#product-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      const f = new FormData(e.target);
      const values = Object.fromEntries(f);
      delete values.photo;
      values.fulfillment=values.fulfillmentType==='nft'?{type:'nft',chain:values.nftChain,sender:values.nftSender,contract:values.nftContract,tokenId:values.nftTokenId,mint:values.nftMint,provider:values.nftProvider}:{type:'physical'};
      for(const field of ['fulfillmentType','nftChain','nftSender','nftContract','nftTokenId','nftMint','nftProvider'])delete values[field];
      values.listed = f.has("listed");
      if (f.get("photo")?.size) {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "X-Autoloot-Admin": adminToken },
          body: f.get("photo"),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        values.image = result.image;
      }
      await api(
        draft
          ? "/api/companion/apply"
          : existing
            ? "/api/products/edit"
            : "/api/products",
        draft
          ? { id: draftId, draftProduct: values }
          : {
              ...values,
              ...(existing ? { id: existing.id } : {}),
            },
      );
      $("#modal").close();
      toast(existing ? "Product updated." : "Product added.");
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  };
}
function startDialog(id) {
  const state=getState();
  const p = state.products.find((p) => p.id === id);
  if (!p) return;
  modal(
    `<div class="start-preview art-${p.art}">${visual(p)}</div><h2>Ready to start?</h2><p>${esc(p.title)} starts at <strong>${usd(p.price)}</strong>.</p><form id="start-form" class="stack-form"><div class="auction-summary"><span>${state.show.bidDuration || 60} seconds</span><span>${usd(state.show.increment || 100)} bid steps</span></div><details class="form-details"><summary>Adjust auction settings</summary><div class="form-detail-fields"><div class="form-row"><label>Duration (seconds)<input name="duration" type="number" min="10" max="3600" value="${state.show.bidDuration || 60}" required></label><label>Bid increment (USD)<input name="increment" type="number" min="0.01" step="0.01" value="${((state.show.increment || 100) / 100).toFixed(2)}" required></label></div><label class="consent"><input name="antiSnipe" type="checkbox" ${state.show.antiSnipe !== false ? "checked" : ""}> Standard · late bids reset the clock to 10 seconds</label><p>Uncheck for 💀 Sudden death: bids never extend the deadline.</p></div></details><div class="notice">${state.mode === "demo" ? "Just a practice run. No real bids or payments." : "Viewers bid in Twitch chat. The winner can check out from their orders page."}</div><button class="btn primary full">${icon("play", 16)} Start auction</button></form>`,
  );
  $("#start-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/api/auction/start", {
        productId: id,
        duration: Number(f.get("duration")),
        increment: f.get("increment"),
        antiSnipe: f.has("antiSnipe"),
      });
      $("#modal").close();
      toast("Auction started.");
    } catch (e) {
      toast(e.message);
    }
  };
}

return {addProduct,startDialog};
}

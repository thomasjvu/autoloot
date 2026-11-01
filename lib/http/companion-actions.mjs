import {json} from './response.mjs';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {cents} from '../engine.mjs';
import {defaultProfile,validateProfile} from '../companion-profile.mjs';
import {codexReply} from '../companion.mjs';
import {demoReply} from '../practice-companion.mjs';
export function createCompanionActions({engine,catalog,rip,nft,twitch,imageDir,companion,broadcast,announce,codexConnection}) {
 return async function action({path,b,req,res}) {
  switch(path) {
        case "/api/companion/connection/status":
          json(res,await codexConnection.status());return true;
        case "/api/companion/connection/start":
          if(companion.busy)throw Error('Wait for the current companion request before changing sign-in.');
          json(res,await codexConnection.start());return true;
        case "/api/companion/connection/key":
          if(companion.busy)throw Error('Wait for the current companion request before changing sign-in.');
          json(res,await codexConnection.apiKey(b.apiKey));return true;
        case "/api/companion/connection/cancel":
          await codexConnection.cancel();break;
        case "/api/catalog/search":
          await catalog.search(b); break;
        case "/api/catalog/select":
          await catalog.select(b.id); break;
        case "/api/catalog/add":
          catalog.add(engine,b); catalog.state.selected=null; break;
        case "/api/rip/search": await rip.search(b);break;
        case "/api/rip/select": await rip.select(b.id);break;
        case "/api/rip/confirm": rip.confirm(b);break;
        case "/api/rip/clear": rip.clear();break;

        case "/api/companion/photo": {
          if (companion.busy) throw Error("Mochi is already working.");
          if (engine.state.companion.provider !== "codex")
            throw Error("Select Codex in Companion to draft from photos.");
          if (!/^\/media\/[a-f0-9]+\.(png|jpg|webp)$/.test(b.image || ""))
            throw Error("Upload a product photo first.");
          const imagePath = join(imageDir, b.image.slice(7));
          if (!existsSync(imagePath)) throw Error("Photo not found.");
          const price = cents(b.price);
          const quantity = Number(b.quantity);
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
            throw Error("Quantity must be 1–10,000.");
          const notes = String(b.notes || "").slice(0, 1500),
            condition = String(b.condition || "Used").slice(0, 40);
          if(engine.state.companion.provider!=='codex' && !(engine.state.mode==='demo' && engine.state.companion.provider==='demo'))throw Error('Connect a companion provider in Companion settings first.');
          companion.busy = true;
          broadcast();
          try {
            const reply = await codexReply(
              `Draft a product listing from the attached product photo. Creator confirmed condition: ${condition}. Opening price: ${(price / 100).toFixed(2)} USD. Quantity: ${quantity}. Notes: ${notes}. No buy-now listing. Describe visible features only.`,
              engine.state,
              { imagePath },
            );
            if (reply.action !== "draft-product" || !reply.draftProduct)
              throw Error(
                "The model could not draft this photo. Try clearer notes or add the product manually.",
              );
            Object.assign(reply.draftProduct, {
              price: (price / 100).toFixed(2),
              quantity,
              condition,
              listed: false,
              buyNowPrice: null,
              image: b.image,
            });
            companion.proposal = { id: randomBytes(16).toString("hex"), ...reply };
            engine.say(reply.message);
            engine.commit();
          } finally {
            companion.busy = false;
            broadcast();
          }
          break;
        }
        case "/api/rip/provider":
          if(!['cloud','local'].includes(b.mode))throw Error('Choose cloud or local vision.');
          engine.state.companion.visionMode=b.mode;rip.clear();engine.commit();break;
        case "/api/companion/profile": {
          if(b.reset===true)Object.assign(engine.state.companion,defaultProfile);
          else {const profile=validateProfile(b);if(profile.avatar.startsWith('/media/')&&!existsSync(join(imageDir,profile.avatar.slice(7))))throw Error('Upload the avatar first.');Object.assign(engine.state.companion,profile);}
          engine.commit();break;
        }
        case "/api/companion/settings": {
          if (b.provider && !["offline", "demo", "codex"].includes(b.provider))
            throw new Error("Unknown provider.");
          if(b.provider==='demo'&&engine.state.mode!=='demo')throw Error('Scripted replies are available only in practice mode.');
          const patch = {};
          for (const k of ["enabled", "voice", "overlayVoice", "reducedMotion"])
            if (typeof b[k] === "boolean") patch[k] = b[k];
          if (b.provider && b.provider!==engine.state.companion.provider){patch.lastSuccessAt=null;patch.lastError=null;}
          if (b.provider) patch.provider = b.provider;
          Object.assign(engine.state.companion, patch);
          engine.commit();
          break;
        }
        case "/api/companion/ask": {
          if (companion.busy) throw new Error("Mochi is already thinking.");
          if (
            typeof b.prompt !== "string" ||
            !b.prompt.trim() ||
            b.prompt.length > 2000
          )
            throw new Error("Enter a request under 2,000 characters.");
          if(engine.state.companion.provider!=='codex' && !(engine.state.mode==='demo' && engine.state.companion.provider==='demo'))throw Error('Connect a companion provider in Companion settings first.');
          engine.state.companion.lastError=null;

          companion.busy = true;
          broadcast();
          try {
            const reply =
              engine.state.companion.provider === "codex"
                ? await codexReply(b.prompt, {...engine.state, catalog:catalog.state})
                : demoReply(b.prompt, engine.state);
            if(reply.action === 'search-catalog') {
              await catalog.search({query:reply.productId || '',game:''});
              reply.action='none';reply.message=`Found ${catalog.state.total} Metadata matches. Open Catalog to review, or ask me to choose a result.`;
            } else if(reply.action === 'select-catalog') {
              const selected=await catalog.select(reply.productId);
              reply.action='none';reply.message=`Selected ${selected.name} ${selected.number} from ${selected.setName}. Review it in Catalog and set your opening price, quantity and condition before adding.`;
            }
            companion.proposal =
              reply.action === "none"
                ? null
                : { id: randomBytes(16).toString("hex"), ...reply };
            engine.state.companion.lastSuccessAt=Date.now();
            engine.say(reply.message);
            engine.activity(
              `Companion replied (${engine.state.companion.provider}).`,
            );
            engine.commit();
          } catch(error) {
            engine.state.companion.lastError='Companion request failed';
            throw error;
          } finally {
            companion.busy = false;
            broadcast();
          }
          break;
        }
        case "/api/companion/apply": {
          if (!companion.proposal || b.id !== companion.proposal.id)
            throw new Error("This proposal is no longer available.");
          const p = companion.proposal;
          if (p.action === "start-next") {
            if (engine.state.mode === "live" && !twitch.status.connected)
              throw new Error("Connect Twitch first.");
            if(engine.state.mode==='live'&&engine.product(p.productId).fulfillment?.type==='nft'&&!nft.configured(engine.product(p.productId).fulfillment.chain))throw Error("Configure NFT receipt verification before opening this auction.");
            engine.start({ productId: p.productId });
          }
          if (p.action === "draft-product") {
            if (!p.draftProduct) throw new Error("The draft is incomplete.");
            engine.addProduct({
              ...p.draftProduct,
              ...(b.draftProduct || {}),
              image: p.draftProduct.image,
            });
          }
          if (p.action === "pause") engine.pause();
          if (p.action === "resume") {
            if (engine.state.mode === "live" && !twitch.status.connected)
              throw new Error("Reconnect Twitch first.");
            engine.resume();
          }
          companion.proposal = null;
          broadcast();
          await announce(engine.state.companion.message);
          break;
        }
        case "/api/companion/dismiss":
          companion.proposal = null;
          broadcast();
          break;
   default:return false;
  }
  return true;
 };
}

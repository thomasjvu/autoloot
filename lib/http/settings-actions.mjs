import {writeFileSync,renameSync} from 'node:fs';
import {runActive} from '../runs.mjs';
import {LEGAL_VERSION,validateOperator} from '../legal.mjs';
import {cents} from '../engine.mjs';
import {json} from './response.mjs';
export function createSettingsActions({engine,twitch,twitchConfigFile,localHost,broadcast}) {
 return async function action({path,b,req,res}) {
  switch(path) {
        case "/api/operator": {
          if (runActive(engine.state.run) || ['live','paused'].includes(engine.state.auction?.status))
            throw Error('Stop the run and finish the auction before changing seller policies.');
          engine.state.operator = {...validateOperator(b), acknowledgedVersion:LEGAL_VERSION, acknowledgedAt:Date.now()};
          engine.activity('Operator published seller contact and transaction/privacy policies.', 'legal');
          engine.commit(); break;
        }
        case "/api/automation": {
          if(!['manual','review','automatic'].includes(b.mode))throw Error('Choose an automation style.');
          if(runActive(engine.state.run))throw Error('Stop the current run before changing your automation style.');
          engine.state.automation={mode:b.mode};engine.commit();break;
        }
        case "/api/twitch/configure": {
          if(!localHost(req)){json(res,{error:'Configure Twitch from localhost.'},403);return true;}
          if(engine.state.mode==='live' && ['live','paused'].includes(engine.state.auction?.status))throw Error('Finish or cancel the auction before changing the Twitch app.');
          const clientId=String(b.clientId || '').trim(),clientSecret=String(b.clientSecret || '').trim();
          if(!/^[a-zA-Z0-9]{10,128}$/.test(clientId) || !/^[a-zA-Z0-9_-]{10,256}$/.test(clientSecret))throw Error('Enter a valid Twitch client ID and client secret.');
          writeFileSync(twitchConfigFile+'.tmp',JSON.stringify({clientId,clientSecret}),{mode:0o600});
          renameSync(twitchConfigFile+'.tmp',twitchConfigFile);
          twitch.disconnect();twitch.pending.clear();twitch.sessions.clear();
          twitch.client=clientId;twitch.secret=clientSecret;twitch.status.configured=true;twitch.status.error=null;
          broadcast();break;
        }
        case "/api/show":
          if (runActive(engine.state.run)) throw Error("Stop the agent run before changing show terms.");
          const nextSettings = {};
          if (b.shippingPrice !== undefined) {
            const value = Number(b.shippingPrice);
            if (
              !Number.isFinite(value) ||
              value < 0 ||
              value > 10000 ||
              !/^\d+(\.\d{1,2})?$/.test(String(b.shippingPrice))
            )
              throw new Error("Invalid shipping price.");
            nextSettings.shippingPrice = Math.round(value * 100);
          }
          if (b.duration !== undefined) {
            const d = Number(b.duration);
            if (!Number.isInteger(d) || d < 10 || d > 3600)
              throw new Error("Duration must be 10–3600 seconds.");
            nextSettings.bidDuration = d;
          }
          if (b.increment !== undefined)
            nextSettings.increment = cents(b.increment);
          if (typeof b.antiSnipe === "boolean")
            nextSettings.antiSnipe = b.antiSnipe;
          Object.assign(engine.state.show, nextSettings);
          engine.state.show.title = String(
            b.title || engine.state.show.title || "Untitled show",
          )
            .trim()
            .slice(0, 100);
          engine.commit();
          break;
        case "/api/points/settings":
          engine.state.pointsRewardId=String(b.rewardId||'').trim().slice(0,100);engine.commit();break;
        case "/api/twitch/disconnect":
          if (
            engine.state.mode === "live" &&
            engine.state.auction?.status === "live"
          )
            engine.pause();
          twitch.disconnect();
          break;
   default:return false;
  }
  return true;
 };
}

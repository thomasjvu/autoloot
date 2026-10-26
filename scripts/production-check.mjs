import {Vision} from '../lib/vision.mjs';
import {spawnSync} from 'node:child_process';
import {readWorkspace} from '../lib/storage.mjs';
import {DatabaseSync} from 'node:sqlite';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {runtimeConfig} from '../lib/runtime.mjs';
import {operatorConfigured} from '../lib/legal.mjs';
const failures=[];
const check=(label,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failures.push(label);};
try {
 const config=runtimeConfig(),directory=resolve(process.env.DATA_DIR||'.data'),file=join(directory,'autoloot.sqlite');
 check('Production mode',config.production);
 check('Public HTTPS viewer origin',config.base.startsWith('https://'));
 let twitchApp={};
 if(existsSync(join(directory,'twitch-app.json')))twitchApp=JSON.parse(readFileSync(join(directory,'twitch-app.json'),'utf8'));
 check('Twitch credentials',Boolean((twitchApp.clientId||process.env.TWITCH_CLIENT_ID)&&(twitchApp.clientSecret||process.env.TWITCH_CLIENT_SECRET)));
 check('Stripe live key and signed webhooks',Boolean((/^(sk|rk)_live_/.test(process.env.STRIPE_API_KEY||''))&&process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')));
 check('Database exists',existsSync(file));
 if(existsSync(file)) {
  check('Private data directory',(statSync(directory).mode&0o077)===0);
  check('Private database file',(statSync(file).mode&0o077)===0);
  const db=new DatabaseSync(file,{readOnly:true});
  try {
   check('SQLite integrity',db.prepare('PRAGMA integrity_check').get().integrity_check==='ok'&&db.prepare('PRAGMA foreign_key_check').all().length===0);
   const {state}=readWorkspace(db);
   check('Workspace commit integrity',true);
   check('Live workspace',state.mode==='live');
   check('Seller policies configured',operatorConfigured(state.operator));
   check('No practice stock in live inventory',!state.products.some(p=>p.practiceOnly));
   check('No scripted companion in live mode',state.companion.provider!=='demo');
   if(state.companion.provider==='codex'){
    const login=spawnSync(process.env.CODEX_BIN||'codex',['login','status'],{stdio:'ignore',timeout:10000});
    check('Companion CLI authenticated',login.status===0);
   }else console.log('SKIP Companion is offline; AI hosting is unavailable.');
   if(process.env.AUTOLOOT_REQUIRE_VISION==='1'){
    const vision=new Vision(),mode=vision.mode(state.companion);
    if(mode==='cloud')check('Prime vision credentials',vision.status(state.companion).cloudConfigured);
    else {
     let healthy=false;
     try{const response=await fetch(vision.localUrl+'/health',{signal:AbortSignal.timeout(3000),redirect:'error'});const health=await response.json();healthy=response.ok&&health.ready===true&&health.model===vision.model;}catch{}
     check('Local vision model ready',healthy);
    }
   }else console.log('SKIP Vision is optional; set AUTOLOOT_REQUIRE_VISION=1 for a vision-led show.');
   if(state.products.some(p=>p.fulfillment?.type==='nft')) {
    const rpc=JSON.parse(process.env.NFT_RPC_CONFIG||'{}');
    check('NFT RPC for every inventory chain',state.products.filter(p=>p.fulfillment?.type==='nft').every(p=>Boolean(rpc[p.fulfillment.chain])));
    check('Constrained wallet bridge configured',Boolean(process.env.NFT_WALLET_URL&&process.env.NFT_WALLET_TOKEN));
   }
  }finally{db.close();}
 }
 console.log('This checks local configuration only. Verify real payment/delivery flows, off-site restore, TLS routing and monitoring before launch.');
 if(failures.length)process.exitCode=1;
}catch{console.error('Production check failed. Check configuration and database availability.');process.exitCode=1;}

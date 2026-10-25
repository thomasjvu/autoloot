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

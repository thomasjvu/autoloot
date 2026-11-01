// Run under a deployment-scoped Infisical environment. Only provider secrets
// are sent to Wrangler over stdin; no secret arguments, files or logs.
import {spawn} from 'node:child_process';
const allowed=['TWITCH_CLIENT_ID','TWITCH_CLIENT_SECRET','METADATA_SERVICE_KEY','STRIPE_API_KEY','STRIPE_WEBHOOK_SECRET','SHIPPO_API_TOKEN','PRIME_API_KEY','PRIME_TEAM_ID','NFT_RPC_CONFIG','NFT_WALLET_URL','NFT_WALLET_TOKEN','NFT_AGENT_TOKEN','REOWN_PROJECT_ID','SOLANA_USDC_RECIPIENT','SOLANA_PAYMENT_RPC_URL'];
const values=Object.fromEntries(allowed.filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
if(!Object.keys(values).length)throw Error('No deployment provider secrets were injected.');
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk'],{stdio:['pipe','pipe','pipe'],env:process.env});
child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
child.on('error',()=>{console.error('Could not start Wrangler; no secret values logged.');process.exitCode=1;});
child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(values));
child.on('close',code=>{if(code){console.error('Worker secret installation failed. Check Cloudflare authentication, account and Worker name.');process.exitCode=1;}else console.log(`Installed ${Object.keys(values).length} deployment secret names; no values logged.`);});

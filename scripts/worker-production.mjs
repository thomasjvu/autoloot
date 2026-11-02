import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function validateWorkerProduction(config){
  const errors=[];
  let origin;
  try{origin=new URL(config.vars?.PUBLIC_URL);}catch{}
  if(!origin||origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||['localhost','127.0.0.1','[::1]'].includes(origin.hostname))errors.push('PUBLIC_URL must be an HTTPS origin.');
  if(origin?.hostname.endsWith('.example'))errors.push('Replace the example public domain.');
  if(config.workers_dev===false&&!config.routes?.length)errors.push('Configure a public custom domain route.');
  if(config.vars?.AUTOLOOT_SETUP_ONLY!=='1'&&!/^\d+$/.test(config.vars?.AUTOLOOT_OWNER_TWITCH_ID||''))errors.push('Set the numeric owner Twitch ID.');
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(config.vars?.AUTOLOOT_WORKSPACE_ID||''))errors.push('Set a stable workspace ID.');
  const id=config.d1_databases?.find(d=>d.binding==='DB')?.database_id;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')||id==='00000000-0000-0000-0000-000000000000')errors.push('Set the provisioned D1 database ID.');
  if(!config.r2_buckets?.some(b=>b.binding==='MEDIA'&&b.bucket_name))errors.push('Configure the MEDIA R2 bucket.');
  if(!config.durable_objects?.bindings?.some(b=>b.name==='WORKSPACES'&&b.class_name==='Workspace'))errors.push('Configure the WORKSPACES Durable Object.');
  if(config.vars?.METADATA_MODE==='demo')errors.push('Production Metadata must use auto or api mode.');
  return errors;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const path=process.env.AUTOLOOT_WORKER_CONFIG||'wrangler.production.json';
  let config;
  try{config=JSON.parse(readFileSync(path,'utf8'));}catch{console.error(`Create ${path} from wrangler.production.example.json with deployment resource IDs.`);process.exit(1);}
  const errors=validateWorkerProduction(config);
  if(errors.length){for(const error of errors)console.error(error);process.exit(1);}
  const action=process.argv[2]||'check';
  const args=action==='deploy'?['deploy']:action==='migrate'?['d1','migrations','apply','DB','--remote']:action==='build'?['deploy','--dry-run','--outdir','.worker-build/production']:null;
  if(!args){console.log('Production Worker configuration passed. Provider secrets and remote resources must be verified separately.');}
  else{const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config',path],{stdio:'inherit'});process.exit(result.status??1);}
}

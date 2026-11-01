import {transition} from './lifecycles.mjs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

const processGraph={closed:['initializing'],initializing:['ready','closed'],ready:['closed']};
const authGraph={idle:['starting'],starting:['pending','idle','failed'],pending:['completed','failed','idle'],completed:['idle'],failed:['idle']};

// Authentication only: never create threads or forward model/tool requests.
// Codex owns credentials in its existing home/keychain; browser responses are allowlisted.
export class CodexConnection {
 constructor({spawnProcess=spawn,env=process.env}={}){
  this.spawnProcess=spawnProcess;this.env=env;this.pending=new Map();this.sequence=0;
  this.lifecycle={process:'closed',auth:'idle'};this.authGeneration=0;
  this.child=null;this.ready=null;this.login=null;this.timer=null;this.starting=null;
 }
 get state(){return {...this.lifecycle};}
 async ensure(){
  if(this.ready)return this.ready;
  transition(this.lifecycle,'process','initializing',processGraph,'Codex process');
  this.ready=(async()=>{
   const allowed=['PATH','HOME','TMPDIR','CODEX_HOME','CODEX_API_KEY','OPENAI_API_KEY','CODEX_ACCESS_TOKEN','LANG','LC_ALL','HTTPS_PROXY','HTTP_PROXY','NO_PROXY','SSL_CERT_FILE','NODE_EXTRA_CA_CERTS'];
   const child=this.spawnProcess(this.env.CODEX_BIN||'codex',['app-server'],{env:Object.fromEntries(allowed.filter(k=>this.env[k]!==undefined).map(k=>[k,this.env[k]])),stdio:['pipe','pipe','ignore']});
   this.child=child;
   const fail=()=>{if(this.child!==child)return;this.close();};
   child.on('error',fail);child.on('close',fail);child.stdin.on('error',fail);
   const lines=createInterface({input:child.stdout});
   lines.on('line',line=>{
    if(line.length>1048576){fail();return;}
    let message;try{message=JSON.parse(line);}catch{return;}
    if(message.id!=null){const request=this.pending.get(message.id);if(!request)return;this.pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(Error('Codex could not complete this step. Update Codex or try again.')):request.resolve(message.result);}
    else if(message.method==='account/login/completed'&&this.login?.loginId===message.params?.loginId){
     clearTimeout(this.timer);this.timer=null;
     transition(this.lifecycle,'auth',message.params.success?'completed':'failed',authGraph,'Codex login');
     this.login=message.params.success?{completed:true}:{error:'Sign-in was cancelled or failed. Try again.'};
    }
   });
   await this.rpc('initialize',{clientInfo:{name:'autoloot',title:'Autoloot',version:'0.2.0'}});
   child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
   if(this.child===child)transition(this.lifecycle,'process','ready',processGraph,'Codex process');
  })();
  try{await this.ready;}catch{this.close();throw Error('Codex is unavailable. Install or update the Codex CLI on this computer, then try again.');}
 }
 rpc(method,params){
  return new Promise((resolve,reject)=>{
   const id=++this.sequence;
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Codex connection timed out. Try again.'));},15000);
   this.pending.set(id,{resolve,reject,timer});
   try{this.child.stdin.write(JSON.stringify({id,method,params})+'\n');}catch{clearTimeout(timer);this.pending.delete(id);reject(Error('Codex connection closed. Try again.'));}
  });
 }
 async status(){
  await this.ensure();
  const result=await this.rpc('account/read',{refreshToken:false});
  const account=result?.account;
  const connected=Boolean(account&&['chatgpt','apiKey'].includes(account.type));
  return {connected,method:connected?(account.type==='chatgpt'?'ChatGPT':'API key'):null,pending:!connected&&Boolean(this.login?.loginId),...(this.login?.error?{error:this.login.error}:{})};
 }
 async start(){
  if(this.starting)return this.starting;
  this.starting=this.begin();
  try{return await this.starting;}finally{this.starting=null;}
 }
 async begin(){
  const attempt=this.authGeneration;
  const state=await this.status();
  if(attempt!==this.authGeneration)throw Error('Sign-in was cancelled. Try again.');
  if(state.connected)return state;
  if(this.login?.loginId)return {...state,authUrl:this.login.authUrl};
  transition(this.lifecycle,'auth','idle',authGraph,'Codex login');
  transition(this.lifecycle,'auth','starting',authGraph,'Codex login');
  let result;try{result=await this.rpc('account/login/start',{type:'chatgpt'});}catch(error){if(attempt===this.authGeneration&&this.lifecycle.auth==='starting')transition(this.lifecycle,'auth','failed',authGraph,'Codex login');throw error;}
  if(attempt!==this.authGeneration){if(this.child&&result.loginId)await this.rpc('account/login/cancel',{loginId:result.loginId});throw Error('Sign-in was cancelled. Try again.');}
  let url;try{url=new URL(result.authUrl);}catch{transition(this.lifecycle,'auth','failed',authGraph,'Codex login');throw Error('Codex returned an invalid sign-in link.');}
  if(url.origin!=='https://auth.openai.com'||url.username||url.password||!result.loginId){transition(this.lifecycle,'auth','failed',authGraph,'Codex login');throw Error('Codex returned an unsupported sign-in link.');}
  transition(this.lifecycle,'auth','pending',authGraph,'Codex login');
  this.login={loginId:result.loginId,authUrl:url.href};
  clearTimeout(this.timer);this.timer=setTimeout(()=>{this.cancel().catch(()=>this.close());},10*60000);this.timer.unref?.();
  return {connected:false,pending:true,authUrl:url.href};
 }
 async apiKey(key){
  if(typeof key!=='string'||!key.trim()||key.length>512)throw Error('Enter your OpenAI API key.');
  await this.ensure();await this.cancel();
  await this.rpc('account/login/start',{type:'apiKey',apiKey:key.trim()});
  return this.status();
 }
 async cancel(){
  this.authGeneration++;
  transition(this.lifecycle,'auth','idle',authGraph,'Codex login');
  const login=this.login;this.login=null;clearTimeout(this.timer);this.timer=null;
  if(login?.loginId&&this.child)await this.rpc('account/login/cancel',{loginId:login.loginId});
  return {ok:true};
 }
 close(){
  this.authGeneration++;
  transition(this.lifecycle,'process','closed',processGraph,'Codex process');
  transition(this.lifecycle,'auth','idle',authGraph,'Codex login');
  clearTimeout(this.timer);this.timer=null;this.login=null;this.ready=null;
  const child=this.child;this.child=null;
  for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(Error('Codex connection closed. Try again.'));}
  this.pending.clear();child?.kill('SIGTERM');
 }
}

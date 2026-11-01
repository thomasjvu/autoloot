import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

// Authentication only: never create threads or forward model/tool requests.
// Codex owns credentials in its existing home/keychain; browser responses are allowlisted.
export class CodexConnection {
 constructor({spawnProcess=spawn,env=process.env}={}){
  this.spawnProcess=spawnProcess;this.env=env;this.pending=new Map();this.sequence=0;
  this.child=null;this.ready=null;this.login=null;this.timer=null;this.starting=null;
 }
 async ensure(){
  if(this.ready)return this.ready;
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
     this.login=message.params.success?{completed:true}:{error:'Sign-in was cancelled or failed. Try again.'};
    }
   });
   await this.rpc('initialize',{clientInfo:{name:'autoloot',title:'Autoloot',version:'0.2.0'}});
   child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
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
  const state=await this.status();
  if(state.connected)return state;
  if(this.login?.loginId)return {...state,authUrl:this.login.authUrl};
  const result=await this.rpc('account/login/start',{type:'chatgpt'});
  let url;try{url=new URL(result.authUrl);}catch{throw Error('Codex returned an invalid sign-in link.');}
  if(url.origin!=='https://auth.openai.com'||url.username||url.password||!result.loginId)throw Error('Codex returned an unsupported sign-in link.');
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
  const login=this.login;this.login=null;clearTimeout(this.timer);this.timer=null;
  if(login?.loginId&&this.child)await this.rpc('account/login/cancel',{loginId:login.loginId});
  return {ok:true};
 }
 close(){
  clearTimeout(this.timer);this.timer=null;this.login=null;this.ready=null;
  const child=this.child;this.child=null;
  for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(Error('Codex connection closed. Try again.'));}
  this.pending.clear();child?.kill('SIGTERM');
 }
}

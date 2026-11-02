// Isolated local practice rehearsal via the app's normal authenticated actions.
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
const base='http://127.0.0.1:4175',password='Practice1!'+randomBytes(24).toString('hex');
let cookie='',admin='';
async function request(path,data){const r=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(admin?{'x-autoloot-admin':admin}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const value=await r.json();if(!r.ok)throw Error(value.error||path);return value;}
const status=await request('/api/admin/status');if(status.configured)throw Error('Use a fresh isolated DATA_DIR for each recording session.');
await request('/api/admin/setup',{username:'munny_rehearsal',password});const bootstrap=await request('/api/bootstrap');admin=bootstrap.admin;
if(bootstrap.state.mode!=='demo')throw Error('Practice mode required.');
const log=[];const save=()=>writeFile(new URL('../capture/bid-sequence.json',import.meta.url),JSON.stringify(log,null,2));
const rl=createInterface({input:process.stdin,output:process.stdout});await rl.question('Practice workspace ready. Start OBS recording, then press Enter: ');rl.close();
const zero=Date.now();async function act(path,data){await request(path,data);const s=await fetch(base+'/api/state').then(r=>r.json());log.push({seconds:(Date.now()-zero)/1000,action:path,amount:s.auction?.highest?.amount||s.auction?.product.price,status:s.auction?.status,endsAt:s.auction?.endsAt});await save();console.log(JSON.stringify(log.at(-1)));}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await act('/api/auction/start',{productId:'p1',duration:45});
for(const [delay,username,amount] of [[5000,'cozycollector','45'],[6000,'cardfan','50'],[6000,'cozycollector','60'],[24000,'cardfan','65']]){await wait(delay);await act('/api/demo/bid',{username,amount});}
await wait(11500);await act('/api/auction/finish',{});console.log('Practice bid take complete. Stop OBS recording.');

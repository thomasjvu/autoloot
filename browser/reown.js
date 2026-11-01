import UniversalProvider from '@walletconnect/universal-provider';
import QRCode from 'qrcode';
const chain='solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
let provider;
export async function payUsdc(config,prepare){
 if(!config.projectId)throw Error('Seller wallet checkout is not configured.');
 provider ||= await UniversalProvider.init({projectId:config.projectId,metadata:{name:'Autoloot',description:'Pay an Autoloot order with USDC on Solana',url:location.origin,icons:[location.origin+'/icon-192.png']}});
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Connect payment wallet');
 dialog.innerHTML='<form method="dialog"><button aria-label="Close wallet connection" style="float:right;padding:8px">✕</button></form><h2>Connect your wallet</h2><p>Scan with a WalletConnect-compatible Solana wallet.</p><canvas aria-label="Wallet connection QR code"></canvas><p><a target="_blank" rel="noopener noreferrer">Open wallet connection</a></p><p role="status"></p>';
 document.body.append(dialog);dialog.showModal();
 let closed=false,timer;dialog.addEventListener('close',()=>{closed=true;provider.abortPairingAttempt();});const message=dialog.querySelector('[role=status]');
 const showUri=uri=>{if(closed)return;if(typeof uri!=='string'||!/^wc:[a-f0-9]{64}@2\?/i.test(uri)){message.textContent='Invalid wallet connection request.';return;}QRCode.toCanvas(dialog.querySelector('canvas'),uri,{width:240,margin:1}).catch(()=>{message.textContent='Unable to draw QR code. Use the connection link.';});dialog.querySelector('a').href=uri;};
 provider.on('display_uri',showUri);
 try{
  if(!provider.session){
   const connect=provider.connect({namespaces:{solana:{chains:[chain],methods:['solana_signAndSendTransaction'],events:['accountsChanged','chainChanged']}}});
   await Promise.race([connect,new Promise((_,reject)=>dialog.addEventListener('close',()=>reject(Error('Wallet connection cancelled.')),{once:true})),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Wallet connection expired. Try again.')),120000))]);
  }
  if(closed)throw Error('Wallet connection cancelled.');
  const accounts=provider.session?.namespaces?.solana?.accounts||[];
  const account=accounts.find(value=>value.startsWith(chain+':'));
  if(!account)throw Error('Connect a Solana mainnet wallet.');
  const payer=account.slice(chain.length+1),quote=await prepare(payer);
  if(closed)throw Error('Wallet payment cancelled.');
  message.textContent='Confirm the USDC payment in your wallet.';
  const result=await provider.request({method:'solana_signAndSendTransaction',params:{transaction:quote.transaction}},chain);
  const signature=typeof result==='string'?result:result?.signature;
  if(!signature)throw Error('No transaction signature returned. Recover it from your wallet before retrying.');
  return signature;
 }finally{closed=true;clearTimeout(timer);provider.removeListener('display_uri',showUri);dialog.close();dialog.remove();}
}

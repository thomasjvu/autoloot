// SSE transport owns subscriptions/backpressure, not authorization decisions or DTOs.
// The current request's admin session is rechecked on every delivery path.
export function createEventHub({stateFor,adminValid,setInterval:setTimer=setInterval,clearInterval:clearTimer=clearInterval}) {
 const clients=new Set();
 const authorized=client=>client.role!=='admin'||adminValid(client.request);
 const snapshot=role=>`data: ${JSON.stringify(stateFor(role))}\n\n`;
 function broadcast(){
  const messages=new Map();
  for(const client of clients){
   if(client.res.destroyed)continue;
   if(!authorized(client)){client.res.end();continue;}
   if(client.res.writableNeedDrain){client.pending=true;continue;}
   if(!messages.has(client.role))messages.set(client.role,snapshot(client.role));
   client.pending=false;client.res.write(messages.get(client.role));
  }
 }
 function connect(request,res,role,settle){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
  const client={res,request,role};clients.add(client);
  settle(); // A registered long-lived stream must not hold shutdown request accounting.
  res.write(snapshot(role));
  res.on('drain',()=>{
   if(!authorized(client)){res.end();return;}
   if(client.pending&&!res.destroyed){client.pending=false;res.write(snapshot(role));}
  });
  res.on('error',()=>res.destroy());
  const keep=setTimer(()=>{
   if(!authorized(client)){res.end();return;}
   if(!res.writableNeedDrain)res.write(': keepalive\n\n');
  },15000);
  res.on('close',()=>{clients.delete(client);clearTimer(keep);});
 }
 return {clients,broadcast,connect,close(){for(const client of clients)client.res.end();}};
}

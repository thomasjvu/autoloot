// Fetch-native SSE. Each slow reader retains at most one pending snapshot;
// authorization is rechecked before every delivery and keepalive.
export function createEventHub({stateFor,adminValid,setInterval:setTimer=setInterval,clearInterval:clearTimer=clearInterval}){
  const clients=new Set(),encoder=new TextEncoder();
  const authorized=client=>client.role!=='admin'||adminValid(client.request);
  function deliver(client,keepalive=false){
    if(client.closed)return;
    if(!authorized(client)){client.close();return;}
    if(client.controller.desiredSize<=0){if(!keepalive)client.pending=true;return;}
    const message=keepalive?': keepalive\n\n':`data: ${JSON.stringify(stateFor(client.role))}\n\n`;
    client.pending=false;
    try{client.controller.enqueue(encoder.encode(message));}catch{client.close();}
  }
  function connect(request,role,settle,signal){
    let timer;
    const client={request,role,pending:false,closed:false,close(){
      if(client.closed)return;client.closed=true;clients.delete(client);
      if(timer!==undefined)clearTimer(timer);
      signal?.removeEventListener('abort',client.close);
      try{client.controller?.close();}catch{}
    }};
    const stream=new ReadableStream({
      start(controller){client.controller=controller;clients.add(client);deliver(client);},
      pull(){if(client.pending)deliver(client);},
      cancel(){client.close();},
    });
    if(signal?.aborted)client.close();
    else {signal?.addEventListener('abort',client.close,{once:true});timer=setTimer(()=>deliver(client,true),15000);}
    settle();
    return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache'}});
  }
  return {clients,connect,broadcast(){for(const client of clients)deliver(client);},close(){for(const client of clients)client.close();}};
}

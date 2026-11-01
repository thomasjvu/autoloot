// Deterministic provider transport used only by the workerd integration test.
export default {async fetch(request){
  const url=new URL(request.url);
  if(url.hostname==='id.twitch.tv'&&url.pathname==='/oauth2/token'){
    const input=await request.formData();return Response.json({access_token:input.get('code')||'owner',refresh_token:'fixture-refresh'});
  }
  if(url.hostname==='id.twitch.tv'&&url.pathname==='/oauth2/validate'){
    const owner=request.headers.get('Authorization')==='OAuth owner';
    return Response.json({user_id:owner?'42':'99',login:owner?'fixture_owner':'fixture_buyer',client_id:'fixture-client',scopes:['user:read:chat','user:write:chat','channel:read:redemptions']});
  }
  if(url.hostname==='api.twitch.tv')return Response.json({data:[]});
  if(url.hostname==='eventsub.wss.twitch.tv'){
    const pair=new WebSocketPair();pair[1].accept();
    pair[1].send(JSON.stringify({metadata:{message_type:'session_welcome'},payload:{session:{id:'fixture-session',keepalive_timeout_seconds:600}}}));
    return new Response(null,{status:101,webSocket:pair[0]});
  }
  return new Response('Unexpected external request blocked by integration fixture.',{status:502});
}};

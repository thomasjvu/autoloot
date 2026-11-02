import {Hono} from 'hono';

// Hosted Node never exposes local password setup or account linking.
export function createHostedNodeAuth({twitch,owner,events}){
  const auth={
    loginPath:'/auth/twitch?role=streamer',
    get username(){return twitch.user?.login||null;},
    valid(req){const session=twitch.session(req.headers.cookie);return session?.role==='streamer'&&session.id===owner;},
  };
  const routes=new Hono();
  routes.get('/api/admin/status',c=>c.json({configured:true,authenticated:auth.valid(c.get('request')),hosted:true,legacyPasswordOnly:false}));
  for(const path of ['/api/admin/setup','/api/admin/login','/api/admin/twitch/unlink'])routes.post(path,c=>c.json({error:'Hosted workspaces require the configured Twitch owner.'},403));
  routes.post('/api/admin/logout',c=>{
    const req=c.get('request');
    if(!auth.valid(req))return c.json({error:'Admin sign-in required.'},401);
    twitch.logout(req.headers.cookie);
    for(const client of events.clients)if(client.role==='admin'&&!auth.valid(client.request))client.close();
    c.header('Set-Cookie','autoloot_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    return c.json({ok:true});
  });
  return {auth,routes};
}

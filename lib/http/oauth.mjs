import {Hono} from 'hono';
import {randomBytes} from 'node:crypto';
export function createOauth({base,twitch,storage,oauthHandoffs,canStartStreamerLogin=({adminAccess})=>adminAccess,onStreamerLogin=()=>{}}) {
 const router=new Hono();
  router.all('/auth/twitch',handle);
  router.get('/auth/twitch/handoff',handle);
  router.all('/auth/twitch/callback',handle);
 return router;
 async function handle(c){
  const req=c.get('request'),{adminAccess,session}=c.get('prepared'),url=new URL(c.req.url),path=url.pathname;

    if(path === "/auth/twitch/handoff" && req.method === 'GET'){
      if(req.headers.host!==new URL(base).host)throw Error('Finish sign-in on the public storefront.');
      const ticket=url.searchParams.get('ticket'),pending=oauthHandoffs.get(ticket);oauthHandoffs.delete(ticket);
      if(!pending||Date.now()-pending.at>60000)throw Error('Sign-in handoff expired. Start again.');
      const nonce=randomBytes(32).toString('hex');
      return c.body(null,302,{Location:twitch.login(pending.role,nonce),'Set-Cookie':`autoloot_oauth=${nonce}; HttpOnly; SameSite=Lax; Path=/auth/twitch/callback; Max-Age=600${base.startsWith('https:')?'; Secure':''}`});
    }
    if (path === "/auth/twitch") {
      const role =
        url.searchParams.get("role") === "streamer" ? "streamer" : "viewer";
      if (role === "streamer" && !canStartStreamerLogin({req,adminAccess}))
        throw new Error("Open Connections in your local streamer dashboard.");
      if(!twitch.status.configured) {
        return c.body(null,302,{Location:role==='streamer'?'/twitch-setup.html':'/shop'});
      }
      if(req.headers.host!==new URL(base).host){
        for(const [key,value] of oauthHandoffs)if(Date.now()-value.at>60000)oauthHandoffs.delete(key);
        if(oauthHandoffs.size>=1000)throw Error('Sign-in capacity reached. Try again later.');
        const ticket=randomBytes(32).toString('hex');oauthHandoffs.set(ticket,{role,at:Date.now()});
        return c.body(null,302,{Location:base+'/auth/twitch/handoff?ticket='+ticket});
      }
      const nonce=randomBytes(32).toString("hex");
      return c.body(null,302,{ Location: twitch.login(role,nonce), "Set-Cookie": `autoloot_oauth=${nonce}; HttpOnly; SameSite=Lax; Path=/auth/twitch/callback; Max-Age=600${base.startsWith("https:")?"; Secure":""}` });
    }
    if (path === "/auth/twitch/callback") {
      if (url.searchParams.get("error"))
        throw new Error("Twitch login was cancelled.");
      const result = await twitch.callback(
        url.searchParams.get("code"),
        url.searchParams.get("state"),
        String(req.headers.cookie||"" ).split(";").map(v=>v.trim()).find(v=>v.startsWith("autoloot_oauth="))?.slice(15),
      );
      if(result.role==='streamer')await onStreamerLogin();
      if(result.role==='streamer')storage.recordAudit({requestId:randomBytes(16).toString('hex'),action:'GET /auth/twitch/callback',outcome:'completed',status:302});
      return c.body(null,302,{
        "Set-Cookie": [`autoloot_session=${result.session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${base.startsWith("https:") ? "; Secure" : ""}`,`autoloot_oauth=; HttpOnly; SameSite=Lax; Path=/auth/twitch/callback; Max-Age=0${base.startsWith("https:")?"; Secure":""}`],
        Location: result.role === "streamer" ? "/" : "/shop",
      });
    }
 }
}

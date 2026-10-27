import {randomBytes} from 'node:crypto';
export function createOauth({base,twitch,storage,oauthHandoffs}) {
 return async function handle({req,res,path,url,adminAccess,session}) {
  if(!(path==='/auth/twitch' || path==='/auth/twitch/handoff' && req.method==='GET' || path==='/auth/twitch/callback'))return false;
  await dispatch();
  return true;
  async function dispatch() {
    if(path === "/auth/twitch/handoff" && req.method === 'GET'){
      if(req.headers.host!==new URL(base).host)throw Error('Finish sign-in on the public storefront.');
      const ticket=url.searchParams.get('ticket'),pending=oauthHandoffs.get(ticket);oauthHandoffs.delete(ticket);
      if(!pending||Date.now()-pending.at>60000)throw Error('Sign-in handoff expired. Start again.');
      const nonce=randomBytes(32).toString('hex');
      res.writeHead(302,{Location:twitch.login(pending.role,nonce),'Set-Cookie':`autoloot_oauth=${nonce}; HttpOnly; SameSite=Lax; Path=/auth/twitch/callback; Max-Age=600${base.startsWith('https:')?'; Secure':''}`});return res.end();
    }
    if (path === "/auth/twitch") {
      const role =
        url.searchParams.get("role") === "streamer" ? "streamer" : "viewer";
      if (role === "streamer" && !adminAccess)
        throw new Error("Open Connections in your local streamer dashboard.");
      if(!twitch.status.configured) {
        res.writeHead(302,{Location:role==='streamer'?'/twitch-setup.html':'/shop'});
        return res.end();
      }
      if(req.headers.host!==new URL(base).host){
        for(const [key,value] of oauthHandoffs)if(Date.now()-value.at>60000)oauthHandoffs.delete(key);
        if(oauthHandoffs.size>=1000)throw Error('Sign-in capacity reached. Try again later.');
        const ticket=randomBytes(32).toString('hex');oauthHandoffs.set(ticket,{role,at:Date.now()});
        res.writeHead(302,{Location:base+'/auth/twitch/handoff?ticket='+ticket});return res.end();
      }
      const nonce=randomBytes(32).toString("hex");
      res.writeHead(302, { Location: twitch.login(role,nonce), "Set-Cookie": `autoloot_oauth=${nonce}; HttpOnly; SameSite=Lax; Path=/auth/twitch/callback; Max-Age=600${base.startsWith("https:")?"; Secure":""}` });
      return res.end();
    }
    if (path === "/auth/twitch/callback") {
      if (url.searchParams.get("error"))
        throw new Error("Twitch login was cancelled.");
      const result = await twitch.callback(
        url.searchParams.get("code"),
        url.searchParams.get("state"),
        String(req.headers.cookie||"" ).split(";").map(v=>v.trim()).find(v=>v.startsWith("autoloot_oauth="))?.slice(15),
      );
      if(result.role==='streamer')storage.recordAudit({requestId:randomBytes(16).toString('hex'),action:'GET /auth/twitch/callback',outcome:'completed',status:302});
      res.writeHead(302, {
        "Set-Cookie": [`autoloot_session=${result.session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${base.startsWith("https:") ? "; Secure" : ""}`,`autoloot_oauth=; HttpOnly; SameSite=Lax; Path=/auth/twitch/callback; Max-Age=0${base.startsWith("https:")?"; Secure":""}`],
        Location: result.role === "streamer" ? "/" : "/shop",
      });
      return res.end();
    }
  }
 };
}

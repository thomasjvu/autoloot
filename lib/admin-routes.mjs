import {Hono} from 'hono';
import {body} from './http/response.mjs';
const sessionCookie=(req,token,maxAge)=>`autoloot_admin=${token}; HttpOnly; SameSite=Strict; Path=/${maxAge==null?'':'; Max-Age='+maxAge}${req.socket.encrypted?'; Secure':''}`;

export function createAdminRoutes({auth,clients,localHost}){
  const router=new Hono();
  router.use('/api/admin/*',async(c,next)=>{
    if(!localHost(c.get('request')))return c.json({error:'Local administrator access required.'},403);
    await next();
  });
  router.all('/api/admin/status',c=>c.json({configured:auth.configured,authenticated:auth.valid(c.get('request')),legacyPasswordOnly:auth.legacyPasswordOnly}));
  for(const path of ['/api/admin/setup','/api/admin/login'])router.post(path,async c=>{
    const input=await body(c.req.raw);
    const token=await auth.login(input.password,path==='/api/admin/setup',input.username,input.remember===true);
    c.header('Set-Cookie',sessionCookie(c.get('request'),token,input.remember===true?30*86400:null));
    return c.json({ok:true});
  });
  router.post('/api/admin/logout',c=>{
    const req=c.get('request');
    if(!auth.valid(req))return c.json({error:'Admin sign-in required.'},401);
    auth.logout(req);
    c.header('Set-Cookie',sessionCookie(req,'',0));
    for(const client of clients)if(client.role==='admin'&&!auth.valid(client.request))client.close();
    return c.json({ok:true});
  });
  return router;
}

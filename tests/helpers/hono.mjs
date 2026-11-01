import {Hono} from 'hono';
import {body} from '../../lib/http/response.mjs';
// Exercise route groups through Fetch, without Node request/response doubles.
export function routeApp(router,{request,prepared={}}={}){
  const app=new Hono();
  app.onError((e,c)=>c.json({error:e.message},400));
  app.use('*',async(c,next)=>{
    const url=new URL(c.req.url);
    c.set('request',request||{method:c.req.method,url:url.pathname+url.search,headers:{...Object.fromEntries(c.req.raw.headers),host:url.host},socket:{}});
    c.set('prepared',prepared);
    if(c.req.method==='POST'&&c.req.header('content-type')==='application/json')c.set('input',await body(c.req.raw.clone()));
    await next();
  });
  app.route('/',router);
  return app;
}
export const post=(app,path,input)=>app.request('http://localhost'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});

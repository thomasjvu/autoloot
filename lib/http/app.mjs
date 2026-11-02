import {storeAccessMiddleware} from './store-access.mjs';
import {Hono} from 'hono';
import {body} from './response.mjs';
import {createAdminRoutes} from '../auth/admin-routes.mjs';
import {createOauth} from './oauth.mjs';
import {createViewer} from './viewer.mjs';
import {createMedia} from './media.mjs';
import {createExports} from './exports.mjs';
import {createStaticRoutes} from './static.mjs';
import {createInventoryActions} from './inventory-actions.mjs';
import {createCommerceActions} from './commerce-actions.mjs';
import {createShowActions} from './show-actions.mjs';
import {createCompanionActions} from './companion-actions.mjs';
import {createSettingsActions} from './settings-actions.mjs';
import {isNft} from '../commerce/nft.mjs';
import {LEGAL_VERSION,operatorProfile,operatorConfigured} from '../commerce/legal.mjs';

// All routes speak Fetch/Hono. Platform services supply persistence, assets,
// secrets, peer identity and the local companion; no Node response bridge.
export function createHttpApp({policy,requestContext,...services}){
  const {auth,events,localHost,admin,port,base,engine,nft,catalog,rip,metadata,stateFor}=services;
  const app=new Hono();
  app.onError((error,c)=>c.json({error:error instanceof SyntaxError?'Invalid JSON request.':error.message},400));
  app.use('*',async(c,next)=>{c.set('request',requestContext(c));await next();});
  app.use('*',policy.middleware);
  app.use('/api/rip/*',async(c,next)=>{if(!engine.features.ripStudio)return c.json({error:'Rip Studio is coming soon.'},403);await next();});
  app.use('*',storeAccessMiddleware({...services,events}));
  app.route('/',services.authRoutes||createAdminRoutes({...services,clients:events.clients}));
  app.all('/',async(c,next)=>{
    const req=c.get('request');
    if((services.hosted||localHost(req))&&!auth.valid(req))return c.redirect(auth.loginPath||'/admin-login.html',302);
    await next();
  });
  app.all('/api/bootstrap',c=>{
    const req=c.get('request');
    if(!localHost(req))return c.json({error:'Open the streamer dashboard at localhost.'},403);
    if(!auth.valid(req))return c.json({error:'Admin sign-in required.'},401);
    return c.json({admin,overlayUrl:services.hosted?base+'/overlay':`http://localhost:${port}/overlay`,viewerUrl:base+'/shop',state:stateFor('admin')});
  });
  app.get('/api/nft/jobs',c=>{
    const {adminAccess,nftAgent}=c.get('prepared');
    if(!adminAccess&&!nftAgent)return c.json({error:'NFT agent or streamer access required.'},403);
    return c.json({jobs:engine.state.orders.filter(o=>isNft(o)&&o.delivery&&['paid','paid-external'].includes(o.status)&&(adminAccess||o.delivery.allowTransfer)).map(o=>({...nft.manifest(o),status:o.delivery.status,transactionId:o.delivery.transactionId||null,error:o.delivery.error||null}))});
  });
  app.post('/api/nft/submit',async c=>{
    const {adminAccess,nftAgent}=c.get('prepared');
    if(!adminAccess&&!nftAgent)return c.json({error:'NFT agent or streamer access required.'},403);
    const b=await body(c.req.raw),o=engine.order(b.id);
    if(!adminAccess&&!o.delivery?.allowTransfer)return c.json({error:'NFT transfer was not authorized for agent execution.'},403);
    nft.submit(o.id,b.transactionId);return c.json({ok:true});
  });
  app.get('/api/legal',c=>c.json({version:LEGAL_VERSION,operator:operatorProfile(engine.state.operator),configured:operatorConfigured(engine.state.operator)}));
  app.all('/api/state',c=>c.json(stateFor(c.get('prepared').adminAccess?'admin':'viewer')));
  app.all('/api/events',c=>{
    const {adminAccess,settle}=c.get('prepared');
    if(new URL(c.req.url).searchParams.has('admin')&&!adminAccess)return c.json({error:'Admin session expired.'},403);
    if(events.clients.size>=200)return c.json({error:'Viewer connection limit reached.'},429);
    return events.connect(c.get('request'),adminAccess?'admin':'viewer',settle,c.req.raw.signal);
  });
  if(services.platformRoutes)app.route('/',services.platformRoutes);
  app.route('/',createOauth(services));
  app.route('/',createViewer(services));
  app.route('/',createMedia(services));
  app.get('/api/metadata/status',c=>{
    if(!c.get('prepared').adminAccess)return c.json({error:'Streamer access required.'},403);
    return c.json({mode:metadata.mode,source:metadata.base,keyConfigured:Boolean(metadata.key)});
  });
  app.use('/api/*',async(c,next)=>{
    if(c.req.method!=='POST')return next();
    const {adminAccess,auditContext}=c.get('prepared');
    if(!adminAccess)return c.json({error:'Streamer access required.'},403);
    const b=await body(c.req.raw,c.req.path.startsWith('/api/import/')?1500000:32768);
    c.set('input',b);
    if(auditContext.action){
      const operation=['ship','cancel','refund','test-pay','confirm-paid'].includes(b.action)?b.action:null;
      const target=engine.state.orders.find(order=>order.id===b.id)?.number||engine.state.products.find(product=>product.id===b.id)?.id;
      if(operation)auditContext.action+=' · '+operation;
      if(target)auditContext.action+=' ['+target+']';
    }
    await next();
  });
  const actions={
    '/api/catalog/search':b=>catalog.search(b),
    '/api/catalog/select':b=>catalog.select(b.id),
    '/api/catalog/add':b=>catalog.add(engine,b),
    '/api/rip/search':b=>rip.search(b),
    '/api/rip/select':b=>rip.select(b.id),
    '/api/rip/confirm':b=>rip.confirm(b),
    '/api/rip/clear':()=>rip.clear(),
  };
  for(const [path,action]of Object.entries(actions))app.post(path,async c=>{await action(c.get('input'));return c.json({ok:true,state:stateFor('admin')});});
  for(const create of [createInventoryActions,createCommerceActions,createShowActions,createCompanionActions,createSettingsActions])app.route('/',create(services));
  app.route('/',createExports(services));
  app.post('/api/*',c=>c.json({error:'Unknown action.'},404));
  app.route('/',createStaticRoutes(services));
  return app;
}

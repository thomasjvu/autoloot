import {Hono} from 'hono';
export function createStaticRoutes({assets,docsOrigin}){
  const router=new Hono();
  router.all('*',async c=>{
    const url=new URL(c.req.url),path=url.pathname;
    if(docsOrigin&&['GET','HEAD'].includes(c.req.method)&&(path==='/docs'||path.startsWith('/docs/')||path==='/help'||path==='/help.html')){
      const target=new URL(path.startsWith('/help')?'/docs/getting-started/faq':path,docsOrigin);target.search=url.search;
      return c.redirect(target.href,302);
    }
    if(path==='/help'||path==='/help.html')return c.redirect('/docs/getting-started/faq',302);
    const safe=(path==='/'||/^\/[a-zA-Z0-9_./-]+$/.test(path))&&!path.includes('..');
    const faq=['/docs/getting-started/faq','/docs/getting-started/faq/','/docs/getting-started/faq.html'].includes(path);
    const docs=path==='/docs'||['/docs/','/assets/','/docs-content/','/pagefind/'].some(p=>path.startsWith(p))||['/docs-index.json','/docs-collection.json','/docs-last-updated.json','/docs-references.json','/file.svg','/folder.svg'].includes(path);
    if(docs&&safe){
      const asset=await assets.readDocs(faq?'/docs/getting-started/faq':path==='/docs'?'/docs.html':path);
      if(asset)return c.body(asset.body,200,{'Content-Type':asset.type});
    }
    const page=faq?'/help.html':['/privacy','/terms','/404'].includes(path)&&['GET','HEAD'].includes(c.req.method)?path+'.html':['/','/shop','/overlay'].includes(path)?'/index.html':path;
    const asset=safe?await assets.read(page):null;
    if(asset)return c.body(asset.body,path==='/404'?404:200,{'Content-Type':asset.type});
    if(path.startsWith('/api/'))return c.json({error:'Not found.'},404);
    const missing=await assets.read('/404.html');
    return missing?c.body(missing.body,404,{'Content-Type':missing.type}):c.text('Not found.',404);
  });
  return router;
}

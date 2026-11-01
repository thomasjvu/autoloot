import {existsSync,statSync,readFileSync} from 'node:fs';
import {join,extname} from 'node:path';
import {json} from './response.mjs';
export function serveStatic({req,res,path,root}) {
    if(path==='/help' || path==='/help.html'){
      res.writeHead(302,{Location:'/docs/getting-started/faq'});return res.end();
    }
    const faqPath=['/docs/getting-started/faq','/docs/getting-started/faq/','/docs/getting-started/faq.html'].includes(path);
    const docsDir=join(root,'documentation','dist');
    const docsRequest=path==='/docs'||path.startsWith('/docs/')||path.startsWith('/assets/')||path.startsWith('/docs-content/')||path.startsWith('/pagefind/')||['/docs-index.json','/docs-collection.json','/docs-last-updated.json','/docs-references.json','/file.svg','/folder.svg'].includes(path);
    if(docsRequest && /^\/[a-zA-Z0-9_./-]+$/.test(path) && !path.includes('..')){
      const relative=faqPath?'/docs/getting-started/faq':path==='/docs'?'/docs.html':path;
      const candidates=[join(docsDir,relative),join(docsDir,relative+'.html'),join(docsDir,relative,'index.html')];
      const file=candidates.find(p=>existsSync(p)&&statSync(p).isFile());
      if(file){const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'}[extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});return res.end(readFileSync(file));}
    }
    if(faqPath){
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(readFileSync(join(root,'public','help.html')));
    }
    const contentPages={'/privacy':'privacy','/terms':'terms','/404':'404'};
    if(Object.hasOwn(contentPages,path) && ['GET','HEAD'].includes(req.method)){
      res.writeHead(path==='/404'?404:200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(readFileSync(join(root,'public',contentPages[path]+'.html')));
    }
    const notFound=()=>{
      if(path.startsWith('/api/'))return json(res,{error:'Not found.'},404);
      res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(readFileSync(join(root,'public','404.html')));
    };
    const file =
      path === "/" || path === "/shop" || path === "/overlay"
        ? "/index.html"
        : path;
    if (!/^\/[a-zA-Z0-9_./-]+$/.test(file) || file.includes(".."))
      return notFound();
    const full = join(root, "public", file);
    if (!existsSync(full) || !statSync(full).isFile()) return notFound();
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".webmanifest": "application/manifest+json",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".woff2": "font/woff2",
    };
    res.setHeader(
      "Content-Type",
      types[extname(full)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.end(readFileSync(full));
}

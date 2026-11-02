import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url)),dist=join(root,'dist');
const raw=process.env.WORKSPACE_URL||'http://localhost:4173';
const url=new URL(raw);
if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['https:','http:'].includes(url.protocol)||url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('WORKSPACE_URL must be an HTTPS origin or local HTTP origin.');
if(process.env.CF_PAGES && !process.env.WORKSPACE_URL)throw Error('Set WORKSPACE_URL for the Pages build.');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
const newsletterRaw=process.env.NEWSLETTER_URL||'';
let newsletterAction='<span class="newsletter-soon">Newsletter coming soon</span>';
if(newsletterRaw){
 const signup=new URL(newsletterRaw);
 if(signup.protocol!=='https:'||signup.username||signup.password)throw Error('NEWSLETTER_URL must be an HTTPS signup URL without credentials.');
 newsletterAction=`<a class="btn primary" href="${escape(signup.href)}" target="_blank" rel="noopener noreferrer">Subscribe ↗</a>`;
}
const socials=[['Twitch','TWITCH_URL','twitch.tv'],['YouTube','YOUTUBE_URL','youtube.com'],['X','X_URL','x.com']].map(([label,key,host])=>{
 const raw=process.env[key];
 if(!raw)return `<span class="social-pending" title="Coming soon" aria-label="${label} — coming soon">${label}</span>`;
 const target=new URL(raw);
 if(target.protocol!=='https:'||target.username||target.password||!(target.hostname===host||target.hostname.endsWith('.'+host)))throw Error(`${key} must be an HTTPS ${host} profile URL.`);
 return `<a href="${escape(target.href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
}).join('');
await writeFile(join(dist,'index.html'),(await readFile(join(root,'index.html'),'utf8')).replaceAll('{{WORKSPACE_URL}}',escape(url.origin)).replaceAll('{{NEWSLETTER_ACTION}}',newsletterAction).replaceAll('{{SOCIAL_LINKS}}',socials));
await copyFile(join(root,'styles.css'),join(dist,'styles.css'));
// Explicit shared brand assets only. No app code, data, credentials or backend files.
const assets={
 'icon-192.png':'icon-192.png','favicon.ico':'favicon.ico',
 'characters/munny-idle.svg':'characters/munny-idle.svg',
 'characters/mochi-hero-wave.webp':'characters/mochi-hero-wave.webp',
 'services/README.md':'brand/services/README.md',
 'fonts/AutolootDisplay-OFL.txt':'fonts/AutolootDisplay-OFL.txt',
 'fonts/AutolootDisplay-Black.woff2':'fonts/AutolootDisplay-Black.woff2',
 'fonts/MapleMono-Variable.woff2':'fonts/MapleMono-Variable.woff2','fonts/OFL.txt':'fonts/OFL.txt','fonts/AUTHORS.txt':'fonts/AUTHORS.txt','fonts/SOURCE.md':'fonts/SOURCE.md'
};
for(const [destination,source]of Object.entries(assets)){const target=join(dist,'assets',destination);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,'../../public',source),target);}
await copyFile(join(root,'_headers'),join(dist,'_headers'));
await writeFile(join(dist,'404.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Not found · Autoloot</title><link rel="stylesheet" href="/styles.css"><body class="marketing"><main class="marketing-error"><h1>Page not found</h1><a class="btn primary" href="/">Back to Autoloot</a></main></body></html>');
console.log('Static marketing site built: apps/marketing/dist');

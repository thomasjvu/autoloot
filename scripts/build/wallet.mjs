import {build} from 'esbuild';
await build({entryPoints:['browser/reown.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outdir:'public/vendor/reown',entryNames:'index',splitting:true,minify:true,legalComments:'eof'});
console.log('Built optional Reown wallet checkout.');

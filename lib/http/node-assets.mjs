import {existsSync,statSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join,extname} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
export function createNodeAssets({root,imageDir,twitchConfigFile,shippingConfigFile}){
  const read=file=>existsSync(file)&&statSync(file).isFile()?{body:readFileSync(file),type:types[extname(file)]||'application/octet-stream'}:null;
  return {
    assets:{
      async read(path){return read(join(root,'public',path));},
      async readDocs(path){
        const dir=join(root,'docs','.papers','user','dist');
        return [path,path+'.html',path+'/index.html'].map(p=>read(join(dir,p))).find(Boolean)||null;
      },
    },
    media:{
      read(name){return read(join(imageDir,name))?.body||null;},
      write(name,bytes){writeFileSync(join(imageDir,name),bytes,{mode:0o600});},
      exists(name){return existsSync(join(imageDir,name));},
      path(name){return join(imageDir,name);},
    },
    configuration:{
      write(name,value){
        const file={twitch:twitchConfigFile,shipping:shippingConfigFile}[name];
        if(!file)throw Error('Unknown private configuration.');
        writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(file+'.tmp',file);
      },
    },
  };
}

import {Hono} from 'hono';
import {randomBytes} from 'node:crypto';
import {rawBody} from './response.mjs';

export function createMedia({media,rip}){
  const router=new Hono();
  router.get('/media/:name',async c=>{
    const name=c.req.param('name');
    if(!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name))return c.json({error:'Image not found.'},404);
    const image=await media.read(name);
    if(!image)return c.json({error:'Image not found.'},404);
    return c.body(image,200,{'Content-Type':name.endsWith('.png')?'image/png':name.endsWith('.jpg')?'image/jpeg':'image/webp','Cache-Control':'public, max-age=3600'});
  });
  router.post('/api/upload',async c=>{
    if(!c.get('prepared').adminAccess)return c.json({error:'Streamer access required.'},403);
    const image=await rawBody(c.req.raw,3*1024*1024,'Choose an image smaller than 3 MB.');
    const ext=image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':image[0]===255&&image[1]===216&&image[2]===255?'jpg':image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP'?'webp':null;
    if(!ext)throw Error('Choose a PNG, JPEG, or WebP image.');
    const name=randomBytes(16).toString('hex')+'.'+ext;
    await media.write(name,image);
    return c.json({image:'/media/'+name});
  });
  router.post('/api/rip/frame',async c=>{
    if(!c.get('prepared').adminAccess)return c.json({error:'Streamer access required.'},403);
    if(c.req.header('content-type')!=='image/jpeg')throw Error('Send a JPEG frame.');
    const image=await rawBody(c.req.raw,2000000,'Frame too large.');
    if(image[0]!==255||image[1]!==216)throw Error('Invalid JPEG.');
    await rip.scan(image);
    return c.json(rip.snapshot());
  });
  return router;
}

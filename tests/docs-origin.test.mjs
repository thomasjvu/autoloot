import test from 'node:test';import assert from 'node:assert/strict';import {createStaticRoutes} from '../lib/http/static.mjs';
test('local docs links redirect to the docs server with their path and query intact',async()=>{
 const app=createStaticRoutes({docsOrigin:'http://localhost:3333',assets:{readDocs(){throw Error('must not serve stale local build');}}});
 const response=await app.request('/docs/integrations/twitch?from=app');assert.equal(response.status,302);assert.equal(response.headers.get('Location'),'http://localhost:3333/docs/integrations/twitch?from=app');
 assert.equal((await app.request('/help')).headers.get('Location'),'http://localhost:3333/docs/getting-started/faq');
});
test('production without separate docs origin continues serving built docs',async()=>{
 const app=createStaticRoutes({assets:{readDocs:async()=>({body:'built documentation',type:'text/html'})}});
 const response=await app.request('/docs/integrations/twitch');assert.equal(response.status,200);assert.equal(await response.text(),'built documentation');
});

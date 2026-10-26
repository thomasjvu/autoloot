import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeConfig,requestAllowed,localAdminRequest,anonymousClientAddress} from '../lib/runtime.mjs';
const config=runtimeConfig({PORT:'4173',PUBLIC_URL:'https://shop.example.com'});
const request=(headers={},address='127.0.0.1')=>({headers:{host:'localhost:4173',...headers},socket:{remoteAddress:address}});
test('admin bootstrap rejects forwarded, remote, rebinding and cross-site requests',()=>{
 assert.equal(localAdminRequest(request(),config),true);
 for(const req of [request({},'203.0.113.1'),request({host:'evil.example'}),request({'x-forwarded-for':'203.0.113.1'}),request({forwarded:'for=203.0.113.1'}),request({origin:'https://evil.example'}),request({'sec-fetch-site':'cross-site'}),request({host:'shop.example.com'})])
  assert.equal(localAdminRequest(req,config),false);
 assert.equal(requestAllowed(request({host:'shop.example.com',origin:'https://shop.example.com'}),config),true);
});
test('production config rejects insecure origins, demo seeds, weak credentials and invalid limits',()=>{
 for(const env of [{PORT:'bad'},{PUBLIC_URL:'http://shop.example.com'},{PUBLIC_URL:'https://user:secret@shop.example.com'},{PUBLIC_URL:'https://shop.example.com/path'},{AUTOLOOT_BACKUP_MINUTES:'999999999'},{NODE_ENV:'production',AUTOLOOT_DEMO:'1'},{NODE_ENV:'production',NFT_AGENT_TOKEN:'weak'}])
  assert.throws(()=>runtimeConfig(env));
 assert.equal(runtimeConfig({NODE_ENV:'production',NFT_AGENT_TOKEN:'a'.repeat(64)}).production,true);
});

test('anonymous addresses honor only exact trusted proxy peers and validated dedicated headers',()=>{
 const trusted=runtimeConfig({AUTOLOOT_TRUSTED_PROXIES:'127.0.0.1'});
 const a=request({'x-autoloot-client-ip':'203.0.113.1'}),b=request({'x-autoloot-client-ip':'203.0.113.2'});
 assert.notEqual(anonymousClientAddress(a,trusted),anonymousClientAddress(b,trusted));
 assert.equal(anonymousClientAddress(a,config),'127.0.0.1');
 assert.equal(anonymousClientAddress(request({'x-autoloot-client-ip':'203.0.113.1'},'198.51.100.1'),trusted),'198.51.100.1');
 for(const value of [undefined,'bad','203.0.113.1, 203.0.113.2'])assert.equal(anonymousClientAddress(request({'x-autoloot-client-ip':value}),trusted),'127.0.0.1');
 assert.equal(anonymousClientAddress(request({'x-autoloot-client-ip':'203.0.113.1'},'::ffff:127.0.0.1'),trusted),'203.0.113.1');
 assert.equal(localAdminRequest(a,trusted),false);assert.throws(()=>runtimeConfig({AUTOLOOT_TRUSTED_PROXIES:'0.0.0.0/0'}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeConfig,requestAllowed,localAdminRequest} from '../lib/runtime.mjs';
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

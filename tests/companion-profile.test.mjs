import test from 'node:test';import assert from 'node:assert/strict';import {defaultProfile,validateProfile,companionProfile} from '../lib/companion-profile.mjs';
test('companion profile validates display preferences and allows only local uploaded avatars',()=>{
 assert.deepEqual(companionProfile({}),defaultProfile);
 const profile=validateProfile({name:'Pip',tone:'calm',instructions:'Short replies',avatar:'/media/'+'a'.repeat(32)+'.png'});assert.equal(profile.name,'Pip');
 for(const patch of [{name:''},{tone:'unrestricted'},{avatar:'https://tracker.example/avatar.png'},{instructions:'a'.repeat(1001)}])assert.throws(()=>validateProfile({...profile,...patch}));
 const configured={provider:'codex',voice:true,...profile};Object.assign(configured,defaultProfile);assert.equal(configured.name,'Munny');assert.equal(configured.provider,'codex');assert.equal(configured.voice,true);
});

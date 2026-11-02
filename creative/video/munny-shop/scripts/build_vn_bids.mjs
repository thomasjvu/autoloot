import {synthesize} from '../../../../public/vendor/vn-tts/index.js';
import {readFile,writeFile} from 'node:fs/promises';
const assets=new URL('../assets/',import.meta.url);
for(const cue of JSON.parse(await readFile(new URL('vn-bid-cues.json',assets),'utf8'))){
 const {audio}=synthesize({text:cue.text,pitch:1.25,speed:1.65,baseFrequency:250,vowelVolume:.24,consonantVolume:.16});
 await writeFile(new URL('sfx/'+cue.file,assets),audio);
}

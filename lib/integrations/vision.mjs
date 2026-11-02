import {visionTask} from './rip.mjs';

export function parseObservation(answer) {
  if(typeof answer!=='string'||answer.length>16000)throw Error('Vision returned an invalid observation. Try a clearer frame.');
  let value;
  try {value=JSON.parse(answer.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw Error('Vision could not read this reveal. Hold one card steady and try again.');}
  if(!value||!['card','pack','multiple','unknown'].includes(value.kind))throw Error('Vision returned an unsupported observation.');
  const result={kind:value.kind};
  for(const key of ['name','number','setName','language','finish','visibleText']) {
    if(typeof value[key]!=='string'||value[key].length>1000)throw Error('Vision returned invalid card details.');
    result[key]=value[key].trim();
  }
  return result;
}

export class Vision {
  constructor({key=process.env.PRIME_API_KEY||'',teamId=process.env.PRIME_TEAM_ID||'',primeModel=process.env.PRIME_VISION_MODEL||'moondream/moondream3.1-9b-a2b',localUrl=process.env.MOONDREAM_LOCAL_URL||'http://127.0.0.1:2021',model=process.env.MOONDREAM_MODEL||'moondream3.1-9B-A2B',fetcher=fetch}={}) {
    const url=new URL(localUrl);
    if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('MOONDREAM_LOCAL_URL must be a loopback HTTP origin.');
    this.localUrl=url.origin;this.key=key;this.teamId=teamId;this.primeModel=primeModel;this.model=model;this.fetcher=fetcher;this.busy=false;
  }
  mode(companion={}) {return companion.visionMode||process.env.MOONDREAM_MODE||(this.key?'cloud':'local');}
  status(companion={}) {return {mode:this.mode(companion),cloudConfigured:!!this.key,model:this.mode(companion)==='cloud'?this.primeModel:this.model};}
  async observe(image,mode) {
    if(!['cloud','local'].includes(mode))throw Error('Choose Prime Inference or local Moondream.');
    if(mode==='cloud'&&!this.key)throw Error('Add PRIME_API_KEY to .env and restart, or choose Local.');
    if(this.busy)throw Error('A reveal is already being read.');
    this.busy=true;
    try {
      const imageUrl='data:image/jpeg;base64,'+image.toString('base64');
      const question=visionTask+' Return ONLY a JSON object with string fields: kind, name, number, setName, language, finish, visibleText.';
      const body=mode==='cloud'?{model:this.primeModel,messages:[{role:'user',content:[{type:'text',text:question},{type:'image_url',image_url:{url:imageUrl}}]}],stream:false,max_tokens:700,temperature:0,response_format:{type:'json_object'}}:{model:this.model,image_url:imageUrl,question,stream:false};
      const response=await this.fetcher(mode==='cloud'?'https://api.pinference.ai/api/v1/chat/completions':this.localUrl+'/query',{
        method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(mode==='cloud'?{Authorization:'Bearer '+this.key,...(this.teamId?{'X-Prime-Team-ID':this.teamId}:{})}:{})},
        body:JSON.stringify(body),signal:AbortSignal.timeout(30000)
      });
      if(!response.ok)throw Error(response.status===401?'Prime Inference rejected the API key.':`Moondream ${mode} request failed (${response.status}).`);
      const decoder=new TextDecoder();let text='';for await(const chunk of response.body){text+=decoder.decode(chunk,{stream:true});if(text.length>32000)throw Error('Moondream response too large.');}text+=decoder.decode();
      let payload;try{payload=JSON.parse(text);}catch{throw Error('Moondream returned an invalid response.');}
      if(mode==='cloud'&&payload.choices?.[0]?.finish_reason!=='stop')throw Error('Prime Inference did not complete this observation. Try again.');
      return parseObservation(mode==='cloud'?payload.choices?.[0]?.message?.content:payload.answer);
    }catch(error){if(error.name==='TimeoutError')throw Error('Vision timed out. Wait for the local model to warm up or try again.');if(error instanceof TypeError)throw Error(`Cannot reach Moondream ${mode}. Check the connection and setup.`);throw error;}
    finally{this.busy=false;}
  }
}

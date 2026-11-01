// The only HTTP layer that reads Node socket/response lifecycle objects.
export function nodeRequestContext(c){
  const {incoming,outgoing}=c.env;
  return {
    method:incoming.method,url:incoming.url,headers:incoming.headers,
    socket:{remoteAddress:incoming.socket.remoteAddress,encrypted:Boolean(incoming.socket.encrypted)},
    onComplete(callback){
      let done=false;
      const finish=()=>{if(done)return;done=true;callback({finished:outgoing.writableFinished,status:outgoing.statusCode});};
      outgoing.once('finish',finish);outgoing.once('close',finish);
    },
  };
}

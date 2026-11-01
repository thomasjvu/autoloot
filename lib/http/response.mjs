import {timingSafeEqual} from 'node:crypto';
export function equal(a, b) {
  if(typeof a!=="string" || typeof b!=="string")return false;
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length && timingSafeEqual(left,right);
}
export async function body(req, limit = 32768) {
  const bytes = await rawBody(req, limit, 'Request too large.');
  const result = bytes.toString('utf8');
  return result ? JSON.parse(result) : {};
}
export async function rawBody(req, limit, message) {
  const chunks=[];let size=0;
  const source=req instanceof Request?req.body:req;
  for await(const chunk of source || []){size+=chunk.length;if(size>limit)throw Error(message);chunks.push(chunk);}
  return Buffer.concat(chunks);
}

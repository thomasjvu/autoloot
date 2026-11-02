import {isIP} from 'node:net';
const normalizeIP=value=>typeof value==='string'&&isIP(value)?value.replace(/^::ffff:(?=\d+\.)/,''):null;
const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export function runtimeConfig(env = process.env) {
  const port = Number(env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT must be between 1 and 65535.');
  const address = new URL(env.PUBLIC_URL || `http://localhost:${port}`);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(address.hostname);
  if (address.username || address.password || address.search || address.hash || address.pathname !== '/' ||
      !['https:', 'http:'].includes(address.protocol) || (!local && address.protocol !== 'https:'))
    throw Error('PUBLIC_URL must be an HTTPS origin, or a local HTTP origin.');
  const hosted = env.AUTOLOOT_NODE_MODE === 'hosted';
  if (env.AUTOLOOT_NODE_MODE && !['local','hosted'].includes(env.AUTOLOOT_NODE_MODE)) throw Error('AUTOLOOT_NODE_MODE must be local or hosted.');
  const host = env.HOST || (hosted ? '0.0.0.0' : '127.0.0.1');
  if (!isIP(host)) throw Error('HOST must be an IP address.');
  if (hosted && (local || address.protocol !== 'https:' || !/^\d+$/.test(env.AUTOLOOT_OWNER_TWITCH_ID || '') || !env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET || !env.DATA_DIR))
    throw Error('Hosted Node requires an HTTPS PUBLIC_URL, owner Twitch ID, Twitch credentials and persistent DATA_DIR.');
  const production = env.NODE_ENV === 'production';
  if (production && env.AUTOLOOT_DEMO === '1') throw Error('Demo seeding is unavailable in production.');
  for (const key of ['NFT_AGENT_TOKEN', 'NFT_WALLET_TOKEN'])
    if (production && env[key] && Buffer.byteLength(env[key]) < 32) throw Error(`${key} must contain at least 32 bytes.`);
  const backupMinutes = Number(env.AUTOLOOT_BACKUP_MINUTES || 60), backupKeep = Number(env.AUTOLOOT_BACKUP_KEEP || 24);
  if (!Number.isInteger(backupMinutes) || backupMinutes < 1 || backupMinutes > 1440 || !Number.isInteger(backupKeep) || backupKeep < 1 || backupKeep > 10000)
    throw Error('Invalid automatic backup interval/retention configuration.');
  const trustedProxies=new Set(String(env.AUTOLOOT_TRUSTED_PROXIES||'').split(',').filter(Boolean).map(value=>{
    const ip=normalizeIP(value.trim());if(!ip)throw Error('AUTOLOOT_TRUSTED_PROXIES must contain exact IP addresses.');return ip;
  }));
  const origins = new Set([address.origin, `http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://[::1]:${port}`]);
  return {hosted,host,trustedProxies,port, base:address.origin, production, backupMinutes, backupKeep, origins, hosts:new Set([...origins].map(origin=>new URL(origin).host))};
}
export function requestAllowed(req, config) {
  if (!config.hosts.has(req.headers.host)) return false;
  const origin = req.headers.origin;
  return (!origin || (config.origins.has(origin) && new URL(origin).host === req.headers.host)) && req.headers['sec-fetch-site'] !== 'cross-site';
}
export function localAdminRequest(req, config) {
  return loopback.has(req.socket.remoteAddress) &&
    [`localhost:${config.port}`, `127.0.0.1:${config.port}`, `[::1]:${config.port}`].includes(req.headers.host) &&
    !Object.keys(req.headers).some(key => key === 'forwarded' || key === 'x-autoloot-client-ip' || key.startsWith('x-forwarded-')) && requestAllowed(req, config);
}

// Only explicitly trusted peers may assert the dedicated proxy-overwritten address.
export function anonymousClientAddress(req,config){
 const peer=normalizeIP(req.socket.remoteAddress)||req.socket.remoteAddress;
 if(config.trustedProxies.has(peer))return normalizeIP(req.headers['x-autoloot-client-ip'])||peer;
 return peer;
}

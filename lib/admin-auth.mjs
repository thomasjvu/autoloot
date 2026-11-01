import {normalizeUsername,passwordError} from '../public/admin-credentials.js';
import {randomBytes, scrypt as derive, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {existsSync, readFileSync, writeFileSync, mkdtempSync, linkSync, rmSync} from 'node:fs';
import {join} from 'node:path';

const scrypt = promisify(derive);
const sessionHash = token => createHash('sha256').update(token).digest('hex');

export class AdminAuth {
  constructor(file) {
    this.file = file;
    this.sessions = new Map();
    this.failures = [];
    this.busy = false;
  }
  get configured() { return existsSync(this.file); }
  get username() {
    return this.configured ? JSON.parse(readFileSync(this.file, 'utf8')).username || null : null;
  }
  get legacyPasswordOnly() {
    return this.configured && !JSON.parse(readFileSync(this.file, 'utf8')).username;
  }
  sessionKey(req) {
    const token = String(req.headers.cookie || '').split(';').map(s => s.trim())
      .find(s => s.startsWith('autoloot_admin='))?.slice(15);
    return token ? sessionHash(token) : null;
  }
  valid(req) {
    const key = this.sessionKey(req);
    if (!key) return false;
    const expiry = this.sessions.get(key);
    if (!expiry || expiry < Date.now()) {
      this.sessions.delete(key);
      return false;
    }
    return true;
  }
  async setup(password, username) {
    if (this.configured) throw Error('Admin setup is already complete.');
    const passwordIssue=passwordError(password);
    if(passwordIssue)throw Error(passwordIssue);
    const accountName=normalizeUsername(username);
    const salt = randomBytes(24).toString('hex');
    const hash = await scrypt(password, salt, 64);
    const temporary = mkdtempSync(this.file + '.setup-');
    try {
      const record = join(temporary, 'password');
      writeFileSync(record, JSON.stringify({username:accountName,salt, hash: hash.toString('hex')}), {mode: 0o600, flag: 'wx'});
      // A hard link publishes the complete private file atomically, and unlike
      // rename cannot replace a password installed by a concurrent setup.
      try { linkSync(record, this.file); }
      catch (error) {
        if (error.code === 'EEXIST') throw Error('Admin setup is already complete.');
        throw error;
      }
    } finally {
      rmSync(temporary, {recursive: true, force: true});
    }
  }
  async login(password, setup = false, username) {
    this.failures = this.failures.filter(t => Date.now() - t < 900000);
    if (this.failures.length >= 8) throw Error('Too many attempts. Try again in 15 minutes.');
    if (this.busy) throw Error('A sign-in is already in progress.');
    if (typeof password !== 'string' || password.length > 256) throw Error('Invalid password.');
    this.busy = true;
    try {
      if (setup) await this.setup(password, username);
      else {
        if (!this.configured) throw Error('Create an admin password first.');
        const record = JSON.parse(readFileSync(this.file, 'utf8'));
        const hash = await scrypt(password, record.salt, 64);
        const passwordMatches=timingSafeEqual(hash, Buffer.from(record.hash, 'hex'));
        let usernameMatches=!record.username;
        if(record.username){
          try{usernameMatches=normalizeUsername(username)===record.username;}catch{usernameMatches=false;}
        }
        if (!passwordMatches || !usernameMatches) {
          this.failures.push(Date.now());
          throw Error('Incorrect username or password.');
        }
      }
      for (const [key, expiry] of this.sessions) if (expiry < Date.now()) this.sessions.delete(key);
      if (this.sessions.size >= 20) this.sessions.delete(this.sessions.keys().next().value);
      const token = randomBytes(32).toString('hex');
      this.sessions.set(sessionHash(token), Date.now() + 12 * 3600000);
      return token;
    } finally {
      this.busy = false;
    }
  }
  logout(req) { return this.sessions.delete(this.sessionKey(req)); }
}

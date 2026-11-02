// Invoked only while flock holds the volume lock for this process's lifetime.
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
if(process.env.AUTOLOOT_CONTAINER_LOCKED!=='1')throw Error('Use the container entrypoint.');
const marker=join(process.env.DATA_DIR||'/data','runtime.sqlite');
if(existsSync(marker)){
  const db=new DatabaseSync(marker);
  try{db.exec('DELETE FROM writer');}finally{db.close();}
}
await import('../../server.mjs');

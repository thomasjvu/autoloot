import {DatabaseSync} from 'node:sqlite';
import {readWorkspace,acquireStorageLock,backupDatabase} from '../lib/storage.mjs';
import {resolve,join} from 'node:path';
import {existsSync,mkdirSync,renameSync,rmSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
process.umask(0o077);
const directory=resolve(process.env.DATA_DIR || '.data'),path=join(directory,'autoloot.sqlite');
const command=process.argv[2];
try {
 if(!['check','backup','restore'].includes(command))throw Error('Usage: storage.mjs check | backup [new-file.sqlite] | restore backup-file.sqlite');
 if(command==='check') {
   const db=new DatabaseSync(path,{readOnly:true});
   try {
     const integrity=db.prepare('PRAGMA integrity_check').all();
     if(integrity.some(row=>row.integrity_check!=='ok'))throw Error('Database integrity check failed.');
     const row=readWorkspace(db);
     const foreignKeys=db.prepare('PRAGMA foreign_key_check').all();if(foreignKeys.length)throw Error('Foreign-key check failed.');
     console.log(JSON.stringify({ok:true,backend:'sqlite',revision:row.revision,products:db.prepare('SELECT COUNT(*) AS count FROM products').get().count,orders:db.prepare('SELECT COUNT(*) AS count FROM orders').get().count}));
   } finally {db.close();}
 } else if(command==='backup') {
   mkdirSync(join(directory,'backups'),{recursive:true,mode:0o700});
   const target=resolve(process.argv[3] || join(directory,'backups',`autoloot-${Date.now()}-${randomUUID()}.sqlite`));
   await backupDatabase(path,target);console.log(`Verified backup: ${target}`);
 } else {
   if(!process.argv[3])throw Error('Provide the verified backup to restore. Stop the app first.');
   const source=resolve(process.argv[3]);if(source===path || !existsSync(source))throw Error('Choose an existing separate backup file.');
   const lock=acquireStorageLock(directory),staged=join(directory,`restore-${randomUUID()}.sqlite`);
   try {
     await backupDatabase(source,staged);
     const check=new DatabaseSync(staged,{readOnly:true});
     try {
       readWorkspace(check);
     }finally{check.close();}
     if(existsSync(path)) {
       mkdirSync(join(directory,'backups'),{recursive:true,mode:0o700});
       await backupDatabase(path,join(directory,'backups',`before-restore-${Date.now()}-${randomUUID()}.sqlite`));
     }
     for(const suffix of ['-wal','-shm'])rmSync(path+suffix,{force:true});
     const fd=openSync(staged,'r');try{fsyncSync(fd);}finally{closeSync(fd);}
     renameSync(staged,path);
     const parent=openSync(directory,'r');try{fsyncSync(parent);}finally{closeSync(parent);}
     console.log('Restore verified. Start the app; interrupted runs resume paused. Uploaded images are restored separately.');
   }finally{rmSync(staged,{force:true});lock.close();}
 }
} catch(error){console.error(error.message);process.exitCode=1;}

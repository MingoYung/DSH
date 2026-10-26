import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {fs,hashFile,sha,appendArchive} from './asar.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const TERMINAL=new Set(['complete','error','timeout','cancelled']);
const BUSY=new Set(['preparing','worker-ready','waiting-exit','installing','relaunching']);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function failure(code){const error=new Error(code);error.code=code;return error;}
function fixedError(error){return /^[a-z][a-z0-9-]{2,60}$/.test(error?.code??'')?error.code:'io-error';}
function plainPath(target,base){
 const relative=path.relative(path.resolve(base),path.resolve(target));if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative))throw failure('unsafe-path');
 for(let at=path.resolve(target);;at=path.dirname(at)){try{if(fs.lstatSync(at).isSymbolicLink())throw failure('unsafe-path');}catch(error){if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}if(at===path.resolve(base))break;if(path.dirname(at)===at)throw failure('unsafe-path');}
}
function atomicJSON(file,value,base){
 plainPath(file,base);const temp=file+'.writing-'+randomUUID();fs.writeFileSync(temp,JSON.stringify(value),{flag:'wx'});JSON.parse(fs.readFileSync(temp,'utf8'));
 // Windows readers/anti-virus can briefly deny replacing an existing file.
 // Retry only sharing/permission races, with a strict sub-second bound.
 const pause=new Int32Array(new SharedArrayBuffer(4));
 for(let attempt=0;;attempt++){try{fs.renameSync(temp,file);return;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=30)throw error;Atomics.wait(pause,0,0,10);}}
}
function json(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function publicJob(job){return job&&typeof job.id==='string'&&typeof job.phase==='string'?{id:job.id,phase:job.phase,action:job.action,...job.errorCode?{errorCode:job.errorCode}:{}}:null;}
function copyChecked(source,target,expected,base){
 plainPath(target,base);if(fs.existsSync(target))throw failure('temporary-exists');fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
 return hashFile(target).then(actual=>{if(actual!==expected)throw failure('copy-verification-failed');});
}
function workerSpawn({worker,jobFile}){
 const command=path.join(process.env.SystemRoot??'C:/Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const env={...process.env};for(const key of Object.keys(env))if(key.toLowerCase()==='psmodulepath')delete env[key];
 // PowerShell 5 exits before -File under DETACHED_PROCESS, while a normally
 // spawned worker can share the parent's console lifetime. A short normal
 // launcher uses Start-Process Hidden to give the real worker its own console.
 const launcher=path.join(path.dirname(worker),'launcher.ps1');
 const child=spawn(command,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',launcher,'-JobFile',jobFile],{stdio:'ignore',windowsHide:true,env});
 child.once('exit',code=>{if(code!==0)child.emit('error',failure('worker-start-failed'));});
 child.unref();return child;
}
/** Internal factory for synthetic, isolated fixtures. Production index fixes
 * policy and paths; no HTTP/UI input can supply a policy or lifecycle hook. */
export function createInstaller({policy,toolRoot=ROOT,platform=process.platform,launchWorker=workerSpawn,handshakeTimeoutMs=8000,pollMs=100,now=()=>Date.now()}={}){
 if(!policy?.originalSha256||!policy?.patchedSha256)throw failure('invalid-policy');
 let preparing=false;const identityCache=new Map(),workers=new Map();
 function processAlive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
 function location(executable){
  if(platform!=='win32')throw failure('unsupported-platform');if(typeof executable!=='string'||path.basename(executable).toLowerCase()!=='dsh next.exe')throw failure('unsupported-desktop');
  executable=path.resolve(executable);const installRoot=path.dirname(executable),resources=path.join(installRoot,'resources');plainPath(executable,installRoot);plainPath(resources,installRoot);
  const loc={executable,installRoot,resources,target:path.join(resources,'app.asar'),backupRoot:path.join(resources,'.dsh-awakening-backup'),backup:path.join(resources,'.dsh-awakening-backup','app.asar')};
  for(const p of [loc.backupRoot,path.join(loc.backupRoot,'jobs')])plainPath(p,installRoot);
  return loc;
 }
 function statusAt(loc){const pointer=path.join(loc.backupRoot,'active-job.json');plainPath(pointer,loc.installRoot);const active=json(pointer);if(!active?.id||!/^[a-f0-9-]{36}$/.test(active.id))return null;const file=path.join(loc.backupRoot,'jobs',active.id,'status.json');plainPath(file,loc.installRoot);return json(file);}
 function readMeta(loc,file){plainPath(file,loc.installRoot);return json(file);}
 function reportedJob(loc){
  const state=statusAt(loc);if(!state||!BUSY.has(state.phase))return publicJob(state);
  if(Number.isInteger(state.workerPid)&&!processAlive(state.workerPid))return publicJob({...state,phase:'error',errorCode:'worker-exited'});
  if(state.phase==='preparing'){
   const owner=readMeta(loc,path.join(loc.backupRoot,'prepare.lock'));
   if(owner&&Number.isInteger(owner.pid)&&!processAlive(owner.pid))return publicJob({...state,phase:'error',errorCode:'interrupted-prepare'});
  }
  if(['worker-ready','waiting-exit'].includes(state.phase)){
   const cfg=readMeta(loc,path.join(loc.backupRoot,'jobs',state.id,'job.json'));
   if(Number.isFinite(cfg?.expiresAt)&&now()>cfg.expiresAt)return publicJob({...state,phase:'timeout',errorCode:'dsh-exit-timeout'});
  }
  return publicJob(state);
 }
 function disarm(loc,dir,cfg){
  const tombstone=path.join(dir,'cancelled.flag');plainPath(tombstone,loc.installRoot);try{fs.writeFileSync(tombstone,'cancelled',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
  atomicJSON(path.join(dir,'authorization.json'),{id:cfg.id,nonce:cfg.nonce,state:'cancelled'},loc.installRoot);
 }
 function recoverStale(loc){
  const lock=path.join(loc.backupRoot,'prepare.lock');plainPath(lock,loc.installRoot);const raw=fs.existsSync(lock)?fs.readFileSync(lock,'utf8'):null;let owner;try{owner=raw?JSON.parse(raw):null;}catch{}
  if(owner&&Number.isInteger(owner.pid)&&!processAlive(owner.pid)&&fs.readFileSync(lock,'utf8')===raw){fs.unlinkSync(lock);const state=statusAt(loc);if(state?.phase==='preparing'){const file=path.join(loc.backupRoot,'jobs',state.id,'status.json');atomicJSON(file,{...state,phase:'error',errorCode:'interrupted-prepare',updatedAt:now()},loc.installRoot);}}
  const state=statusAt(loc);
  if(state&&BUSY.has(state.phase)&&Number.isInteger(state.workerPid)&&!processAlive(state.workerPid)){
   const dir=path.join(loc.backupRoot,'jobs',state.id),cfg=readMeta(loc,path.join(dir,'job.json'));
   if(cfg?.id===state.id){disarm(loc,dir,cfg);atomicJSON(path.join(dir,'status.json'),{...state,phase:'error',errorCode:'worker-exited',updatedAt:now()},loc.installRoot);}
  }
  if(state?.phase==='waiting-exit'){
   const dir=path.join(loc.backupRoot,'jobs',state.id),cfg=readMeta(loc,path.join(dir,'job.json'));
   if(cfg?.id===state.id&&Number.isFinite(cfg.expiresAt)&&now()>cfg.expiresAt+5000){disarm(loc,dir,cfg);atomicJSON(path.join(dir,'status.json'),{...state,phase:'timeout',errorCode:'dsh-exit-timeout',updatedAt:now()},loc.installRoot);}
  }
 }
 async function sourceEligible(packageRoot){
  try{
   const root=fs.realpathSync(packageRoot??path.resolve(toolRoot,'../..')),manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
   if(manifest.name!=='dsh-awakening'||!policy.packageVersions?.includes(manifest.version))throw failure('source-runtime-mismatch');
   if(!policy.runtimeFiles||!Object.keys(policy.runtimeFiles).length)throw failure('source-runtime-mismatch');
   for(const [relative,digest]of Object.entries(policy.runtimeFiles)){const file=path.join(root,relative);plainPath(file,root);const info=fs.statSync(file);if(!info.isFile()||info.size>24*1024*1024||await hashFile(file)!==digest)throw failure('source-runtime-mismatch');}
   return true;
  }catch{throw failure('source-runtime-mismatch');}
 }
 async function identity(loc,fresh=false){
  for(const file of [loc.executable,loc.target])plainPath(file,loc.installRoot);
  const exeStat=fs.statSync(loc.executable),targetStat=fs.statSync(loc.target);const key=[loc.executable,exeStat.size,exeStat.mtimeMs,targetStat.size,targetStat.mtimeMs].join('|');
  if(!fresh&&identityCache.has(key))return identityCache.get(key);
  if(await hashFile(loc.executable)!==policy.exeSha256)throw failure('unsupported-desktop-build');
  const digest=await hashFile(loc.target);let variant='unknown';if(digest===policy.originalSha256)variant='pristine';else if(digest===policy.legacySha256||(Array.isArray(policy.previousManagedSha256s)&&policy.previousManagedSha256s.includes(digest)))variant='legacy';else if(digest===policy.patchedSha256)variant='managed';
  if(variant==='unknown')throw failure('unsupported-app-archive');
  let backupValid=false;if(fs.existsSync(loc.backup)){plainPath(loc.backup,loc.installRoot);backupValid=await hashFile(loc.backup)===policy.originalSha256;if(!backupValid)throw failure('invalid-original-backup');}
  if(variant!=='pristine'&&!backupValid)throw failure('missing-original-backup');
  const result={digest,variant,backupValid};identityCache.clear();identityCache.set(key,result);return result;
 }
 async function inspect({executable,packageRoot}={}){
  try{const loc=location(executable),state=await identity(loc),job=reportedJob(loc);let eligible=true;try{await sourceEligible(packageRoot);}catch{eligible=false;}return{supported:true,installed:state.variant!=='pristine',variant:state.variant,upToDate:state.variant==='managed',sourceEligible:eligible,canInstall:state.variant!=='managed'&&eligible,canRollback:state.variant!=='pristine',targetVersion:policy.desktopVersion,...eligible?{}:{reason:'source-runtime-mismatch'},job};}
  catch(error){return{supported:false,installed:false,variant:'unknown',targetVersion:policy.desktopVersion,reason:fixedError(error),job:null};}
 }
 async function cancel({executable,jobId}={}){
  const loc=location(executable),active=json(path.join(loc.backupRoot,'active-job.json'));
  if(active?.id!==jobId||!/^[a-f0-9-]{36}$/.test(jobId??''))throw failure('unknown-job');
  const dir=path.join(loc.backupRoot,'jobs',jobId);plainPath(dir,loc.installRoot);for(const file of ['job.json','status.json'])plainPath(path.join(dir,file),loc.installRoot);
  const cfg=readMeta(loc,path.join(dir,'job.json')),state=readMeta(loc,path.join(dir,'status.json'));
  if(!cfg||cfg.id!==jobId||!state)throw failure('unknown-job');if(TERMINAL.has(state.phase))return{cancelled:false};if(['installing','relaunching'].includes(state.phase))throw failure('job-already-applying');
  disarm(loc,dir,cfg);workers.get(jobId)?.kill?.();workers.delete(jobId);
  atomicJSON(path.join(dir,'status.json'),{id:jobId,nonce:cfg.nonce,action:cfg.action,phase:'cancelled',updatedAt:now()},loc.installRoot);return{cancelled:true};
 }
 async function prepare({action,executable,packageRoot}={}){
  if(!['install','rollback'].includes(action))throw failure('invalid-action');if(preparing)throw failure('job-busy');preparing=true;
  let loc,dir,cfg,lockFd,worker;try{
   loc=location(executable);const initial=await identity(loc,true);
   if(action==='install')await sourceEligible(packageRoot);
   if(action==='install'&&initial.variant==='managed')throw failure('already-installed');if(action==='rollback'&&initial.variant==='pristine')throw failure('already-original');
   recoverStale(loc);const existing=statusAt(loc);if(existing&&BUSY.has(existing.phase))throw failure('job-busy');
   for(const directory of [loc.backupRoot,path.join(loc.backupRoot,'jobs')]){plainPath(directory,loc.installRoot);fs.mkdirSync(directory,{recursive:true});plainPath(directory,loc.installRoot);}
   const lockFile=path.join(loc.backupRoot,'prepare.lock');plainPath(lockFile,loc.installRoot);try{lockFd=fs.openSync(lockFile,'wx');fs.writeSync(lockFd,JSON.stringify({pid:process.pid,createdAt:now()}));}catch{throw failure('job-busy');}
   // Cross-process callers may have read the previous state before this lock.
   // Recheck it while holding the lock before publishing another job.
   const lockedExisting=statusAt(loc);if(lockedExisting&&BUSY.has(lockedExisting.phase))throw failure('job-busy');
   const id=randomUUID(),nonce=randomUUID();dir=path.join(loc.backupRoot,'jobs',id);fs.mkdirSync(dir);plainPath(dir,loc.installRoot);
   const setStatus=(phase,extra={})=>atomicJSON(path.join(dir,'status.json'),{id,nonce,action,phase,updatedAt:now(),preparePid:process.pid,...extra},loc.installRoot);
   setStatus('preparing');atomicJSON(path.join(loc.backupRoot,'active-job.json'),{id},loc.installRoot);
   if(!initial.backupValid){const staged=loc.backup+'.copying-'+id;await copyChecked(loc.target,staged,policy.originalSha256,loc.installRoot);if(await hashFile(loc.target)!==policy.originalSha256)throw failure('archive-changed-during-prepare');fs.renameSync(staged,loc.backup);}
   if(await hashFile(loc.backup)!==policy.originalSha256)throw failure('invalid-original-backup');
   const candidate=path.join(dir,'candidate.asar');let expectedAfter;
   if(action==='install'){
    const replacements=new Map();for(const [name,digest]of Object.entries(policy.files)){const file=path.join(toolRoot,'payload',path.basename(name));plainPath(file,toolRoot);const bytes=fs.readFileSync(file);if(sha(bytes)!==digest)throw failure('installer-payload-mismatch');replacements.set(name,bytes);}
    const built=await appendArchive(loc.backup,candidate,replacements);if(built.sha256!==policy.patchedSha256)throw failure('candidate-verification-failed');expectedAfter=policy.patchedSha256;
   }else{await copyChecked(loc.backup,candidate,policy.originalSha256,loc.installRoot);expectedAfter=policy.originalSha256;}
   const refreshed=await identity(loc,true);if(refreshed.digest!==initial.digest)throw failure('archive-changed-during-prepare');
   cfg={schema:1,id,nonce,action,installRoot:loc.installRoot,executable:loc.executable,target:loc.target,backup:loc.backup,candidate,jobDirectory:dir,expectedBefore:initial.digest,expectedAfter,originalSha256:policy.originalSha256,expectedExe:policy.exeSha256,waitExitSeconds:90,armTimeoutSeconds:10,createdAt:now(),expiresAt:now()+100000};
   atomicJSON(path.join(dir,'job.json'),cfg,loc.installRoot);atomicJSON(path.join(dir,'authorization.json'),{id,nonce,state:'pending'},loc.installRoot);
   // The worker must prove it loaded the exact job before it is armed.
   worker=launchWorker({worker:path.join(toolRoot,'worker.ps1'),jobFile:path.join(dir,'job.json'),config:cfg});workers.set(id,worker);let spawnError=false;worker?.once?.('error',()=>{spawnError=true;});worker?.once?.('exit',()=>workers.delete(id));
   async function awaitPhase(allowed){const started=now();while(now()-started<handshakeTimeoutMs){if(spawnError)throw failure('worker-start-failed');const state=readMeta(loc,path.join(dir,'status.json'));if(state?.id===id&&state.nonce===nonce){if(allowed.includes(state.phase))return;if(TERMINAL.has(state.phase))throw failure(state.errorCode??'worker-start-failed');}await wait(pollMs);}throw failure('worker-handshake-timeout');}
   await awaitPhase(['worker-ready']);atomicJSON(path.join(dir,'authorization.json'),{id,nonce,state:'armed'},loc.installRoot);await awaitPhase(['waiting-exit','installing','relaunching','complete']);
   return{jobId:id,phase:'prepared'};
  }catch(error){if(dir&&loc){let current;try{current=readMeta(loc,path.join(dir,'status.json'));}catch{}if(!current||!['installing','relaunching','complete'].includes(current.phase)){try{if(cfg)disarm(loc,dir,cfg);}catch{}try{worker?.kill?.();}catch{}if(cfg)workers.delete(cfg.id);try{if(current)atomicJSON(path.join(dir,'status.json'),{...current,phase:'error',errorCode:fixedError(error),updatedAt:now()},loc.installRoot);}catch{}}}throw failure(fixedError(error));}
  finally{if(lockFd!==undefined){fs.closeSync(lockFd);try{fs.unlinkSync(path.join(loc.backupRoot,'prepare.lock'));}catch{}}preparing=false;}
 }
 return{inspect,prepare,cancel};
}

// Exact build profiles: changing an EXE never broadens an archive whitelist.
import fs from 'node:fs';
import path from 'node:path';
import {hashFile} from './asar.mjs';
import {createInstaller} from './engine.mjs';
const codeError=code=>Object.assign(new Error(code),{code});
/** Internal factory for isolated test fixtures; production index fixes profiles. */
export function createProfileInstaller({profiles,packageRoot,platform=process.platform,buildInstaller=spec=>createInstaller({...spec,platform})}={}){
 if(!Array.isArray(profiles)||!profiles.length||new Set(profiles.map(p=>p.policy.exeSha256)).size!==profiles.length)throw codeError('invalid-build-profiles');
 const entries=profiles.map(profile=>({...profile,installer:buildInstaller(profile)}));
 async function select(options){
  if(platform!=='win32')throw codeError('unsupported-platform');
  const file=options?.executable;if(typeof file!=='string'||path.basename(file).toLowerCase()!=='dsh next.exe')throw codeError('unsupported-desktop');
  const absolute=path.resolve(file),base=path.dirname(absolute);
  for(let at=absolute;;at=path.dirname(at)){if(fs.lstatSync(at).isSymbolicLink())throw codeError('unsafe-path');if(at===base)break;}
  const digest=await hashFile(absolute),selected=entries.find(p=>p.policy.exeSha256===digest);if(!selected)throw codeError('unsupported-desktop-build');
  return selected.installer;
 }
 function fixed(options){return{...options,packageRoot:options?.packageRoot??packageRoot};}
 return{
  async inspect(options){try{return await(await select(options)).inspect(fixed(options));}catch(error){return{supported:false,installed:false,variant:'unknown',targetVersion:'unsupported',reason:/^[a-z][a-z0-9-]{2,60}$/.test(error?.code??'')?error.code:'io-error',job:null};}},
  async prepare(options){return(await select(options)).prepare(fixed(options));},
  async cancel(options){return(await select(options)).cancel(fixed(options));}
 };
}

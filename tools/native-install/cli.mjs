// Called only by the manual PowerShell entry, using DSH's own Node runtime.
import {inspect,prepare,cancel} from './index.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const action=process.argv[2]??'inspect';
try{
 let result;if(action==='inspect')result=await inspect({packageRoot,executable:process.execPath});
 else if(['install','rollback'].includes(action))result=await prepare({action,packageRoot,executable:process.execPath});
 else if(action==='cancel')result=await cancel({jobId:process.argv[3],packageRoot,executable:process.execPath});
 else throw Object.assign(new Error('invalid-action'),{code:'invalid-action'});
 process.stdout.write(JSON.stringify({ok:true,result})+'\n');
}catch(error){process.stdout.write(JSON.stringify({ok:false,errorCode:/^[a-z][a-z0-9-]{2,60}$/.test(error?.code??'')?error.code:'installer-failed'})+'\n');process.exitCode=1;}

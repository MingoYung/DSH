/* Local DSH NEXT 2.0.19-next compatibility layer, explicitly enabled by its
 * installation. No Host requests or credentials are used before Host startup.
 * Only the reviewed dsh-awakening 0.4.0 bytes may run in the initial document. */
import {readFile,realpath,stat,lstat,mkdir,writeFile,rename,readdir,rm} from 'node:fs/promises';
import {resolve,join,isAbsolute,sep,relative,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseDocument} from 'yaml';

const ID='dsh-awakening',VERSION='0.4.0';
// Package 0.5 adds installer/settings code; its ten animated runtime assets
// remain byte-identical to the reviewed 0.4 runtime pinned below.
const PACKAGE_VERSIONS=new Set(['0.4.0','0.5.0']);
const DEFAULTS={enabled:true,sound:true,volume:85,frequency:'startup',timeoutSeconds:45};
const KEYS=Object.keys(DEFAULTS);
const SCRIPT_FILES=['runtime/scene/brand.js','runtime/scene/animation.js','runtime/scene/morph.js','runtime/scene/desktop-composition.js','runtime/scene/responsive-composition.js','runtime/scene/portrait-camera.js','runtime/stage.js','runtime/bootstrap.js'];
const MEDIA={'boot.mp4':['media/boot.mp4','video/mp4'],'poster.png':['media/poster.png','image/png']};
const INTEGRITY=Object.freeze({
 'runtime/scene/brand.js':'9133132dba57f3eed887768752e41015b4286293f6f8b794cb1d49ce25a39475',
 'runtime/scene/animation.js':'b5e82bfec9bfe00ff05bea5085c7eca3bca345d074eb7f671981d483333a11fb',
 'runtime/scene/morph.js':'c7468a9682a5a8c4918812e31ebb6b225543723a6e9c25e147ad60dd3ee29bd1',
 'runtime/scene/desktop-composition.js':'b5d757f4aec5c178082b033eaa368e3a8f60fd2a2545e88136bcaa8b6881f37c',
 'runtime/scene/responsive-composition.js':'5761c5f0bcc697af6217f439354ee35839391d83a4de2dfe633ebb3700685923',
 'runtime/scene/portrait-camera.js':'f4498e68661e1a8cd5d03071dab9bd39e676e230f64f61f0ddfb849087da3c0b',
 'runtime/stage.js':'c75dca9e845d7334617d753d071238954add00edf5555959aee2598b4efcded7',
 'runtime/bootstrap.js':'754ae16c954fb2cc906b2e0b579fe65a9f43b56b3863cf599c404701c3dc0b25',
 'media/boot.mp4':'fac040bbdad7580cdd626403edd4aa34116c38070e5271c5315f710a40cf189c',
 'media/poster.png':'f32dedb8187a78c1beb82f9f2350b422b7e8b65bbf0ca62600e1af56902a43b0'
});
const FILES=Object.keys(INTEGRITY),REVISION=/^[a-f0-9]{24}$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const owns=(o,k)=>Object.hasOwn(o,k);
const inlineJSON=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const scriptText=v=>v.replace(/<\/script/gi,'<\\/script');
function validContext(c){return c&&typeof c.home==='string'&&isAbsolute(c.home)&&typeof c.profile==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(c.profile)&&c.safeMode===false&&c.recoveryMode===false;}
function within(root,target){const p=relative(root,target);return p!==''&&!p.startsWith('..'+sep)&&p!=='..'&&!isAbsolute(p);}
async function bounded(file,limit,missing=false){
 try{const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>limit)throw new Error('invalid-file');const data=await readFile(file);if(data.length>limit)throw new Error('invalid-file');return data;}
 catch(error){if(missing&&error.code==='ENOENT')return null;throw error;}
}
function validateSettings(settings){return typeof settings.enabled==='boolean'&&typeof settings.sound==='boolean'&&Number.isInteger(settings.volume)&&settings.volume>=0&&settings.volume<=100&&['startup','daily'].includes(settings.frequency)&&Number.isInteger(settings.timeoutSeconds)&&settings.timeoutSeconds>=25&&settings.timeoutSeconds<=60;}
function ownNested(value,depth=0){
 if(depth>40)throw new Error('patch-too-deep');
 if(!value||typeof value!=='object')return false;
 if(value.id===ID)return true;
 return Object.values(value).some(v=>ownNested(v,depth+1));
}
function parseRows(bytes){
 if(bytes===null)return [];
 const document=parseDocument(bytes.toString('utf8'),{logLevel:'silent',customTags:[{tag:'tag:yaml.org,2002:js',resolve:()=>({unsupportedNativeExpression:true})}]});
 if(document.errors.length)throw new Error('invalid-profile-yaml');
 const rows=document.toJS({maxAliasCount:100});
 if(!Array.isArray(rows))throw new Error('profile-patch-not-sequence');
 return rows;
}
// A top-level expression, wildcard/control selector or computed provider may
// change any entry. Never evaluate it or conclude that it targets another row.
// A known insert of entirely static, unrelated entries is safe to ignore.
function controlRow(row,allowOwn){
 if(!plain(row))throw new Error('unknown-control-row');
 if(owns(row,'insert')){
  if(Object.keys(row).length!==1||!Array.isArray(row.insert))throw new Error('unknown-insert-control');
  for(const child of row.insert){controlRow(child,false);if(ownNested(child))throw new Error('nested-own-control');}
  return false;
 }
 if(typeof row.id!=='string'||!row.id||row.id.length>256||/[?*\[\]]/.test(row.id))throw new Error('unknown-control-id');
 if(Object.keys(row).some(key=>!['id','name','config','disabled'].includes(key)))throw new Error('unknown-control-shape');
 if(owns(row,'name')&&typeof row.name!=='string')throw new Error('computed-provider');
 if(row.id!==ID&&(row.id.includes(ID)||row.name===ID))throw new Error('aliased-own-provider');
 if(row.id===ID&&!allowOwn)throw new Error('unsupported-own-control');
 return row.id===ID;
}
function applyRows(rows,state){
 for(const row of rows){
  const isOwn=controlRow(row,true);
  if(!isOwn){if(ownNested(row))throw new Error('unsupported-nested-own-patch');continue;}
  if(Object.keys(row).some(key=>!['id','name','config','disabled'].includes(key)))throw new Error('unsupported-own-patch');
  if(owns(row,'name')&&row.name!==ID)throw new Error('own-provider-mismatch');
  if(owns(row,'disabled')){if(typeof row.disabled!=='boolean')throw new Error('invalid-disabled');state.disabled=row.disabled;}
  if(owns(row,'config')){
   if(!plain(row.config)||Object.keys(row.config).some(key=>!KEYS.includes(key)))throw new Error('unsupported-own-config');
   Object.assign(state.settings,row.config);
  }
  state.found=true;
 }
}
async function selection(context){
 const home=await realpath(context.home),profile=join(home,'profiles',context.profile);
 const profileReal=await realpath(profile);
 if(profileReal!==profile||!within(home,profileReal))throw new Error('profile-link-not-supported');
 const manifest=JSON.parse((await bounded(join(profile,'package.json'),1024*1024)).toString('utf8'));
 if(!Array.isArray(manifest.dsh?.profile?.bundles)||!manifest.dsh.profile.bundles.includes(ID)||typeof manifest.dependencies?.[ID]!=='string')throw new Error('bundle-not-selected');
 const dependency=manifest.dependencies[ID];
 const packagePath=/^(link:|file:)/.test(dependency)?resolve(profile,dependency.slice(dependency.indexOf(':')+1)):join(profile,'node_modules',ID);
 const packageRoot=await realpath(packagePath);
 const pkg=JSON.parse((await bounded(join(packageRoot,'package.json'),128*1024)).toString('utf8'));
 if(pkg.name!==ID||!PACKAGE_VERSIONS.has(pkg.version))throw new Error('unreviewed-package');
 const state={found:false,disabled:false,settings:{...DEFAULTS}};
 applyRows(parseRows(await bounded(join(profile,'cordis.yml'),2*1024*1024,true)),state);
 applyRows(parseRows(await bounded(join(profile,'cordis.patch.yml'),2*1024*1024,true)),state);
 // Global/explicit desktop overlays use richer composition semantics. Never
 // guess their order or execute an expression: any own reference fails closed.
 for(const file of [join(home,'cordis.patch.yml'),join(profile,'desktop-next.cordis.patch.json'),join(profile,'desktop-next.runtime.patch.json')]){
  const raw=await bounded(file,2*1024*1024,true);if(raw===null)continue;
  const value=file.endsWith('.json')?JSON.parse(raw.toString('utf8')):parseRows(raw);
  if(!Array.isArray(value))throw new Error('unknown-overlay-control');
  for(const row of value)controlRow(row,false);
  if(ownNested(value))throw new Error('unsupported-overlay-own-patch');
 }
 if(state.disabled||!validateSettings(state.settings)||!state.settings.enabled)throw new Error('animation-disabled-or-invalid');
 return {home,profile:context.profile,packageRoot,settings:state.settings};
}
async function packageBytes(packageRoot){
 const bytes=new Map();
 for(const file of FILES){
  const original=join(packageRoot,file),target=await realpath(original);
  if(!within(packageRoot,target))throw new Error('asset-outside-package');
  const payload=await bounded(target,file.endsWith('.mp4')?20*1024*1024:file.endsWith('.png')?4*1024*1024:512*1024);
  if(sha(payload)!==INTEGRITY[file])throw new Error('asset-integrity-mismatch');
  bytes.set(file,payload);
 }
 return bytes;
}
async function realDirectory(parent,name){
 const target=join(parent,name);
 try{await mkdir(target,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}
 const info=await lstat(target);
 if(!info.isDirectory()||info.isSymbolicLink()||await realpath(target)!==target)throw new Error('cache-directory-link');
 return target;
}
async function verifiedCache(directory){
 const info=await lstat(directory);
 if(!info.isDirectory()||info.isSymbolicLink()||await realpath(directory)!==directory)throw new Error('invalid-cache');
 const actual=new Map();
 for(const file of FILES){
  const target=await realpath(join(directory,file));if(!within(directory,target))throw new Error('cache-outside-root');
  const bytes=await bounded(target,file.endsWith('.mp4')?20*1024*1024:file.endsWith('.png')?4*1024*1024:512*1024);
  if(sha(bytes)!==INTEGRITY[file])throw new Error('cached-integrity-mismatch');
  actual.set(file,bytes);
 }
 return actual;
}
async function safeRemoveRevision(root,name){
 if(!REVISION.test(name))return;
 const directory=join(root,name);
 const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink()||await realpath(directory)!==directory)return;
 // This cache has a fixed, known tree. Unknown files/links are never removed.
 const known=new Set([...FILES,'manifest.json']);
 async function check(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const rel=prefix+entry.name,target=join(dir,entry.name);
   if(entry.isSymbolicLink())return false;
   if(entry.isDirectory()){if(!FILES.some(file=>file.startsWith(rel+'/'))||!await check(target,rel+'/'))return false;}
   else if(!entry.isFile()||!known.has(rel))return false;
  }
  return true;
 }
 if(await check(directory))await rm(directory,{recursive:true});
}
async function cleanCache(root,protectedRevisions){
 const entries=[];
 for(const row of await readdir(root,{withFileTypes:true}))if(row.isDirectory()&&!row.isSymbolicLink()&&REVISION.test(row.name)&&!protectedRevisions.has(row.name))entries.push({name:row.name,mtime:(await stat(join(root,row.name))).mtimeMs});
 entries.sort((a,b)=>b.mtime-a.mtime);
 for(const row of entries.slice(2))await safeRemoveRevision(root,row.name);
}
async function cache(selection,bytes,revision,activeRevisions){
 let cacheRoot=await realDirectory(selection.home,'desktop-startup');cacheRoot=await realDirectory(cacheRoot,'awakening');
 const directory=join(cacheRoot,revision);
 let exists=true;try{await lstat(directory);}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}
 if(!exists){
  const temporary=join(cacheRoot,'.pending-'+randomUUID());await mkdir(temporary,{mode:0o700});
  try{
   for(const [file,payload]of bytes){const target=join(temporary,file);await mkdir(dirname(target),{recursive:true,mode:0o700});await writeFile(target,payload,{flag:'wx',mode:0o600});}
   await writeFile(join(temporary,'manifest.json'),JSON.stringify({schema:1,version:VERSION,revision,profile:selection.profile,integrity:INTEGRITY}),{flag:'wx',mode:0o600});
   await verifiedCache(temporary);
   try{await rename(temporary,directory);}catch(error){if(!['EEXIST','ENOTEMPTY','EPERM'].includes(error.code))throw error;await verifiedCache(directory);await rm(temporary,{recursive:true});}
  }catch(error){try{if(await realpath(temporary)===temporary)await rm(temporary,{recursive:true});}catch{}throw error;}
 }
 const cached=await verifiedCache(directory);
 try{await cleanCache(cacheRoot,new Set([revision,...activeRevisions]));}catch{/* cache retention must not block boot */}
 return {directory,bytes:cached};
}

/** Every initial document reads authoritative saved plugin settings afresh. */
export async function loadCarrier(context,{onWarning=()=>{},activeRevisions=[]}={}){
 if(!validContext(context))return null;
 try{
  const selected=await selection(context),source=await packageBytes(selected.packageRoot);
  const revision=sha(JSON.stringify([VERSION,selected.profile,selected.settings,INTEGRITY])).slice(0,24);
  const cached=await cache(selected,source,revision,activeRevisions);
  const prefix='/assets/dsh-awakening-native/'+revision+'/';
  const options={settings:selected.settings,sourceUrl:prefix+'boot.mp4',posterUrl:prefix+'poster.png',autostart:true};
  const code=SCRIPT_FILES.map(file=>cached.bytes.get(file).toString('utf8')).join('\n')+'\nwindow.__DSH_AWAKENING_INSTALL__('+inlineJSON(options)+');';
  const assets=new Map();
  for(const [file]of Object.values(MEDIA)){
   const path=join(cached.directory,file),info=await stat(path);
   assets.set(file,{file:path,size:info.size,mtimeMs:info.mtimeMs,bytes:cached.bytes.get(file)});
  }
  return {revision,profile:selected.profile,prefix,head:'<script data-dsh-native-boot="'+revision+'">'+scriptText(code)+'</script>',assets,sourceSettings:{...selected.settings},cacheDirectory:cached.directory};
 }catch{try{onWarning('native-boot-skipped');}catch{}return null;}
}
function rangeOf(text,size){if(!text)return null;const m=/^bytes=(\d*)-(\d*)$/.exec(text.trim());if(!m||(!m[1]&&!m[2]))return false;let start,end;if(!m[1]){const n=Number(m[2]);if(!Number.isSafeInteger(n)||n<=0)return false;start=Math.max(0,size-n);end=size-1;}else{start=Number(m[1]);end=m[2]?Number(m[2]):size-1;}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return false;return {start,end:Math.min(end,size-1)};}
/** Resource bodies use the exact validated immutable bytes, never source reads. */
export async function serveCarrierAsset(request,carrier){
 if(!carrier)return null;
 const url=new URL(request.url),name=url.pathname.startsWith(carrier.prefix)?url.pathname.slice(carrier.prefix.length):null;
 if(!name||!Object.hasOwn(MEDIA,name))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 const [file,mime]=MEDIA[name],asset=carrier.assets.get(file);
 try{
  const current=await lstat(asset.file);if(!current.isFile()||current.isSymbolicLink()||current.size!==asset.size||current.mtimeMs!==asset.mtimeMs)return new Response(null,{status:410});
  const range=rangeOf(request.headers.get('range'),asset.size);if(range===false)return new Response(null,{status:416,headers:{'content-range':'bytes */'+asset.size}});
  const start=range?.start??0,end=range?.end??asset.size-1;
  const headers={'content-type':mime,'content-length':String(end-start+1),'accept-ranges':'bytes','cache-control':'no-store','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin'};
  if(range)headers['content-range']=`bytes ${start}-${end}/${asset.size}`;
  return new Response(request.method==='HEAD'?null:asset.bytes.subarray(start,end+1),{status:range?206:200,headers});
 }catch{return new Response(null,{status:404});}
}
export const snapshotFiles=Object.freeze(FILES);

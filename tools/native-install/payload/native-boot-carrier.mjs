/* Local DSH NEXT 2.0.19-next compatibility layer, explicitly enabled by its
 * installation. No Host requests or credentials are used before Host startup.
 * Only the reviewed dsh-awakening runtime bytes may run in the initial document.
 * Creator media is data only: an explicitly selected, local, hash-checked video. */
import {readFile,realpath,stat,lstat,mkdir,writeFile,rename,readdir,rm} from 'node:fs/promises';
import {resolve,join,isAbsolute,sep,relative,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseDocument} from 'yaml';

const ID='dsh-awakening',VERSION='0.7.0';
const PACKAGE_VERSIONS=new Set(['0.7.0']);
const DEFAULTS={enabled:true,sound:true,volume:85,frequency:'startup',timeoutSeconds:45,animationId:'builtin:awakening',videoFit:'cover'};
const KEYS=Object.keys(DEFAULTS);
const SCRIPT_FILES=['runtime/scene/brand.js','runtime/scene/animation.js','runtime/scene/morph.js','runtime/scene/desktop-composition.js','runtime/scene/responsive-composition.js','runtime/scene/portrait-camera.js','runtime/safe-video.js','runtime/stage.js','runtime/bootstrap.js'];
const BUILTIN_FILES=Object.freeze({'builtin:awakening':['boot.mp4','poster.png'],'builtin:codex':['codex.mp4','codex-poster.png'],'builtin:claude-code':['claude-code.mp4','claude-code-poster.png']});
const MEDIA=Object.fromEntries(Object.values(BUILTIN_FILES).flat().map(name=>[name,['media/'+name,name.endsWith('.mp4')?'video/mp4':'image/png']]));
const INTEGRITY=Object.freeze({
 "runtime/scene/brand.js": "9133132dba57f3eed887768752e41015b4286293f6f8b794cb1d49ce25a39475",
 "runtime/scene/animation.js": "61a55db356ce2f89e30ce1e098a66c1e1f61bc88699c617a81564e6a97c4e038",
 "runtime/scene/morph.js": "923240333c95301d9a6f90bd72e8aca28d87b944c3f63f91138825c9b8971434",
 "runtime/scene/desktop-composition.js": "145c4c50098b6c551bd624c34009669bb9292ec7f1d468d587afa2ef10a0e4fa",
 "runtime/scene/responsive-composition.js": "391f25bdafd44620d5b061ffb2b8fb19b8adf80c0085f8bcc6ef68a792255ec3",
 "runtime/scene/portrait-camera.js": "153ec0432d12c76de19bfea462352784b003b9888717c0df8d4dbc8c71c23fa4",
 "runtime/safe-video.js": "85bcbbc541df93083e7c5d70fc7311350b4ee268730a346ccba1ab1e94107fa9",
 "runtime/stage.js": "f0407d0293f61ea84bde9de3062cd057cf116cd509f54859fc554dd9eb2512db",
 "runtime/bootstrap.js": "c82de55af6009153e68dfc54dee1a52060d9e3d9c927620c43e20496bc23ac03",
 "media/builtins.json": "0c4f44e6377853defb2c052e5613552af88f37342e0f7d415e4d522e9e0c84dd",
 "media/boot.mp4": "7cd3f3bb33afa18ee2591e10e0d52c6838bd7aa09518780c90628fac3e752849",
 "media/poster.png": "91395701dd37dec4b3a9f7eb7daf3b5f884f6f3f5f3bb45496ea2613a0e2ff6f",
 "media/codex.mp4": "9a3a11a7edd9ff1c2185e293f69aed75495f935c665ecb09b3df751900b306a5",
 "media/codex-poster.png": "7729cb2116c4de284f23d6f3fe0a490437837894bcf9672f064603247c4e5851",
 "media/claude-code.mp4": "24968a5910759fa1824efbeb6db662c97d5d22754ad4898259f2ca7ddb5787ea",
 "media/claude-code-poster.png": "8402c9b2a467593c33170c15cbbad029a38c9400772563b60a2c3628c63cba1a"
});
const FILES=Object.keys(INTEGRITY),REVISION=/^[a-f0-9]{24}$/;
const MAX_VIDEO_BYTES=120*1024*1024,MAX_LIBRARY_BYTES=1024*1024;
const SHA256=/^[a-f0-9]{64}$/,VIDEO_ID=/^video:[a-f0-9]{24}$/;
const LICENSES=new Set(['local-only','MIT','CC-BY-4.0','CC0-1.0','CC-BY-SA-4.0']);
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
function validateSettings(settings){return typeof settings.enabled==='boolean'&&typeof settings.sound==='boolean'&&Number.isInteger(settings.volume)&&settings.volume>=0&&settings.volume<=100&&['startup','daily'].includes(settings.frequency)&&Number.isInteger(settings.timeoutSeconds)&&settings.timeoutSeconds>=25&&settings.timeoutSeconds<=60&&(owns(BUILTIN_FILES,settings.animationId)||VIDEO_ID.test(settings.animationId))&&['cover','contain'].includes(settings.videoFit);}
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
  const payload=await bounded(target,file.endsWith('.mp4')?MAX_VIDEO_BYTES:file.endsWith('.png')?4*1024*1024:512*1024);
  if(sha(payload)!==INTEGRITY[file])throw new Error('asset-integrity-mismatch');
  bytes.set(file,payload);
 }
 return bytes;
}
function label(value){return typeof value==='string'&&value.trim().length>0&&value.length<=80&&!/[\u0000-\u001f\u007f]/.test(value);}
function videoEntry(value){
 return plain(value)&&SHA256.test(value.sha256)&&value.id==='video:'+value.sha256.slice(0,24)&&['mp4','webm'].includes(value.format)&&value.file===value.sha256+'.'+value.format&&Number.isSafeInteger(value.bytes)&&value.bytes>=12&&value.bytes<=MAX_VIDEO_BYTES&&Number.isFinite(value.durationSeconds)&&value.durationSeconds>=1&&value.durationSeconds<=45&&label(value.title)&&label(value.author)&&LICENSES.has(value.license);
}
function videoHeader(bytes,format){return format==='mp4'?bytes.length>=12&&bytes.toString('ascii',4,8)==='ftyp':format==='webm'&&bytes.length>=4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;}
/** Never load a creator script, evaluate metadata, or fetch a remote asset here. */
async function selectedVideo(selected){
 if(owns(BUILTIN_FILES,selected.settings.animationId))return null;
 const library=join(selected.home,'awakening-library'),info=await lstat(library);
 if(!info.isDirectory()||info.isSymbolicLink()||await realpath(library)!==library)throw new Error('invalid-library-directory');
 const manifest=JSON.parse((await bounded(join(library,'manifest.json'),MAX_LIBRARY_BYTES)).toString('utf8'));
 if(!plain(manifest)||manifest.schemaVersion!==1||!Array.isArray(manifest.animations)||manifest.animations.length>128)throw new Error('invalid-library-manifest');
 const entries=manifest.animations,ids=new Set();
 for(const entry of entries){if(!videoEntry(entry)||ids.has(entry.id))throw new Error('invalid-library-entry');ids.add(entry.id);}
 const entry=entries.find(value=>value.id===selected.settings.animationId);
 if(!entry)throw new Error('selected-video-missing');
 const target=join(library,entry.file),payload=await bounded(target,MAX_VIDEO_BYTES);
 if(payload.length!==entry.bytes||sha(payload)!==entry.sha256||!videoHeader(payload,entry.format))throw new Error('selected-video-invalid');
 return{entry,payload,file:'media/selected.'+entry.format,route:'selected.'+entry.format,mime:entry.format==='mp4'?'video/mp4':'video/webm'};
}

// Consume the very same pinned descriptor document as Host. Only resource URLs
// change to this document's immutable native route; fit and camera clock remain
// with the shared video runtime. No creator code is loaded from metadata.
function presentation(value,duration){
 if(!plain(value)||value.schemaVersion!==1||value.mode!=='safe-camera'||value.sourceWidth!==1280||value.sourceHeight!==720||value.sampleBackground!==true||!Array.isArray(value.keyframes)||value.keyframes.length<2||value.keyframes.length>32)return false;
 let previous=-1;
 for(const frame of value.keyframes){
  if(!plain(frame)||!Number.isFinite(frame.time)||frame.time<0||frame.time>duration||frame.time<=previous||!Array.isArray(frame.safe)||frame.safe.length!==4||!frame.safe.every(Number.isFinite)||!/^#[a-f0-9]{6}$/i.test(frame.background)||!Number.isFinite(frame.verticalAnchor)||frame.verticalAnchor<0||frame.verticalAnchor>1)return false;
  const[x,y,w,h]=frame.safe;if(x<0||y<0||w<=0||h<=0||x+w>1280||y+h>720)return false;previous=frame.time;
 }
 return value.keyframes[0].time===0&&previous===duration;
}
function selectedBuiltin(source,id,prefix){
 const manifest=JSON.parse(source.get('media/builtins.json').toString('utf8'));
 if(!plain(manifest)||manifest.schemaVersion!==1||!Array.isArray(manifest.entries)||manifest.entries.length!==3)throw new Error('invalid-builtin-manifest');
 const ids=new Set();
 for(const entry of manifest.entries){
  if(!plain(entry)||!owns(BUILTIN_FILES,entry.id)||ids.has(entry.id)||entry.kind!=='video'||entry.builtin!==true||entry.removable!==false||entry.fit!=='safe'||entry.durationSeconds!==22||!label(entry.title)||!label(entry.author)||!LICENSES.has(entry.license)||!presentation(entry.presentation,entry.durationSeconds))throw new Error('invalid-builtin-descriptor');
  ids.add(entry.id);const[video,poster]=BUILTIN_FILES[entry.id];
  if(entry.sourceUrl!=='/dsh-awakening/media/'+video+'?v='+VERSION||entry.posterUrl!=='/dsh-awakening/media/'+poster+'?v='+VERSION||entry.thumbnailUrl!==entry.posterUrl||entry.sha256!==INTEGRITY['media/'+video]||entry.bytes!==source.get('media/'+video).length)throw new Error('builtin-media-mismatch');
 }
 const entry=manifest.entries.find(value=>value.id===id);if(!entry)throw new Error('selected-builtin-missing');
 const[video,poster]=BUILTIN_FILES[id];return{...entry,sourceUrl:prefix+video,posterUrl:prefix+poster,thumbnailUrl:prefix+poster};
}
async function realDirectory(parent,name){
 const target=join(parent,name);
 try{await mkdir(target,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}
 const info=await lstat(target);
 if(!info.isDirectory()||info.isSymbolicLink()||await realpath(target)!==target)throw new Error('cache-directory-link');
 return target;
}
async function verifiedCache(directory,integrity){
 const info=await lstat(directory);
 if(!info.isDirectory()||info.isSymbolicLink()||await realpath(directory)!==directory)throw new Error('invalid-cache');
 const actual=new Map();
 for(const file of Object.keys(integrity)){
  const target=await realpath(join(directory,file));if(!within(directory,target))throw new Error('cache-outside-root');
  const bytes=await bounded(target,/\.(mp4|webm)$/.test(file)?MAX_VIDEO_BYTES:file.endsWith('.png')?4*1024*1024:512*1024);
  if(sha(bytes)!==integrity[file])throw new Error('cached-integrity-mismatch');
  actual.set(file,bytes);
 }
 return actual;
}
async function safeRemoveRevision(root,name){
 if(!REVISION.test(name))return;
 const directory=join(root,name);
 const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink()||await realpath(directory)!==directory)return;
 // This cache has a fixed, known tree. Unknown files/links are never removed.
 const known=new Set([...FILES,'media/selected.mp4','media/selected.webm','manifest.json']);
 async function check(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const rel=prefix+entry.name,target=join(dir,entry.name);
   if(entry.isSymbolicLink())return false;
   if(entry.isDirectory()){if(![...known].some(file=>file.startsWith(rel+'/'))||!await check(target,rel+'/'))return false;}
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
async function cache(selection,bytes,integrity,revision,activeRevisions){
 let cacheRoot=await realDirectory(selection.home,'desktop-startup');cacheRoot=await realDirectory(cacheRoot,'awakening');
 const directory=join(cacheRoot,revision);
 let exists=true;try{await lstat(directory);}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}
 if(!exists){
  const temporary=join(cacheRoot,'.pending-'+randomUUID());await mkdir(temporary,{mode:0o700});
  try{
   for(const [file,payload]of bytes){const target=join(temporary,file);await mkdir(dirname(target),{recursive:true,mode:0o700});await writeFile(target,payload,{flag:'wx',mode:0o600});}
   await writeFile(join(temporary,'manifest.json'),JSON.stringify({schema:2,version:VERSION,revision,profile:selection.profile,integrity}),{flag:'wx',mode:0o600});
   await verifiedCache(temporary,integrity);
   try{await rename(temporary,directory);}catch(error){if(!['EEXIST','ENOTEMPTY','EPERM'].includes(error.code))throw error;await verifiedCache(directory,integrity);await rm(temporary,{recursive:true});}
  }catch(error){try{if(await realpath(temporary)===temporary)await rm(temporary,{recursive:true});}catch{}throw error;}
 }
 const cached=await verifiedCache(directory,integrity);
 try{await cleanCache(cacheRoot,new Set([revision,...activeRevisions]));}catch{/* cache retention must not block boot */}
 return {directory,bytes:cached};
}

/** Every initial document reads authoritative saved plugin settings afresh. */
export async function loadCarrier(context,{onWarning=()=>{},activeRevisions=[]}={}){
 if(!validContext(context))return null;
 try{
  const selected=await selection(context),source=await packageBytes(selected.packageRoot),video=await selectedVideo(selected);
  const integrity={...INTEGRITY},media={...MEDIA};
  if(video){source.set(video.file,video.payload);integrity[video.file]=video.entry.sha256;media[video.route]=[video.file,video.mime];}
  const revision=sha(JSON.stringify([VERSION,selected.profile,selected.settings,integrity])).slice(0,24);
  const cached=await cache(selected,source,integrity,revision,activeRevisions);
  const prefix='/assets/dsh-awakening-native/'+revision+'/';
  const animation=video?{id:video.entry.id,title:video.entry.title,kind:'video',durationSeconds:video.entry.durationSeconds,sourceUrl:prefix+video.route,fit:selected.settings.videoFit}:selectedBuiltin(source,selected.settings.animationId,prefix);
  const options={version:VERSION,settings:selected.settings,animation,sourceUrl:animation.sourceUrl,...animation.posterUrl?{posterUrl:animation.posterUrl}:{},autostart:true};
  const code=SCRIPT_FILES.map(file=>cached.bytes.get(file).toString('utf8')).join('\n')+'\nwindow.__DSH_AWAKENING_INSTALL__('+inlineJSON(options)+');';
  const assets=new Map();
  for(const [file]of Object.values(media)){
   const path=join(cached.directory,file),info=await stat(path);
   assets.set(file,{file:path,size:info.size,mtimeMs:info.mtimeMs,bytes:cached.bytes.get(file)});
  }
  return {revision,profile:selected.profile,prefix,head:'<script data-dsh-native-boot="'+revision+'">'+scriptText(code)+'</script>',assets,media,sourceSettings:{...selected.settings},cacheDirectory:cached.directory};
 }catch{try{onWarning('native-boot-skipped');}catch{}return null;}
}
function rangeOf(text,size){if(!text)return null;const m=/^bytes=(\d*)-(\d*)$/.exec(text.trim());if(!m||(!m[1]&&!m[2]))return false;let start,end;if(!m[1]){const n=Number(m[2]);if(!Number.isSafeInteger(n)||n<=0)return false;start=Math.max(0,size-n);end=size-1;}else{start=Number(m[1]);end=m[2]?Number(m[2]):size-1;}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return false;return {start,end:Math.min(end,size-1)};}
/** Resource bodies use the exact validated immutable bytes, never source reads. */
export async function serveCarrierAsset(request,carrier){
 if(!carrier)return null;
 const url=new URL(request.url),name=url.pathname.startsWith(carrier.prefix)?url.pathname.slice(carrier.prefix.length):null;
 const media=carrier.media??MEDIA;
 if(!name||!Object.hasOwn(media,name))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 const [file,mime]=media[name],asset=carrier.assets.get(file);
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

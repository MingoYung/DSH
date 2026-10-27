import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { fileHandler } from './media.js';

export const CATALOG_URL='https://raw.githubusercontent.com/MingoYung/dsh-awakening-library/main/catalog.json';
export const CONTRIBUTION_URL='https://github.com/MingoYung/dsh-awakening-library/blob/main/CONTRIBUTING.md';
export const LIMITS=Object.freeze({bytes:120*1024*1024,durationSeconds:45,entries:128});
export const LICENSES=Object.freeze(['local-only','MIT','CC-BY-4.0','CC0-1.0','CC-BY-SA-4.0']);
const HOSTS=new Set(['github.com','raw.githubusercontent.com','objects.githubusercontent.com','release-assets.githubusercontent.com','user-images.githubusercontent.com','camo.githubusercontent.com']);
const sha=data=>createHash('sha256').update(data).digest('hex');
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validText=(s,max=80)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\x00-\x1f\x7f]/.test(s);
const fail=(code,message,status=400)=>Object.assign(new Error(message),{code,status});
const builtin=Object.freeze({id:'builtin:awakening',title:'鲸启',author:'MingoYung',license:'MIT',kind:'adaptive',durationSeconds:22,sourceUrl:'/dsh-awakening/media/boot.mp4?v=0.6.0',posterUrl:'/dsh-awakening/media/poster.png?v=0.6.0',thumbnailUrl:'/dsh-awakening/media/library-cover.png',sourcePage:'https://github.com/MingoYung/dsh-awakening/blob/main/CREDITS.md',fit:'cover'});
export function trustedUrl(value){
  if(typeof value!=='string'||value.length>2048||/[\x00-\x20\x7f]/.test(value)||value.includes('#')||value.split('/')[2]?.includes('@'))throw fail('invalid-url','作品地址无效。');
  let u;try{u=new URL(value);}catch{throw fail('invalid-url','作品地址无效。');}
  if(u.protocol!=='https:'||!HOSTS.has(u.hostname)||u.username||u.password||u.hash||(u.port&&u.port!=='443'))throw fail('invalid-url','动画库只接受 GitHub 托管的 HTTPS 地址。');
  return u;
}
export function validateCatalog(value){
  if(!plain(value)||value.schemaVersion!==1||!Array.isArray(value.entries)||value.entries.length>LIMITS.entries)throw fail('invalid-catalog','动画库索引格式不受支持。');
  const ids=new Set();
  for(const entry of value.entries){
    if(!plain(entry)||typeof entry.id!=='string'||!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(entry.id)||ids.has(entry.id)||!validText(entry.title)||!validText(entry.author)||!LICENSES.slice(1).includes(entry.license)||!validText(entry.description,256)||!Number.isFinite(entry.durationSeconds)||entry.durationSeconds<1||entry.durationSeconds>45)throw fail('invalid-catalog','动画库条目信息不完整或重复。');
    ids.add(entry.id);trustedUrl(entry.sourceUrl);trustedUrl(entry.licenseUrl);if(entry.previewUrl)trustedUrl(entry.previewUrl);
    if(entry.kind==='builtin'){if(entry.id!=='mingoyung.awakening'||entry.durationSeconds!==22||Object.hasOwn(entry,'asset'))throw fail('invalid-catalog','未知内置动画。');}
    else if(entry.kind==='video'){
      const a=entry.asset;
      if(!plain(a)||!['mp4','webm'].includes(a.format)||!Number.isSafeInteger(a.bytes)||a.bytes<12||a.bytes>LIMITS.bytes||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256))throw fail('invalid-catalog','作品下载信息无效。');
      if(!trustedUrl(a.url).pathname.toLowerCase().endsWith('.'+a.format))throw fail('invalid-catalog','作品文件扩展名与格式不一致。');
    }else throw fail('invalid-catalog','仅接受内置动画或 MP4 / WebM 视频。');
  }
  return value;
}
function validateLocal(e){
  if(!(plain(e)&&typeof e.sha256==='string'&&/^[a-f0-9]{64}$/.test(e.sha256)&&e.id==='video:'+e.sha256.slice(0,24)&&['mp4','webm'].includes(e.format)&&e.file===e.sha256+'.'+e.format&&Number.isSafeInteger(e.bytes)&&e.bytes>=12&&e.bytes<=LIMITS.bytes&&Number.isFinite(e.durationSeconds)&&e.durationSeconds>=1&&e.durationSeconds<=45&&validText(e.title)&&validText(e.author)&&LICENSES.includes(e.license)))return false;
  try{if(e.sourceUrl)trustedUrl(e.sourceUrl);if(e.licenseUrl)trustedUrl(e.licenseUrl);}catch{return false;}return true;
}
function mediaSignature(prefix,format){return format==='mp4'?prefix.length>=12&&prefix.toString('ascii',4,8)==='ftyp':prefix.length>=4&&prefix.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));}
function sameToken(value,expected){if(typeof value!=='string'||value.length>256)return false;const a=Buffer.from(value),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
function sameOrigin(req){try{const origin=new URL(req.headers?.origin),host=req.headers?.host;return ['http:','https:'].includes(origin.protocol)&&origin.host===host&&!origin.username&&!origin.password&&origin.pathname==='/';}catch{return false;}}
function reply(res,status,value){if(res.destroyed||res.writableEnded)return;const bytes=Buffer.from(JSON.stringify(value));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':String(bytes.length),'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);}
async function readJSON(req,max=4096){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers?.['content-type']??''))throw fail('invalid-body','请求格式无效。',415);
  const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>max)throw fail('body-too-large','请求内容过大。',413);chunks.push(chunk);}
  let v;try{v=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('invalid-body','请求内容无效。');}if(!plain(v))throw fail('invalid-body','请求内容无效。');return v;
}
export function createAnimationLibrary({home=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),fetchImpl=globalThis.fetch}={}){
  const absoluteHome=path.resolve(home),root=path.join(absoluteHome,'awakening-library'),manifestFile=path.join(root,'manifest.json'),catalogFile=path.join(root,'catalog-cache.json');
  let busy=false;const verified=new Map();
  function guard(file){
    const rel=path.relative(absoluteHome,path.resolve(file));if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw fail('unsafe-path','动画库目录无效。');
    for(let at=path.resolve(file);;at=path.dirname(at)){
      try{if(fs.lstatSync(at).isSymbolicLink())throw fail('unsafe-path','动画库目录包含不支持的链接。');}catch(e){if(e.code!=='ENOENT')throw e;}
      if(at===absoluteHome)break;if(path.dirname(at)===at)throw fail('unsafe-path','动画库目录无效。');
    }
  }
  function readFile(file,max,missing){guard(file);try{const s=fs.lstatSync(file);if(!s.isFile()||s.size>max)throw fail('invalid-library','动画库文件无效。');const b=fs.readFileSync(file);if(b.length>max)throw fail('invalid-library','动画库文件过大。');return b;}catch(e){if(e.code==='ENOENT'&&missing)return null;throw e;}}
  function state(){
    const b=readFile(manifestFile,1024*1024,true);if(!b)return{schemaVersion:1,animations:[]};let v;try{v=JSON.parse(b);}catch{throw fail('invalid-library','本地动画库索引损坏，请保留文件并检查，未覆盖原数据。');}
    if(!plain(v)||v.schemaVersion!==1||!Array.isArray(v.animations)||v.animations.length>128||!v.animations.every(validateLocal)||new Set(v.animations.map(e=>e.id)).size!==v.animations.length)throw fail('invalid-library','本地动画库索引不受支持，未修改原数据。');return v;
  }
  function ensure(){guard(root);fs.mkdirSync(root,{recursive:true,mode:0o700});guard(root);}
  function atomic(file,value){guard(file);const temp=path.join(root,'.pending-'+randomUUID()+'.json');guard(temp);try{fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temp,file);}finally{try{fs.unlinkSync(temp);}catch{}}}
  function descriptor(e){return {...Object.fromEntries(['id','title','author','license','durationSeconds','sha256','bytes','catalogId','importedAt','licenseUrl'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])),kind:'video',sourceUrl:'/dsh-awakening/library/media?id='+encodeURIComponent(e.id),sourcePage:e.sourceUrl,fit:'cover'};}
  function checkedMedia(e){
    if(!validateLocal(e))throw fail('invalid-library','作品信息无效。');const file=path.join(root,e.file);guard(file);let stat;try{stat=fs.lstatSync(file);}catch{throw fail('missing-media','视频文件已丢失，请重新导入。',404);}
    if(!stat.isFile()||stat.size!==e.bytes)throw fail('media-changed','视频文件已变化，请重新导入。',409);
    const key=[e.sha256,stat.size,stat.mtimeMs,stat.ctimeMs].join(':');
    if(!verified.has(key)){const bytes=fs.readFileSync(file);if(sha(bytes)!==e.sha256||!mediaSignature(bytes.subarray(0,32),e.format))throw fail('media-changed','视频校验未通过，请重新导入。',409);if(verified.size>=128)verified.delete(verified.keys().next().value);verified.set(key,true);}
    return file;
  }
  function resolve(id='builtin:awakening',fit='cover'){
    if(id==='builtin:awakening')return{...builtin};const e=state().animations.find(v=>v.id===id);if(!e)throw fail('missing-media','所选动画未在本机找到，当前使用内置鲸启。',404);checkedMedia(e);return{...descriptor(e),fit:fit==='contain'?'contain':'cover'};
  }
  function list(){
    const value=state();const entries=[{...builtin},...value.animations.map(e=>{try{const file=path.join(root,e.file);guard(file);const stat=fs.lstatSync(file);if(!stat.isFile()||stat.size!==e.bytes)throw fail('missing-media','视频不存在或大小已变化，请重新导入。');return descriptor(e);}catch(error){return{...descriptor(e),unavailable:true,unavailableReason:error.code==='missing-media'?error.message:'视频文件不可用，请重新导入。'};}})];
    let cached=null;try{const b=readFile(catalogFile,1024*1024,true);if(b){const parsed=JSON.parse(b);validateCatalog(parsed.catalog);cached=parsed;}}catch{}
    return{entries,catalogUrl:CATALOG_URL,contributionUrl:CONTRIBUTION_URL,limits:LIMITS,...cached?{catalog:cached.catalog,catalogFetchedAt:cached.fetchedAt}:{}};
  }
  async function exclusive(fn){if(busy)throw fail('library-busy','已有动画库操作正在进行，请稍后再试。',409);busy=true;try{return await fn();}finally{busy=false;}}
  async function ingest(iterable,meta,{expectedBytes,expectedSha,signal}={}){
    if(!plain(meta)||!validText(meta.title)||!validText(meta.author)||!LICENSES.includes(meta.license)||!['mp4','webm'].includes(meta.format)||!Number.isFinite(meta.durationSeconds)||meta.durationSeconds<1||meta.durationSeconds>45)throw fail('invalid-metadata','请填写作品名称、作者、许可和 1–45 秒的时长。');
    if(meta.sourceUrl)trustedUrl(meta.sourceUrl);if(meta.licenseUrl)trustedUrl(meta.licenseUrl);
    if(signal?.aborted)throw fail('cancelled','导入或下载已取消。',408);
    const current=state();if(current.animations.length>=128)throw fail('library-full','本地动画库最多保存128个作品，请先移除不再使用的动画。',409);
    ensure();const temp=path.join(root,'.pending-'+randomUUID()+'.media');guard(temp);let handle=null,total=0,prefix=Buffer.alloc(0);const hash=createHash('sha256');
    const interrupt=()=>{iterable.destroy?.();};signal?.addEventListener('abort',interrupt,{once:true});
    try{
      handle=await fsp.open(temp,'wx',0o600);
      if(signal?.aborted)throw fail('cancelled','导入或下载已取消。',408);
      for await(const raw of iterable){if(signal?.aborted)throw fail('cancelled','下载已取消。',499);const chunk=Buffer.from(raw);total+=chunk.length;if(total>LIMITS.bytes||(expectedBytes!==undefined&&total>expectedBytes))throw fail('media-too-large','视频超过120 MiB或声明大小。',413);if(prefix.length<32)prefix=Buffer.concat([prefix,chunk.subarray(0,32-prefix.length)]);hash.update(chunk);await handle.writeFile(chunk);}
      if(signal?.aborted)throw fail('cancelled','导入或下载已取消。',408);
      await handle.close();handle=null;
      if(!mediaSignature(prefix,meta.format)||total<12)throw fail('invalid-media','文件不是受支持的 MP4 / WebM 视频。');
      const digest=hash.digest('hex');if((expectedBytes!==undefined&&total!==expectedBytes)||(expectedSha!==undefined&&digest!==expectedSha))throw fail('download-integrity','下载大小或 SHA256 不匹配，未加入动画库。',422);
      const id='video:'+digest.slice(0,24),existing=current.animations.find(e=>e.id===id);
      if(existing){if(existing.sha256!==digest)throw fail('id-conflict','作品标识冲突。',409);checkedMedia(existing);return descriptor(existing);}
      const file=digest+'.'+meta.format,target=path.join(root,file);guard(target);
      if(fs.existsSync(target)){const old=readFile(target,LIMITS.bytes,false);if(sha(old)!==digest)throw fail('media-conflict','已有媒体文件校验不符，未覆盖。',409);}else await fsp.rename(temp,target);
      const entry={id,title:meta.title.trim(),author:meta.author.trim(),license:meta.license,format:meta.format,file,sha256:digest,bytes:total,durationSeconds:meta.durationSeconds,importedAt:new Date().toISOString(),...meta.sourceUrl?{sourceUrl:meta.sourceUrl}:{},...meta.licenseUrl?{licenseUrl:meta.licenseUrl}:{},...meta.catalogId?{catalogId:meta.catalogId}:{}};
      atomic(manifestFile,{schemaVersion:1,animations:[...current.animations,entry]});return descriptor(entry);
    }finally{signal?.removeEventListener('abort',interrupt);if(handle)await handle.close().catch(()=>{});await fsp.unlink(temp).catch(()=>{});}
  }
  async function fetchTrusted(url,signal){
    for(let hop=0;hop<6;hop++){
      const u=trustedUrl(url),res=await fetchImpl(u.href,{redirect:'manual',signal,headers:{'user-agent':'dsh-awakening/0.6.0','accept':'*/*'}});
      if([301,302,303,307,308].includes(res.status)){const next=res.headers.get('location');await res.body?.cancel().catch(()=>{});if(!next)throw fail('download-failed','下载重定向无效。',502);url=new URL(next,u).href;continue;}
      if(!res.ok){await res.body?.cancel().catch(()=>{});throw fail('download-failed','GitHub 暂时无法提供下载，请稍后重试。',502);}return res;
    }throw fail('download-failed','下载重定向次数过多。',502);
  }
  async function refresh(signal){return exclusive(async()=>{
    const res=await fetchTrusted(CATALOG_URL,signal),chunks=[];let size=0;
    for await(const c of res.body){size+=c.length;if(size>1024*1024)throw fail('invalid-catalog','动画库索引过大。',413);chunks.push(c);}
    let value;try{value=JSON.parse(Buffer.concat(chunks));}catch{throw fail('invalid-catalog','动画库索引不是有效JSON。');}validateCatalog(value);ensure();const cached={catalog:value,fetchedAt:new Date().toISOString()};atomic(catalogFile,cached);return cached;
  });}
  async function download(id,signal){return exclusive(async()=>{
    const b=readFile(catalogFile,1024*1024,true);if(!b)throw fail('catalog-required','请先更新社区动画库。',409);let cached;try{cached=JSON.parse(b);}catch{throw fail('invalid-catalog','缓存索引无效，请重新更新。');}validateCatalog(cached.catalog);
    const e=cached.catalog.entries.find(v=>v.id===id);if(!e)throw fail('missing-entry','此作品未在当前索引中找到。',404);if(e.kind==='builtin')return{...builtin};
    const response=await fetchTrusted(e.asset.url,signal),length=response.headers.get('content-length');if(length&&Number(length)!==e.asset.bytes){await response.body?.cancel().catch(()=>{});throw fail('download-integrity','远端文件大小与索引不一致。',422);}
    return ingest(response.body,{title:e.title,author:e.author,license:e.license,format:e.asset.format,durationSeconds:e.durationSeconds,sourceUrl:e.sourceUrl,licenseUrl:e.licenseUrl,catalogId:e.id},{expectedBytes:e.asset.bytes,expectedSha:e.asset.sha256,signal});
  });}
  async function remove(id,selectedId){return exclusive(async()=>{
    if(id==='builtin:awakening')throw fail('builtin-required','内置鲸启保留为默认作品。',409);if(id===selectedId)throw fail('animation-in-use','请先选用其它动画，再移除此作品。',409);
    const value=state(),entry=value.animations.find(e=>e.id===id);if(!entry)throw fail('missing-entry','作品已移除。',404);guard(path.join(root,entry.file));atomic(manifestFile,{schemaVersion:1,animations:value.animations.filter(e=>e.id!==id)});verified.clear();
    // Only this manifest-owned, content-addressed media file is removed.
    await fsp.unlink(path.join(root,entry.file)).catch(e=>{if(e.code!=='ENOENT')throw e;});return true;
  });}
  return{resolve,list,refresh,download,remove,importVideo:(stream,meta,options)=>exclusive(()=>ingest(stream,meta,options)),media(id){const e=state().animations.find(e=>e.id===id);if(!e)throw fail('missing-media','作品不存在。',404);return{file:checkedMedia(e),mime:e.format==='mp4'?'video/mp4':'video/webm'};}};
}

export function createLibraryRoutes({library,authorizeRequest=()=>false,getSelectedId=()=> 'builtin:awakening',token=randomBytes(32).toString('base64url'),operationTimeoutMs=120000}={}){
  function access(req,res,write=false){
    let allowed=false;try{allowed=authorizeRequest(req)===true;}catch{}
    if(!allowed||(write&&(!sameToken(req.headers?.['x-dsh-awakening-library-token'],token)||!sameOrigin(req)))){req.resume?.();reply(res,403,{ok:false,error:{code:'request-denied',message:'操作验证未通过，请重新打开设置。'}});return false;}
    const methods=write?['POST']:['GET','HEAD'];if(!methods.includes(req.method)){req.resume?.();res.setHeader('allow',methods.join(', '));reply(res,405,{ok:false,error:{code:'method-not-allowed',message:'请求方法不受支持。'}});return false;}return true;
  }
  const handle=(action,write=true)=>async(req,res)=>{if(!access(req,res,write))return;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),operationTimeoutMs);const interrupt=()=>{if(!req.readableEnded&&!req.destroyed)req.destroy();};controller.signal.addEventListener('abort',interrupt,{once:true});const closed=()=>{if(!res.writableEnded)controller.abort();};res.once('close',closed);try{const result=await action(req,controller.signal);reply(res,200,{ok:true,...result});}catch(error){const known=typeof error.code==='string'&&/^[a-z][a-z-]{1,63}$/.test(error.code);reply(res,known?error.status??400:500,{ok:false,error:{code:known?error.code:'library-operation-failed',message:known?error.message:'动画库操作失败，请稍后重试；原有作品仍保留。'}});}finally{clearTimeout(timer);controller.signal.removeEventListener('abort',interrupt);res.off('close',closed);}};
  async function idBody(req){const b=await readJSON(req);if(Object.keys(b).length!==1||typeof b.id!=='string'||b.id.length>100)throw fail('invalid-body','作品标识无效。');return b.id;}
  return{token,
    list:handle(()=>{const result=library.list();let selectionMissing=false;try{library.resolve(getSelectedId());}catch{selectionMissing=true;}return{...result,selectionMissing};},false),
    importVideo:handle(async(req,signal)=>{let meta;try{const h=req.headers?.['x-awakening-metadata'];if(typeof h!=='string'||h.length>4096)throw 0;meta=JSON.parse(decodeURIComponent(h));if(!plain(meta)||Object.keys(meta).some(k=>!['title','author','license','durationSeconds'].includes(k)))throw 0;}catch{throw fail('invalid-metadata','导入信息无效。');}const mime=req.headers?.['content-type'];const format=mime==='video/mp4'?'mp4':mime==='video/webm'?'webm':null;if(!format)throw fail('invalid-media','请选择 MP4 或 WebM 视频。',415);const length=req.headers?.['content-length'];if(length&&(!/^\d+$/.test(length)||Number(length)>LIMITS.bytes))throw fail('media-too-large','视频不能超过120 MiB。',413);return{entry:await library.importVideo(req,{...meta,format},{signal})};}),
    remove:handle(async req=>({removed:await library.remove(await idBody(req),getSelectedId())})),
    catalog:handle(async(req,signal)=>{const b=await readJSON(req);if(Object.keys(b).length)throw fail('invalid-body','刷新请求无效。');return library.refresh(signal);}),
    download:handle(async(req,signal)=>({entry:await library.download(await idBody(req),signal)})),
    async media(req,res){if(!access(req,res))return;try{const url=new URL(req.url,'http://localhost'),{file,mime}=library.media(url.searchParams.get('id'));await fileHandler(file,mime)(req,res);}catch{reply(res,404,{ok:false,error:{code:'missing-media',message:'视频不存在或校验失败。'}});}}
  };
}

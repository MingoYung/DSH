// Incremental ASAR writer. Pickle and SHA256 block metadata use vendored
// official @electron/asar 4.0.1 code; see vendor/electron-asar-LICENSE.md.
import {createRequire} from 'node:module';
import nativeFs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import assert from 'node:assert/strict';
import {Pickle} from './vendor/pickle.mjs';
import {getFileIntegrity} from './vendor/integrity.mjs';
const require=createRequire(import.meta.url);
export const fs=(()=>{try{return require('original-fs');}catch{return nativeFs;}})();
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function hashFile(file,{start=0,end}={}){
 const h=createHash('sha256');for await(const b of fs.createReadStream(file,{start,...end===undefined?{}:{end}}))h.update(b);return h.digest('hex');
}
export function readArchive(file){
 const fd=fs.openSync(file,'r');try{
  const sizeBuffer=Buffer.alloc(8);assert.equal(fs.readSync(fd,sizeBuffer,0,8,0),8);
  const headerSize=Pickle.createFromBuffer(sizeBuffer).createIterator().readUInt32();
  assert(Number.isSafeInteger(headerSize)&&headerSize>8&&headerSize<64*1024*1024,'invalid-header-size');
  const body=Buffer.alloc(headerSize);assert.equal(fs.readSync(fd,body,0,headerSize,8),headerSize);
  const header=JSON.parse(Pickle.createFromBuffer(body).createIterator().readString());
  assert(header&&typeof header.files==='object','invalid-header');return{header,headerSize,payloadStart:8+headerSize};
 }finally{fs.closeSync(fd);}
}
export function flatten(header,prefix='',result=new Map()){
 for(const [name,entry] of Object.entries(header.files??{})){const key=prefix?prefix+'/'+name:name;result.set(key,entry);if(entry.files)flatten(entry,key,result);}return result;
}
function nameValid(name){return typeof name==='string'&&name.length<1024&&!name.includes('\\')&&!name.startsWith('/')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..');}
export function extract(file,name){
 assert(nameValid(name),'invalid-entry-name');const raw=readArchive(file),entries=flatten(raw.header),entry=entries.get(name);
 assert(entry&&!entry.files&&!entry.link&&!entry.unpacked&&Number.isSafeInteger(entry.size),'packed-file-required');
 const offset=Number(entry.offset);assert(Number.isSafeInteger(offset)&&offset>=0&&offset+entry.size<=fs.statSync(file).size-raw.payloadStart,'invalid-file-range');
 const bytes=Buffer.alloc(entry.size),fd=fs.openSync(file,'r');try{assert.equal(fs.readSync(fd,bytes,0,bytes.length,raw.payloadStart+offset),bytes.length);}finally{fs.closeSync(fd);}return bytes;
}
function setEntry(header,name,entry){
 const parts=name.split('/');let at=header;for(const part of parts.slice(0,-1)){at=at.files?.[part];assert(at?.files&&!at.link&&!at.unpacked,'packed-parent-required');}at.files[parts.at(-1)]=entry;
}
function writeAll(fd,bytes){let n=0;while(n<bytes.length)n+=fs.writeSync(fd,bytes,n,bytes.length-n);}
export async function appendArchive(source,destination,replacements){
 assert.notEqual(path.resolve(source),path.resolve(destination));assert(replacements instanceof Map&&replacements.size===3,'three-replacements-required');
 const raw=readArchive(source),header=structuredClone(raw.header),entries=flatten(raw.header),size=fs.statSync(source).size-raw.payloadStart;
 let offset=size;const appended=[];
 for(const [name,bytes] of replacements){assert(nameValid(name)&&Buffer.isBuffer(bytes)&&bytes.length>0);const prior=entries.get(name);assert(!prior?.files&&!prior?.link&&!prior?.unpacked);
  const entry={...prior,size:bytes.length,offset:String(offset),integrity:await getFileIntegrity(Readable.from([bytes]))};delete entry.files;delete entry.unpacked;delete entry.link;setEntry(header,name,entry);appended.push(bytes);offset+=bytes.length;
 }
 const pickle=Pickle.createEmpty();pickle.writeString(JSON.stringify(header));const body=pickle.toBuffer(),sizePickle=Pickle.createEmpty();sizePickle.writeUInt32(body.length);const prefix=sizePickle.toBuffer();assert.equal(prefix.length,8);
 assert(!fs.existsSync(destination),'destination-exists');const output=fs.openSync(destination,'wx');let input;
 try{writeAll(output,prefix);writeAll(output,body);input=fs.openSync(source,'r');const buffer=Buffer.alloc(4*1024*1024);let pos=raw.payloadStart,left=size;while(left){const n=fs.readSync(input,buffer,0,Math.min(left,buffer.length),pos);assert(n>0);writeAll(output,buffer.subarray(0,n));pos+=n;left-=n;}for(const b of appended)writeAll(output,b);fs.fsyncSync(output);}finally{if(input!==undefined)fs.closeSync(input);fs.closeSync(output);}
 const current=readArchive(destination),changed=flatten(current.header);let unchanged=0;
 for(const [name,entry]of entries){assert(changed.has(name));if(!replacements.has(name)){const a={...entry},b={...changed.get(name)};delete a.files;delete b.files;assert.deepEqual(a,b);unchanged++;}}
 assert.equal(changed.size,entries.size+[...replacements.keys()].filter(n=>!entries.has(n)).length);
 assert.equal(await hashFile(source,{start:raw.payloadStart}),await hashFile(destination,{start:current.payloadStart,end:current.payloadStart+size-1}));
 for(const [name,b]of replacements){assert.deepEqual(extract(destination,name),b);assert.deepEqual(changed.get(name).integrity,await getFileIntegrity(Readable.from([b])));}
 return{unchangedEntries:unchanged,sourcePayloadBytes:size,sha256:await hashFile(destination),bytes:fs.statSync(destination).size};
}

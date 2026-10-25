import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

/** Strict single-range reader. No caller-provided filesystem paths. */
export function parseRange(header,size){
  if(!header)return null;
  const match=/^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if(!match||(!match[1]&&!match[2]))return false;
  let start,end;
  if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return false;start=Math.max(0,size-suffix);end=size-1;}
  else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return false;
  return {start,end:Math.min(end,size-1)};
}
export function fileHandler(file,mime){
  return async(req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'allow':'GET, HEAD'});res.end();return;}
    let info;try{info=await stat(file);}catch{res.writeHead(404);res.end();return;}
    const range=parseRange(req.headers.range,info.size);
    if(range===false){res.writeHead(416,{'content-range':`bytes */${info.size}`});res.end();return;}
    const start=range?.start??0,end=range?.end??info.size-1;
    const headers={'content-type':mime,'content-length':String(end-start+1),'accept-ranges':'bytes','cache-control':'no-cache','x-content-type-options':'nosniff'};
    if(range)headers['content-range']=`bytes ${start}-${end}/${info.size}`;
    res.writeHead(range?206:200,headers);
    if(req.method==='HEAD'){res.end();return;}
    const stream=createReadStream(file,{start,end});
    stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  };
}

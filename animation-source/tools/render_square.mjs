import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

// Optional developer tool. Runtime installation never runs this exporter.
const source=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(process.argv[2]||path.join(source,'../media/boot.mp4'));
const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files'],...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
let encoder;
try{
 const page=await browser.newPage({viewport:{width:2560,height:2560},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(source,'native-square.html')).href);
 await page.evaluate(()=>document.fonts.ready);
 encoder=spawn(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-vcodec','png','-framerate','30','-i','pipe:0','-i',path.join(source,'video/approved-v3-master.mp4'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-level:v','5.1','-c:a','copy','-movflags','+faststart','-t','22',output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 let log='';encoder.stderr.on('data',bytes=>log+=bytes);encoder.stdin.on('error',()=>{});
 const finished=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(log)));});
 for(let frame=0;frame<660;frame++){
  const base64=await page.evaluate(async time=>{await window.renderAt(time);return document.getElementById('square').toDataURL('image/png').split(',')[1];},frame/30);
  if(!encoder.stdin.write(Buffer.from(base64,'base64')))await new Promise(resolve=>encoder.stdin.once('drain',resolve));
  if(frame%60===0)console.log(`Rendered ${frame}/660`);
 }
 encoder.stdin.end();await finished;
 console.log(`Wrote ${output} (${(await fs.stat(output)).size} bytes)`);
}finally{if(encoder?.exitCode===null)encoder.kill();await browser.close();}

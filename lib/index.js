import z from '@deepseek-ai/schemastery';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fileHandler } from './media.js';

export const name='dsh-awakening';
// Register the document hook synchronously. Decoration must not hold up Host
// activation while optional services become available.
export const inject=[];
export const Config=z.object({
  enabled:z.boolean().default(true).volatile(),
  sound:z.boolean().default(true).volatile(),
  volume:z.number().min(0).max(100).step(1).default(85).volatile(),
  frequency:z.union([z.const('startup'),z.const('daily')]).default('startup').volatile(),
  timeoutSeconds:z.number().min(25).max(60).step(1).default(45).volatile(),
});
// Both early boot and the deferred settings client use exactly this scene order.
const runtimeFiles=['scene/brand.js','scene/animation.js','scene/morph.js','scene/desktop-composition.js','scene/responsive-composition.js','scene/portrait-camera.js','stage.js','bootstrap.js'];
const bootstrap=runtimeFiles.map(file=>readFileSync(new URL('../runtime/'+file,import.meta.url),'utf8')).join('\n');
const videoFile=fileURLToPath(new URL('../media/boot.mp4',import.meta.url));
const posterFile=fileURLToPath(new URL('../media/poster.png',import.meta.url));
const unbox=value=>value&&typeof value.get==='function'?value.get():value;
export function apply(ctx,config){
  const settings=()=>Object.fromEntries(['enabled','sound','volume','frequency','timeoutSeconds'].map(key=>[key,unbox(config[key])]));
  ctx.inject(['webServer'],child=>{
    child.effect(()=>child.webServer.register({kind:'exact',path:'/dsh-awakening/media/boot.mp4',handler:fileHandler(videoFile,'video/mp4')}));
    child.effect(()=>child.webServer.register({kind:'exact',path:'/dsh-awakening/media/poster.png',handler:fileHandler(posterFile,'image/png')}));
  });
  ctx.inject(['settings'],child=>child.effect(()=>child.settings.configure({auto:false},ctx.fiber)));
  ctx.on('webserver/index-inject',table=>{
    const options={version:'0.4.0',settings:settings(),sourceUrl:'/dsh-awakening/media/boot.mp4?v=0.4.0',posterUrl:'/dsh-awakening/media/poster.png?v=0.4.0',autostart:true};
    table.push({kind:'global',name:'__DSH_AWAKENING_OPTIONS__',value:options});
    table.push({kind:'script',placement:'head',text:bootstrap+'\nwindow.__DSH_AWAKENING_INSTALL__(window.__DSH_AWAKENING_OPTIONS__);'});
  });
}
export default {name,inject,Config,apply};

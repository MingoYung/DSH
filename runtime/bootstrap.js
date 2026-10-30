/* Early boot controller. One native video supplies the media clock and sound;
   the adaptive Canvas displays the approved composition at the actual size.
   Host configForms is authoritative. local/session storage records frequency,
   not settings. A missing or failed decoration must always yield the UI. */
(function(root){
 'use strict';
 const DEFAULTS={enabled:true,sound:true,volume:85,frequency:'startup',timeoutSeconds:45,animationId:'builtin:awakening',videoFit:'cover'};
 const SESSION_KEY='dsh-awakening:startup:v1',DAY_KEY='dsh-awakening:day:v1';
 function number(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
 function normalise(value={}){return {enabled:typeof value.enabled==='boolean'?value.enabled:true,sound:typeof value.sound==='boolean'?value.sound:true,volume:number(value.volume??85,85,0,100),frequency:value.frequency==='daily'?'daily':'startup',timeoutSeconds:number(value.timeoutSeconds??45,45,25,60),animationId:typeof value.animationId==='string'&&/^(builtin:(?:awakening|codex|claude-code)|video:[a-f0-9]{24})$/.test(value.animationId)?value.animationId:'builtin:awakening',videoFit:value.videoFit==='contain'?'contain':'cover'};}
 function animation(value,options={}){
  if(value&&['adaptive','video'].includes(value.kind)&&typeof value.sourceUrl==='string'&&value.sourceUrl&&value.sourceUrl.length<=4096){return {id:typeof value.id==='string'?value.id:'preview',title:typeof value.title==='string'?value.title:'启动动画',kind:value.kind,sourceUrl:value.sourceUrl,posterUrl:typeof value.posterUrl==='string'?value.posterUrl:undefined,durationSeconds:number(value.durationSeconds,22,1,45),fit:value.fit==='contain'?'contain':value.fit==='safe'?'safe':'cover',builtin:value.builtin===true,presentation:value.builtin===true&&['builtin:awakening','builtin:codex','builtin:claude-code'].includes(value.id)?root.DSHSafeVideo?.normalisePresentation(value.presentation)??undefined:undefined};}
  return {id:'builtin:awakening',title:'DeepSeek · 鲸启',kind:'video',durationSeconds:22,sourceUrl:options.sourceUrl||'/dsh-awakening/media/boot.mp4?v=0.7.0',posterUrl:options.posterUrl,fit:'contain'};
 }
 function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 function read(store,key){try{return store.getItem(key);}catch{return null;}}
 function write(store,key,value){try{store.setItem(key,value);}catch{}}
 root.__DSH_AWAKENING_INSTALL__=function install(options={}){
  if(root.__DSH_AWAKENING_PLUGIN__){if(options.settings||options.animation)root.__DSH_AWAKENING_PLUGIN__.configure(options.settings,options.animation||(options.sourceUrl?animation(null,options):undefined));return root.__DSH_AWAKENING_PLUGIN__;}
  let settings=normalise(options.settings??DEFAULTS),selected=animation(options.animation,options),active=null,disposed=false;
  const api={version:'0.7.0',lastResult:null,configure,preview:(next,descriptor)=>play(normalise(next||currentSettings()),true,descriptor?animation(descriptor):selected),dismiss:()=>active?.finish('skip'),dispose,diagnostics:()=>active?.diagnostics()??{active:false,lastResult:api.lastResult,animationId:selected.id}};
  function currentSettings(){return settings;}
  function configure(next,descriptor){if(next)settings=normalise({...settings,...next});if(descriptor)selected=animation(descriptor);if(active){active.video.volume=settings.volume/100;active.video.muted=!settings.sound;}}
  function dispose(){if(disposed)return;disposed=true;active?.finish('dispose',true);if(root.__DSH_AWAKENING_PLUGIN__===api)delete root.__DSH_AWAKENING_PLUGIN__;}
  function eligible(){if(!settings.enabled)return false;if(read(root.sessionStorage,SESSION_KEY))return false;if(settings.frequency==='daily'&&read(root.localStorage,DAY_KEY)===localDay())return false;return true;}
  function markPlayed(){write(root.sessionStorage,SESSION_KEY,'played');write(root.localStorage,DAY_KEY,localDay());}
  function play(config,manual,descriptor=selected){
   if(disposed)return Promise.resolve({reason:'disposed'});
   if(active)return active.done;
   if(!manual&&!eligible())return Promise.resolve({reason:'frequency'});
   let settle;const done=new Promise(resolve=>settle=resolve);
   const overlay=document.createElement('div');overlay.id='dsh-awakening-overlay';overlay.dataset.dshAwakening='';
   overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#000207;isolation:isolate;opacity:1;transition:opacity .32s ease;';
   if(descriptor.presentation)overlay.style.background=descriptor.presentation.keyframes[0].background;
   const shadow=overlay.attachShadow({mode:'open'});
   shadow.innerHTML='<style>:host{color-scheme:dark}*{box-sizing:border-box}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;z-index:1;transition:opacity .15s ease}button{position:relative;z-index:3;font:13px system-ui,"Microsoft YaHei UI",sans-serif;color:#d1dff4;background:#102039a0;border:1px solid #7998c144;border-radius:30px;padding:10px 17px;cursor:pointer}button:focus-visible{outline:2px solid #c4dcff;outline-offset:4px}.skip{position:absolute;right:28px;top:48px}.prompt{position:absolute;inset:0;z-index:4;display:none;place-items:center}.prompt.visible{display:grid}.status{position:absolute;z-index:3;left:20px;right:20px;bottom:48px;text-align:center;color:#93accb;font:13px system-ui,"Microsoft YaHei UI",sans-serif;min-height:20px;pointer-events:none}@media(prefers-reduced-motion:reduce){video{transition:none}}</style><video playsinline preload="auto"></video><button type="button" class="skip">跳过 · Esc</button><div class="prompt"><button type="button" class="resume">点击启用声音并播放</button></div><div class="status" role="status" aria-live="polite"></div>';
   const video=shadow.querySelector('video'),skip=shadow.querySelector('.skip'),prompt=shadow.querySelector('.prompt'),resume=shadow.querySelector('.resume'),status=shadow.querySelector('.status');
   video.src=descriptor.sourceUrl;if(descriptor.posterUrl)video.poster=descriptor.posterUrl;video.volume=config.volume/100;video.muted=!config.sound;
   video.style.objectFit=descriptor.builtin?'contain':descriptor.kind==='video'?config.videoFit:'cover';
   let stage=null;
   if(descriptor.presentation||descriptor.kind==='adaptive')try{stage=root.DSHAwakeningStage?.mount({video,container:shadow,presentation:descriptor.presentation})??null;}catch(error){console.warn("[dsh-awakening] Adaptive rendering unavailable",error);}
   let closing=false,removed=false,finished=false,seenBoot=false,ready=manual,started=false,allowMarked=false,mediaBlocked=false,painted=false,firstTimer,secondTimer;
   const beforeFocus=document.activeElement,createdAt=performance.now();
   const record={active:true,manual,video,done,finish,diagnostics:()=>({active:true,manual,animationId:descriptor.id,animationKind:descriptor.kind,fit:descriptor.presentation?'safe':descriptor.kind==='video'?config.videoFit:'adaptive',currentTime:video.currentTime,duration:video.duration||descriptor.durationSeconds,muted:video.muted,volume:video.volume,paused:video.paused,mediaBlocked,ready,seenBoot,finished,started,stage:stage?.diagnostics?.()??null,elapsedSeconds:(performance.now()-createdAt)/1000})};
   active=record;
   function remove(reason){
    if(removed)return;removed=true;clearTimeout(watchdog);clearTimeout(firstTimer);clearTimeout(secondTimer);observer.disconnect();document.removeEventListener('keydown',escape,true);
    stage?.dispose();stage=null;video.removeEventListener('ended',ended);video.removeEventListener('error',mediaError);video.removeEventListener('playing',playing);video.pause();video.removeAttribute('src');video.load();overlay.remove();
    if(active===record)active=null;api.lastResult={reason,manual};if(beforeFocus?.isConnected&&typeof beforeFocus.focus==='function')beforeFocus.focus({preventScroll:true});settle({reason,manual});
   }
   function finish(reason='complete',immediate=false){
    if(removed)return;if(immediate){closing=true;video.pause();remove(reason);return;}if(closing)return;closing=true;video.pause();prompt.classList.remove('visible');skip.style.opacity='0';status.textContent='';video.style.opacity='0';
    firstTimer=setTimeout(()=>{overlay.style.opacity='0';secondTimer=setTimeout(()=>remove(reason),340);},160);
   }
   function playing(){
    if(closing)return;started=true;mediaBlocked=false;prompt.classList.remove('visible');status.textContent='';
    if(!manual&&!allowMarked){allowMarked=true;markPlayed();}
   }
   function ended(){finished=true;checkReady();if(ready||manual)finish('complete');else status.textContent='工作空间仍在加载，可按 Esc 跳过';}
   function mediaError(){finish('media-error');}
   function escape(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish('skip');}}
   function checkReady(){
    if(manual||closing)return;
    const boot=document.querySelector('[data-dsh-boot]');
    if(boot){seenBoot=true;if(!boot.querySelector('[data-dsh-boot-spinner]')){finish('host-error');return;}}
    else if(seenBoot||document.readyState==='complete'){ready=true;if(finished)finish('complete');}
   }
   async function begin(){
    if(closing)return;
    try{await video.play();if(!closing)playing();}
    catch(error){
     if(closing)return;
     if(error?.name==='NotAllowedError'){mediaBlocked=true;video.pause();prompt.classList.add('visible');status.textContent=config.sound?'浏览器需要一次点击才能播放声音':'点击播放启动动画';resume.textContent=config.sound?'点击启用声音并播放':'点击播放动画';resume.focus({preventScroll:true});}
     else finish('media-error');
    }
   }
   const observer=new MutationObserver(checkReady);
   const watchdog=setTimeout(()=>finish('timeout'),Math.min(60,Math.max(config.timeoutSeconds,Math.ceil(descriptor.durationSeconds)+3))*1000);
   observer.observe(document.documentElement,{childList:true,subtree:true});
   document.addEventListener('keydown',escape,true);video.addEventListener('ended',ended);video.addEventListener('error',mediaError);video.addEventListener('playing',playing);
   skip.onclick=()=>finish('skip');resume.onclick=begin;
   document.documentElement.append(overlay);checkReady();begin();
   return done;
  }
  root.__DSH_AWAKENING_PLUGIN__=api;
  if(options.autostart)play(settings,false);
  return api;
 };
})(window);

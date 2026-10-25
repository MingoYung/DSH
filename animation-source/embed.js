/* Host-independent component; a real DSH plugin adapter is a separate layer. */
(function(root){
 'use strict';
 root.DSHAwakening.mount=function(options={}){
  const base=new URL(options.assetBase||'./',document.baseURI),overlay=document.createElement('div');
  overlay.setAttribute('data-dsh-awakening','');overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#000207;opacity:1;transition:opacity .32s ease;';
  const shadow=overlay.attachShadow({mode:'open'});
  shadow.innerHTML='<style>canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .15s ease}button{position:absolute;right:28px;top:26px;color:#abc0de;background:#10203999;border:1px solid #58709266;padding:10px 16px;border-radius:30px;font:13px system-ui;cursor:pointer}button:focus-visible{outline:2px solid #bdd4ff;outline-offset:3px}</style><canvas width="1920" height="1080" role="img" aria-label="DSH 鲸启启动动画"></canvas><button type="button">跳过 · Esc</button>';
  const canvas=shadow.querySelector('canvas'),audio=new Audio(new URL('audio/awakening-master.wav',base)),video=document.createElement('video');
  video.src=new URL('video/character-reveal.mp4',base);video.preload='auto';video.muted=true;video.playsInline=true;
  const player=new root.DSHAwakening.Player(canvas,{audio,video,mode:options.mode||'host',sound:options.sound!==false,volume:options.volume??.85,maxWait:options.maxWait||40});
  let closing=false,removed=false,one,two;
  function remove(reason){if(removed)return;removed=true;clearTimeout(one);clearTimeout(two);document.removeEventListener('keydown',escape);video.removeEventListener('error',mediaError);player.dispose();audio.removeAttribute('src');audio.load();video.removeAttribute('src');video.load();overlay.remove();options.onExit?.(reason);}
  function close(reason='dispose',immediate=false){if(removed)return;if(immediate){closing=true;remove(reason);return;}if(closing)return;closing=true;player.pause();canvas.style.opacity='0';shadow.querySelector('button').style.opacity='0';one=setTimeout(()=>{overlay.style.opacity='0';two=setTimeout(()=>remove(reason),340);},160);}
  function escape(e){if(e.key==='Escape'){e.preventDefault();close('skip');}}
  function mediaError(){close('media-error');}
  shadow.querySelector('button').onclick=()=>close('skip');document.addEventListener('keydown',escape);video.addEventListener('error',mediaError);
  player.on('complete',()=>close('complete'));player.on('error',e=>close(e.code||'error'));
  (options.target||document.body).append(overlay);player.paint();player.play(0);
  return {ready(){if(!closing)player.hostReady();},setPhase(p){if(!closing)player.setPhase(p);},fail(){close('error');},skip(){close('skip');},dispose(){close('dispose',true);},get element(){return overlay;}};
 };
})(window);

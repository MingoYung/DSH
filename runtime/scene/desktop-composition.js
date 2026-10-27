/* Responsive desktop composition preview. The output is the viewport itself,
   not a padded movie. Intro uses source geometry; the tail is a focal camera
   view of the approved master, with no edge filters or alpha masks. */
(function(root){
 'use strict';
 const SW=1920,SH=1080,TAIL=13.6;
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
 const mix=(a,b,t)=>a+(b-a)*t;
 class DesktopComposition{
  constructor(canvas,video){
   this.canvas=canvas;this.video=video;
   this.layer=document.createElement('canvas');this.layer.width=SW;this.layer.height=SH;
   // The renderer retains its original pixel grid and material caches.
   const layerContext=this.layer.getContext('2d',{alpha:true});
   this.renderer=new root.DSHAwakening.Renderer(this.layer);
   this.renderer.ctx=layerContext;
   this.lastLayout=null;this.frames=0;
  }
  layout(width,height,time){
   const ratio=width/height;
   // Preserve the accepted 16:9 composition. In taller desktop windows the
   // logo/title are a little larger; the actual background fills all pixels.
   const introScale=Math.min(width/1500,height/SH);
   const intro={scale:introScale,x:(width-SW*introScale)/2,y:(height-SH*introScale)/2};
   const tailScale=Math.max(width/SW,height/SH);
   // Wide windows remove lower body/background, rather than the head ornament.
   // Narrower windows crop the left/right margins around the same focal point.
   const tail={scale:tailScale,x:(width-SW*tailScale)/2,y:0};
   const blend=smooth(9.8,TAIL,time);
   const camera={scale:mix(intro.scale,tail.scale,blend),x:mix(intro.x,tail.x,blend),y:mix(intro.y,tail.y,blend)};
   return {width,height,ratio,intro,tail,camera,blend,tailSourceView:{x:-tail.x/tailScale,y:0,width:width/tailScale,height:height/tailScale}};
  }
  render(time,width=this.canvas.width,height=this.canvas.height){
   width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
   if(this.canvas.width!==width)this.canvas.width=width;
   if(this.canvas.height!==height)this.canvas.height=height;
   const ctx=this.canvas.getContext('2d',{alpha:false}),t=Math.max(0,Math.min(22,Number(time)||0));
   const layout=this.layout(width,height,t),camera=layout.camera;
   ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
   ctx.fillStyle='#000207';ctx.fillRect(0,0,width,height);
   if(t>=TAIL&&this.video.readyState>=2){
    // v3 already contains its exact stream transition and final fade. Never
    // double-compose it, blur it, sample its edges, or fade its body boundary.
    ctx.setTransform(layout.tail.scale,0,0,layout.tail.scale,layout.tail.x,layout.tail.y);
    ctx.drawImage(this.video,0,0,SW,SH);
   }else{
    // Continue the approved atmosphere into the viewport's actual visible
    // world coordinates, without any source-video rectangle at the edges.
    ctx.setTransform(camera.scale,0,0,camera.scale,camera.x,camera.y);
    const atmosphere=(1-smooth(11.5,TAIL,t))*.31;
    if(atmosphere>0){
     const g=ctx.createRadialGradient(960,440,40,960,490,890);
     g.addColorStop(0,`rgba(23,47,90,${atmosphere})`);g.addColorStop(1,'rgba(23,47,90,0)');
     ctx.fillStyle=g;ctx.fillRect(-camera.x/camera.scale,-camera.y/camera.scale,width/camera.scale,height/camera.scale);
    }
    const foreground=this.renderer.ctx;
    foreground.setTransform(1,0,0,1,0,0);foreground.globalAlpha=1;foreground.shadowBlur=0;foreground.clearRect(0,0,SW,SH);foreground.textBaseline='alphabetic';
    this.renderer.drawLogo(t);this.renderer.drawName(t);this.renderer.drawStreams(t);this.renderer.drawParticles(t);
    ctx.drawImage(this.layer,0,0);
   }
   this.frames++;this.lastLayout=layout;
   return {time:t,phase:t<TAIL?'intro':'welcome',...layout,frames:this.frames};
  }
  async renderAt(time,width=this.canvas.width,height=this.canvas.height){
   const video=this.video;
   if(time>=TAIL){
    if(video.readyState<2)await new Promise((resolve,reject)=>{const ok=()=>{clean();resolve();},bad=()=>{clean();reject(new Error('Approved master unavailable'));},clean=()=>{video.removeEventListener('loadeddata',ok);video.removeEventListener('error',bad);};video.addEventListener('loadeddata',ok,{once:true});video.addEventListener('error',bad,{once:true});});
    const target=Math.max(0,Math.min(video.duration-.0001,time));
    if(Math.abs(video.currentTime-target)>.002)await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=target;});
   }
   return this.render(time,width,height);
  }
 }
 root.DSHDesktopComposition={DesktopComposition};
})(window);

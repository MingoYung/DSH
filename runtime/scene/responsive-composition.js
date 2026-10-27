/* A single continuous composition for desktop and portrait viewports.
   Extends the source-based desktop study, not the rejected padded master.
   The only media element is the approved 22s v3 master and its own audio. */
(function(root){
 'use strict';
 const SW=1920,SH=1080,TAIL=13.6;
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
 const mix=(a,b,t)=>a+(b-a)*t;
 const random=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 class ResponsiveComposition extends root.DSHDesktopComposition.DesktopComposition{
  constructor(canvas,video){
   super(canvas,video);
   this.stars=Array.from({length:130},(_,i)=>({x:random(i+41),y:random(i+531),r:.45+random(i+31)*.5,a:.045+random(i+741)*.095,p:random(i+984)*Math.PI*2}));
  }
  layout(width,height,time){
   const ratio=width/height,portraitWeight=1-smooth(.8,1.15,ratio);
   const desktopScale=Math.min(width/1500,height/SH);
   const desktopIntro={scale:desktopScale,x:(width-SW*desktopScale)/2,y:(height-SH*desktopScale)/2};
   // Intro uses a designed medium shot with at least 800 world pixels of
   // width. The welcome is always full bleed: the original head ornament
   // touches its top row, so putting any new scene above it exposes a seam.
   const tailScale=Math.max(width/SW,height/SH);
   const tail={scale:tailScale,x:(width-SW*tailScale)/2,y:0};
   const mediumScale=Math.min(tailScale,width/800),mediumY=Math.max(0,height-SH*mediumScale);
   const portraitOffset=Math.min(240,Math.max(0,(height/mediumScale-SH)*.7));
   const portraitIntro={scale:mediumScale,x:(width-SW*mediumScale)/2,y:mediumY-mediumScale*portraitOffset};
   const intro={scale:mix(desktopIntro.scale,portraitIntro.scale,portraitWeight),x:mix(desktopIntro.x,portraitIntro.x,portraitWeight),y:mix(desktopIntro.y,portraitIntro.y,portraitWeight)};
   const blend=smooth(9.8,TAIL,time);
   const camera={scale:mix(intro.scale,tail.scale,blend),x:mix(intro.x,tail.x,blend),y:mix(intro.y,tail.y,blend)};
   return {width,height,ratio,portraitWeight,intro,tail,camera,blend,portraitOffset,fullBleedTail:true,tailSourceView:{x:-tail.x/tailScale,y:0,width:width/tailScale,height:height/tailScale}};
  }
  background(ctx,time,layout){
   const {width,height,camera,tail,portraitWeight}=layout;
   ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
   // The approved movie's topmost rows are black in its welcome section.
   // Match that clear atmosphere exactly; do not soften its perimeter.
   ctx.fillStyle=time>=TAIL?'#000000':'#000207';ctx.fillRect(0,0,width,height);
   const atmosphere=(1-smooth(11.5,TAIL,time))*.31;
   if(atmosphere>0){
    ctx.save();ctx.setTransform(camera.scale,0,0,camera.scale,camera.x,camera.y);
    const g=ctx.createRadialGradient(960,440,40,960,490,890);
    g.addColorStop(0,`rgba(23,47,90,${atmosphere})`);g.addColorStop(1,'rgba(23,47,90,0)');
    ctx.fillStyle=g;ctx.fillRect(-camera.x/camera.scale,-camera.y/camera.scale,width/camera.scale,height/camera.scale);ctx.restore();
   }
   if(portraitWeight<.001)return;
   const visible=smooth(.2,1.8,time)*(1-smooth(21.7,22,time))*portraitWeight;
   const radiusScale=Math.min(1.6,Math.max(.7,width/450));
   for(const star of this.stars){
    const x=star.x*width,y=star.y*height;
    const upper=time>=TAIL?1-smooth(Math.max(0,tail.y-95),Math.max(1,tail.y-8),y):1;
    const alpha=star.a*visible*upper*(.75+.25*Math.sin(time*.8+star.p)**2);
    if(alpha<.002)continue;
    ctx.beginPath();ctx.arc(x,y,star.r*radiusScale,0,Math.PI*2);ctx.fillStyle=`rgba(134,165,218,${alpha})`;ctx.fill();
   }
  }
  render(time,width=this.canvas.width,height=this.canvas.height){
   width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
   if(this.canvas.width!==width)this.canvas.width=width;if(this.canvas.height!==height)this.canvas.height=height;
   const ctx=this.canvas.getContext('2d',{alpha:false}),t=Math.max(0,Math.min(22,Number(time)||0));
   const layout=this.layout(width,height,t),camera=layout.camera;
   this.background(ctx,t,layout);
   if(t>=TAIL&&this.video.readyState>=2){
    ctx.setTransform(layout.tail.scale,0,0,layout.tail.scale,layout.tail.x,layout.tail.y);ctx.globalAlpha=1;
    // v3 includes the approved stream handoff and final fade; use it once.
    ctx.drawImage(this.video,0,0,SW,SH);
   }else{
    const foreground=this.renderer.ctx;
    foreground.setTransform(1,0,0,1,0,0);foreground.globalAlpha=1;foreground.shadowBlur=0;foreground.clearRect(0,0,SW,SH);foreground.textBaseline='alphabetic';
    this.renderer.drawLogo(t);this.renderer.drawName(t);this.renderer.drawStreams(t);this.renderer.drawParticles(t);
    ctx.setTransform(camera.scale,0,0,camera.scale,camera.x,camera.y);ctx.globalAlpha=1;ctx.drawImage(this.layer,0,0);
   }
   this.frames++;this.lastLayout=layout;
   return {time:t,phase:t<TAIL?'intro':'welcome',...layout,frames:this.frames};
  }
 }
 root.DSHResponsiveComposition={ResponsiveComposition};
})(window);

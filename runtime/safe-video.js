/* Data-only camera framing for bundled movies. The original video remains the
   only media clock and audio source. No remote author code is loaded. */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const mix=(a,b,t)=>a+(b-a)*t;
 const smooth=v=>{const q=clamp(v,0,1);return q*q*q*(q*(q*6-15)+10);};
 function normalisePresentation(value){
  if(!value||value.schemaVersion!==1||value.mode!=='safe-camera'||value.sourceWidth!==1280||value.sourceHeight!==720||!Array.isArray(value.keyframes)||value.keyframes.length<2||value.keyframes.length>32)return null;
  let previous=-1;const frames=[];
  for(const f of value.keyframes){
   if(!f||!Number.isFinite(f.time)||f.time<0||f.time>45||f.time<=previous||!Array.isArray(f.safe)||f.safe.length!==4||!f.safe.every(Number.isFinite)||!/^#[0-9a-f]{6}$/i.test(f.background)||!Number.isFinite(f.verticalAnchor)||f.verticalAnchor<0||f.verticalAnchor>1)return null;
   const[x,y,w,h]=f.safe;if(x<0||y<0||w<1||h<1||x+w>1280||y+h>720)return null;
   previous=f.time;frames.push({time:f.time,safe:[x,y,w,h],background:f.background,verticalAnchor:f.verticalAnchor});
  }
  if(frames[0].time!==0)return null;
  return{schemaVersion:1,mode:'safe-camera',sourceWidth:1280,sourceHeight:720,sampleBackground:value.sampleBackground===true,keyframes:frames};
 }
 class SafeVideoComposition{
  constructor(canvas,video,presentation){
   this.canvas=canvas;this.video=video;this.presentation=normalisePresentation(presentation);
   if(!this.presentation)throw new TypeError('The bundled movie framing data is invalid.');
   this.renderer={ctx:canvas.getContext('2d',{alpha:false})};
   this.sampler=document.createElement('canvas');this.sampler.width=8;this.sampler.height=1;
   this.sampleContext=this.sampler.getContext('2d',{willReadFrequently:true});this.sampleFailed=false;
  }
  layout(width,height,time){
   const frames=this.presentation.keyframes;
   let a=frames[0],b=a;
   for(let i=1;i<frames.length;i++){b=frames[i];if(time<=b.time)break;a=b;}
   const q=a===b?0:smooth((time-a.time)/(b.time-a.time));
   const safe=a.safe.map((v,i)=>mix(v,b.safe[i],q)),[sx,sy,sw,sh]=safe;
   const anchor=mix(a.verticalAnchor,b.verticalAnchor,q),cover=Math.max(width/1280,height/720);
   const scale=Math.min(cover,width/sw,height/sh),imageWidth=1280*scale,imageHeight=720*scale;
   const x=imageWidth<width?(width-imageWidth)/2:clamp(width/2-(sx+sw/2)*scale,width-imageWidth,0);
   const y=imageHeight<height?(height-imageHeight)*anchor:clamp(height/2-(sy+sh/2)*scale,height-imageHeight,0);
   const visibleSafe={x:x+sx*scale,y:y+sy*scale,width:sw*scale,height:sh*scale};
   return{mode:'safe-camera',width,height,time,safe,scale,x,y,imageWidth,imageHeight,verticalAnchor:anchor,background:q<.5?a.background:b.background,visibleSafe,safeInside:visibleSafe.x>=-.5&&visibleSafe.y>=-.5&&visibleSafe.x+visibleSafe.width<=width+.5&&visibleSafe.y+visibleSafe.height<=height+.5};
  }
  background(fallback,layout){
   if(!this.presentation.sampleBackground||this.sampleFailed||this.video.readyState<2)return fallback;
   try{
    const w=this.video.videoWidth,h=this.video.videoHeight;if(!w||!h)return fallback;
    const left=clamp(-layout.x/layout.scale,0,w-1),right=clamp((layout.width-layout.x)/layout.scale,0,w-1);
    const edge=layout.y>0?0:layout.y+layout.imageHeight<layout.height?h-1:0;
    const points=Array.from({length:8},(_,i)=>[mix(left,right,(i+.5)/8),edge]);
    points.forEach(([x,y],i)=>this.sampleContext.drawImage(this.video,Math.floor(x),Math.floor(y),1,1,i,0,1,1));
    const data=this.sampleContext.getImageData(0,0,8,1).data,colors=[];
    for(let i=0;i<8;i++)colors.push([data[i*4],data[i*4+1],data[i*4+2]]);
    const median=[0,1,2].map(channel=>{const values=colors.map(c=>c[channel]).sort((a,b)=>a-b);return Math.round((values[3]+values[4])/2);});
    return`rgb(${median.join(',')})`;
   }catch{this.sampleFailed=true;return fallback;}
  }
  render(time,width=this.canvas.width,height=this.canvas.height){
   width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
   if(this.canvas.width!==width)this.canvas.width=width;if(this.canvas.height!==height)this.canvas.height=height;
   const ctx=this.renderer.ctx,layout=this.layout(width,height,Number(time)||0);this.lastLayout=layout;
   ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
   ctx.fillStyle=this.background(layout.background,layout);ctx.fillRect(0,0,width,height);
   if(this.video.readyState<2)return false;
   if(this.video.videoWidth!==1280||this.video.videoHeight!==720)throw new Error('The bundled movie dimensions do not match its framing data.');
   ctx.drawImage(this.video,layout.x,layout.y,layout.imageWidth,layout.imageHeight);return true;
  }
 }
 root.DSHSafeVideo={normalisePresentation,SafeVideoComposition};
})(window);

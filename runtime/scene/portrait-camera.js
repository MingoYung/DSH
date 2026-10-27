/* D study: a full-bleed portrait camera follows the left light stream, then
   returns to the face. No padded scene, edge masks or altered source movie. */
(function(root){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smoother=value=>{const x=clamp(value);return x*x*x*(10+x*(-15+x*6));};
 const mix=(a,b,t)=>a+(b-a)*t;
 class PortraitTrackStudy extends root.DSHResponsiveComposition.ResponsiveComposition{
  constructor(canvas,video){super(canvas,video);this.focusStart=700;}
  layout(width,height,time){
   const layout=super.layout(width,height,time),weight=layout.portraitWeight;
   // Desktop is deliberately byte-for-byte the same calculation as A.
   if(weight<=0)return {...layout,study:'D',focusX:960,trackingWeight:0};
   const startFocus=960-(960-this.focusStart)*weight;
   const returnProgress=smoother((time-13.6)/1.0);
   const focusX=mix(startFocus,960,returnProgress);
   const startTail={...layout.tail,x:width/2-startFocus*layout.tail.scale};
   const tail={...layout.tail,x:width/2-focusX*layout.tail.scale};
   const introProgress=mix(layout.blend,smoother((time-9.8)/(13.6-9.8)),weight);
   const camera=time<13.6?{
    scale:mix(layout.intro.scale,startTail.scale,introProgress),
    x:mix(layout.intro.x,startTail.x,introProgress),
    y:mix(layout.intro.y,startTail.y,introProgress),
   }:{...tail};
   return {...layout,camera,tail,study:'D',focusX,startFocus,returnProgress,trackingWeight:weight,tailSourceView:{x:-tail.x/tail.scale,y:0,width:width/tail.scale,height:height/tail.scale}};
  }
 }
 root.DSHPortraitTrackStudy={PortraitTrackStudy};
})(window);

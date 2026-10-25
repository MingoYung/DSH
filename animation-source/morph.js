/* Revision 3: a shared material field connects silhouette and particles.
   The accepted typography, star trajectories after 11.05s, streams, clip and
   audio are deliberately inherited unchanged from revision 2. */
(function(root){
 'use strict';
 const proto=root.DSHAwakening.Renderer.prototype;
 const oldLogo=proto.drawLogo,oldParticles=proto.drawParticles;
 const HANDOFF=11.05,TAU=Math.PI*2;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=(a,b,t)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
 const smoother=t=>{const q=clamp(t);return q*q*q*(10+q*(-15+q*6));};
 const ease=t=>1-Math.pow(1-clamp(t),4);
 const random=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const BOX={x:720,y:240,w:480,h:360},LOGO={x:960,y:420,w:415};
 const scale=415/23.16;
 function oldPosition(p,t){
  const q=ease((t-8.65-p.c*.55)/2.4),arch=Math.sin(q*Math.PI)*70;
  return {x:lerp(p.x,p.starX,q)+Math.sin(p.a*TAU)*arch,y:lerp(p.y,p.starY,q)+Math.cos(p.b*TAU)*arch,q};
 }
 function hsl(h,s,l){
  h=((h%360)+360)/360;const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h*12)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
  return [f(0)*255,f(8)*255,f(4)*255];
 }
 function quintic(p0,p1,v1,a1,duration,u){
  const d=p1-p0,v=v1*duration,a=a1*duration*duration;
  return p0+u*u*u*((10*d-4*v+.5*a)+u*((-15*d+7*v-a)+u*(6*d-3*v+.5*a)));
 }
 function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function initialise(renderer){
  if(renderer.material)return renderer.material;
  const surface=makeCanvas(BOX.w,BOX.h),ctx=surface.getContext('2d',{willReadFrequently:true});
  ctx.setTransform(scale,0,0,scale,LOGO.x-BOX.x-11.58*scale,LOGO.y-BOX.y-8.52*scale);
  const gradient=ctx.createLinearGradient(3,2,19,17);
  gradient.addColorStop(0,'#afceff');gradient.addColorStop(.29,'#6d96ff');gradient.addColorStop(1,'#4261ee');
  ctx.fillStyle=gradient;ctx.fill(renderer.path);
  ctx.globalAlpha=.17;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=.075;ctx.strokeStyle='#92bbff';ctx.shadowColor='#5484ff';ctx.shadowBlur=10;
  for(const contour of root.DSHBrand.contours){ctx.beginPath();ctx.moveTo(...contour.points[0]);for(let i=1;i<contour.points.length;i++)ctx.lineTo(...contour.points[i]);ctx.stroke();}
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;
  const original=ctx.getImageData(0,0,BOX.w,BOX.h),distance=new Float32Array(BOX.w*BOX.h);
  // Approximate Euclidean distance to both the outside and the logo's holes.
  for(let i=0;i<distance.length;i++)distance[i]=original.data[i*4+3]>64?10000:0;
  const w=BOX.w,h=BOX.h,diag=Math.SQRT2;
  for(let y=1;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(distance[i])distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-w]+1,distance[i-w-1]+diag,distance[i-w+1]+diag);}
  for(let y=h-2;y>=0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;if(distance[i])distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+w]+1,distance[i+w-1]+diag,distance[i+w+1]+diag);}
  let max=0;for(const d of distance)max=Math.max(max,d);
  const entry=new Float32Array(w*h),exit=new Float32Array(w*h),active=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x,wx=x+BOX.x,wy=y+BOX.y;
   const nx=clamp((wx-(LOGO.x-LOGO.w/2))/LOGO.w),depth=clamp(distance[i]/max);
   const flow=.5+.25*Math.sin(wx*.044+wy*.013)+.25*Math.sin(wy*.063-wx*.017);
   // Connected thick regions settle first on entry; thin fins release first
   // on exit. The exact same release time also drives each material particle.
   const grain=(random(i+7309)-.5)*.055;
   entry[i]=2.50+.48*(1-depth)+.20*nx+.07*flow+grain;
   exit[i]=8.05+.56*depth+.24*(1-nx)+.07*flow+grain;
   if(original.data[i*4+3]>0)active.push(i);
  }
  const working=ctx.createImageData(w,h);working.data.set(original.data);
  const skin={surface,ctx,original,working,entry,exit,active,type:renderer.particles.filter(p=>p.kind==='type')};
  const checker=makeCanvas(1,1).getContext('2d');
  for(const p of renderer.particles){
   if(p.kind!=='logo')continue;
   // Jitter only this revision's material sites, never the accepted star seed.
   // This removes the dot-matrix pattern without moving the old star field.
   let mx=p.x+(random(p.i+3711)-.5)*5.6,my=p.y+(random(p.i+9813)-.5)*5.6;
   if(!checker.isPointInPath(renderer.path,(mx-LOGO.x)/scale+11.58,(my-LOGO.y)/scale+8.52)){mx=p.x;my=p.y;}
   p.materialX=mx;p.materialY=my;
   const ix=Math.round(mx-BOX.x),iy=Math.round(my-BOX.y),index=clamp(iy,0,h-1)*w+clamp(ix,0,w-1);
   p.materialEntry=entry[index];p.materialExit=exit[index];
   p.materialColor=Array.from(original.data.slice(index*4,index*4+3));
   p.materialMotionStart=p.materialExit+.025;
   const dt=.004,a=oldPosition(p,HANDOFF-dt),b=oldPosition(p,HANDOFF),c=oldPosition(p,HANDOFF+dt);
   p.materialTarget=b;p.materialVelocity={x:(c.x-a.x)/(dt*2),y:(c.y-a.y)/(dt*2)};
   p.materialAcceleration={x:(c.x-2*b.x+a.x)/(dt*dt),y:(c.y-2*b.y+a.y)/(dt*dt)};
  }
  renderer.material=skin;return skin;
 }
 function surface(renderer,t){
  const m=initialise(renderer),out=t>=8;
  if(t>=9.35)return;
  const field=out?m.exit:m.entry,alpha=m.working.data,source=m.original.data;
  for(const i of m.active){const a=out?1-smooth(field[i]-.035,field[i]+.085,t):smooth(field[i]-.035,field[i]+.085,t);alpha[i*4+3]=Math.round(source[i*4+3]*a);}
  m.ctx.putImageData(m.working,0,0);renderer.ctx.drawImage(m.surface,BOX.x,BOX.y);
 }
 function trace(renderer,t){
  const ctx=renderer.ctx,alpha=smooth(.55,1.8,t)*(1-smooth(2.45,3.60,t));
  if(alpha<.001)return;
  ctx.save();ctx.globalAlpha=alpha;
  // Identical pose to the particles and material, including during assembly.
  ctx.translate(LOGO.x,LOGO.y);ctx.scale(scale,scale);ctx.translate(-11.58,-8.52);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=.075;ctx.strokeStyle='#92bbff';ctx.shadowColor='#5484ff';ctx.shadowBlur=10;
  root.DSHBrand.contours.forEach((contour,j)=>{
   const q=smooth(.7+j*.15,3.8+j*.15,t),n=Math.floor(q*(contour.points.length-1));if(n<1)return;
   ctx.beginPath();ctx.moveTo(...contour.points[0]);for(let k=1;k<=n;k++)ctx.lineTo(...contour.points[k]);ctx.stroke();
   if(q<.999){const p=contour.points[n];ctx.beginPath();ctx.arc(p[0],p[1],.095,0,TAU);ctx.fillStyle='#e9f8ff';ctx.fill();}
  });ctx.restore();
 }
 proto.drawLogo=function(t){
  initialise(this);
  // Preserve the approved, settled brand and its small glint exactly.
  if(t>=6.4&&t<8.0){oldLogo.call(this,t);return;}
  if(t<8.0)trace(this,t);
  if(t>=2.38&&t<9.35)surface(this,t);
  if(t>=4.7&&t<6.4){
   const ctx=this.ctx,glint=smooth(4.8,5.2,t)*(1-smooth(5.8,6.4,t));
   ctx.save();ctx.translate(LOGO.x,LOGO.y);ctx.scale(scale,scale);ctx.translate(-11.58,-8.52);ctx.clip(this.path);ctx.globalAlpha=glint*.28;
   const x=lerp(-8,28,smooth(4.7,6.3,t)),g=ctx.createLinearGradient(x-3,0,x+3,0);g.addColorStop(0,'rgba(235,247,255,0)');g.addColorStop(.5,'rgba(235,247,255,.9)');g.addColorStop(1,'rgba(235,247,255,0)');ctx.fillStyle=g;ctx.fillRect(-5,-5,35,30);ctx.restore();
  }
 };
 proto.drawParticles=function(t){
  const m=initialise(this);
  // At and beyond this boundary, the old code and random seeds are untouched.
  if(t>=HANDOFF){oldParticles.call(this,t);return;}
  const all=this.particles;this.particles=m.type;
  try{oldParticles.call(this,t);}finally{this.particles=all;}
  const ctx=this.ctx;ctx.save();
  for(const p of all){
   if(p.kind!=='logo')continue;
   if(t<3.65){
    const arrival=p.materialEntry-.02,start=.10+p.a*.35;
    const q=smoother((t-start)/(arrival-start));
    const settled=smooth(p.materialEntry-.035,p.materialEntry+.085,t);
    const a=smooth(.05,.75,t)*(1-settled)*(.35+p.b*.55);
    if(a>.001){
     const x=lerp(p.startX,p.materialX,q),y=lerp(p.startY,p.materialY,q),join=smooth(.75,1,q);
     const rgb=[lerp(139,p.materialColor[0],join),lerp(185,p.materialColor[1],join),lerp(255,p.materialColor[2],join)];
     ctx.beginPath();ctx.arc(x,y,lerp(.7+p.c*.65,1.45,join),0,TAU);ctx.fillStyle=`rgba(${rgb.join(',')},${a})`;ctx.fill();
     if(join>.1){ctx.fillStyle=`rgba(${rgb.join(',')},${a*.45*join})`;for(let j=0;j<2;j++){const angle=(p.a+j*.5)*TAU;ctx.beginPath();ctx.arc(x+Math.cos(angle)*2.0,y+Math.sin(angle)*2.0,.6+p.b*.3,0,TAU);ctx.fill();}}
    }
   }
   if(t>=7.95){
    const born=smooth(p.materialExit-.025,p.materialExit+.085,t);if(born<.001)continue;
    const duration=HANDOFF-p.materialMotionStart,u=clamp((t-p.materialMotionStart)/duration);
    const x=quintic(p.materialX,p.materialTarget.x,p.materialVelocity.x,p.materialAcceleration.x,duration,u);
    const y=quintic(p.materialY,p.materialTarget.y,p.materialVelocity.y,p.materialAcceleration.y,duration,u);
    const age=Math.max(0,t-p.materialMotionStart),transfer=smoother(u);
    const hue=p.stream?190+p.a*40:215+p.a*50,starColor=hsl(hue,.85,(71+p.a*19)/100);
    const rgb=p.materialColor.map((v,i)=>lerp(v,starColor[i],transfer));
    const twinkle=.62+.38*Math.sin(t*1.7+p.a*30)**2,oldAlpha=(.35+p.b*.55)*twinkle;
    const alpha=born*lerp(.86,oldAlpha,transfer),radius=lerp(1.6,.65+p.c,transfer);
    ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fillStyle=`rgba(${rgb.join(',')},${alpha})`;ctx.fill();
    if(p.i%59===0&&transfer>.5){ctx.strokeStyle=`rgba(179,211,255,${oldAlpha*.45*smooth(.5,1,transfer)})`;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
    // Short-lived fine fragments make the material edge granular rather than
    // a sparse dot-grid. They completely disappear before the old star field.
    const dust=born*(1-smooth(.25,1.0,age))*.55;
    if(dust>.001){
     ctx.fillStyle=`rgba(${rgb.join(',')},${dust})`;
     for(let j=0;j<2;j++){const angle=(p.a+j*.5)*TAU,offset=1.6+age*3;ctx.beginPath();ctx.arc(x+Math.cos(angle)*offset,y+Math.sin(angle)*offset,.55+p.b*.35,0,TAU);ctx.fill();}
    }
   }
  }
  ctx.restore();
 };
 root.DSHAwakening.version='0.4.0';
 root.DSHMorph={handoff:HANDOFF,initialise,oldPosition};
})(window);

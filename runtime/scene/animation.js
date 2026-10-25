/* DSH Awakening · v2. Official whale geometry, original motion direction.
   The licensed character segment and its original audio share one clock. */
(function (root) {
  'use strict';
  const DURATION=22, TAIL=13.6, HOLD=12.4, TAU=Math.PI*2;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
  const ease=x=>1-Math.pow(1-clamp(x),4);
  const windowAt=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
  const random=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  const font='"Bahnschrift", "Segoe UI", Arial, sans-serif';
  const cn='"Microsoft YaHei UI", "PingFang SC", sans-serif';
  function type(ctx,value,x,y,size,spacing,color,weight=400){
    ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;
    const chars=Array.from(value),width=chars.reduce((s,c)=>s+ctx.measureText(c).width,0)+(chars.length-1)*spacing;
    let cx=x-width/2;for(const c of chars){ctx.fillText(c,cx,y);cx+=ctx.measureText(c).width+spacing;}
  }
  function dot(ctx,x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill();}
  function bezier(p,t){const q=1-t;return {x:q*q*q*p[0][0]+3*q*q*t*p[1][0]+3*q*t*t*p[2][0]+t*t*t*p[3][0],y:q*q*q*p[0][1]+3*q*q*t*p[1][1]+3*q*t*t*p[2][1]+t*t*t*p[3][1]};}
  // The paths continue the left/right streams in the character clip's opening.
  const STREAMS=[[[ -120,920],[240,540],[416,397],[580,665]],[[1250,1190],[1580,1100],[1790,650],[1960,85]]];
  const LOGO={x:960,y:420,width:415,height:415*17.04/23.16};
  function world(x,y){return {x:LOGO.x+(x-11.58)*LOGO.width/23.16,y:LOGO.y+(y-8.52)*LOGO.width/23.16};}

  class Renderer {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
      this.path=new Path2D(root.DSHBrand.path);this.particles=[];
      const test=document.createElement('canvas').getContext('2d');
      // All stars originate in the official silhouette or in its name.
      for(let y=.2;y<17.04;y+=.43)for(let x=.2;x<23.16;x+=.43){
        if(test.isPointInPath(this.path,x,y)){const p=world(x,y);this.particles.push({x:p.x,y:p.y,kind:'logo'});}
      }
      const mask=document.createElement('canvas');mask.width=1920;mask.height=1080;
      const m=mask.getContext('2d',{willReadFrequently:true});
      type(m,'DEEPSEEK',960,695,68,9,'#fff',500);
      type(m,'HARNESS',960,763,27,9,'#fff',400);
      const data=m.getImageData(0,650,1920,150).data;
      for(let y=0;y<150;y+=9)for(let x=480;x<1440;x+=9){if(data[(y*1920+x)*4+3]>100)this.particles.push({x,y:y+650,kind:'type'});}
      this.particles.forEach((p,i)=>{
        p.i=i;p.a=random(i+4);p.b=random(i+501);p.c=random(i+2039);
        const angle=p.a*TAU,r=Math.sqrt(p.b);
        p.starX=960+Math.cos(angle)*r*900;p.starY=500+Math.sin(angle)*r*435;
        p.startX=p.x+(p.a-.5)*1470;p.startY=p.y+(p.b-.5)*680;
        p.stream=p.a>.53?1:0;p.u=.03+p.c*.94;
      });
    }
    drawLogo(t){
      const ctx=this.ctx;
      const alpha=smooth(.55,1.8,t)*(1-smooth(8.8,10.2,t));
      if(alpha<.001)return;
      const grow=lerp(.97,1,ease((t-.4)/4));
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(LOGO.x,LOGO.y);
      ctx.scale(LOGO.width/23.16*grow,LOGO.width/23.16*grow);ctx.translate(-11.58,-8.52);
      const fill=smooth(3.65,4.9,t);
      if(fill>0){
        const gradient=ctx.createLinearGradient(3,2,19,17);
        gradient.addColorStop(0,'#afceff');gradient.addColorStop(.29,'#6d96ff');gradient.addColorStop(1,'#4261ee');
        ctx.save();ctx.globalAlpha*=fill;ctx.fillStyle=gradient;ctx.shadowColor='#4167ed';ctx.shadowBlur=24*windowAt(t,3.7,4.6,5,6.2);ctx.fill(this.path);ctx.restore();
        // A restrained moving light crosses the same silhouette.
        const glint=windowAt(t,4.8,5.2,5.8,6.4);
        if(glint>0){ctx.save();ctx.clip(this.path);ctx.globalAlpha*=glint*.28;
          const x=lerp(-8,28,smooth(4.7,6.3,t));const g=ctx.createLinearGradient(x-3,0,x+3,0);
          g.addColorStop(0,'rgba(235,247,255,0)');g.addColorStop(.5,'rgba(235,247,255,.9)');g.addColorStop(1,'rgba(235,247,255,0)');ctx.fillStyle=g;ctx.fillRect(-5,-5,35,30);ctx.restore();}
      }
      const outline=lerp(1,.17,fill);
      ctx.save();ctx.globalAlpha*=outline;ctx.lineCap='round';ctx.lineJoin='round';
      root.DSHBrand.contours.forEach((contour,j)=>{
        const p=smooth(.7+j*.15,3.8+j*.15,t),n=Math.floor(p*(contour.points.length-1));
        if(n<1)return;ctx.beginPath();ctx.moveTo(...contour.points[0]);
        for(let k=1;k<=n;k++)ctx.lineTo(...contour.points[k]);
        ctx.strokeStyle='#92bbff';ctx.lineWidth=.075;ctx.shadowColor='#5484ff';ctx.shadowBlur=10;ctx.stroke();
        if(p<.999){const head=contour.points[n];dot(ctx,head[0],head[1],.095,'#e9f8ff');}
      });ctx.restore();ctx.restore();
    }
    drawName(t){
      const ctx=this.ctx,exit=1-smooth(8.75,9.75,t);
      if(t<2.6||exit<.001)return;
      const rows=[{value:'DEEPSEEK',size:68,space:9,y:695,weight:500,start:2.65},{value:'HARNESS',size:27,space:9,y:763,weight:400,start:4.5}];
      for(const row of rows){
        ctx.font=`${row.weight} ${row.size}px ${font}`;
        const glyphs=Array.from(row.value),width=glyphs.reduce((s,c)=>s+ctx.measureText(c).width,0)+(glyphs.length-1)*row.space;
        let x=960-width/2;
        glyphs.forEach((c,i)=>{
          const p=ease((t-row.start-i*.1)/.92),a=smooth(0,.35,p)*exit;
          ctx.save();ctx.globalAlpha=a;
          const source=i%2?-1:1,dx=source*(1-p)*(42+Math.abs(i-(glyphs.length-1)/2)*23),dy=(1-p)*(i%3===0?-30:38);
          ctx.translate(x+dx,row.y+dy);ctx.fillStyle=row.value==='HARNESS'?'#9bb6e5':'#e2ecff';ctx.fillText(c,0,0);
          // Each glyph's brief assembly guide disappears on arrival.
          if(p>.03&&p<.95){ctx.strokeStyle=`rgba(93,141,241,${(1-p)*.4})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-10,row.size*.27);ctx.lineTo(ctx.measureText(c).width+10,row.size*.27);ctx.stroke();}
          ctx.restore();x+=ctx.measureText(c).width+row.space;
        });
      }
      const caption=windowAt(t,6.3,6.9,8.3,8.85);
      ctx.save();ctx.globalAlpha=caption*.75;ctx.font=`24px ${cn}`;ctx.textAlign='center';ctx.fillStyle='#7b97b7';ctx.fillText('唤醒你的工作空间',960,878);ctx.textAlign='left';ctx.restore();
    }
    drawParticles(t){
      const ctx=this.ctx;
      const intro=windowAt(t,.05,.8,2.5,4.2);
      const late=windowAt(t,8.55,9.25,13.75,14.55);
      if(intro<.001&&late<.001)return;
      ctx.save();
      for(const p of this.particles){
        if(intro>.001&&p.kind==='logo'){
          const q=ease((t-.15-p.a*.6)/2.65),x=lerp(p.startX,p.x,q),y=lerp(p.startY,p.y,q);
          const a=intro*(.22+p.b*.60)*smooth(.1,.8,t);
          dot(ctx,x,y,.7+p.c*.65,`rgba(139,185,255,${a})`);
        }
        if(late>.001){
          const q=ease((t-8.65-p.c*.55)/2.4),pull=smooth(11.05+p.b*.18,13.5,t);
          const arch=Math.sin(q*Math.PI)*70;
          let x=lerp(p.x,p.starX,q)+Math.sin(p.a*TAU)*arch,y=lerp(p.y,p.starY,q)+Math.cos(p.b*TAU)*arch;
          const target=bezier(STREAMS[p.stream],p.u);
          x=lerp(x,target.x,pull);y=lerp(y,target.y,pull);
          const twinkle=.62+.38*Math.sin(t*1.7+p.a*30)**2;
          const a=late*(.35+p.b*.55)*twinkle;
          const hue=p.stream?190+p.a*40:215+p.a*50;
          dot(ctx,x,y,.65+p.c*1.0,`hsla(${hue},85%,${71+p.a*19}%,${a})`);
          if(p.i%59===0&&q>.7&&pull<.3){ctx.strokeStyle=`rgba(179,211,255,${a*.45})`;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
        }
      }
      ctx.restore();
    }
    drawStreams(t){
      const ctx=this.ctx,a=windowAt(t,11.95,13.25,13.85,14.4);
      if(a<.001)return;
      ctx.save();ctx.globalAlpha=a;ctx.lineCap='round';
      STREAMS.forEach((curve,j)=>{
        const progress=smooth(11.8,13.35,t);
        // The right stream is written from the upper-right toward the lower
        // curve. Keep its final geometry and world-space gradient unchanged.
        ctx.beginPath();for(let i=0;i<=80*progress;i++){const index=j===1&&progress<1?80-i:i;const p=bezier(curve,index/80);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
        const g=ctx.createLinearGradient(curve[0][0],curve[0][1],curve[3][0],curve[3][1]);
        g.addColorStop(0,j?'rgba(209,164,251,0)':'rgba(92,164,255,0)');g.addColorStop(.54,j?'#dfd4c4':'#8dafff');g.addColorStop(1,j?'#9cdef7':'#d4b7ff');
        ctx.strokeStyle=g;ctx.lineWidth=2.2;ctx.shadowColor=j?'#afcff5':'#7a8dff';ctx.shadowBlur=19;ctx.stroke();
        ctx.globalAlpha=a*.2;ctx.lineWidth=10;ctx.shadowBlur=25;ctx.stroke();ctx.globalAlpha=a;
      });ctx.restore();
    }
    render(time,{video=null,phaseLabel='',waiting=false}={}){
      const ctx=this.ctx,t=clamp(time,0,DURATION);ctx.setTransform(this.canvas.width/1920,0,0,this.canvas.height/1080,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.textBaseline='alphabetic';
      ctx.fillStyle='#000207';ctx.fillRect(0,0,1920,1080);
      const atmosphere=(1-smooth(11.5,13.6,t))*.31;
      if(atmosphere>0){const g=ctx.createRadialGradient(960,440,40,960,490,890);g.addColorStop(0,`rgba(23,47,90,${atmosphere})`);g.addColorStop(1,'rgba(23,47,90,0)');ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);}
      if(t>=TAIL&&video&&video.readyState>=2){ctx.save();ctx.globalAlpha=smooth(TAIL,TAIL+.65,t);ctx.drawImage(video,0,0,1920,1080);ctx.restore();}
      this.drawLogo(t);this.drawName(t);this.drawStreams(t);this.drawParticles(t);
      if(phaseLabel&&t<8.5){ctx.save();ctx.globalAlpha=.65;ctx.font=`22px ${cn}`;ctx.textAlign='center';ctx.fillStyle='#7994b5';ctx.fillText(phaseLabel,960,940);ctx.textAlign='left';ctx.restore();}
      if(waiting){ctx.save();ctx.font=`24px ${cn}`;ctx.textAlign='center';ctx.fillStyle='#8da9c9';ctx.fillText('等待工作界面就绪',960,872);ctx.textAlign='left';ctx.restore();}
      const end=smooth(21.7,22,t);if(end>0){ctx.globalAlpha=end;ctx.fillStyle='#000207';ctx.fillRect(0,0,1920,1080);ctx.globalAlpha=1;}
      return {time:t,phase:t<4.5?'identify':t<8.65?'awaken':t<TAIL?'transform':t<21.7?'welcome':'exit'};
    }
  }

  class Player{
    constructor(canvas,{audio,video,mode='preview',sound=true,volume=.85,maxWait=40}={}){
      this.renderer=new Renderer(canvas);this.audio=audio;this.video=video;this.mode=mode;this.sound=sound;this.volume=volume;this.maxWait=maxWait;
      this.time=0;this.playing=false;this.ready=mode!=='host';this.holding=false;this.disposed=false;this.generation=0;this.phaseLabel='';this.events=new Map();
    }
    on(name,callback){this.events.set(name,callback);return()=>this.events.delete(name);}
    emit(name,value){this.events.get(name)?.(value);}
    paint(){return this.renderer.render(this.time,{video:this.video,phaseLabel:this.phaseLabel,waiting:this.holding});}
    pause(){this.generation++;this.playing=false;cancelAnimationFrame(this.frame);this.audio?.pause();this.video?.pause();}
    async seek(time){
      this.pause();const request=++this.generation;this.time=clamp(time,0,DURATION);
      if(this.audio)this.audio.currentTime=this.time;
      if(this.video){
        const to=Math.min((this.video.duration||8.042)-.015,Math.max(0,this.time-TAIL));
        if(Math.abs(this.video.currentTime-to)>.004){await new Promise(resolve=>{const finish=()=>{clearTimeout(timer);resolve();};this.video.addEventListener('seeked',finish,{once:true});const timer=setTimeout(()=>{this.video.removeEventListener('seeked',finish);resolve();},700);this.video.currentTime=to;});}
      }
      if(request!==this.generation||this.disposed)return false;
      this.paint();this.emit('frame',{time:this.time});return true;
    }
    async play(time=this.time){
      if(this.disposed)return;
      if(!await this.seek(time))return;
      const request=this.generation;
      if(this.audio){this.audio.volume=clamp(this.volume);this.audio.muted=!this.sound;let blocked=false;try{await this.audio.play();}catch{blocked=true;}if(request!==this.generation||this.disposed)return;this.audioClock=!blocked;this.emit('audio',{blocked});}
      if(request!==this.generation||this.disposed)return;
      if(this.mode==='host'&&!this.ready&&!this.watchdog){this.watchdog=setTimeout(()=>{this.watchdog=null;this.pause();this.holding=false;this.emit('error',{code:'timeout'});},this.maxWait*1000);}
      this.baseTime=this.time;this.start=performance.now();this.playing=true;this.lastPaint=-Infinity;
      const tick=now=>{
        if(!this.playing||this.disposed)return;
        let time=this.audioClock&&this.audio&&!this.audio.paused?this.audio.currentTime:this.baseTime+(now-this.start)/1000;
        // An ended audio clock must allow the last video frame to finish too.
        if(this.audio?.ended)time=Math.max(time,DURATION);
        if(!this.ready&&time>=HOLD){this.pause();this.holding=true;this.time=HOLD;if(this.audio)this.audio.currentTime=HOLD;this.paint();this.emit('hold',{});return;}
        this.time=clamp(time,0,DURATION);
        if(this.video&&time>=TAIL&&!this.video.ended){const expected=Math.min(this.video.duration-.015,Math.max(0,time-TAIL));if(!this.video.seeking&&Math.abs(this.video.currentTime-expected)>.085)this.video.currentTime=expected;if(this.video.paused)this.video.play().catch(()=>{});}
        if(now-this.lastPaint>=1000/30-.5||time>=DURATION){this.paint();this.lastPaint=now;}
        this.emit('frame',{time:this.time});
        if(time>=DURATION){clearTimeout(this.watchdog);this.watchdog=null;this.pause();this.emit('complete',{});return;}
        this.frame=requestAnimationFrame(tick);
      };this.frame=requestAnimationFrame(tick);
    }
    hostReady(){clearTimeout(this.watchdog);this.watchdog=null;this.ready=true;if(this.holding){this.holding=false;this.play(HOLD);}}
    setPhase({label}={}){this.phaseLabel=typeof label==='string'?label.slice(0,24):'';}
    dispose(){if(this.disposed)return;clearTimeout(this.watchdog);this.watchdog=null;this.disposed=true;this.generation++;this.pause();this.events.clear();}
  }
  root.DSHAwakening={Renderer,Player,duration:DURATION,tailStart:TAIL,holdTime:HOLD,version:'0.3.0'};
})(window);

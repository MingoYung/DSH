/* Offline, genuinely extended DSH stage. The central 1920 x 1080 composition
   uses the approved renderer unchanged. New outside pixels are procedural
   background and stars, never blurred, mirrored or stretched source pixels. */
(function (root) {
  'use strict';
  const WIDTH = 1920, HEIGHT = 1080, SIZE = 2560, TAIL = 13.6;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = (a, b, value) => { const x = clamp((value - a) / (b - a)); return x * x * (3 - 2 * x); };
  const random = value => { const x = Math.sin(value * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const BASE = '#000207';
  function makeCanvas(width, height) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas; }

  class NativeStage {
    constructor({ canvas, video }) {
      this.canvas = canvas; this.video = video;
      this.centralCanvas = makeCanvas(WIDTH, HEIGHT);
      this.renderer = new DSHAwakening.Renderer(this.centralCanvas);
      this.tailCanvas = makeCanvas(WIDTH, HEIGHT);
      // Only the cropped source-video boundary is alpha-composited; the native
      // background remains crisp. Set to 0 for a pixel-preserving comparison.
      this.tailFeather = 64;
      // A stable infinite-looking field; every point is newly drawn geometry.
      // This range also covers the portrait fallback beyond the square master.
      this.stars = Array.from({ length: 760 }, (_, i) => ({
        x: -2240 + random(i + 201) * 6400,
        y: -2240 + random(i + 793) * 5560,
        size: .65 + random(i + 1881) * .9,
        alpha: .11 + random(i + 7151) * .25,
        phase: random(i + 10717) * Math.PI * 2,
        drift: .9 + random(i + 2371) * 2.0,
      }));
      this.frameCount = 0;
    }

    async seekVideo(time) {
      const video = this.video;
      if (video.readyState < 2) await new Promise((resolve, reject) => {
        const loaded = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error('The approved master video could not be loaded.')); };
        const cleanup = () => { video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', failed); };
        video.addEventListener('loadeddata', loaded, { once: true }); video.addEventListener('error', failed, { once: true });
      });
      const target = Math.max(0, Math.min((video.duration || 22) - .0001, time));
      if (Math.abs(video.currentTime - target) > .002) await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true }); video.currentTime = target;
      });
    }

    outside(ctx, draw) {
      // The finite bounds exceed all supported master/viewport prototypes.
      ctx.save(); ctx.beginPath(); ctx.rect(-8192, -8192, 16384, 16384);
      ctx.rect(0, 0, WIDTH, HEIGHT); ctx.clip('evenodd'); draw(); ctx.restore();
    }

    background(ctx, time, bounds) {
      ctx.fillStyle = BASE; ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      // This is the same original radial atmosphere, now allowed to extend
      // beyond its old fixed rectangle. Its central pixels are unchanged.
      const atmosphere = (1 - smooth(11.5, 13.6, time)) * .31;
      if (atmosphere > 0) {
        const gradient = ctx.createRadialGradient(960, 440, 40, 960, 490, 890);
        gradient.addColorStop(0, `rgba(23,47,90,${atmosphere})`);
        gradient.addColorStop(1, 'rgba(23,47,90,0)');
        ctx.fillStyle = gradient; ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      const entrance = smooth(.15, 1.8, time), exit = 1 - smooth(21.7, 22, time);
      this.outside(ctx, () => {
        // A broad native night-blue field, not a sampled image or blur. It is
        // restrained so the logo and text remain the visual centre.
        const gradient = ctx.createRadialGradient(960, 600, 500, 960, 600, 1940);
        gradient.addColorStop(0, 'rgba(16,31,61,0)');
        gradient.addColorStop(.48, `rgba(16,31,61,${.075 * entrance * exit})`);
        gradient.addColorStop(1, 'rgba(16,31,61,0)');
        ctx.fillStyle = gradient; ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        for (let i = 0; i < this.stars.length; i++) {
          const star = this.stars[i];
          const x = star.x + Math.sin(time * .07 + star.phase) * star.drift;
          const y = star.y + Math.cos(time * .05 + star.phase) * star.drift;
          if (x < bounds.x - 4 || x > bounds.x + bounds.width + 4 || y < bounds.y - 4 || y > bounds.y + bounds.height + 4) continue;
          const distance = Math.max(-x, x - WIDTH, -y, y - HEIGHT, 0);
          // Stars begin gently outside the old frame; there is no rectangular
          // seam or row of points tracing the previous video boundary.
          const edge = smooth(8, 115, distance);
          const twinkle = .72 + .28 * Math.sin(time * .8 + star.phase) ** 2;
          const alpha = star.alpha * entrance * exit * edge * twinkle;
          if (alpha < .002) continue;
          ctx.beginPath(); ctx.arc(x, y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(130,166,224,${alpha})`; ctx.fill();
          if (i % 41 === 0 && alpha > .12) {
            ctx.strokeStyle = `rgba(158,193,246,${alpha * .35})`; ctx.lineWidth = .6;
            ctx.beginPath(); ctx.moveTo(x - 3.2, y); ctx.lineTo(x + 3.2, y);
            ctx.moveTo(x, y - 3.2); ctx.lineTo(x, y + 3.2); ctx.stroke();
          }
        }
      });
    }

    draw(time, canvas = this.canvas, viewport = null) {
      const ctx = canvas.getContext('2d', { alpha: false });
      const t = Math.max(0, Math.min(22, Number(time)));
      const scale = viewport?.scale ?? 1;
      const originX = viewport?.originX ?? (SIZE - WIDTH) / 2;
      const originY = viewport?.originY ?? (SIZE - HEIGHT) / 2;
      const bounds = { x: -originX / scale, y: -originY / scale, width: canvas.width / scale, height: canvas.height / scale };
      ctx.setTransform(scale, 0, 0, scale, originX, originY);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
      this.background(ctx, t, bounds);
      if (t < TAIL) {
        // Rasterise at the original integer origin before placing the safe
        // rectangle. This preserves antialiasing/shadow quantisation exactly;
        // translating the original drawing context can change some GPU AA.
        this.renderer.render(t);
        ctx.drawImage(this.centralCanvas, 0, 0, WIDTH, HEIGHT);
      } else {
        // Existing master already contains the exact approved intro/tail blend
        // and welcome lip timing. Copy its whole central frame once, unaltered.
        if (this.tailFeather > 0) {
          const tail = this.tailCanvas.getContext('2d');
          const strength = this.tailFeather / 64 * smooth(TAIL, 14.45, t);
          const side = 48 * strength, top = 16 * strength, bottom = 96 * strength;
          tail.globalCompositeOperation = 'source-over'; tail.clearRect(0, 0, WIDTH, HEIGHT);
          tail.drawImage(this.video, 0, 0, WIDTH, HEIGHT);
          tail.globalCompositeOperation = 'destination-in';
          const horizontal = tail.createLinearGradient(0, 0, WIDTH, 0);
          horizontal.addColorStop(0, 'transparent'); horizontal.addColorStop(side / WIDTH, '#000');
          horizontal.addColorStop(1 - side / WIDTH, '#000'); horizontal.addColorStop(1, 'transparent');
          tail.fillStyle = horizontal; tail.fillRect(0, 0, WIDTH, HEIGHT);
          const vertical = tail.createLinearGradient(0, 0, 0, HEIGHT);
          vertical.addColorStop(0, 'transparent'); vertical.addColorStop(top / HEIGHT, '#000');
          vertical.addColorStop(1 - bottom / HEIGHT, '#000'); vertical.addColorStop(1, 'transparent');
          tail.fillStyle = vertical; tail.fillRect(0, 0, WIDTH, HEIGHT);
          tail.globalCompositeOperation = 'source-over';
          ctx.drawImage(this.tailCanvas, 0, 0, WIDTH, HEIGHT);
        } else ctx.drawImage(this.video, 0, 0, WIDTH, HEIGHT);
      }
      this.frameCount++;
      return { time: t, master: { width: canvas.width, height: canvas.height }, central: { x: originX, y: originY, width: WIDTH * scale, height: HEIGHT * scale }, frameCount: this.frameCount };
    }

    async renderAt(time) {
      if (time >= TAIL) await this.seekVideo(time);
      return this.draw(time);
    }

    async renderViewport(width, height, time, canvas) {
      if (time >= TAIL) await this.seekVideo(time);
      canvas.width = width; canvas.height = height;
      const scale = Math.min(width / WIDTH, height / HEIGHT);
      return this.draw(time, canvas, { scale, originX: (width - WIDTH * scale) / 2, originY: (height - HEIGHT * scale) / 2 });
    }
  }
  root.NativeDSHAwakening = { NativeStage, width: SIZE, height: SIZE, safe: { x: 320, y: 740, width: WIDTH, height: HEIGHT } };
})(window);

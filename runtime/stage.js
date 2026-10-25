/* Native square-master layout. The 1920 x 1080 safe composition is preserved.
   Ordinary desktop ratios need only CSS geometry. A small procedural field
   exists only when a viewport extends beyond the square master itself. */
(function (root) {
  'use strict';
  const mounts = new WeakMap();
  const MASTER = 2560;
  const SAFE = Object.freeze({ x: 320, y: 740, width: 1920, height: 1080 });
  const BASE = '#000207';
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = (a, b, value) => { const x = clamp((value - a) / (b - a)); return x * x * (3 - 2 * x); };
  const random = value => { const x = Math.sin(value * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function mount({ video, container = video?.parentElement } = {}) {
    if (!video || !container || !video.parentNode) throw new TypeError('A mounted video and its stage container are required.');
    if (mounts.has(video)) return mounts.get(video);
    const surface = typeof container.getBoundingClientRect === 'function' ? container : container.host;
    const surfaceBefore = surface?.style ? { overflow: surface.style.overflow, position: surface.style.position } : null;
    const surfaceApplied = {};
    if (surface?.style) {
      surface.style.overflow = 'hidden'; surfaceApplied.overflow = surface.style.overflow;
      if (root.getComputedStyle(surface).position === 'static') {
        surface.style.position = 'relative'; surfaceApplied.position = surface.style.position;
      }
    }
    const properties = ['position', 'width', 'height', 'left', 'top', 'right', 'bottom', 'maxWidth', 'maxHeight', 'objectFit', 'background', 'maskImage'];
    const before = Object.fromEntries(properties.map(key => [key, video.style[key]]));
    const applied = {};
    function style(key, value) { video.style[key] = value; applied[key] = video.style[key]; }
    let disposed = false, geometry = null, coveredByMaster = true;
    let canvas = null, context = null, stars = null, rasterScale = 1;
    let videoCallback = 0, animationCallback = 0, lastDraw = -Infinity;
    let drawn = 0, failures = 0, fallbackFailed = false;

    function stopFrames() {
      if (videoCallback && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(videoCallback);
      if (animationCallback) root.cancelAnimationFrame(animationCallback);
      videoCallback = 0; animationCallback = 0;
    }

    function removeFallback() {
      stopFrames();
      canvas?.remove(); canvas = null; context = null; stars = null;
    }

    function ensureFallback() {
      if (canvas || fallbackFailed) return;
      try {
        canvas = document.createElement('canvas');
        canvas.dataset.dshAwakeningBackdrop = 'native';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:#000207;';
        context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Procedural background canvas unavailable.');
        video.parentNode.insertBefore(canvas, video);
        // Same seed and world coordinates as the offline square master.
        stars = Array.from({ length: 760 }, (_, i) => ({
          x: -2240 + random(i + 201) * 6400,
          y: -2240 + random(i + 793) * 5560,
          size: .65 + random(i + 1881) * .9,
          alpha: .11 + random(i + 7151) * .25,
          phase: random(i + 10717) * Math.PI * 2,
          drift: .9 + random(i + 2371) * 2.0,
        }));
      } catch (_) {
        failures++; fallbackFailed = true;
        canvas?.remove(); canvas = null; context = null; stars = null;
      }
    }

    function draw(force = false) {
      if (disposed || coveredByMaster || !canvas || !context || !geometry || fallbackFailed) return;
      const now = performance.now();
      if (!force && now - lastDraw < 1000 / 24 - 1) return;
      lastDraw = now;
      const { viewport, safeArea, scale } = geometry;
      const t = Number.isFinite(video.currentTime) ? Math.max(0, Math.min(22, video.currentTime)) : 0;
      const world = { x: -safeArea.x / scale, y: -safeArea.y / scale, width: viewport.width / scale, height: viewport.height / scale };
      try {
        context.setTransform(scale * rasterScale, 0, 0, scale * rasterScale, safeArea.x * rasterScale, safeArea.y * rasterScale);
        context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; context.shadowBlur = 0;
        context.fillStyle = BASE; context.fillRect(world.x, world.y, world.width, world.height);
        const atmosphere = (1 - smooth(11.5, 13.6, t)) * .31;
        if (atmosphere > 0) {
          const gradient = context.createRadialGradient(960, 440, 40, 960, 490, 890);
          gradient.addColorStop(0, `rgba(23,47,90,${atmosphere})`); gradient.addColorStop(1, 'rgba(23,47,90,0)');
          context.fillStyle = gradient; context.fillRect(world.x, world.y, world.width, world.height);
        }
        const entrance = smooth(.15, 1.8, t), exit = 1 - smooth(21.7, 22, t);
        context.save(); context.beginPath(); context.rect(-8192, -8192, 16384, 16384);
        context.rect(0, 0, SAFE.width, SAFE.height); context.clip('evenodd');
        const gradient = context.createRadialGradient(960, 600, 500, 960, 600, 1940);
        gradient.addColorStop(0, 'rgba(16,31,61,0)');
        gradient.addColorStop(.48, `rgba(16,31,61,${.075 * entrance * exit})`);
        gradient.addColorStop(1, 'rgba(16,31,61,0)');
        context.fillStyle = gradient; context.fillRect(world.x, world.y, world.width, world.height);
        for (let i = 0; i < stars.length; i++) {
          const star = stars[i];
          const x = star.x + Math.sin(t * .07 + star.phase) * star.drift;
          const y = star.y + Math.cos(t * .05 + star.phase) * star.drift;
          if (x < world.x - 4 || x > world.x + world.width + 4 || y < world.y - 4 || y > world.y + world.height + 4) continue;
          const distance = Math.max(-x, x - SAFE.width, -y, y - SAFE.height, 0);
          const edge = smooth(8, 115, distance), twinkle = .72 + .28 * Math.sin(t * .8 + star.phase) ** 2;
          const alpha = star.alpha * entrance * exit * edge * twinkle;
          if (alpha < .002) continue;
          context.beginPath(); context.arc(x, y, star.size, 0, Math.PI * 2);
          context.fillStyle = `rgba(130,166,224,${alpha})`; context.fill();
          if (i % 41 === 0 && alpha > .12) {
            context.strokeStyle = `rgba(158,193,246,${alpha * .35})`; context.lineWidth = .6;
            context.beginPath(); context.moveTo(x - 3.2, y); context.lineTo(x + 3.2, y);
            context.moveTo(x, y - 3.2); context.lineTo(x, y + 3.2); context.stroke();
          }
        }
        context.restore(); drawn++;
      } catch (_) {
        failures++; fallbackFailed = true; stopFrames();
      }
    }

    function schedule() {
      if (disposed || coveredByMaster || fallbackFailed || !canvas || videoCallback || animationCallback || video.paused || video.ended) return;
      if (typeof video.requestVideoFrameCallback === 'function') {
        videoCallback = video.requestVideoFrameCallback(() => { videoCallback = 0; draw(); schedule(); });
      } else {
        animationCallback = root.requestAnimationFrame(() => { animationCallback = 0; draw(); schedule(); });
      }
    }

    function resize() {
      if (disposed) return;
      const rect = surface?.getBoundingClientRect();
      const width = Math.max(1, rect?.width || root.innerWidth || 1), height = Math.max(1, rect?.height || root.innerHeight || 1);
      const scale = Math.min(width / SAFE.width, height / SAFE.height);
      const size = MASTER * scale, left = (width - size) / 2, top = (height - size) / 2;
      const safeArea = { x: left + SAFE.x * scale, y: top + SAFE.y * scale, width: SAFE.width * scale, height: SAFE.height * scale };
      coveredByMaster = left <= .5 && top <= .5 && left + size >= width - .5 && top + size >= height - .5;
      geometry = { viewport: { width, height }, scale, master: { x: left, y: top, width: size, height: size }, safeArea, intrinsicSafeArea: { ...SAFE }, coveredByMaster };
      style('position', 'absolute'); style('right', 'auto'); style('bottom', 'auto'); style('width', `${size}px`); style('height', `${size}px`);
      style('left', `${left}px`); style('top', `${top}px`); style('maxWidth', 'none'); style('maxHeight', 'none');
      style('objectFit', 'contain'); style('background', 'transparent'); style('maskImage', 'none');
      if (coveredByMaster) {
        removeFallback();
      } else {
        ensureFallback();
        if (canvas) {
          rasterScale = Math.min(root.devicePixelRatio || 1, 1.5, 512 / width, 512 / height);
          canvas.width = Math.max(1, Math.round(width * rasterScale)); canvas.height = Math.max(1, Math.round(height * rasterScale));
          draw(true); schedule();
        }
      }
    }

    function wake() { draw(true); schedule(); }
    function pause() { stopFrames(); draw(true); }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (surface) observer?.observe(surface);
    root.addEventListener('resize', resize);
    video.addEventListener('loadedmetadata', resize); video.addEventListener('loadeddata', resize);
    video.addEventListener('playing', wake); video.addEventListener('seeked', wake);
    video.addEventListener('pause', pause); video.addEventListener('ended', pause);
    const api = {
      refresh: resize,
      diagnostics: () => ({ disposed, drawn, failures, coveredByMaster, fallbackActive: !!canvas, fallbackFailed,
        geometry, fallbackRaster: canvas ? { width: canvas.width, height: canvas.height, dpr: rasterScale } : null,
        source: { width: video.videoWidth || 0, height: video.videoHeight || 0 },
      }),
      dispose() {
        if (disposed) return;
        disposed = true; removeFallback(); observer?.disconnect(); root.removeEventListener('resize', resize);
        video.removeEventListener('loadedmetadata', resize); video.removeEventListener('loadeddata', resize);
        video.removeEventListener('playing', wake); video.removeEventListener('seeked', wake);
        video.removeEventListener('pause', pause); video.removeEventListener('ended', pause);
        for (const key of properties) if (video.style[key] === applied[key]) video.style[key] = before[key];
        if (surfaceBefore) for (const key of Object.keys(surfaceApplied)) if (surface.style[key] === surfaceApplied[key]) surface.style[key] = surfaceBefore[key];
        mounts.delete(video);
      },
    };
    mounts.set(video, api); resize(); return api;
  }
  root.DSHAwakeningStage = { mount };
})(window);

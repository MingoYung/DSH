/* One decoded video, one protected composition, an extended edge-colour field.
   This layer never changes video time, audio, playback or the image's aspect.
   It is decoration: a failed canvas simply leaves the complete native video. */
(function (root) {
  'use strict';
  const mounts = new WeakMap();
  const BASE = '#000207';
  function mount({ video, container = video?.parentElement } = {}) {
    if (!video || !container) throw new TypeError('A video and its stage container are required.');
    if (mounts.has(video)) return mounts.get(video);
    const canvas = document.createElement('canvas');
    canvas.dataset.dshAwakeningBackdrop = '';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:#000207;';
    const context = canvas.getContext('2d', { alpha: false });
    const sample = document.createElement('canvas');
    sample.width = 160; sample.height = 90;
    const sampleContext = sample.getContext('2d', { alpha: false });
    const changedProperties = ['background', 'objectFit', 'inset', 'width', 'height', 'left', 'top', 'maskImage'];
    const before = Object.fromEntries(changedProperties.map(key => [key, video.style[key]]));
    const applied = {};
    function style(key, value) { video.style[key] = value; applied[key] = video.style[key]; }
    style('background', 'transparent');
    style('objectFit', 'contain');
    video.parentNode.insertBefore(canvas, video);
    let disposed = false, videoCallback = 0, animationCallback = 0;
    let drawn = 0, failures = 0, lastDraw = -Infinity, geometry = null;
    let width = 1, height = 1, rasterScale = 1;

    function resize() {
      if (disposed) return;
      const surface = typeof container.getBoundingClientRect === 'function' ? container : container.host;
      const rect = surface?.getBoundingClientRect();
      width = Math.max(1, rect?.width || root.innerWidth || 1);
      height = Math.max(1, rect?.height || root.innerHeight || 1);
      // The backdrop is deliberately a soft colour field. Limit its raster
      // cost even on 4K displays; the foreground retains native video quality.
      rasterScale = Math.min(root.devicePixelRatio || 1, 1.5, 1024 / width, 1024 / height);
      const nextWidth = Math.max(1, Math.round(width * rasterScale));
      const nextHeight = Math.max(1, Math.round(height * rasterScale));
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      draw(true);
    }

    function field(sx, sy, sw, sh, dx, dy, dw, dh) {
      if (dw <= 0 || dh <= 0) return;
      context.drawImage(sample, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    function shade(x0, y0, x1, y1, x, y, w, h) {
      const gradient = context.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, BASE);
      gradient.addColorStop(1, '#00020700');
      context.fillStyle = gradient;
      context.fillRect(x, y, w, h);
    }

    function draw(force = false) {
      if (disposed || !context || !sampleContext) return;
      const now = performance.now();
      if (!force && now - lastDraw < 1000 / 24 - 1) return;
      lastDraw = now;
      const w = canvas.width, h = canvas.height;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1; context.filter = 'none';
      context.fillStyle = BASE; context.fillRect(0, 0, w, h);
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      const fit = Math.min(width / video.videoWidth, height / video.videoHeight);
      const vw = video.videoWidth * fit * rasterScale;
      const vh = video.videoHeight * fit * rasterScale;
      const left = Math.max(0, (w - vw) / 2), top = Math.max(0, (h - vh) / 2);
      geometry = { viewport: { width, height }, foreground: {
        x: (width - video.videoWidth * fit) / 2,
        y: (height - video.videoHeight * fit) / 2,
        width: video.videoWidth * fit, height: video.videoHeight * fit,
      }, raster: { width: w, height: h, dpr: rasterScale } };
      // Keep the complete source rectangle, with a very small optical feather
      // only where it meets a newly extended field. This removes the visible
      // rectangular seam without enlarging or cropping the protected image.
      style('inset', 'auto');
      style('width', `${video.videoWidth * fit}px`);
      style('height', `${video.videoHeight * fit}px`);
      style('left', `${(width - video.videoWidth * fit) / 2}px`);
      style('top', `${(height - video.videoHeight * fit) / 2}px`);
      const feather = Math.min(18, width * .025, height * .025);
      style('maskImage', left > .5
        ? `linear-gradient(to right,transparent,#000 ${feather}px,#000 calc(100% - ${feather}px),transparent)`
        : top > .5
          ? `linear-gradient(to bottom,transparent,#000 ${feather}px,#000 calc(100% - ${feather}px),transparent)`
          : 'none');
      // The native video itself remains a full, uncropped 16:9 composition.
      // Only its outermost two sampled columns/rows extend into extra space.
      // A small low-pass removes literal face/garment contours from the field.
      try {
        sampleContext.drawImage(video, 0, 0, 160, 90);
        const blur = Math.max(4, Math.min(width, height) * .065 * rasterScale), overlap = blur * 3;
        context.filter = `blur(${blur}px)`;
        context.globalAlpha = .42;
        if (left > .5) {
          field(0, 0, 2, 90, -overlap, top - overlap, left + overlap * 2, vh + overlap * 2);
          field(158, 0, 2, 90, w - left - overlap, top - overlap, left + overlap * 2, vh + overlap * 2);
        }
        if (top > .5) {
          field(0, 0, 160, 2, -overlap, -overlap, w + overlap * 2, top + overlap * 2);
          field(0, 88, 160, 2, -overlap, h - top - overlap, w + overlap * 2, top + overlap * 2);
        }
        context.filter = 'none'; context.globalAlpha = 1;
        // Continue the current edge, then let it settle into the same dark
        // atmosphere. No mirrored frame, duplicate character or second clock.
        if (left > .5) {
          shade(0, 0, left, 0, 0, 0, left, h);
          shade(w, 0, w - left, 0, w - left, 0, left, h);
        }
        if (top > .5) {
          shade(0, 0, 0, top, 0, 0, w, top);
          shade(0, h, 0, h - top, 0, h - top, w, top);
        }
        drawn++;
      } catch (_) {
        failures++;
        context.filter = 'none';
        context.fillStyle = BASE; context.fillRect(0, 0, w, h);
      }
    }

    function tick() {
      if (disposed) return;
      draw();
      if (typeof video.requestVideoFrameCallback === 'function') videoCallback = video.requestVideoFrameCallback(tick);
      else if (!video.paused && !video.ended) animationCallback = root.requestAnimationFrame(tick);
    }

    function wake() {
      if (disposed) return;
      draw(true);
      if (typeof video.requestVideoFrameCallback !== 'function' && !animationCallback) animationCallback = root.requestAnimationFrame(function frame() {
        animationCallback = 0;
        if (disposed || video.paused || video.ended) return;
        draw(); animationCallback = root.requestAnimationFrame(frame);
      });
    }

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    const surface = typeof container.getBoundingClientRect === 'function' ? container : container.host;
    if (surface) resizeObserver?.observe(surface);
    root.addEventListener('resize', resize);
    for (const event of ['loadeddata', 'seeked', 'playing']) video.addEventListener(event, wake);
    const api = {
      refresh: resize,
      diagnostics: () => ({ disposed, drawn, failures, geometry }),
      dispose() {
        if (disposed) return;
        disposed = true;
        if (videoCallback && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(videoCallback);
        if (animationCallback) root.cancelAnimationFrame(animationCallback);
        resizeObserver?.disconnect(); root.removeEventListener('resize', resize);
        for (const event of ['loadeddata', 'seeked', 'playing']) video.removeEventListener(event, wake);
        // Do not erase later intentional changes from the owning controller.
        for (const key of changedProperties) if (video.style[key] === applied[key]) video.style[key] = before[key];
        canvas.remove(); mounts.delete(video);
      },
    };
    mounts.set(video, api);
    resize();
    if (typeof video.requestVideoFrameCallback === 'function') videoCallback = video.requestVideoFrameCallback(tick);
    return api;
  }
  root.DSHAwakeningStage = { mount };
})(window);

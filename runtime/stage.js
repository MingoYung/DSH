/* The viewport is the output canvas. The approved master remains the single
   media clock and audio source; resizing changes geometry, never playback.
   If Canvas is unavailable, the native video takes over in full-cover mode. */
(function (root) {
  'use strict';
  const mounts = new WeakMap();
  const FRAME_INTERVAL = 1000 / 30;
  const MAX_DPR = 1.5;
  const MAX_RASTER = 2560;
  let nextCompositionId = 0;

  function mount({ video, container = video?.parentElement, presentation = null } = {}) {
    if (!video || !container || !video.parentNode) throw new TypeError('A mounted video and its stage container are required.');
    if (mounts.has(video)) return mounts.get(video);
    const surface = typeof container.getBoundingClientRect === 'function' ? container : container.host;
    const properties = ['position', 'width', 'height', 'left', 'top', 'right', 'bottom', 'maxWidth', 'maxHeight', 'objectFit', 'background', 'opacity', 'zIndex', 'pointerEvents'];
    const before = Object.fromEntries(properties.map(key => [key, video.style[key]]));
    const applied = {};
    const surfaceBefore = surface?.style?.position;
    let surfaceApplied = null;
    if (surface?.style && root.getComputedStyle(surface).position === 'static') {
      surface.style.position = 'relative';
      surfaceApplied = surface.style.position;
    }
    function style(key, value) { video.style[key] = value; applied[key] = video.style[key]; }
    style('position', 'absolute'); style('left', '0px'); style('top', '0px');
    style('right', '0px'); style('bottom', '0px'); style('width', '100%'); style('height', '100%');
    style('maxWidth', 'none'); style('maxHeight', 'none'); style('objectFit', presentation ? 'contain' : 'cover');
    style('background', presentation?.keyframes?.[0]?.background || '#000207'); style('zIndex', '1'); style('pointerEvents', 'none');

    let disposed = false, canvas = null, composition = null, frame = 0;
    let drawn = 0, failures = 0, compositionBuilds = 0, lastPaint = -Infinity;
    let pending = true, geometry = null, lastLayout = null, lastTime = 0;
    let fallbackActive = false, fallbackReason = null;
    const compositionId = `responsive-${++nextCompositionId}`;

    function stopFrame() {
      if (frame) root.cancelAnimationFrame(frame);
      frame = 0;
    }

    function fallback(error) {
      if (fallbackActive || disposed) return;
      failures++;
      fallbackActive = true;
      fallbackReason = error instanceof Error ? error.message : String(error);
      pending = false;
      stopFrame();
      canvas?.remove(); canvas = null; composition = null;
      style('opacity', '1');
      console.warn('[dsh-awakening] Adaptive Canvas unavailable; using native video.', error);
    }

    function measure() {
      const rect = surface?.getBoundingClientRect();
      // The early overlay is deliberately constructed before it is attached.
      // Its first real ResizeObserver notification replaces this initial size.
      const width = Math.max(1, rect?.width || root.innerWidth || 1);
      const height = Math.max(1, rect?.height || root.innerHeight || 1);
      const dpr = Math.max(.01, Math.min(Number(root.devicePixelRatio) || 1, MAX_DPR, MAX_RASTER / width, MAX_RASTER / height));
      geometry = {
        viewport: { width, height },
        raster: { width: Math.max(1, Math.round(width * dpr)), height: Math.max(1, Math.round(height * dpr)), dpr },
      };
    }

    function schedule() {
      if (disposed || fallbackActive || frame || document.hidden || !canvas || !composition) return;
      if (!pending && (video.paused || video.ended)) return;
      frame = root.requestAnimationFrame(paint);
    }

    function paint(now) {
      frame = 0;
      if (disposed || fallbackActive || document.hidden || !canvas || !composition) return;
      if (now - lastPaint >= FRAME_INTERVAL - .1) {
        try {
          const time = Number(video.currentTime);
          lastTime = Number.isFinite(time) ? Math.max(0, Math.min(22, time)) : 0;
          const raster = geometry.raster;
          // render() is synchronous and reads currentTime. renderAt() is an
          // offline seeking helper and is never used by the live stage.
          const rendered = composition.render(lastTime, raster.width, raster.height);
          lastLayout = composition.lastLayout;
          lastPaint = now;
          drawn++;
          pending = rendered === false;
          if (rendered !== false) style('opacity', '0');
        } catch (error) {
          fallback(error);
          return;
        }
      }
      schedule();
    }

    function refresh() {
      if (disposed) return;
      measure();
      pending = true;
      schedule();
    }
    function wake() { if (!disposed) { pending = true; schedule(); } }
    function visibility() {
      if (document.hidden) stopFrame();
      else refresh();
    }

    try {
      canvas = document.createElement('canvas');
      canvas.dataset.dshAwakeningStage = 'responsive';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;background:#000207;';
      if (!canvas.getContext('2d', { alpha: false })) throw new Error('The adaptive Canvas 2D context is unavailable.');
      canvas.style.background = presentation?.keyframes?.[0]?.background || '#000207';
      const Composition = presentation ? root.DSHSafeVideo?.SafeVideoComposition : root.DSHPortraitTrackStudy?.PortraitTrackStudy;
      if (typeof Composition !== 'function') throw new Error('The adaptive scene modules are unavailable.');
      composition = new Composition(canvas, video, presentation);
      composition.focusStart = 500;
      if (!composition.renderer?.ctx) throw new Error('The source composition Canvas 2D context is unavailable.');
      compositionBuilds++;
      video.parentNode.insertBefore(canvas, video.nextSibling);
    } catch (error) {
      fallback(error);
    }

    const observer = typeof root.ResizeObserver === 'function' ? new root.ResizeObserver(refresh) : null;
    if (surface) observer?.observe(surface);
    root.addEventListener('resize', refresh);
    document.addEventListener('visibilitychange', visibility);
    const videoEvents = ['loadedmetadata', 'loadeddata', 'playing', 'play', 'pause', 'seeked', 'ended'];
    for (const event of videoEvents) video.addEventListener(event, wake);
    const api = {
      refresh,
      diagnostics: () => ({
        disposed, drawn, failures, compositionBuilds, compositionId, presentationMode: presentation?.mode || 'legacy-scene',
        fallbackActive, fallbackFailed: fallbackActive, fallbackReason,
        hidden: document.hidden, framePending: !!frame, pending,
        lastTime, lastLayout, geometry,
        viewport: geometry?.viewport ?? null, raster: geometry?.raster ?? null,
        source: { width: video.videoWidth || 0, height: video.videoHeight || 0 },
      }),
      dispose() {
        if (disposed) return;
        disposed = true;
        stopFrame(); observer?.disconnect();
        root.removeEventListener('resize', refresh);
        document.removeEventListener('visibilitychange', visibility);
        for (const event of videoEvents) video.removeEventListener(event, wake);
        canvas?.remove(); canvas = null; composition = null;
        for (const key of properties) if (video.style[key] === applied[key]) video.style[key] = before[key];
        if (surfaceApplied !== null && surface.style.position === surfaceApplied) surface.style.position = surfaceBefore;
        mounts.delete(video);
      },
    };
    mounts.set(video, api);
    refresh();
    return api;
  }
  root.DSHAwakeningStage = { mount };
})(window);

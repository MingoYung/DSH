/* Bundled safe-camera movies stay on native video CSS with decoded-frame
   callbacks. The older procedural scene retains its bounded Canvas path. */
(function (root) {
  'use strict';
  const mounts = new WeakMap();
  const FRAME_INTERVAL = 1000 / 30;
  const MAX_DPR = 1.5;
  const MAX_RASTER = 2560;
  let nextCompositionId = 0;

  function mountNative({ video, container, presentation }) {
    const surface = typeof container.getBoundingClientRect === 'function' ? container : container.host;
    const camera = new root.DSHSafeVideo.SafeVideoCamera(presentation);
    const sampler = new root.DSHSafeVideo.SourceBorderSampler(camera.presentation.sampleBackground);
    const properties = ['position', 'width', 'height', 'left', 'top', 'right', 'bottom', 'maxWidth', 'maxHeight', 'objectFit', 'background', 'opacity', 'zIndex', 'pointerEvents', 'transform', 'transformOrigin'];
    const before = Object.fromEntries(properties.map(key => [key, video.style[key]])), applied = {};
    const surfaceProperties = ['position', 'overflow', 'backgroundColor'];
    const surfaceBefore = Object.fromEntries(surfaceProperties.map(key => [key, surface?.style?.[key]])), surfaceApplied = {};
    let disposed = false, geometry = null, lastLayout = null, lastTime = 0, decodedTime = null;
    let callback = 0, callbackKind = null, colorTask = 0, colorTaskKind = null, lastColorQueue = -Infinity;
    let drawn = 0, failures = 0, fallbackActive = false, fallbackReason = null, callbacks = 0, skippedCallbacks = 0, styleWrites = 0;
    let lastFrameKey = null, lastPresentedFrames = null;
    const compositionId = `native-${++nextCompositionId}`;
    const useVideoFrames = typeof video.requestVideoFrameCallback === 'function';
    const style = (key, value) => { if (video.style[key] !== value) { video.style[key] = value; styleWrites++; } applied[key] = video.style[key]; };
    const surfaceStyle = (key, value) => { if (!surface?.style) return; if (surface.style[key] !== value) surface.style[key] = value; surfaceApplied[key] = surface.style[key]; };
    if (surface?.style && root.getComputedStyle(surface).position === 'static') surfaceStyle('position', 'relative');
    surfaceStyle('overflow', 'hidden'); surfaceStyle('backgroundColor', camera.presentation.keyframes[0].background);
    style('position', 'absolute'); style('left', '0px'); style('top', '0px'); style('right', 'auto'); style('bottom', 'auto');
    style('width', '1280px'); style('height', '720px'); style('maxWidth', 'none'); style('maxHeight', 'none');
    style('objectFit', 'contain'); style('background', 'transparent'); style('opacity', '1'); style('zIndex', '1'); style('pointerEvents', 'none'); style('transformOrigin', '0 0');
    function cancelFrame() {
      if (callback) { if (callbackKind === 'video') video.cancelVideoFrameCallback?.(callback); else root.cancelAnimationFrame(callback); }
      callback = 0; callbackKind = null;
    }
    function cancelColor() {
      if (colorTask) { if (colorTaskKind === 'idle') root.cancelIdleCallback?.(colorTask); else root.clearTimeout(colorTask); }
      colorTask = 0; colorTaskKind = null;
    }
    function queueColor(layout) {
      if (disposed || document.hidden || colorTask || !sampler.enabled || !sampler.needsPadding(layout) || video.readyState < 2) return;
      const now = performance.now(); if (now - sampler.lastSample < 250 || now - lastColorQueue < 250) return;
      lastColorQueue = now;
      const run = () => { colorTask = 0; colorTaskKind = null; if (disposed || document.hidden) return; const color = sampler.sample(video, lastLayout || layout, performance.now()); if (color) surfaceStyle('backgroundColor', color); };
      if (typeof root.requestIdleCallback === 'function') { colorTaskKind = 'idle'; colorTask = root.requestIdleCallback(run, { timeout: 300 }); }
      else { colorTaskKind = 'timer'; colorTask = root.setTimeout(run, 0); }
    }
    function measure() {
      const rect = surface?.getBoundingClientRect();
      geometry = { viewport: { width: Math.max(1, rect?.width || root.innerWidth || 1), height: Math.max(1, rect?.height || root.innerHeight || 1) }, raster: null };
    }
    function fallback(error) {
      failures++; fallbackActive = true; fallbackReason = error instanceof Error ? error.message : String(error); cancelFrame(); cancelColor();
      style('transform', 'none'); style('width', '100%'); style('height', '100%'); style('objectFit', 'contain');
      console.warn('[dsh-awakening] Native framing unavailable; showing the complete native video.', error);
    }
    function paint(time) {
      if (disposed || document.hidden || fallbackActive) return;
      try {
        if (video.readyState >= 1 && (video.videoWidth !== 1280 || video.videoHeight !== 720)) throw Error('The bundled movie dimensions do not match its framing data.');
        lastTime = Math.max(0, Math.min(22, Number(time) || 0));
        const { width, height } = geometry.viewport; lastLayout = camera.layout(width, height, lastTime);
        style('transform', `matrix(${lastLayout.scale},0,0,${lastLayout.scale},${lastLayout.x},${lastLayout.y})`);
        drawn++; queueColor(lastLayout);
      } catch (error) { fallback(error); }
    }
    function schedule() {
      if (disposed || fallbackActive || callback || document.hidden || video.paused || video.ended) return;
      if (useVideoFrames) { callbackKind = 'video'; callback = video.requestVideoFrameCallback(onVideoFrame); }
      else { callbackKind = 'raf'; callback = root.requestAnimationFrame(onAnimationFrame); }
    }
    function onVideoFrame(now, metadata) {
      callback = 0; callbackKind = null; if (disposed || document.hidden || video.paused || video.ended) return;
      callbacks++; const time = Number.isFinite(metadata.mediaTime) ? metadata.mediaTime : video.currentTime;
      if (time !== decodedTime || metadata.presentedFrames !== lastPresentedFrames) { decodedTime = time; lastPresentedFrames = metadata.presentedFrames; paint(time); }
      else skippedCallbacks++;
      schedule();
    }
    function onAnimationFrame() {
      callback = 0; callbackKind = null; if (disposed || document.hidden || video.paused || video.ended) return;
      callbacks++; const quality = video.getVideoPlaybackQuality?.(), key = quality?.totalVideoFrames ?? Math.floor(video.currentTime * 30);
      if (key !== lastFrameKey) { lastFrameKey = key; paint(video.currentTime); } else skippedCallbacks++;
      schedule();
    }
    function refresh() { if (disposed) return; measure(); paint(video.currentTime); schedule(); }
    function wake() { if (disposed) return; if (video.paused || video.ended) cancelFrame(); paint(video.currentTime); schedule(); }
    function visibility() { if (document.hidden) { cancelFrame(); cancelColor(); } else refresh(); }
    const observer = typeof root.ResizeObserver === 'function' ? new root.ResizeObserver(refresh) : null;
    if (surface) observer?.observe(surface); root.addEventListener('resize', refresh); document.addEventListener('visibilitychange', visibility);
    const events = ['loadedmetadata', 'loadeddata', 'playing', 'play', 'pause', 'seeked', 'ended'];
    for (const event of events) video.addEventListener(event, wake);
    const api = { refresh, diagnostics: () => ({ disposed, drawn, failures, compositionBuilds: 1, compositionId, presentationMode: 'safe-camera', backend: 'native-video', fullViewportCanvas: false,
      fallbackActive, fallbackFailed: fallbackActive, fallbackReason, hidden: document.hidden, framePending: !!callback, pending: false, lastTime, decodedTime, lastLayout, geometry,
      viewport: geometry?.viewport ?? null, raster: null, source: { width: video.videoWidth || 0, height: video.videoHeight || 0 },
      synchronization: useVideoFrames ? 'requestVideoFrameCallback' : 'requestAnimationFrame-decoded-counter', frameCallbacks: callbacks, skippedCallbacks, styleWrites, presentedFrames: lastPresentedFrames,
      background: sampler.diagnostics(), colorTaskPending: !!colorTask, playbackQuality: video.getVideoPlaybackQuality ? { totalVideoFrames: video.getVideoPlaybackQuality().totalVideoFrames, droppedVideoFrames: video.getVideoPlaybackQuality().droppedVideoFrames } : null }),
      dispose() { if (disposed) return; disposed = true; cancelFrame(); cancelColor(); observer?.disconnect(); root.removeEventListener('resize', refresh); document.removeEventListener('visibilitychange', visibility);
        for (const event of events) video.removeEventListener(event, wake); sampler.dispose();
        for (const key of properties) if (video.style[key] === applied[key]) video.style[key] = before[key];
        for (const key of surfaceProperties) if (surface?.style?.[key] === surfaceApplied[key]) surface.style[key] = surfaceBefore[key]; mounts.delete(video);
      } };
    mounts.set(video, api); refresh(); return api;
  }

  function mount({ video, container = video?.parentElement, presentation = null } = {}) {
    if (!video || !container || !video.parentNode) throw new TypeError('A mounted video and its stage container are required.');
    if (mounts.has(video)) return mounts.get(video);
    if (presentation) return mountNative({ video, container, presentation });
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

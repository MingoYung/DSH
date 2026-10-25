window.__ModuleLoader__.load({id:"dsh-awakening",factory:function(require){
var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/entry.jsx
var entry_exports = {};
__export(entry_exports, {
  apply: () => apply2,
  default: () => entry_default,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(entry_exports);

// runtime/stage.js
(function(root) {
  "use strict";
  const mounts = /* @__PURE__ */ new WeakMap();
  const BASE = "#000207";
  function mount({ video, container = video?.parentElement } = {}) {
    if (!video || !container) throw new TypeError("A video and its stage container are required.");
    if (mounts.has(video)) return mounts.get(video);
    const canvas = document.createElement("canvas");
    canvas.dataset.dshAwakeningBackdrop = "";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:#000207;";
    const context = canvas.getContext("2d", { alpha: false });
    const sample = document.createElement("canvas");
    sample.width = 160;
    sample.height = 90;
    const sampleContext = sample.getContext("2d", { alpha: false });
    const changedProperties = ["background", "objectFit", "inset", "width", "height", "left", "top", "maskImage"];
    const before = Object.fromEntries(changedProperties.map((key) => [key, video.style[key]]));
    const applied = {};
    function style(key, value) {
      video.style[key] = value;
      applied[key] = video.style[key];
    }
    style("background", "transparent");
    style("objectFit", "contain");
    video.parentNode.insertBefore(canvas, video);
    let disposed = false, videoCallback = 0, animationCallback = 0;
    let drawn = 0, failures = 0, lastDraw = -Infinity, geometry = null;
    let width = 1, height = 1, rasterScale = 1;
    function resize() {
      if (disposed) return;
      const surface2 = typeof container.getBoundingClientRect === "function" ? container : container.host;
      const rect = surface2?.getBoundingClientRect();
      width = Math.max(1, rect?.width || root.innerWidth || 1);
      height = Math.max(1, rect?.height || root.innerHeight || 1);
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
      gradient.addColorStop(1, "#00020700");
      context.fillStyle = gradient;
      context.fillRect(x, y, w, h);
    }
    function draw(force = false) {
      if (disposed || !context || !sampleContext) return;
      const now = performance.now();
      if (!force && now - lastDraw < 1e3 / 24 - 1) return;
      lastDraw = now;
      const w = canvas.width, h = canvas.height;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.filter = "none";
      context.fillStyle = BASE;
      context.fillRect(0, 0, w, h);
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      const fit = Math.min(width / video.videoWidth, height / video.videoHeight);
      const vw = video.videoWidth * fit * rasterScale;
      const vh = video.videoHeight * fit * rasterScale;
      const left = Math.max(0, (w - vw) / 2), top = Math.max(0, (h - vh) / 2);
      geometry = { viewport: { width, height }, foreground: {
        x: (width - video.videoWidth * fit) / 2,
        y: (height - video.videoHeight * fit) / 2,
        width: video.videoWidth * fit,
        height: video.videoHeight * fit
      }, raster: { width: w, height: h, dpr: rasterScale } };
      style("inset", "auto");
      style("width", `${video.videoWidth * fit}px`);
      style("height", `${video.videoHeight * fit}px`);
      style("left", `${(width - video.videoWidth * fit) / 2}px`);
      style("top", `${(height - video.videoHeight * fit) / 2}px`);
      const feather = Math.min(18, width * 0.025, height * 0.025);
      style("maskImage", left > 0.5 ? `linear-gradient(to right,transparent,#000 ${feather}px,#000 calc(100% - ${feather}px),transparent)` : top > 0.5 ? `linear-gradient(to bottom,transparent,#000 ${feather}px,#000 calc(100% - ${feather}px),transparent)` : "none");
      try {
        sampleContext.drawImage(video, 0, 0, 160, 90);
        const blur = Math.max(4, Math.min(width, height) * 0.065 * rasterScale), overlap = blur * 3;
        context.filter = `blur(${blur}px)`;
        context.globalAlpha = 0.42;
        if (left > 0.5) {
          field(0, 0, 2, 90, -overlap, top - overlap, left + overlap * 2, vh + overlap * 2);
          field(158, 0, 2, 90, w - left - overlap, top - overlap, left + overlap * 2, vh + overlap * 2);
        }
        if (top > 0.5) {
          field(0, 0, 160, 2, -overlap, -overlap, w + overlap * 2, top + overlap * 2);
          field(0, 88, 160, 2, -overlap, h - top - overlap, w + overlap * 2, top + overlap * 2);
        }
        context.filter = "none";
        context.globalAlpha = 1;
        if (left > 0.5) {
          shade(0, 0, left, 0, 0, 0, left, h);
          shade(w, 0, w - left, 0, w - left, 0, left, h);
        }
        if (top > 0.5) {
          shade(0, 0, 0, top, 0, 0, w, top);
          shade(0, h, 0, h - top, 0, h - top, w, top);
        }
        drawn++;
      } catch (_) {
        failures++;
        context.filter = "none";
        context.fillStyle = BASE;
        context.fillRect(0, 0, w, h);
      }
    }
    function tick() {
      if (disposed) return;
      draw();
      if (typeof video.requestVideoFrameCallback === "function") videoCallback = video.requestVideoFrameCallback(tick);
      else if (!video.paused && !video.ended) animationCallback = root.requestAnimationFrame(tick);
    }
    function wake() {
      if (disposed) return;
      draw(true);
      if (typeof video.requestVideoFrameCallback !== "function" && !animationCallback) animationCallback = root.requestAnimationFrame(function frame() {
        animationCallback = 0;
        if (disposed || video.paused || video.ended) return;
        draw();
        animationCallback = root.requestAnimationFrame(frame);
      });
    }
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    const surface = typeof container.getBoundingClientRect === "function" ? container : container.host;
    if (surface) resizeObserver?.observe(surface);
    root.addEventListener("resize", resize);
    for (const event of ["loadeddata", "seeked", "playing"]) video.addEventListener(event, wake);
    const api = {
      refresh: resize,
      diagnostics: () => ({ disposed, drawn, failures, geometry }),
      dispose() {
        if (disposed) return;
        disposed = true;
        if (videoCallback && typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(videoCallback);
        if (animationCallback) root.cancelAnimationFrame(animationCallback);
        resizeObserver?.disconnect();
        root.removeEventListener("resize", resize);
        for (const event of ["loadeddata", "seeked", "playing"]) video.removeEventListener(event, wake);
        for (const key of changedProperties) if (video.style[key] === applied[key]) video.style[key] = before[key];
        canvas.remove();
        mounts.delete(video);
      }
    };
    mounts.set(video, api);
    resize();
    if (typeof video.requestVideoFrameCallback === "function") videoCallback = video.requestVideoFrameCallback(tick);
    return api;
  }
  root.DSHAwakeningStage = { mount };
})(window);

// runtime/bootstrap.js
(function(root) {
  "use strict";
  const DEFAULTS2 = { enabled: true, sound: true, volume: 85, frequency: "startup", timeoutSeconds: 45 };
  const SESSION_KEY = "dsh-awakening:startup:v1", DAY_KEY = "dsh-awakening:day:v1";
  function normalise(value = {}) {
    return { enabled: typeof value.enabled === "boolean" ? value.enabled : true, sound: typeof value.sound === "boolean" ? value.sound : true, volume: Math.max(0, Math.min(100, Number(value.volume ?? 85))), frequency: value.frequency === "daily" ? "daily" : "startup", timeoutSeconds: Math.max(25, Math.min(60, Number(value.timeoutSeconds ?? 45))) };
  }
  function localDay() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function read(store, key) {
    try {
      return store.getItem(key);
    } catch {
      return null;
    }
  }
  function write(store, key, value) {
    try {
      store.setItem(key, value);
    } catch {
    }
  }
  root.__DSH_AWAKENING_INSTALL__ = function install(options = {}) {
    if (root.__DSH_AWAKENING_PLUGIN__) {
      if (options.settings) root.__DSH_AWAKENING_PLUGIN__.configure(options.settings);
      return root.__DSH_AWAKENING_PLUGIN__;
    }
    let settings = normalise(options.settings ?? DEFAULTS2), active = null, disposed = false;
    const source = options.sourceUrl || "/dsh-awakening/media/boot.mp4?v=0.2.0";
    const api = { version: "0.2.0", lastResult: null, configure, preview: (settings2) => play(normalise(settings2 || currentSettings()), true), dismiss: () => active?.finish("skip"), dispose, diagnostics: () => active?.diagnostics() ?? { active: false, lastResult: api.lastResult } };
    function currentSettings() {
      return settings;
    }
    function configure(next) {
      settings = normalise(next);
      if (active) {
        active.video.volume = settings.volume / 100;
        active.video.muted = !settings.sound;
      }
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      active?.finish("dispose", true);
      if (root.__DSH_AWAKENING_PLUGIN__ === api) delete root.__DSH_AWAKENING_PLUGIN__;
    }
    function eligible() {
      if (!settings.enabled) return false;
      if (read(root.sessionStorage, SESSION_KEY)) return false;
      if (settings.frequency === "daily" && read(root.localStorage, DAY_KEY) === localDay()) return false;
      return true;
    }
    function markPlayed() {
      write(root.sessionStorage, SESSION_KEY, "played");
      write(root.localStorage, DAY_KEY, localDay());
    }
    function play(config, manual) {
      if (disposed) return Promise.resolve({ reason: "disposed" });
      if (active) return active.done;
      if (!manual && !eligible()) return Promise.resolve({ reason: "frequency" });
      let settle;
      const done = new Promise((resolve) => settle = resolve);
      const overlay = document.createElement("div");
      overlay.id = "dsh-awakening-overlay";
      overlay.dataset.dshAwakening = "";
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#000207;isolation:isolate;opacity:1;transition:opacity .32s ease;";
      const shadow = overlay.attachShadow({ mode: "open" });
      shadow.innerHTML = '<style>:host{color-scheme:dark}*{box-sizing:border-box}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;z-index:1;transition:opacity .15s ease}button{position:relative;z-index:3;font:13px system-ui,"Microsoft YaHei UI",sans-serif;color:#d1dff4;background:#102039a0;border:1px solid #7998c144;border-radius:30px;padding:10px 17px;cursor:pointer}button:focus-visible{outline:2px solid #c4dcff;outline-offset:4px}.skip{position:absolute;right:28px;top:48px}.prompt{position:absolute;inset:0;z-index:4;display:none;place-items:center}.prompt.visible{display:grid}.status{position:absolute;z-index:3;left:20px;right:20px;bottom:48px;text-align:center;color:#93accb;font:13px system-ui,"Microsoft YaHei UI",sans-serif;min-height:20px;pointer-events:none}@media(prefers-reduced-motion:reduce){video{transition:none}}</style><video playsinline preload="auto"></video><button type="button" class="skip">\u8DF3\u8FC7 \xB7 Esc</button><div class="prompt"><button type="button" class="resume">\u70B9\u51FB\u542F\u7528\u58F0\u97F3\u5E76\u64AD\u653E</button></div><div class="status" role="status" aria-live="polite"></div>';
      const video = shadow.querySelector("video"), skip = shadow.querySelector(".skip"), prompt = shadow.querySelector(".prompt"), resume = shadow.querySelector(".resume"), status = shadow.querySelector(".status");
      video.src = source;
      if (options.posterUrl) video.poster = options.posterUrl;
      video.volume = config.volume / 100;
      video.muted = !config.sound;
      let stage = null;
      try {
        stage = root.DSHAwakeningStage?.mount({ video, container: shadow }) ?? null;
      } catch (error) {
        console.warn("[dsh-awakening] Background extension unavailable", error);
      }
      let closing = false, removed = false, finished = false, seenBoot = false, ready = manual, started = false, allowMarked = false, mediaBlocked = false, painted = false, firstTimer, secondTimer;
      const beforeFocus = document.activeElement, createdAt = performance.now();
      const record = { active: true, manual, video, done, finish, diagnostics: () => ({ active: true, manual, currentTime: video.currentTime, duration: video.duration || 22, muted: video.muted, volume: video.volume, paused: video.paused, mediaBlocked, ready, seenBoot, finished, started, stage: stage?.diagnostics?.() ?? null, elapsedSeconds: (performance.now() - createdAt) / 1e3 }) };
      active = record;
      function remove(reason) {
        if (removed) return;
        removed = true;
        clearTimeout(watchdog);
        clearTimeout(firstTimer);
        clearTimeout(secondTimer);
        observer.disconnect();
        document.removeEventListener("keydown", escape, true);
        stage?.dispose();
        stage = null;
        video.removeEventListener("ended", ended);
        video.removeEventListener("error", mediaError);
        video.removeEventListener("playing", playing);
        video.pause();
        video.removeAttribute("src");
        video.load();
        overlay.remove();
        if (active === record) active = null;
        api.lastResult = { reason, manual };
        if (beforeFocus?.isConnected && typeof beforeFocus.focus === "function") beforeFocus.focus({ preventScroll: true });
        settle({ reason, manual });
      }
      function finish(reason = "complete", immediate = false) {
        if (removed) return;
        if (immediate) {
          closing = true;
          video.pause();
          remove(reason);
          return;
        }
        if (closing) return;
        closing = true;
        video.pause();
        prompt.classList.remove("visible");
        skip.style.opacity = "0";
        status.textContent = "";
        video.style.opacity = "0";
        firstTimer = setTimeout(() => {
          overlay.style.opacity = "0";
          secondTimer = setTimeout(() => remove(reason), 340);
        }, 160);
      }
      function playing() {
        if (closing) return;
        started = true;
        mediaBlocked = false;
        prompt.classList.remove("visible");
        status.textContent = "";
        if (!manual && !allowMarked) {
          allowMarked = true;
          markPlayed();
        }
      }
      function ended() {
        finished = true;
        checkReady();
        if (ready || manual) finish("complete");
        else status.textContent = "\u5DE5\u4F5C\u7A7A\u95F4\u4ECD\u5728\u52A0\u8F7D\uFF0C\u53EF\u6309 Esc \u8DF3\u8FC7";
      }
      function mediaError() {
        finish("media-error");
      }
      function escape(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish("skip");
        }
      }
      function checkReady() {
        if (manual || closing) return;
        const boot = document.querySelector("[data-dsh-boot]");
        if (boot) {
          seenBoot = true;
          if (!boot.querySelector("[data-dsh-boot-spinner]")) {
            finish("host-error");
            return;
          }
        } else if (seenBoot || document.readyState === "complete") {
          ready = true;
          if (finished) finish("complete");
        }
      }
      async function begin() {
        if (closing) return;
        try {
          await video.play();
          if (!closing) playing();
        } catch (error) {
          if (closing) return;
          if (error?.name === "NotAllowedError") {
            mediaBlocked = true;
            video.pause();
            prompt.classList.add("visible");
            status.textContent = config.sound ? "\u6D4F\u89C8\u5668\u9700\u8981\u4E00\u6B21\u70B9\u51FB\u624D\u80FD\u64AD\u653E\u58F0\u97F3" : "\u70B9\u51FB\u64AD\u653E\u542F\u52A8\u52A8\u753B";
            resume.textContent = config.sound ? "\u70B9\u51FB\u542F\u7528\u58F0\u97F3\u5E76\u64AD\u653E" : "\u70B9\u51FB\u64AD\u653E\u52A8\u753B";
            resume.focus({ preventScroll: true });
          } else finish("media-error");
        }
      }
      const observer = new MutationObserver(checkReady);
      const watchdog = setTimeout(() => finish("timeout"), config.timeoutSeconds * 1e3);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener("keydown", escape, true);
      video.addEventListener("ended", ended);
      video.addEventListener("error", mediaError);
      video.addEventListener("playing", playing);
      skip.onclick = () => finish("skip");
      resume.onclick = begin;
      document.documentElement.append(overlay);
      checkReady();
      begin();
      return done;
    }
    root.__DSH_AWAKENING_PLUGIN__ = api;
    if (options.autostart) play(settings, false);
    return api;
  };
})(window);

// src/client.jsx
var import_react = __toESM(require("react"), 1);
var ENTRY_ID = "dsh-awakening";
var DEFAULTS = Object.freeze({
  enabled: true,
  sound: true,
  volume: 85,
  frequency: "startup",
  timeoutSeconds: 45
});
var CSS = `
.dsh-awakening-settings{font-family:inherit;color:var(--dsw-alias-label-primary,inherit);width:100%;max-width:760px;line-height:1.6}
.dsh-awakening-settings *{box-sizing:border-box}
.dsh-awakening-settings h2{font-size:20px;font-weight:600;line-height:1.4;margin:0 0 5px;letter-spacing:.03em}
.dsh-awakening-settings p{margin:0}
.dsh-awakening-settings .awa-muted{color:var(--dsw-alias-label-secondary,#80858e);font-size:12px}
.dsh-awakening-settings .awa-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px;flex-wrap:wrap}
.dsh-awakening-settings .awa-heading{font-size:13px;font-weight:500;line-height:1.6}
.dsh-awakening-settings .awa-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px 0;border-top:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.18))}
.dsh-awakening-settings .awa-copy{flex:1;min-width:0}
.dsh-awakening-settings .awa-copy .awa-muted{margin-top:4px}
.dsh-awakening-settings button,.dsh-awakening-settings select,.dsh-awakening-settings input{font-family:inherit}
.dsh-awakening-settings button{font-size:12px;line-height:1.5;min-height:34px;padding:7px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));border-radius:8px;background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary,inherit);cursor:pointer;white-space:nowrap}
.dsh-awakening-settings button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dsh-awakening-settings .awa-primary{background:var(--dsw-alias-brand-primary,#4d6bfe);border-color:transparent;color:#fff}
.dsh-awakening-settings .awa-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary,#4d6bfe);filter:brightness(1.08)}
.dsh-awakening-settings button:disabled,.dsh-awakening-settings input:disabled,.dsh-awakening-settings select:disabled{cursor:default;opacity:.5}
.dsh-awakening-settings button:focus-visible,.dsh-awakening-settings input:focus-visible,.dsh-awakening-settings select:focus-visible,.dsh-awakening-settings summary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:3px}
.dsh-awakening-settings select,.dsh-awakening-settings input[type=number]{font-size:12px;line-height:1.5;min-height:34px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));border-radius:8px;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,inherit);padding:6px 10px}
.dsh-awakening-settings select{min-width:132px}
.dsh-awakening-settings input[type=number]{width:82px;font-variant-numeric:tabular-nums}
.dsh-awakening-settings .awa-switch{appearance:none;-webkit-appearance:none;width:34px;height:21px;position:relative;display:block;flex:0 0 auto;margin:0;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.3));border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));border-radius:20px;cursor:pointer}
.dsh-awakening-settings .awa-switch::before{content:'';position:absolute;width:15px;height:15px;top:2px;left:2px;background:#fff;border-radius:50%;box-shadow:0 1px 3px #0002;transition:transform .15s ease}
.dsh-awakening-settings .awa-switch:checked{background:var(--dsw-alias-brand-primary,#4d6bfe);border-color:transparent}
.dsh-awakening-settings .awa-switch:checked::before{transform:translateX(13px)}
.dsh-awakening-settings .awa-volume{display:flex;align-items:center;gap:12px;margin:0 0 18px 0;padding:2px 0 0 0}
.dsh-awakening-settings .awa-volume input{width:100%;max-width:320px;accent-color:var(--dsw-alias-brand-primary,#4d6bfe);height:4px;margin:0}
.dsh-awakening-settings .awa-volume label{font-size:12px;min-width:31px;color:var(--dsw-alias-label-secondary,#80858e)}
.dsh-awakening-settings .awa-volume output{font-size:12px;min-width:38px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#80858e)}
.dsh-awakening-settings details{border-top:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.18));margin-top:2px}
.dsh-awakening-settings summary{font-size:12px;color:var(--dsw-alias-label-secondary,#80858e);padding:15px 0;cursor:pointer;list-style-position:inside}
.dsh-awakening-settings details .awa-row{border-top:0;padding:4px 0 18px}
.dsh-awakening-settings .awa-number{display:flex;align-items:center;gap:7px;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary,#80858e)}
.dsh-awakening-settings .awa-footer{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:10px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.18));flex-wrap:wrap}
.dsh-awakening-settings .awa-feedback{min-height:22px;margin-top:12px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary,#80858e)}
.dsh-awakening-settings .awa-error{color:var(--dsw-alias-status-error,#c94d52)}
.dsh-awakening-settings .awa-info{font-size:12px;line-height:1.8;padding:10px 12px;margin-bottom:12px;background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.06));border-radius:8px;color:var(--dsw-alias-label-secondary,#80858e)}
@media(max-width:560px){.dsh-awakening-settings .awa-row{gap:14px}.dsh-awakening-settings .awa-header{gap:12px}.dsh-awakening-settings .awa-volume input{max-width:none}.dsh-awakening-settings select{min-width:116px}.dsh-awakening-settings .awa-footer{align-items:flex-start}.dsh-awakening-settings .awa-footer p{flex-basis:100%}}
@media(prefers-reduced-motion:reduce){.dsh-awakening-settings .awa-switch::before{transition:none}}
`;
function resolveValues(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULTS.enabled,
    sound: typeof input.sound === "boolean" ? input.sound : DEFAULTS.sound,
    volume: Number.isInteger(input.volume) && input.volume >= 0 && input.volume <= 100 ? input.volume : DEFAULTS.volume,
    frequency: input.frequency === "daily" ? "daily" : DEFAULTS.frequency,
    timeoutSeconds: Number.isInteger(input.timeoutSeconds) && input.timeoutSeconds >= 25 && input.timeoutSeconds <= 60 ? input.timeoutSeconds : DEFAULTS.timeoutSeconds
  };
}
function createSettingsPanel(form) {
  const subscribe = (listener) => form.subscribe(listener);
  const getSnapshot = () => form.getSnapshot();
  return function AwakeningSettings() {
    const snapshot = import_react.default.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const values = resolveValues(snapshot.value);
    const [pending, setPending] = import_react.default.useState(false);
    const [error, setError] = import_react.default.useState("");
    const [notice, setNotice] = import_react.default.useState("");
    const [previewing, setPreviewing] = import_react.default.useState(false);
    const [volumeDraft, setVolumeDraft] = import_react.default.useState(values.volume);
    const [timeoutDraft, setTimeoutDraft] = import_react.default.useState(String(values.timeoutSeconds));
    const busy = import_react.default.useRef(false);
    const mounted = import_react.default.useRef(true);
    const volumeEditing = import_react.default.useRef(false);
    const timeoutEditing = import_react.default.useRef(false);
    import_react.default.useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);
    import_react.default.useEffect(() => {
      if (!volumeEditing.current) setVolumeDraft(values.volume);
    }, [values.volume]);
    import_react.default.useEffect(() => {
      if (!timeoutEditing.current) setTimeoutDraft(String(values.timeoutSeconds));
    }, [values.timeoutSeconds]);
    const ready = snapshot.status === "ready" && snapshot.value !== void 0;
    const editable = ready && snapshot.writable === true;
    const disabled = !editable || pending;
    async function commit(operation, successText = "\u5DF2\u4FDD\u5B58\uFF0C\u4E0B\u6B21\u542F\u52A8\u6309\u65B0\u8BBE\u7F6E\u64AD\u653E\u3002") {
      if (busy.current || !editable) return false;
      busy.current = true;
      setPending(true);
      setError("");
      setNotice("");
      try {
        const accepted = await operation();
        if (!accepted) {
          if (mounted.current) setError("\u8BBE\u7F6E\u672A\u80FD\u4FDD\u5B58\uFF0C\u5DF2\u91CD\u65B0\u8BFB\u53D6\u5BBF\u4E3B\u7684\u5F53\u524D\u503C\u3002\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
          return false;
        }
        if (mounted.current) setNotice(successText);
        return true;
      } catch (caught) {
        if (mounted.current) setError(`\u4FDD\u5B58\u5931\u8D25\uFF1A${caught instanceof Error ? caught.message : "\u65E0\u6CD5\u8FDE\u63A5\u5BBF\u4E3B\u8BBE\u7F6E\u670D\u52A1\u3002"}`);
        return false;
      } finally {
        busy.current = false;
        if (mounted.current) setPending(false);
      }
    }
    async function write(field, value) {
      if (form.getSnapshot().value?.[field] === value) return true;
      return commit(() => form.set(field, value));
    }
    async function commitVolume(raw) {
      volumeEditing.current = false;
      if (busy.current) return;
      const next = Number(raw);
      if (!Number.isInteger(next) || next < 0 || next > 100) return;
      if (!await write("volume", next)) {
        if (mounted.current) setVolumeDraft(resolveValues(form.getSnapshot().value).volume);
      }
    }
    async function commitTimeout(raw) {
      timeoutEditing.current = false;
      if (busy.current) return;
      const next = Number(raw);
      if (String(raw).trim() === "" || !Number.isInteger(next) || next < 25 || next > 60) {
        setError("\u7B49\u5F85\u4E0A\u9650\u9700\u8981\u662F 25\u201360 \u79D2\u4E4B\u95F4\u7684\u6574\u6570\u3002");
        setTimeoutDraft(String(resolveValues(form.getSnapshot().value).timeoutSeconds));
        return;
      }
      if (!await write("timeoutSeconds", next)) {
        if (mounted.current) setTimeoutDraft(String(resolveValues(form.getSnapshot().value).timeoutSeconds));
      }
    }
    async function preview() {
      if (previewing || busy.current || !ready) return;
      setError("");
      const bridge = window.__DSH_AWAKENING_PLUGIN__;
      if (typeof bridge?.preview !== "function") {
        setNotice("\u9884\u89C8\u6865\u63A5\u5C1A\u672A\u52A0\u8F7D\u3002\u8BF7\u91CD\u65B0\u6253\u5F00 DSH \u540E\u518D\u8BD5\uFF1B\u8FD9\u4E0D\u4F1A\u6539\u52A8\u5F53\u524D\u64AD\u653E\u8BBE\u7F6E\u3002");
        return;
      }
      setPreviewing(true);
      setNotice("\u9884\u89C8\u53EF\u968F\u65F6\u6309 Esc \u9000\u51FA\u3002");
      try {
        await bridge.preview({ ...resolveValues(form.getSnapshot().value) });
      } catch (caught) {
        if (mounted.current) setError(`\u9884\u89C8\u672A\u80FD\u542F\u52A8\uFF1A${caught instanceof Error ? caught.message : "\u8BF7\u91CD\u65B0\u6253\u5F00 DSH \u540E\u518D\u8BD5\u3002"}`);
      } finally {
        if (mounted.current) setPreviewing(false);
      }
    }
    async function reset() {
      if (!editable || busy.current) return;
      volumeEditing.current = false;
      timeoutEditing.current = false;
      const accepted = await commit(
        () => form.mutate(Object.entries(DEFAULTS).map(([field, value]) => ({ op: "set", path: [field], value }))),
        "\u5DF2\u6062\u590D\u9ED8\u8BA4\uFF1A\u6BCF\u6B21\u542F\u52A8\u64AD\u653E\u3001\u58F0\u97F3\u5F00\u542F\u3001\u97F3\u91CF 85%\u3001\u7B49\u5F85\u4E0A\u9650 45 \u79D2\u3002"
      );
      if (accepted && mounted.current) {
        setVolumeDraft(DEFAULTS.volume);
        setTimeoutDraft(String(DEFAULTS.timeoutSeconds));
      }
    }
    const loadingCopy = snapshot.status === "loading" ? "\u6B63\u5728\u8BFB\u53D6\u5BBF\u4E3B\u4FDD\u5B58\u7684\u8BBE\u7F6E\u2026" : !ready ? "\u5BBF\u4E3B\u5C1A\u672A\u63D0\u4F9B\u9CB8\u542F\u914D\u7F6E\u3002\u8BF7\u786E\u8BA4\u63D2\u4EF6\u5DF2\u5B8C\u6574\u52A0\u8F7D\u540E\u518D\u8BD5\u3002" : !snapshot.writable ? "\u5F53\u524D\u8FDE\u63A5\u7684\u5BBF\u4E3B\u8BBE\u7F6E\u53EA\u8BFB\uFF0C\u53EF\u4EE5\u67E5\u770B\u8BBE\u7F6E\u4E0E\u9884\u89C8\u52A8\u753B\u3002" : "";
    return /* @__PURE__ */ import_react.default.createElement("section", { className: "dsh-awakening-settings", "aria-label": "\u9CB8\u542F\u542F\u52A8\u52A8\u753B\u8BBE\u7F6E" }, /* @__PURE__ */ import_react.default.createElement("style", null, CSS), /* @__PURE__ */ import_react.default.createElement("header", { className: "awa-header" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h2", null, "\u9CB8\u542F"), /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-muted" }, "DSH Awakening \xB7 \u5B8C\u6574\u52A8\u753B 22 \u79D2")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "awa-primary", disabled: !ready || pending || previewing, onClick: preview }, previewing ? "\u9884\u89C8\u4E2D\u2026" : "\u5B8C\u6574\u9884\u89C8")), loadingCopy && /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-info", role: "status" }, loadingCopy), /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-row" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-copy" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "awa-heading", htmlFor: "awa-enabled" }, "\u5F00\u542F\u542F\u52A8\u52A8\u753B"), /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-muted" }, "\u63D2\u4EF6\u63A5\u7BA1\u52A0\u8F7D\u753B\u9762\u540E\u64AD\u653E\u9CB8\u542F\uFF1B\u5173\u95ED\u540E\u76F4\u63A5\u8FDB\u5165\u5DE5\u4F5C\u754C\u9762\u3002")), /* @__PURE__ */ import_react.default.createElement("input", { className: "awa-switch", id: "awa-enabled", type: "checkbox", role: "switch", checked: values.enabled, disabled, onChange: (event) => write("enabled", event.target.checked) })), /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-row" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-copy" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "awa-heading", htmlFor: "awa-frequency" }, "\u64AD\u653E\u9891\u7387"), /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-muted" }, "\u6BCF\u65E5\u9996\u6B21\u6309\u8FD9\u53F0\u8BBE\u5907\u7684\u672C\u5730\u65E5\u671F\u8BA1\u7B97\uFF0C\u624B\u52A8\u9884\u89C8\u4E0D\u53D7\u9650\u5236\u3002")), /* @__PURE__ */ import_react.default.createElement("select", { id: "awa-frequency", value: values.frequency, disabled, onChange: (event) => write("frequency", event.target.value) }, /* @__PURE__ */ import_react.default.createElement("option", { value: "startup" }, "\u6BCF\u6B21\u542F\u52A8"), /* @__PURE__ */ import_react.default.createElement("option", { value: "daily" }, "\u6BCF\u65E5\u9996\u6B21"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-row" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-copy" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "awa-heading", htmlFor: "awa-sound" }, "\u64AD\u653E\u58F0\u97F3"), /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-muted" }, "\u5305\u542B\u754C\u9762\u97F3\u6548\u4E0E\u89D2\u8272\u539F\u58F0\u6B22\u8FCE\u8BED\uFF0C\u97F3\u91CF\u7EDF\u4E00\u8C03\u8282\u3002")), /* @__PURE__ */ import_react.default.createElement("input", { className: "awa-switch", id: "awa-sound", type: "checkbox", role: "switch", checked: values.sound, disabled, onChange: (event) => write("sound", event.target.checked) })), /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-volume" }, /* @__PURE__ */ import_react.default.createElement("label", { htmlFor: "awa-volume" }, "\u97F3\u91CF"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        id: "awa-volume",
        type: "range",
        min: "0",
        max: "100",
        step: "1",
        value: volumeDraft,
        disabled: disabled || !values.sound,
        "aria-valuetext": `${volumeDraft}%`,
        onPointerDown: () => {
          volumeEditing.current = true;
        },
        onChange: (event) => {
          volumeEditing.current = true;
          setVolumeDraft(Number(event.target.value));
        },
        onPointerUp: (event) => commitVolume(event.currentTarget.value),
        onKeyUp: (event) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) commitVolume(event.currentTarget.value);
        },
        onBlur: (event) => commitVolume(event.currentTarget.value)
      }
    ), /* @__PURE__ */ import_react.default.createElement("output", { htmlFor: "awa-volume" }, volumeDraft, "%")), /* @__PURE__ */ import_react.default.createElement("details", null, /* @__PURE__ */ import_react.default.createElement("summary", null, "\u9AD8\u7EA7\u8BBE\u7F6E"), /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-row" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-copy" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "awa-heading", htmlFor: "awa-timeout" }, "\u542F\u52A8\u7B49\u5F85\u4E0A\u9650"), /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-muted" }, "DSH \u8FDF\u8FDF\u672A\u5C31\u7EEA\u65F6\uFF0C\u8D85\u8FC7\u4E0A\u9650\u81EA\u52A8\u9000\u51FA\u52A8\u753B\uFF0C\u663E\u793A\u5E95\u5C42\u754C\u9762\u3002")), /* @__PURE__ */ import_react.default.createElement("div", { className: "awa-number" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        id: "awa-timeout",
        type: "number",
        min: "25",
        max: "60",
        step: "1",
        value: timeoutDraft,
        disabled,
        onFocus: () => {
          timeoutEditing.current = true;
        },
        onChange: (event) => setTimeoutDraft(event.target.value),
        onBlur: (event) => commitTimeout(event.currentTarget.value),
        onKeyDown: (event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", null, "\u79D2")))), /* @__PURE__ */ import_react.default.createElement("footer", { className: "awa-footer" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "awa-muted" }, "\u7A97\u53E3\u81EA\u9002\u5E94\uFF1A\u4E2D\u592E\u753B\u9762\u5B8C\u6574\u4FDD\u7559\uFF0C\u80CC\u666F\u5411\u8FB9\u7F18\u5EF6\u5C55\u3002", /* @__PURE__ */ import_react.default.createElement("br", null), "\u4FDD\u6301 22 \u79D2\u8282\u594F\u4E0E\u539F\u58F0\u53E3\u578B\u3002\u64AD\u653E\u4E2D\u6309 Esc \u6216\u70B9\u51FB\u201C\u8DF3\u8FC7\u201D\u9000\u51FA\u3002"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", disabled, onClick: reset }, "\u6062\u590D\u9ED8\u8BA4")), /* @__PURE__ */ import_react.default.createElement("div", { className: `awa-feedback${error ? " awa-error" : ""}`, role: error ? "alert" : "status", "aria-live": "polite" }, error || (pending ? "\u6B63\u5728\u4FDD\u5B58\u2026" : notice)));
  };
}
function apply(ctx) {
  const form = ctx.configForms.get(ENTRY_ID);
  const Panel = createSettingsPanel(form);
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-awakening",
    order: 35,
    label: () => "\u9CB8\u542F\u542F\u52A8\u52A8\u753B"
  }, Panel));
}

// src/entry.jsx
var name = "dsh-awakening";
var inject = ["slots", "configForms"];
function apply2(ctx) {
  const bridge = window.__DSH_AWAKENING_INSTALL__({ ...window.__DSH_AWAKENING_OPTIONS__, autostart: false });
  const form = ctx.configForms.get("dsh-awakening");
  const update = () => {
    const snapshot = form.getSnapshot();
    if (snapshot.status === "ready" && snapshot.value) bridge.configure(snapshot.value);
  };
  update();
  ctx.effect(() => form.subscribe(update));
  ctx.effect(() => () => bridge.dispose());
  apply(ctx);
}
var entry_default = { name, inject, apply: apply2 };

return module.exports;
}});

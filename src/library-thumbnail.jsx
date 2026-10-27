import React from 'react'
import { Icon } from './settings-ui.jsx'

const cache = new Map(), queue = []
const MAX_CACHE = 64
let active = 0

function safeImage(value) {
  if (typeof value !== 'string' || !value || value.length > 4096) return null
  try {
    const url = new URL(value, location.href)
    if (url.protocol === location.protocol && url.host === location.host && !url.username && !url.password && url.pathname.startsWith('/dsh-awakening/')) return url.href
    if (url.protocol === 'https:' && !url.username && !url.password && ['github.com', 'raw.githubusercontent.com', 'user-images.githubusercontent.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com', 'camo.githubusercontent.com'].includes(url.hostname)) return url.href
  } catch {}
  return null
}

function frame(url, signal) {
  return new Promise(resolve => {
    const video = document.createElement('video')
    let ended = false, seekRequested = false
    const timeout = setTimeout(() => finish(null), 8000)
    function finish(value) {
      if (ended) return
      ended = true; clearTimeout(timeout); signal.removeEventListener('abort', cancel)
      video.onloadedmetadata = null; video.onloadeddata = null; video.onseeked = null; video.onerror = null
      video.pause(); video.removeAttribute('src'); video.load()
      resolve(value)
    }
    function cancel() { finish(null) }
    function draw() {
      if (ended || signal.aborted || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return
      try {
        const canvas = document.createElement('canvas'), width = 480
        canvas.width = width; canvas.height = Math.max(1, Math.round(width * video.videoHeight / video.videoWidth))
        if (canvas.height > 480) { canvas.width = Math.round(width * 480 / canvas.height); canvas.height = 480 }
        const context = canvas.getContext('2d')
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        finish(canvas.toDataURL('image/jpeg', .78))
        canvas.width = 0; canvas.height = 0
      } catch { finish(null) }
    }
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const at = Math.min(1.2, Math.max(0, (Number.isFinite(video.duration) ? video.duration : 1) * .08))
      if (at > .01) { seekRequested = true; video.currentTime = at } else draw()
    }
    video.onloadeddata = () => { if (!seekRequested) draw() }
    video.onseeked = draw
    video.onerror = () => finish(null)
    signal.addEventListener('abort', cancel, { once: true })
    if (signal.aborted) { cancel(); return }
    video.src = url; video.load()
  })
}

function pump() {
  if (active || !queue.length) return
  const job = queue.shift()
  if (job.signal.aborted) { job.resolve(null); pump(); return }
  active++
  frame(job.url, job.signal).then(value => {
    if (value && !job.signal.aborted) {
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value)
      cache.set(job.key, value)
    }
    job.resolve(value)
  }).finally(() => { active--; pump() })
}

function thumbnail(url, key, signal) {
  if (cache.has(key)) return Promise.resolve(cache.get(key))
  return new Promise(resolve => { queue.push({ url, key, signal, resolve }); pump() })
}

export function AnimationThumbnail({ entry, alt = '', className = '', priority = false }) {
  const holder = React.useRef(null)
  const image = safeImage(entry?.thumbnailUrl || entry?.previewUrl || entry?.posterUrl)
  const source = entry?.kind === 'video' ? safeImage(entry?.sourceUrl) : null
  const localSource = source && new URL(source).protocol === location.protocol && new URL(source).host === location.host ? source : null
  const key = `${entry?.id}:${entry?.sha256 || localSource || image || ''}`
  const [extracted, setExtracted] = React.useState(() => cache.get(key) || null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => { setExtracted(cache.get(key) || null); setFailed(false) }, [key])
  React.useEffect(() => {
    if ((image && !failed) || !localSource) return
    if (cache.has(key)) { setExtracted(cache.get(key)); return }
    const abort = new AbortController()
    let observer, started = false
    const start = () => {
      if (started || abort.signal.aborted) return
      started = true; observer?.disconnect()
      thumbnail(localSource, key, abort.signal).then(value => { if (!abort.signal.aborted) setExtracted(value) })
    }
    if (priority || typeof IntersectionObserver !== 'function') start()
    else { observer = new IntersectionObserver(rows => { if (rows.some(row => row.isIntersecting)) start() }, { rootMargin: '80px' }); if (holder.current) observer.observe(holder.current) }
    return () => { observer?.disconnect(); abort.abort() }
  }, [key, image, localSource, priority, failed])

  const url = (!failed && image) || extracted
  return <span ref={holder} className={`awa-artwork ${className}`} aria-hidden={alt ? undefined : true}>
    {url ? <img src={url} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => { if (url === image) setFailed(true); else setExtracted(null) }} /> : <span className="awa-artwork-empty"><Icon name="file" size={28} /><span>{entry?.kind === 'adaptive' ? '鲸启' : '视频动画'}</span></span>}
  </span>
}

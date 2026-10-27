import React from 'react'

export const BUILTIN_ANIMATION = Object.freeze({
  id: 'builtin:awakening', title: '鲸启', author: 'MingoYung', license: 'MIT · 含第三方素材署名',
  kind: 'adaptive', durationSeconds: 22, sourceUrl: '/dsh-awakening/media/boot.mp4?v=0.6.0',
  posterUrl: '/dsh-awakening/media/poster.png?v=0.6.0', fit: 'cover',
})
const LIBRARY = '/dsh-awakening/library/'
const CONTRIBUTING = 'https://github.com/MingoYung/dsh-awakening-library/blob/main/CONTRIBUTING.md'
const MAX_BYTES = 120 * 1024 * 1024
const MAX_SECONDS = 45
const LICENSES = [['local-only', '仅供本机使用'], ['MIT', 'MIT'], ['CC-BY-4.0', 'CC BY 4.0'], ['CC-BY-SA-4.0', 'CC BY-SA 4.0'], ['CC0-1.0', 'CC0 1.0']]
const CSS = `
.awa-library{border-top:1px solid var(--dsw-alias-border-l2,#8080802e);padding:18px 0 4px;margin-bottom:12px;font-size:12px}
.awa-library .awa-lib-top,.awa-library .awa-lib-line,.awa-library .awa-lib-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.awa-library .awa-lib-top{justify-content:space-between;gap:12px;margin-bottom:12px}
.awa-library .awa-lib-top h3{font-size:13px;font-weight:600;margin:0}
.awa-library .awa-lib-top p{margin-top:3px}
.awa-library .awa-lib-card{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--dsw-alias-border-l2,#8080802e);border-radius:10px;margin-top:8px;min-width:0}
.awa-library .awa-lib-card.is-current{border-color:var(--dsw-alias-brand-primary,#7597d8);background:var(--dsw-alias-bg-layer-1,#8080800a)}
.awa-library .awa-lib-mark{width:36px;height:36px;flex:0 0 auto;border-radius:9px;display:grid;place-items:center;background:var(--dsw-alias-bg-layer-2,#819ac218);color:var(--dsw-alias-brand-primary,#8baaff)}
.awa-library .awa-lib-copy{min-width:0;flex:1;overflow-wrap:anywhere}
.awa-library .awa-lib-title{font-size:13px;font-weight:500;line-height:1.5}
.awa-library .awa-lib-badge{font-size:10px;line-height:1.5;padding:1px 6px;border-radius:20px;background:var(--dsw-alias-interactive-bg-hover,#809dc325);color:var(--dsw-alias-label-secondary,#93a4b8);white-space:nowrap}
.awa-library .awa-lib-meta{font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary,#80858e);margin-top:3px}
.awa-library .awa-lib-actions{justify-content:flex-end;flex-shrink:0}
.awa-library .awa-lib-actions button{padding:5px 10px;min-height:30px}
.awa-library .awa-lib-list{display:grid;gap:0}
.awa-library .awa-lib-list:empty{display:none}
.awa-library .awa-lib-fit{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 16px}
.awa-library .awa-lib-import{border:1px solid var(--dsw-alias-border-l2,#8080802e);border-radius:10px;padding:14px;margin:12px 0;background:var(--dsw-alias-bg-layer-1,#80808008)}
.awa-library .awa-lib-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.awa-library .awa-lib-form label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary,#80858e);min-width:0}
.awa-library input[type=text],.awa-library .awa-lib-form select{min-width:0;width:100%;font-size:12px;line-height:1.5;border:1px solid var(--dsw-alias-border-l2,#80808044);border-radius:7px;min-height:34px;padding:6px 9px;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,inherit)}
.awa-library .awa-lib-form .awa-lib-wide{grid-column:1/-1}
.awa-library .awa-lib-community{border-top:1px solid var(--dsw-alias-border-l2,#8080802e);margin-top:16px;padding-top:16px}
.awa-library .awa-lib-community .awa-lib-top{margin-bottom:4px}
.awa-library .awa-lib-description{font-size:12px;line-height:1.7;margin:5px 0 6px;color:var(--dsw-alias-label-secondary,#80858e)}
.awa-library .awa-lib-community .awa-lib-card{align-items:flex-start;flex-wrap:wrap}
.awa-library .awa-lib-community .awa-lib-copy{flex-basis:65%}
.awa-library .awa-lib-community .awa-lib-actions{margin-left:auto}
.awa-library a{color:var(--dsw-alias-brand-primary,#8baaff);text-underline-offset:3px;font-size:11px}
.awa-library .awa-lib-feedback{min-height:19px;line-height:1.7;margin-top:10px;color:var(--dsw-alias-label-secondary,#80858e);overflow-wrap:anywhere}
.awa-library .awa-lib-feedback.is-error,.awa-library .awa-lib-warning{color:var(--dsw-alias-status-error,#c94d52)}
.awa-library .awa-lib-feedback .awa-lib-line{justify-content:space-between}
.awa-library .awa-lib-delete{border:1px solid var(--dsw-alias-border-l2,#8080802e);border-radius:8px;padding:10px;margin-top:8px}
.awa-library .awa-lib-delete .awa-lib-actions{margin-top:8px}
@media(max-width:560px){.awa-library .awa-lib-card{flex-wrap:wrap}.awa-library .awa-lib-actions{margin-left:auto}.awa-library .awa-lib-copy{flex-basis:calc(100% - 50px)}.awa-library .awa-lib-form{grid-template-columns:1fr}.awa-library .awa-lib-community .awa-lib-copy{flex-basis:100%}.awa-library .awa-lib-fit{align-items:flex-start}.awa-library .awa-lib-fit select{min-width:118px}}
`

function seconds(value) { return `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)} 秒` }
function size(value) { return `${(Number(value) / 1024 / 1024).toFixed(1)} MB` }
function external(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['github.com', 'raw.githubusercontent.com', 'user-images.githubusercontent.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname) ? url.href : undefined
  } catch { return undefined }
}
function catalogLocal(entry, entries) {
  if (entry.kind === 'builtin' && entry.id === 'mingoyung.awakening') return entries.find(item => item.id === BUILTIN_ANIMATION.id) || BUILTIN_ANIMATION
  return entries.find(item => item.catalogId === entry.id || (entry.asset?.sha256 && item.sha256 === entry.asset.sha256))
}
function durationOf(file, signal) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), video = document.createElement('video')
    let finished = false
    const timer = setTimeout(() => finish(new Error('读取视频超时，请确认文件能在浏览器中播放。')), 12000)
    function finish(error, duration) {
      if (finished) return
      finished = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel)
      video.onloadedmetadata = null; video.onerror = null; video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url)
      if (error) reject(error); else resolve(duration)
    }
    function cancel() { finish(new DOMException('操作已取消', 'AbortError')) }
    video.preload = 'metadata'; video.muted = true
    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!Number.isFinite(duration) || duration < 1 || duration > MAX_SECONDS) finish(new Error(`动画时长需为 1–${MAX_SECONDS} 秒，建议保持 15–25 秒。`))
      else finish(null, duration)
    }
    video.onerror = () => finish(new Error('无法读取这个视频。请使用可正常播放的 MP4 或 WebM 文件。'))
    if (signal?.aborted) { cancel(); return }
    signal?.addEventListener('abort', cancel, { once: true }); video.src = url; video.load()
  })
}

export function AnimationLibraryPanel({ selectedId, fit, disabled, readOnly, previewing, onSelect, onFit, onPreview, onSelectionChange, onBusyChange }) {
  const [entries, setEntries] = React.useState([BUILTIN_ANIMATION])
  const [loaded, setLoaded] = React.useState(false)
  const [selectionMissing, setSelectionMissing] = React.useState(false)
  const [catalog, setCatalog] = React.useState(null)
  const [catalogFetchedAt, setCatalogFetchedAt] = React.useState('')
  const [activity, setActivity] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [error, setError] = React.useState('')
  const [picked, setPicked] = React.useState(null)
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [license, setLicense] = React.useState('local-only')
  const [removeId, setRemoveId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const mounted = React.useRef(true), controller = React.useRef(null), busy = React.useRef(false), fileInput = React.useRef(null)
  const current = entries.find(entry => entry.id === selectedId)
  const blocked = disabled || !!activity || previewing

  React.useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controller.current?.abort() }
  }, [])
  React.useEffect(() => { onBusyChange?.(!!activity); return () => onBusyChange?.(false) }, [activity, onBusyChange])
  React.useEffect(() => { onSelectionChange?.(current || (selectedId === BUILTIN_ANIMATION.id ? BUILTIN_ANIMATION : null)) }, [current, selectedId, onSelectionChange])

  async function api(action, { signal, body, headers, method = 'POST' } = {}) {
    const token = window.__DSH_AWAKENING_LIBRARY__?.actionToken
    if (method === 'POST' && !token) throw new Error('动画库操作尚未连接，请重新打开设置后再试。')
    const response = await fetch(LIBRARY + action, {
      method, signal, credentials: 'same-origin', cache: 'no-store',
      headers: method === 'POST' ? { 'x-dsh-awakening-library-token': token, 'content-type': 'application/json', ...headers } : undefined,
      body: body === undefined ? undefined : body instanceof File ? body : JSON.stringify(body),
    })
    let payload
    try { payload = await response.json() } catch { throw new Error('动画库返回了无法识别的结果，请重新读取后再试。') }
    if (!response.ok || payload?.ok !== true) throw new Error(payload?.error?.message || '动画库操作未能完成，请重试。')
    return payload
  }
  function acceptList(payload) {
    if (!Array.isArray(payload.entries)) throw new Error('动画列表格式不正确，请稍后重新读取。')
    setEntries(payload.entries); setLoaded(true); setSelectionMissing(payload.selectionMissing === true)
    if (payload.catalog?.entries) setCatalog(payload.catalog)
    if (payload.catalogFetchedAt) setCatalogFetchedAt(payload.catalogFetchedAt)
  }
  async function run(label, operation) {
    if (busy.current) return
    busy.current = true
    const abort = new AbortController(); controller.current = abort
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; abort.abort() }, 120000)
    if (mounted.current) { setActivity(label); setError(''); setNotice('') }
    try { return await operation(abort.signal) }
    catch (caught) {
      if (mounted.current) {
        if (caught?.name === 'AbortError') setNotice(timedOut ? '连接超时。可重新读取列表，确认已经完成的操作。' : '操作已取消。可重新读取列表，确认已经完成的操作。')
        else setError(caught instanceof Error ? caught.message : '操作未能完成，请重试。')
      }
    } finally {
      clearTimeout(timer); busy.current = false
      if (controller.current === abort) controller.current = null
      if (mounted.current) setActivity('')
    }
  }
  async function refresh() {
    return run('正在读取本地动画…', async signal => { const payload = await api('list', { method: 'GET', signal }); if (mounted.current) acceptList(payload) })
  }
  React.useEffect(() => { refresh() }, [])

  async function pickFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file || blocked || readOnly) return
    await run('正在读取视频信息…', async signal => {
      if (!/\.(mp4|webm)$/i.test(file.name)) throw new Error('请选择 MP4 或 WebM 文件。')
      if (!file.size || file.size > MAX_BYTES) throw new Error('视频文件需大于 0 字节且不超过 120 MB。')
      const durationSeconds = await durationOf(file, signal)
      if (mounted.current) {
        setPicked({ file, durationSeconds, format: /\.webm$/i.test(file.name) ? 'webm' : 'mp4' })
        setTitle(file.name.replace(/\.(mp4|webm)$/i, '').slice(0, 80)); setAuthor(''); setLicense('local-only')
      }
    })
  }
  async function importFile() {
    if (!picked || !title.trim() || readOnly || blocked) return
    await run('正在导入视频，请稍候…', async signal => {
      const metadata = { title: title.trim(), author: author.trim() || '本地导入', license, durationSeconds: picked.durationSeconds }
      const result = await api('import', { signal, body: picked.file, headers: { 'content-type': picked.format === 'webm' ? 'video/webm' : 'video/mp4', 'x-awakening-metadata': encodeURIComponent(JSON.stringify(metadata)) } })
      const payload = await api('list', { method: 'GET', signal })
      if (mounted.current) { acceptList(payload); setPicked(null); setNotice(`已导入「${result.entry?.title || metadata.title}」。点“选用”后，下次启动播放。文件仅保存在本机。`) }
    })
  }
  async function updateCatalog() {
    if (blocked || readOnly) return
    await run('正在更新社区作品列表…', async signal => {
      const payload = await api('catalog', { body: {}, signal })
      if (mounted.current) { setCatalog(payload.catalog); setCatalogFetchedAt(payload.fetchedAt || ''); setNotice('社区列表已更新。下载作品后可在本机选用；启动时无需联网。') }
    })
  }
  async function download(entry) {
    if (blocked || readOnly) return
    await run(`正在下载「${entry.title}」并校验文件…`, async signal => {
      const result = await api('download', { body: { id: entry.id }, signal })
      const payload = await api('list', { method: 'GET', signal })
      if (mounted.current) { acceptList(payload); setNotice(`「${result.entry?.title || entry.title}」已下载，可在本地动画中预览或选用。`) }
    })
  }
  async function remove() {
    if (blocked || readOnly || !removeId) return
    await run('正在移除本地文件…', async signal => {
      await api('remove', { body: { id: removeId }, signal })
      const payload = await api('list', { method: 'GET', signal })
      if (mounted.current) { acceptList(payload); setRemoveId(''); setNotice('已从本机移除。社区中的原作品不受影响。') }
    })
  }
  async function choose(entry) {
    if (blocked || readOnly || entry.id === selectedId) return
    setError(''); setNotice('')
    const accepted = await onSelect(entry.id)
    if (accepted && mounted.current) { setRemoveId(''); setNotice(`已选用「${entry.title}」，下次启动生效。可以先预览效果。`) }
  }
  function onlinePreview(entry) {
    const local = catalogLocal(entry, entries)
    if (local) return onPreview(local)
    if (!entry.asset || !external(entry.asset.url)) return
    return onPreview({ id: `catalog:${entry.id}`, title: entry.title, kind: 'video', durationSeconds: entry.durationSeconds, sourceUrl: entry.asset.url, fit })
  }

  const catalogEntries = (catalog?.entries || []).filter(entry => !search.trim() || `${entry.title} ${entry.author} ${entry.description}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return <section className="awa-library" aria-label="动画库">
    <style>{CSS}</style>
    <div className="awa-lib-top">
      <div><h3>我的动画</h3><p className="awa-muted">选用后下次启动生效，预览不会更改选择。</p></div>
      <div className="awa-lib-actions">
        <button type="button" disabled={blocked} onClick={refresh} aria-label="重新读取本地动画">重新读取</button>
        <button type="button" disabled={blocked || readOnly} onClick={() => fileInput.current?.click()}>导入视频</button>
        <input ref={fileInput} type="file" accept=".mp4,.webm,video/mp4,video/webm" hidden onChange={pickFile} />
      </div>
    </div>

    {loaded && (selectionMissing || (!current && selectedId !== BUILTIN_ANIMATION.id)) && <p className="awa-lib-warning" role="alert">所选动画文件已不可用，启动时会使用内置鲸启。请重新导入或选择另一部作品。</p>}

    <div className="awa-lib-list">
      {entries.map(entry => <article key={entry.id} className={`awa-lib-card${entry.id === selectedId ? ' is-current' : ''}`}>
        <div className="awa-lib-mark" aria-hidden="true">{entry.kind === 'adaptive' ? '◈' : '▷'}</div>
        <div className="awa-lib-copy">
          <div className="awa-lib-line"><span className="awa-lib-title">{entry.title}</span>{entry.id === selectedId && <span className="awa-lib-badge">当前动画</span>}{entry.kind === 'adaptive' && <span className="awa-lib-badge">内置 · 动态构图</span>}</div>
          <p className="awa-lib-meta">{entry.author} · {seconds(entry.durationSeconds)}{entry.bytes ? ` · ${size(entry.bytes)}` : ''}<br />{entry.license === 'local-only' ? '仅供本机使用 · 不会自动公开' : entry.license}</p>
        </div>
        <div className="awa-lib-actions">
          <button type="button" disabled={blocked} onClick={() => onPreview(entry)} aria-label={`预览${entry.title}`}>预览</button>
          <button type="button" className={entry.id !== selectedId ? 'awa-primary' : ''} disabled={blocked || readOnly || entry.id === selectedId} onClick={() => choose(entry)}>{entry.id === selectedId ? '使用中' : '选用'}</button>
          {entry.kind !== 'adaptive' && <button type="button" disabled={blocked || readOnly || entry.id === selectedId} onClick={() => setRemoveId(entry.id)} aria-label={`移除${entry.title}`}>移除</button>}
        </div>
      </article>)}
    </div>

    {removeId && <div className="awa-lib-delete" role="group" aria-label="确认移除动画">
      <p>从本机移除「{entries.find(entry => entry.id === removeId)?.title || '这部动画'}」及其视频文件？社区原作品不受影响。</p>
      <div className="awa-lib-actions"><button type="button" disabled={blocked} onClick={() => setRemoveId('')}>取消</button><button type="button" disabled={blocked || readOnly} onClick={remove}>确认移除</button></div>
    </div>}

    <div className="awa-lib-fit">
      <div><label htmlFor="awa-video-fit">普通视频显示方式</label><p className="awa-muted">内置鲸启继续按窗口绘制。普通视频可选填满或保留全画面。</p></div>
      <select id="awa-video-fit" value={fit} disabled={blocked || readOnly} onChange={event => onFit(event.target.value)}><option value="cover">填满窗口</option><option value="contain">完整画面</option></select>
    </div>

    {picked && <div className="awa-lib-import" role="group" aria-label="导入视频信息">
      <p className="awa-lib-title">导入「{picked.file.name}」</p>
      <p className="awa-lib-meta">{seconds(picked.durationSeconds)} · {size(picked.file.size)} · {picked.format.toUpperCase()}</p>
      <div className="awa-lib-form">
        <label>作品名称<input type="text" maxLength={80} value={title} disabled={blocked} onChange={event => setTitle(event.target.value)} /></label>
        <label>作者（可选）<input type="text" maxLength={80} value={author} disabled={blocked} placeholder="本地导入" onChange={event => setAuthor(event.target.value)} /></label>
        <label className="awa-lib-wide">使用许可<select value={license} disabled={blocked} onChange={event => setLicense(event.target.value)}>{LICENSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <p className="awa-muted">仅保存在本机，不会自动上传到社区。支持含音轨的 MP4 / WebM，1–45 秒、最大 120 MB。建议使用 15–25 秒作品。</p>
      <div className="awa-lib-actions" style={{ marginTop: 12 }}><button type="button" disabled={blocked} onClick={() => setPicked(null)}>取消</button><button type="button" className="awa-primary" disabled={blocked || readOnly || !title.trim()} onClick={importFile}>保存到本地库</button></div>
    </div>}

    <div className="awa-lib-community">
      <div className="awa-lib-top">
        <div><h3>社区动画库</h3><p className="awa-muted">发现创作者的作品，按需下载。开机不联网更新。</p></div>
        <div className="awa-lib-actions"><a href={CONTRIBUTING} target="_blank" rel="noreferrer">创作者投稿 ↗</a><button type="button" disabled={blocked || readOnly} onClick={updateCatalog}>{catalog ? '更新列表' : '浏览社区作品'}</button></div>
      </div>
      {!catalog && <p className="awa-lib-description">尚未读取社区列表。点击“浏览社区作品”后连接 GitHub；你的本地动画不会被上传。</p>}
      {catalogFetchedAt && <p className="awa-lib-meta">列表更新于 {new Date(catalogFetchedAt).toLocaleString()}</p>}
      {(catalog?.entries?.length || 0) > 4 && <input type="text" aria-label="搜索社区动画" placeholder="搜索作品或作者" value={search} onChange={event => setSearch(event.target.value)} style={{ marginTop: 10 }} />}
      {catalogEntries.map(entry => {
        const local = catalogLocal(entry, entries), selected = local?.id === selectedId
        return <article className="awa-lib-card" key={entry.id}>
          <div className="awa-lib-copy">
            <div className="awa-lib-line"><span className="awa-lib-title">{entry.title}</span>{local && <span className="awa-lib-badge">{entry.kind === 'builtin' ? '内置作品' : '已下载'}</span>}</div>
            <p className="awa-lib-meta">{entry.author} · {seconds(entry.durationSeconds)} · {entry.license}{entry.asset?.bytes ? ` · ${size(entry.asset.bytes)}` : ''}</p>
            <p className="awa-lib-description">{entry.description}</p>
            <div className="awa-lib-line">{external(entry.sourceUrl) && <a href={external(entry.sourceUrl)} target="_blank" rel="noreferrer">作品来源 ↗</a>}{external(entry.licenseUrl) && <a href={external(entry.licenseUrl)} target="_blank" rel="noreferrer">许可 ↗</a>}</div>
          </div>
          <div className="awa-lib-actions">
            <button type="button" disabled={blocked} onClick={() => onlinePreview(entry)}>{local ? '预览' : '在线预览'}</button>
            {local ? <button type="button" className={selected ? '' : 'awa-primary'} disabled={blocked || readOnly || selected} onClick={() => choose(local)}>{selected ? '使用中' : '选用'}</button> : <button type="button" className="awa-primary" disabled={blocked || readOnly} onClick={() => download(entry)}>下载到本地</button>}
          </div>
        </article>
      })}
      {catalog && !catalogEntries.length && <p className="awa-lib-description">{search ? '没有找到符合条件的作品。' : '社区作品正在准备中，你也可以先导入自己的动画。'}</p>}
    </div>
    <div className={`awa-lib-feedback${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">
      {activity ? <div className="awa-lib-line"><span>{activity}</span><button type="button" onClick={() => controller.current?.abort()}>取消操作</button></div> : error || notice}
    </div>
  </section>
}

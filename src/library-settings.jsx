import React from 'react'
import { Icon } from './settings-ui.jsx'
import { AnimationThumbnail } from './library-thumbnail.jsx'
import { LIBRARY_CSS } from './library-styles.js'

import bundledManifest from '../media/builtins.json'
export const BUILTIN_ANIMATIONS = Object.freeze(bundledManifest.entries)
export const BUILTIN_ANIMATION = BUILTIN_ANIMATIONS[0]
const LIBRARY = '/dsh-awakening/library/'
const MAX_BYTES = 120 * 1024 * 1024, MAX_SECONDS = 45
const LICENSES = [['local-only', '仅供本机使用'], ['MIT', 'MIT'], ['CC-BY-4.0', 'CC BY 4.0'], ['CC-BY-SA-4.0', 'CC BY-SA 4.0'], ['CC0-1.0', 'CC0 1.0']]
const TEMPLATE = {
  id: 'your-name.animation-name', title: '作品名称', author: '作者名称', license: 'CC-BY-4.0', kind: 'video',
  description: '一句话介绍作品的画面和声音。', sourceUrl: 'https://github.com/your-name/animation',
  licenseUrl: 'https://github.com/your-name/animation/blob/v1.0.0/LICENSE', durationSeconds: 20,
  previewUrl: 'https://raw.githubusercontent.com/your-name/animation/v1.0.0/preview.png',
  asset: { url: 'https://github.com/your-name/animation/releases/download/v1.0.0/boot.mp4', format: 'mp4', bytes: 0, sha256: '请替换为视频的64位SHA256摘要' },
}
const seconds = value => `${Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1)} 秒`
const size = value => `${(Number(value) / 1024 / 1024).toFixed(1)} MB`
function external(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && ['github.com', 'raw.githubusercontent.com', 'user-images.githubusercontent.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'camo.githubusercontent.com'].includes(u.hostname) ? u.href : undefined } catch { return undefined }
}
function localFor(remote, entries) {
  if (remote.kind === 'builtin' && remote.id === 'mingoyung.awakening') return entries.find(e => e.id === BUILTIN_ANIMATION.id) || BUILTIN_ANIMATION
  return entries.find(e => (e.catalogId === remote.id && (!e.builtin || e.sha256 === remote.asset?.sha256)) || (remote.asset?.sha256 && e.sha256 === remote.asset.sha256))
}
function merge(entries, catalog) {
  const result = entries.map(local => ({ key: local.id, local, remote: null }))
  for (const remote of catalog?.entries || []) {
    const local = localFor(remote, entries), existing = local && result.find(item => item.local?.id === local.id)
    if (existing) { if (!(existing.local?.builtin && remote.id === 'mingoyung.awakening')) existing.remote = remote }
    else result.push({ key: `catalog:${remote.id}`, local: null, remote })
  }
  return result.map(item => {
    const data = item.local?.builtin ? item.local : item.remote || item.local, adaptive = !!item.local?.presentation || item.local?.kind === 'adaptive' || data.kind === 'builtin'
    return { ...item, title: data.title, author: data.author, durationSeconds: data.durationSeconds, license: item.local?.license || data.license, unavailable: item.local?.unavailable === true,
      thumbnail: { ...(item.local || {}), id: item.key, title: data.title, kind: adaptive ? 'adaptive' : 'video', thumbnailUrl: item.local?.thumbnailUrl, posterUrl: item.local?.posterUrl, previewUrl: item.remote?.previewUrl, sourceUrl: item.local?.sourceUrl, sha256: item.local?.sha256 },
    }
  })
}
function durationOf(file, signal) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), video = document.createElement('video')
    let finished = false
    const timer = setTimeout(() => finish(new Error('读取视频超时，请确认文件能正常播放。')), 12000)
    function finish(error, duration) {
      if (finished) return
      finished = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel)
      video.onloadedmetadata = null; video.onerror = null; video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url)
      if (error) reject(error); else resolve(duration)
    }
    function cancel() { finish(new DOMException('操作已取消', 'AbortError')) }
    video.preload = 'metadata'; video.muted = true
    video.onloadedmetadata = () => { const duration = video.duration; if (!Number.isFinite(duration) || duration < 1 || duration > MAX_SECONDS) finish(new Error('动画需为 1–45 秒，推荐使用 15–25 秒作品。')); else finish(null, duration) }
    video.onerror = () => finish(new Error('无法读取视频，请选择可正常播放的 MP4 或 WebM。'))
    if (signal?.aborted) { cancel(); return }
    signal?.addEventListener('abort', cancel, { once: true }); video.src = url; video.load()
  })
}

export function AnimationLibraryPanel({ selectedId, fit, disabled, readOnly, previewing, onSelect, onPreview, onSelectionChange, onBusyChange, view = 'current', onOpenLibrary, onOpenSettings }) {
  const [entries, setEntries] = React.useState([...BUILTIN_ANIMATIONS]), [loaded, setLoaded] = React.useState(false)
  const [catalog, setCatalog] = React.useState(null), [catalogFetchedAt, setCatalogFetchedAt] = React.useState('')
  const [catalogLoading, setCatalogLoading] = React.useState(false)
  const [selectionMissing, setSelectionMissing] = React.useState(false), [activity, setActivity] = React.useState('')
  const [notice, setNotice] = React.useState(''), [error, setError] = React.useState('')
  const [page, setPage] = React.useState({ type: 'browse' }), [scope, setScope] = React.useState('all'), [search, setSearch] = React.useState('')
  const [picked, setPicked] = React.useState(null), [title, setTitle] = React.useState(''), [author, setAuthor] = React.useState(''), [license, setLicense] = React.useState('local-only')
  const [removeId, setRemoveId] = React.useState(''), [dragging, setDragging] = React.useState(false), [templateVisible, setTemplateVisible] = React.useState(false)
  const mounted = React.useRef(true), controller = React.useRef(null), catalogController = React.useRef(null), busy = React.useRef(false), fileInput = React.useRef(null), heading = React.useRef(null), pageFocus = React.useRef(false), catalogAttempted = React.useRef(false)
  const current = entries.find(e => e.id === selectedId), blocked = disabled || !!activity || previewing
  const writingBlocked = blocked || catalogLoading
  const items = React.useMemo(() => merge(entries, catalog), [entries, catalog])
  const selectedItem = items.find(item => item.local?.id === selectedId)
  const detail = page.type === 'detail' ? items.find(item => item.key === page.key) : null
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); catalogController.current?.abort() } }, [])
  React.useEffect(() => { onBusyChange?.(!!activity); return () => onBusyChange?.(false) }, [activity, onBusyChange])
  React.useEffect(() => { onSelectionChange?.(current?.unavailable ? null : current || (selectedId === BUILTIN_ANIMATION.id ? BUILTIN_ANIMATION : null)) }, [current, selectedId, onSelectionChange])
  React.useEffect(() => { if (pageFocus.current) { heading.current?.focus({ preventScroll: true }); pageFocus.current = false } }, [page.type, page.key, view])
  function navigate(next) { setRemoveId(''); setError(''); setNotice(''); pageFocus.current = true; setPage(next) }
  function browse() { navigate({ type: 'browse' }) }
  function openDetail(item) { navigate({ type: 'detail', key: item.key }) }
  async function api(action, { signal, body, headers, method = 'POST' } = {}) {
    const token = window.__DSH_AWAKENING_LIBRARY__?.actionToken
    if (method === 'POST' && !token) throw new Error('动画库连接尚未就绪，请重新打开设置。')
    const response = await fetch(LIBRARY + action, { method, signal, credentials: 'same-origin', cache: 'no-store', headers: method === 'POST' ? { 'x-dsh-awakening-library-token': token, 'content-type': 'application/json', ...headers } : undefined, body: body === undefined ? undefined : body instanceof File ? body : JSON.stringify(body) })
    let payload
    try { payload = await response.json() } catch { throw new Error('未能读取动画库结果，请稍后重试。') }
    if (!response.ok || payload?.ok !== true) throw new Error(payload?.error?.message || '操作未完成，请稍后重试。')
    return payload
  }
  function acceptList(payload) {
    if (!Array.isArray(payload.entries)) throw new Error('动画列表格式无效，请重新读取。')
    setEntries(payload.entries); setLoaded(true); setSelectionMissing(payload.selectionMissing === true)
    if (payload.catalog?.entries) setCatalog(payload.catalog)
    if (payload.catalogFetchedAt) setCatalogFetchedAt(payload.catalogFetchedAt)
  }
  async function run(label, operation) {
    if (busy.current) return false
    busy.current = true
    const abort = new AbortController(); controller.current = abort
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; abort.abort() }, 120000)
    if (mounted.current) { setActivity(label); setError(''); setNotice('') }
    try { return await operation(abort.signal) }
    catch (caught) { if (mounted.current) { if (caught?.name === 'AbortError') setNotice(timedOut ? '连接超时。可以刷新列表后重试。' : '操作已取消，可刷新列表确认已完成的操作。'); else setError(caught instanceof Error ? caught.message : '操作未完成，请稍后重试。') }; return false }
    finally { clearTimeout(timer); busy.current = false; if (controller.current === abort) controller.current = null; if (mounted.current) setActivity('') }
  }
  async function refreshLocal() { return run('正在读取动画…', async signal => { const payload = await api('list', { method: 'GET', signal }); if (mounted.current) acceptList(payload) }) }
  React.useEffect(() => { refreshLocal() }, [])
  async function updateCatalog(manual = true) {
    if (busy.current || catalogController.current || disabled || previewing || readOnly) return
    const abort = new AbortController(); catalogController.current = abort
    const timer = setTimeout(() => abort.abort(), 20000)
    setCatalogLoading(true); setError(''); if (manual) setNotice('')
    try {
      const local = await api('list', { method: 'GET', signal: abort.signal })
      if (mounted.current) acceptList(local)
      const payload = await api('catalog', { body: {}, signal: abort.signal })
      if (mounted.current) { setCatalog(payload.catalog); setCatalogFetchedAt(payload.fetchedAt || ''); if (manual) setNotice('动画库已更新。') }
    } catch (caught) {
      if (mounted.current) setError(caught?.name === 'AbortError' ? '目录更新已停止，已添加的作品仍可使用。' : `目录更新失败，已添加的作品仍可使用。${caught instanceof Error ? caught.message : ''}`)
    } finally { clearTimeout(timer); if (catalogController.current === abort) catalogController.current = null; if (mounted.current) setCatalogLoading(false) }
  }
  React.useEffect(() => {
    if (view !== 'library' || page.type !== 'browse' || !loaded || busy.current || disabled || previewing || readOnly || catalogAttempted.current) return
    catalogAttempted.current = true; updateCatalog(false)
  }, [view, page.type, loaded, activity, disabled, previewing, readOnly])
  async function useLocal(entry, afterDownload = false) {
    if (!entry || readOnly || entry.unavailable) return false
    if (entry.id === selectedId) return true
    const accepted = await onSelect(entry.id)
    if (!accepted) throw new Error(afterDownload ? '作品已保存到本机，但未能切换。稍后点“使用此动画”重试。' : '未能保存选择，请稍后重试。')
    return true
  }
  async function choose(item) {
    if (blocked || readOnly || !item.local || item.local.id === selectedId) return
    return run('正在切换动画…', async () => { await useLocal(item.local); if (mounted.current) setNotice(`已使用「${item.title}」，下次启动生效。`) })
  }
  async function download(item, useAfter) {
    if (writingBlocked || readOnly || !item.remote || item.local) return
    return run(`正在下载「${item.title}」…`, async signal => {
      const result = await api('download', { body: { id: item.remote.id }, signal }), local = await api('list', { method: 'GET', signal })
      if (mounted.current) { acceptList(local); setPage({ type: 'detail', key: result.entry.id }); pageFocus.current = true }
      if (useAfter) await useLocal(result.entry, true)
      if (mounted.current) setNotice(useAfter ? `已下载并使用「${item.title}」，下次启动生效。` : `「${item.title}」已添加，可以随时预览或使用。`)
    })
  }
  function preview(item) {
    if (blocked || item.unavailable) return
    const descriptor = item.local || (item.remote?.asset && external(item.remote.asset.url) ? { id: `catalog:${item.remote.id}`, title: item.title, kind: 'video', durationSeconds: item.durationSeconds, sourceUrl: item.remote.asset.url, fit } : null)
    if (descriptor) return onPreview(descriptor)
  }
  async function pick(file) {
    if (!file || blocked || readOnly) return
    return run('正在读取视频信息…', async signal => {
      if (!/\.(mp4|webm)$/i.test(file.name)) throw new Error('请选择 MP4 或 WebM 文件。')
      if (!file.size || file.size > MAX_BYTES) throw new Error('视频不能超过120 MB。')
      const durationSeconds = await durationOf(file, signal)
      if (mounted.current) { setPicked({ file, durationSeconds, format: /\.webm$/i.test(file.name) ? 'webm' : 'mp4' }); setTitle(file.name.replace(/\.(mp4|webm)$/i, '').slice(0, 80)); setAuthor(''); setLicense('local-only'); navigate({ type: 'import' }); onOpenLibrary?.() }
    })
  }
  async function importFile(useAfter) {
    if (!picked || !title.trim() || readOnly || writingBlocked) return
    return run('正在导入动画…', async signal => {
      const metadata = { title: title.trim(), author: author.trim() || '本地导入', license, durationSeconds: picked.durationSeconds }
      const result = await api('import', { signal, body: picked.file, headers: { 'content-type': picked.format === 'webm' ? 'video/webm' : 'video/mp4', 'x-awakening-metadata': encodeURIComponent(JSON.stringify(metadata)) } }), local = await api('list', { method: 'GET', signal })
      if (mounted.current) { acceptList(local); setPicked(null); setPage({ type: 'detail', key: result.entry.id }); pageFocus.current = true }
      if (useAfter) await useLocal(result.entry, true)
      if (mounted.current) setNotice(useAfter ? `已导入并使用「${metadata.title}」，下次启动生效。` : `「${metadata.title}」已添加，当前动画不变。`)
    })
  }
  async function remove() {
    if (writingBlocked || readOnly || !removeId || removeId === selectedId) return
    return run('正在移除动画…', async signal => { await api('remove', { body: { id: removeId }, signal }); const payload = await api('list', { method: 'GET', signal }); if (mounted.current) { acceptList(payload); setRemoveId(''); setPage({ type: 'browse' }); pageFocus.current = true; setNotice('已从本机移除，社区原作品不受影响。') } })
  }
  async function copyTemplate() {
    try { await navigator.clipboard.writeText(JSON.stringify(TEMPLATE, null, 2)); setNotice('投稿模板已复制。填写完整后提交审核。'); setError('') }
    catch { setTemplateVisible(true); setError('未能访问剪贴板，可以展开模板手动复制，或保存投稿文件。') }
  }
  function saveTemplate() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(TEMPLATE, null, 2) + '\n'], { type: 'application/json' })), link = document.createElement('a')
    link.href = url; link.download = 'animation.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('投稿模板已保存，填写完成后再提交审核。')
  }
  function categoryKeys(event, index) {
    const values = ['all', 'added', 'community']; let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % 3
    else if (event.key === 'ArrowLeft') next = (index + 2) % 3
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 2
    else return
    event.preventDefault(); setScope(values[next]); event.currentTarget.parentElement.children[next]?.focus()
  }
  const filtered = items.filter(item => (scope !== 'added' || item.local) && (scope !== 'community' || item.remote) && (!search.trim() || `${item.title} ${item.author} ${item.remote?.description || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())))
  const Feedback = () => <div className="awa-library-feedback" aria-live="polite" role={error ? 'alert' : 'status'}>
    {activity ? <div className="awa-notice"><span>{activity}</span><button type="button" className="awa-btn awa-btn--ghost" onClick={() => controller.current?.abort()}>取消</button></div> : catalogLoading ? <div className="awa-notice"><span>正在更新目录，已添加的作品仍可使用。</span><button type="button" className="awa-btn awa-btn--ghost" onClick={() => catalogController.current?.abort()}>停止更新</button></div> : (error || notice) ? <div className={`awa-notice${error ? ' is-error' : ''}`}><span>{error || notice}</span><button type="button" className="awa-icon-btn" aria-label="关闭提示" onClick={() => { setError(''); setNotice('') }}><Icon name="close" size={14} /></button></div> : null}
  </div>
  const Back = () => <button type="button" className="awa-library-back" disabled={previewing} onClick={() => { if (page.type === 'import') setPicked(null); browse() }}><Icon name="arrowLeft" size={14} />返回动画库</button>
  if (view === 'settings') return null
  return <section className="awa-library" aria-label={view === 'current' ? '当前动画' : '动画库'}>
    <style>{LIBRARY_CSS}</style>
    <input ref={fileInput} type="file" accept=".mp4,.webm,video/mp4,video/webm" aria-label="选择动画文件" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; pick(file) }} />
    {view === 'current' ? <>
      <article className="awa-current-card">
        <button type="button" className="awa-current-cover" aria-label="预览当前动画" disabled={blocked || !selectedItem || selectedItem.unavailable} onClick={() => selectedItem && preview(selectedItem)}><AnimationThumbnail entry={selectedItem?.thumbnail || (selectedId === BUILTIN_ANIMATION.id ? BUILTIN_ANIMATION : { id: selectedId, kind: 'video' })} priority /><span className="awa-cover-play"><Icon name="play" size={23} /></span></button>
        <div className="awa-current-copy"><div className="awa-current-text"><h3>{selectedItem?.title || (loaded ? '所选动画不可用' : '正在读取动画')}</h3><p className="awa-work-meta"><span>{selectedItem?.author || (loaded ? '请重新选择动画' : '正在读取本机作品…')}</span>{selectedItem && <span>{seconds(selectedItem.durationSeconds)}</span>}</p></div><div className="awa-work-actions"><button type="button" className="awa-btn" disabled={blocked || !selectedItem || selectedItem.unavailable} onClick={() => selectedItem && preview(selectedItem)}><Icon name="play" />预览</button><button type="button" className="awa-btn awa-btn--primary" disabled={blocked} onClick={onOpenLibrary}><Icon name="library" />更换动画</button></div></div>
      </article>
      {loaded && (selectionMissing || !current || current.unavailable) && <p className="awa-inline-note" role="alert">所选文件已不可用，启动时会使用内置鲸启。请重新选择或导入动画。</p>}<Feedback />
    </> : page.type === 'import' && picked ? <div className="awa-library-subpage" role="group" aria-label="导入动画">
      <Back /><div className="awa-library-form"><h3 ref={heading} tabIndex={-1}>导入动画</h3><div className="awa-import-summary"><Icon name="file" size={25} /><div><h4>{picked.file.name}</h4><p className="awa-work-meta">{seconds(picked.durationSeconds)}<span>{size(picked.file.size)}</span><span>{picked.format.toUpperCase()}</span></p></div></div>
        <div className="awa-library-fields"><label className="awa-library-field">作品名称<input autoComplete="off" type="text" maxLength={80} value={title} disabled={blocked} onChange={event => setTitle(event.target.value)} /></label><label className="awa-library-field">作者（可选）<input autoComplete="off" type="text" maxLength={80} value={author} disabled={blocked} placeholder="本地导入" onChange={event => setAuthor(event.target.value)} /></label></div>
        <p className="awa-inline-note">仅保存在本机，不会自动上传或公开。</p><details className="awa-import-license"><summary>设置作品许可</summary><label className="awa-library-field">使用许可<select value={license} disabled={blocked} onChange={event => setLicense(event.target.value)}>{LICENSES.map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select></label></details>
        <div className="awa-import-actions"><button type="button" className="awa-btn awa-btn--ghost" disabled={blocked} onClick={() => { setPicked(null); browse() }}>取消</button><button type="button" className="awa-btn" disabled={writingBlocked || readOnly || !title.trim()} onClick={() => importFile(false)}>仅导入</button><button type="button" className="awa-btn awa-btn--primary" disabled={writingBlocked || readOnly || !title.trim()} onClick={() => importFile(true)}>导入并使用</button></div>
      </div><Feedback />
    </div> : page.type === 'contribute' ? <div className="awa-library-subpage" role="group" aria-label="创作与投稿">
      <Back /><h3 ref={heading} tabIndex={-1}>分享你的开机动画</h3><p className="awa-inline-note">把你的作品带到这里，让更多人选用。</p><ul className="awa-contribute-list"><li><strong>准备完整视频</strong><p>MP4 或 WebM，包含需要的音轨。1–45 秒、最大120 MB，推荐15–25秒。字幕与人脸尽量保留在中央安全区。</p></li><li><strong>填写作品信息</strong><p>下载模板，填写作品名称、作者、预览图、固定版本视频地址、准确的文件大小与SHA256，以及素材来源和许可。</p></li><li><strong>提交条目，审核后入库</strong><p>当前通过社区仓库的 Pull Request 审核加入。请只提交 entries/ 下的作品条目；复制或保存模板不会上传视频，也不会立即发布。</p></li></ul>
      <div className="awa-work-actions"><button type="button" className="awa-btn awa-btn--primary" onClick={saveTemplate}><Icon name="download" />保存投稿模板</button><button type="button" className="awa-btn" onClick={copyTemplate}><Icon name="copy" />复制投稿模板</button><button type="button" className="awa-btn awa-btn--ghost" onClick={() => setTemplateVisible(!templateVisible)}>{templateVisible ? '收起模板' : '查看模板'}</button></div>{templateVisible && <pre className="awa-template" tabIndex={0} aria-label="投稿JSON模板">{JSON.stringify(TEMPLATE, null, 2)}</pre>}
      <details className="awa-detail-extra"><summary>准备好后在哪里提交？</summary><p className="awa-inline-note">在社区仓库中按说明提交文件；这一步需要你的 GitHub 账号。</p><a href="https://github.com/MingoYung/dsh-awakening-library/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">打开完整投稿说明（新窗口）<Icon name="external" size={12} /></a></details><Feedback />
    </div> : page.type === 'detail' && detail ? <div className="awa-library-subpage" role="group" aria-label="动画详情">
      <Back /><div className="awa-detail-cover"><AnimationThumbnail entry={detail.thumbnail} priority /></div><div className="awa-detail-title"><div><h3 ref={heading} tabIndex={-1}>{detail.title}</h3><p className="awa-work-meta"><span>{detail.author}</span><span>{seconds(detail.durationSeconds)}</span><span>{detail.local?.builtin ? '内置自适应' : '视频动画'}</span></p></div>{detail.local?.id === selectedId && <span className="awa-work-status is-selected"><Icon name="check" size={14} />使用中</span>}</div>
      <p className="awa-detail-description">{detail.local?.description || detail.remote?.description || (detail.local?.kind === 'adaptive' ? '随窗口保留关键构图，22秒完整节奏与作品音轨。' : detail.local?.license === 'local-only' ? '你导入的本地作品，仅保存在这台设备。' : '已添加到本机，随时可以预览或使用。')}</p>{detail.unavailable && <p className="awa-inline-note" role="alert">本机视频文件已不可用，请重新导入或选择其他动画。</p>}
      <div className="awa-detail-actions"><button type="button" className="awa-btn" disabled={blocked || detail.unavailable} onClick={() => preview(detail)}><Icon name="play" />预览</button>{detail.local ? <button type="button" className="awa-btn awa-btn--primary" disabled={blocked || readOnly || detail.unavailable || detail.local.id === selectedId} onClick={() => choose(detail)}><Icon name={detail.local.id === selectedId ? 'check' : 'play'} />{detail.local.id === selectedId ? '使用中' : '使用此动画'}</button> : <><button type="button" className="awa-btn awa-btn--primary" disabled={writingBlocked || readOnly} onClick={() => download(detail, true)}><Icon name="download" />下载并使用</button><button type="button" className="awa-btn awa-btn--ghost" disabled={writingBlocked || readOnly} onClick={() => download(detail, false)}>仅下载</button></>}</div>
      <details className="awa-detail-extra"><summary>作者、许可与文件信息</summary><dl><dt>作者</dt><dd>{detail.author}</dd><dt>许可</dt><dd>{detail.license === 'local-only' ? '仅供本机使用' : detail.license}</dd>{(detail.local?.bytes || detail.remote?.asset?.bytes) && <><dt>文件大小</dt><dd>{size(detail.local?.bytes || detail.remote?.asset?.bytes)}</dd></>}{external(detail.remote?.sourceUrl || detail.local?.sourcePage) && <><dt>来源</dt><dd><a href={external(detail.remote?.sourceUrl || detail.local?.sourcePage)} target="_blank" rel="noreferrer">原作者作品页面<Icon name="external" size={12} /></a></dd></>}{external(detail.remote?.licenseUrl || detail.local?.licenseUrl) && <><dt>许可正文</dt><dd><a href={external(detail.remote?.licenseUrl || detail.local?.licenseUrl)} target="_blank" rel="noreferrer">查看许可<Icon name="external" size={12} /></a></dd></>}{detail.local?.builtin && <><dt>素材署名</dt><dd>本项目制作的动画、生成影像与音轨按声明许可；模型名称与品牌图形的权利由各自权利人保留。</dd></>}</dl></details>
      {detail.local && !detail.local.builtin && detail.local.kind !== 'adaptive' && <div className="awa-detail-extra"><button type="button" className="awa-btn awa-btn--ghost" disabled={writingBlocked || readOnly || detail.local.id === selectedId} onClick={() => setRemoveId(detail.local.id)}>从本机移除</button>{detail.local.id === selectedId && <p className="awa-inline-note">使用中的作品需先切换后再移除。</p>}</div>}{removeId && <div className="awa-remove-confirm" role="group" aria-label="确认移除动画"><p>移除「{detail.title}」及本机视频文件？社区原作品仍会保留。</p><div className="awa-work-actions"><button type="button" className="awa-btn" disabled={blocked} onClick={() => setRemoveId('')}>取消</button><button type="button" className="awa-btn awa-btn--primary" disabled={writingBlocked || readOnly} onClick={remove}>确认移除</button></div></div>}<Feedback />
    </div> : <div className={`awa-file-drop${dragging ? ' is-dragging' : ''}`} onDragEnter={event => { if (!blocked && !readOnly && event.dataTransfer?.types?.includes('Files')) { event.preventDefault(); setDragging(true) } }} onDragOver={event => { if (!blocked && !readOnly && event.dataTransfer?.types?.includes('Files')) event.preventDefault() }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); pick(event.dataTransfer?.files?.[0]) }}>
      <div className="awa-library-head"><div><h3 ref={heading} tabIndex={-1}>动画库</h3><p>发现喜欢的作品，选作下一次开机画面。</p></div><button type="button" className="awa-btn" disabled={blocked || readOnly} onClick={() => fileInput.current?.click()}><Icon name="upload" />导入动画</button></div><div className="awa-library-tools"><label className="awa-library-search"><Icon name="search" /><input type="search" aria-label="搜索动画" placeholder="搜索名称或创作者" value={search} onChange={event => setSearch(event.target.value)} /></label><button type="button" className="awa-icon-btn" disabled={blocked || readOnly} aria-label={catalogLoading ? '停止更新动画库' : '刷新动画库'} title={catalogLoading ? '停止更新' : '刷新动画库'} onClick={() => catalogLoading ? catalogController.current?.abort() : updateCatalog()}><Icon name={catalogLoading ? 'close' : 'refresh'} /></button></div>
      <div className="awa-library-filter-row"><div className="awa-library-scopes" role="tablist" aria-label="作品分类">{[['all', '全部作品'], ['added', '已添加'], ['community', '社区']].map(([value, label], index) => <button key={value} type="button" role="tab" id={`awa-library-category-${value}`} aria-controls="awa-library-results" aria-selected={scope === value} tabIndex={scope === value ? 0 : -1} onKeyDown={event => categoryKeys(event, index)} onClick={() => setScope(value)}>{label}</button>)}</div><span className="awa-library-count">{filtered.length} 部作品</span></div><div className="awa-work-grid" id="awa-library-results" role="tabpanel" aria-labelledby={`awa-library-category-${scope}`}>{filtered.map(item => { const selected = item.local?.id === selectedId; return <article className={`awa-work-card${selected ? ' is-current' : ''}`} key={item.key}>
        <button type="button" className="awa-work-open" aria-label={`查看${item.title}详情`} onClick={() => openDetail(item)}><span className="awa-work-cover"><AnimationThumbnail entry={item.thumbnail} /><span className="awa-cover-play"><Icon name="info" size={16} /></span><span className="awa-work-duration">{seconds(item.durationSeconds)}</span></span><span className="awa-work-info"><span className="awa-work-title">{item.title}</span><span className="awa-work-author">{item.author}</span></span></button><div className="awa-work-footer"><span className={`awa-work-status${selected ? ' is-selected' : ''}`}>{selected ? <><Icon name="check" size={13} />使用中</> : item.unavailable ? '文件不可用' : item.local?.builtin || item.local?.kind === 'adaptive' ? '内置作品' : item.local ? '已添加' : '社区作品'}</span><button type="button" className="awa-btn awa-btn--ghost" disabled={blocked || item.unavailable} aria-label={`预览${item.title}`} onClick={() => preview(item)}><Icon name="play" size={13} />预览</button></div>
      </article> })}</div>{!filtered.length && <div className="awa-library-empty"><Icon name={search ? 'search' : 'library'} size={25} /><p>{search ? '没有找到匹配的作品' : scope === 'community' ? '社区列表还未加载' : '这里还没有作品'}</p><p className="awa-inline-note">{search ? '试试其他名称或作者。' : '可以刷新动画库，或导入你自己的视频。'}</p>{search ? <button type="button" className="awa-btn" onClick={() => setSearch('')}>清除搜索</button> : <button type="button" className="awa-btn" disabled={blocked || readOnly} onClick={() => updateCatalog()}>重新加载</button>}</div>}
      <Feedback /><div className="awa-library-bottom"><p>{catalogFetchedAt ? `目录更新于 ${new Date(catalogFetchedAt).toLocaleDateString()}` : '下载后的作品保存在本机'}<br />开机播放无需联网</p><button type="button" className="awa-btn awa-btn--ghost" disabled={blocked} onClick={() => navigate({ type: 'contribute' })}>创作与投稿<Icon name="chevronRight" size={14} /></button></div>
    </div>}
  </section>
}

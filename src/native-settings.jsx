import React from 'react'

const PATH = '/dsh-awakening/native/'
const ACTIVE = new Set(['preparing', 'worker-ready', 'waiting-exit', 'installing', 'relaunching'])
const JOB_ID = /^[a-z0-9][a-z0-9_-]{7,100}$/i
const DOCS = 'https://github.com/MingoYung/dsh-awakening/blob/main/COMPATIBILITY.md'
const CSS = `
.dsh-awakening-settings .awa-native{margin:0;padding:0 0 10px;min-width:0}
.dsh-awakening-settings .awa-native-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
.dsh-awakening-settings .awa-native h3{font-size:12px;line-height:1.5;font-weight:500;color:var(--awa-muted)}
.dsh-awakening-settings .awa-native-badge{font-size:11px;line-height:1.5;padding:3px 8px;border-radius:6px;white-space:nowrap;background:var(--awa-surface);color:var(--awa-muted)}
.dsh-awakening-settings .awa-native-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
.dsh-awakening-settings .awa-native a{font-size:12px;color:var(--awa-accent);text-underline-offset:3px}
.dsh-awakening-settings .awa-native-confirm{margin-top:12px;padding:12px;border-radius:8px;background:var(--awa-surface)}
.dsh-awakening-settings .awa-native-feedback{min-height:0;margin-top:8px;font-size:12px;line-height:1.65;color:var(--awa-muted)}
.dsh-awakening-settings .awa-native-feedback.awa-error{color:var(--awa-error)}
`

function desktopBridge() { return typeof window.desktopNext?.command === 'function' ? window.desktopNext : null }
function errorCopy(code) {
  if (code === 'job-busy') return '已有首屏操作正在进行，请稍后重新检测。'
  if (code === 'native-required') return '请在本机 DSH NEXT 中安装首屏兼容。'
  if (code === 'native-policy-unavailable') return '暂时无法验证桌面连接，未执行安装操作。请重新打开设置后检测。'
  if (code === 'native-request-denied') return '当前页面未通过本机桌面验证，请从 DSH 主窗口打开设置后重新检测。'
  if (code === 'request-denied') return '操作验证已过期，请重新打开设置后再试。'
  if (code === 'helper-not-ready' || code === 'worker-handshake-timeout') return '安装工具未能准备好，DSH 会保持开启。请重新检测后再试。'
  if (code?.startsWith('unsupported') || code === 'unknown-target') return '当前 DSH 安装版本暂未适配，已保留原来的启动方式。'
  if (code === 'cancelled') return '操作已取消，启动方式保持原样。'
  if (code === 'source-runtime-mismatch') return '当前动画资源未通过检查，已保留原启动方式。请重新安装完整插件包后再试。'
  if (code === 'wait-exit-timeout' || code === 'timeout') return 'DSH 未能在等待时间内完全退出，本次操作已停止。'
  return '操作未能完成，DSH 会保持开启。请重新检测状态后再试。'
}
async function request(endpoint, body) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), body ? 120000 : 20000)
  try {
    const actionToken = window.__DSH_AWAKENING_NATIVE__?.actionToken
    const response = await fetch(PATH + endpoint, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: body ? { 'content-type': 'application/json', 'x-dsh-awakening-token': actionToken || '' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    let value
    try { value = await response.json() } catch { throw Object.assign(new Error('invalid-response'), { code: 'invalid-response' }) }
    if (!response.ok || value?.ok !== true) throw Object.assign(new Error('native-request-failed'), { code: value?.error?.code || 'operation-failed' })
    return value
  } finally { clearTimeout(timeout) }
}

/** The user confirms once; the native helper must be armed before we ask NEXT
 * to quit. A failed preparation or rejected handshake never closes the app. */
export function NativeBootPanel({ disabled = false }) {
  const [status, setStatus] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [confirmation, setConfirmation] = React.useState(null)
  const [feedback, setFeedback] = React.useState('')
  const [error, setError] = React.useState('')
  const alive = React.useRef(true)
  const busy = React.useRef(false)
  const confirmButton = React.useRef(null)
  const native = !!desktopBridge()

  async function refresh() {
    if (busy.current) return
    if (!desktopBridge()) { setStatus({ supported: false, installed: false, reason: 'native-required', job: null }); return }
    busy.current = true
    if (alive.current) { setLoading(true); setError(''); setFeedback('') }
    try {
      const value = await request('status')
      if (alive.current) {
        setStatus(value.status)
        if (value.status?.job?.phase === 'error' || value.status?.job?.phase === 'timeout') setError(errorCopy(value.status.job.errorCode || value.status.job.phase))
        else if (value.status?.job?.phase === 'complete' && value.status.supported && value.status.sourceEligible !== false) setFeedback(value.status.job.action === 'rollback' ? '上次已恢复默认首屏，鲸启动画仍按插件设置播放。' : '上次首屏兼容安装已完成，当前检测通过。')
        else if (value.status?.job?.phase === 'cancelled') setFeedback('上次准备已取消，启动方式保持原样。')
      }
    } catch (caught) {
      if (alive.current) {
        if (caught?.code === 'native-policy-unavailable' || caught?.code === 'native-request-denied') {
          setStatus({ supported: false, installed: false, variant: 'unknown', reason: caught.code, job: null })
        }
        setError(errorCopy(caught?.code))
      }
    }
    finally { busy.current = false; if (alive.current) setLoading(false) }
  }
  React.useEffect(() => {
    alive.current = true
    refresh()
    return () => { alive.current = false }
  }, [])
  React.useEffect(() => { if (confirmation) confirmButton.current?.focus() }, [confirmation])

  async function perform() {
    const action = confirmation
    const allowed = action === 'install'
      ? status?.supported && status?.sourceEligible !== false && status?.canInstall !== false
      : status?.installed && (status?.canRollback === true || (status?.supported && status?.canRollback !== false))
    if (!action || busy.current || disabled || !allowed || !desktopBridge()) return
    busy.current = true
    setPending(true); setError(''); setFeedback('正在检查版本并准备恢复文件，请保持 DSH 开启…')
    let preparedJob = null
    try {
      const result = await request('prepare', { action })
      if (result.phase !== 'prepared' || !JOB_ID.test(result.jobId || '')) throw Object.assign(new Error('helper-not-ready'), { code: 'helper-not-ready' })
      preparedJob = result.jobId
      // Closing the settings section while preparation is running cancels the
      // operation. Keep the response alive long enough to disarm its exact job;
      // aborting the fetch would lose that id while leaving a waiting helper.
      if (!alive.current) {
        try { await request('cancel', { jobId: preparedJob }) } catch {}
        preparedJob = null
        return
      }
      if (alive.current) {
        setConfirmation(null)
        setStatus(previous => ({ ...previous, job: { id: result.jobId, action, phase: 'waiting-exit' } }))
        setFeedback('已准备好，正在退出 DSH；完成后会自动重新打开。')
      }
      await desktopBridge().command({ type: 'quit' })
    } catch (caught) {
      let cancelled = false
      if (preparedJob) {
        try { await request('cancel', { jobId: preparedJob }); cancelled = true } catch {}
      }
      if (alive.current) {
        if (preparedJob) {
          setConfirmation(null)
          setError(cancelled ? 'DSH 的退出请求未完成，已取消本次操作。' : 'DSH 的退出请求未完成。请保持 DSH 开启；准备任务将在等待超时后自行停止。')
          if (cancelled) setStatus(previous => ({ ...previous, job: null }))
        } else setError(errorCopy(caught?.code))
        setFeedback('')
      }
    } finally { busy.current = false; if (alive.current) setPending(false) }
  }

  const activeJob = ACTIVE.has(status?.job?.phase)
  const blocked = disabled || pending || loading || activeJob
  const legacy = status?.variant === 'legacy'
  const needsUpdate = legacy || (status?.installed && status?.upToDate === false)
  const sourceInvalid = status?.sourceEligible === false
  const connectionUnverified = status?.reason === 'native-policy-unavailable' || status?.reason === 'native-request-denied'
  const canInstall = status?.supported && !sourceInvalid && status?.canInstall !== false
  const canRollback = status?.installed && (status?.canRollback === true || (status?.supported && status?.canRollback !== false))
  const badge = loading ? '正在检测' : !native ? '需桌面版' : !status ? '待检测' : sourceInvalid ? '需检查资源' : connectionUnverified ? '连接待确认' : !status.supported ? '暂不支持' : needsUpdate ? '需要更新' : status.installed ? '已安装' : '未安装'
  const copy = !native
    ? '首屏兼容需要在运行 DSH NEXT 的 Windows 电脑上安装。Web 端仍可正常播放鲸启动画，手动工具随插件包提供。'
    : sourceInvalid
      ? '当前动画资源未通过检查，会保留原来的启动方式。请重新安装完整插件包；已安装的首屏兼容仍可恢复。'
      : connectionUnverified
      ? '当前桌面连接尚未通过验证，因此没有显示安装按钮。请从 DSH 主窗口重新打开设置后检测；这不表示你的桌面版本未适配。'
      : status && !status.supported
      ? '当前环境或桌面版本暂未适配，保留原来的启动方式。支持范围和手动工具见安装说明。'
      : needsUpdate
        ? '已有首屏兼容层需要更新，以配合本版插件。更新会保留原始启动资源备份和已有动画设置。'
        : status?.installed
        ? '已提前播放动画，开关、声音和音量继续使用上面的设置。更新 DSH 后请重新检测兼容状态。'
        : '安装一次后，从原来的 DSH 图标打开即可提前播放动画。动画与后台加载同时开始，完成后进入工作界面。'

  return <section className="awa-native" aria-label="首屏兼容">
    <style>{CSS}</style>
    <div className="awa-native-head"><h3>首屏兼容</h3><span className="awa-native-badge">{badge}</span></div>
    <p className="awa-muted">{copy}</p>
    <div className="awa-native-actions">
      {native && canInstall && (!status.installed || needsUpdate) && <button type="button" className="awa-primary" disabled={blocked} onClick={() => { setConfirmation('install'); setError(''); setFeedback('') }}>{needsUpdate ? '更新并重启' : '安装并重启'}</button>}
      {native && canRollback && <button type="button" disabled={blocked} onClick={() => { setConfirmation('rollback'); setError(''); setFeedback('') }}>恢复默认首屏并重启</button>}
      {native && <button type="button" disabled={pending || loading} onClick={refresh}>{loading ? '检测中…' : '重新检测'}</button>}
      <a href={DOCS} target="_blank" rel="noreferrer">安装说明与手动工具 ↗</a>
    </div>
    {confirmation && <div className="awa-native-confirm" role="group" aria-label="确认首屏操作">
      <p className="awa-muted">{confirmation === 'install'
        ? '将备份原始启动资源并退出 DSH，安装完成后自动重新打开。请先保存正在进行的工作。'
        : '将恢复 DSH 默认首屏并退出，完成后自动重新打开。鲸启动画仍按插件设置播放。请先保存正在进行的工作。'}</p>
      <div className="awa-native-actions"><button type="button" disabled={pending} onClick={() => { setConfirmation(null); setFeedback('') }}>取消</button><button ref={confirmButton} type="button" className="awa-primary" disabled={blocked} onClick={perform}>{pending ? '准备中…' : confirmation === 'install' ? '确认安装并重启' : '确认恢复并重启'}</button></div>
    </div>}
    {(feedback || error || activeJob) && <p className={`awa-native-feedback${error ? ' awa-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">{error || feedback || '安装工具已准备好，正在等待 DSH 完全退出。'}</p>}
  </section>
}

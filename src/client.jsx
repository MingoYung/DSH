import React from 'react'

export const name = 'dsh-awakening'
export const inject = ['slots', 'configForms']

const ENTRY_ID = 'dsh-awakening'
const DEFAULTS = Object.freeze({
  enabled: true,
  sound: true,
  volume: 85,
  frequency: 'startup',
  timeoutSeconds: 45,
})

const CSS = `
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
.dsh-awakening-settings .awa-attribution{margin-top:12px;line-height:1.8}
.dsh-awakening-settings .awa-attribution a{color:var(--dsw-alias-brand-primary,#8baaff);text-underline-offset:3px}
@media(max-width:560px){.dsh-awakening-settings .awa-row{gap:14px}.dsh-awakening-settings .awa-header{gap:12px}.dsh-awakening-settings .awa-volume input{max-width:none}.dsh-awakening-settings select{min-width:116px}.dsh-awakening-settings .awa-footer{align-items:flex-start}.dsh-awakening-settings .awa-footer p{flex-basis:100%}}
@media(prefers-reduced-motion:reduce){.dsh-awakening-settings .awa-switch::before{transition:none}}
`

function resolveValues(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULTS.enabled,
    sound: typeof input.sound === 'boolean' ? input.sound : DEFAULTS.sound,
    volume: Number.isInteger(input.volume) && input.volume >= 0 && input.volume <= 100 ? input.volume : DEFAULTS.volume,
    frequency: input.frequency === 'daily' ? 'daily' : DEFAULTS.frequency,
    timeoutSeconds: Number.isInteger(input.timeoutSeconds) && input.timeoutSeconds >= 25 && input.timeoutSeconds <= 60 ? input.timeoutSeconds : DEFAULTS.timeoutSeconds,
  }
}

function createSettingsPanel(form) {
  // ConfigForm methods use `this`; stable wrappers preserve their receiver.
  const subscribe = listener => form.subscribe(listener)
  const getSnapshot = () => form.getSnapshot()

  return function AwakeningSettings() {
    const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    const values = resolveValues(snapshot.value)
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState('')
    const [notice, setNotice] = React.useState('')
    const [previewing, setPreviewing] = React.useState(false)
    const [volumeDraft, setVolumeDraft] = React.useState(values.volume)
    const [timeoutDraft, setTimeoutDraft] = React.useState(String(values.timeoutSeconds))
    const busy = React.useRef(false)
    const mounted = React.useRef(true)
    const volumeEditing = React.useRef(false)
    const timeoutEditing = React.useRef(false)

    React.useEffect(() => {
      mounted.current = true
      return () => { mounted.current = false }
    }, [])
    React.useEffect(() => {
      if (!volumeEditing.current) setVolumeDraft(values.volume)
    }, [values.volume])
    React.useEffect(() => {
      if (!timeoutEditing.current) setTimeoutDraft(String(values.timeoutSeconds))
    }, [values.timeoutSeconds])

    const ready = snapshot.status === 'ready' && snapshot.value !== undefined
    const editable = ready && snapshot.writable === true
    const disabled = !editable || pending

    async function commit(operation, successText = '已保存，下次启动按新设置播放。') {
      if (busy.current || !editable) return false
      busy.current = true
      setPending(true)
      setError('')
      setNotice('')
      try {
        const accepted = await operation()
        if (!accepted) {
          if (mounted.current) setError('设置未能保存，已重新读取宿主的当前值。请稍后重试。')
          return false
        }
        if (mounted.current) setNotice(successText)
        return true
      } catch (caught) {
        if (mounted.current) setError(`保存失败：${caught instanceof Error ? caught.message : '无法连接宿主设置服务。'}`)
        return false
      } finally {
        busy.current = false
        if (mounted.current) setPending(false)
      }
    }

    async function write(field, value) {
      if (form.getSnapshot().value?.[field] === value) return true
      return commit(() => form.set(field, value))
    }

    async function commitVolume(raw) {
      volumeEditing.current = false
      if (busy.current) return
      const next = Number(raw)
      if (!Number.isInteger(next) || next < 0 || next > 100) return
      if (!await write('volume', next)) {
        if (mounted.current) setVolumeDraft(resolveValues(form.getSnapshot().value).volume)
      }
    }

    async function commitTimeout(raw) {
      timeoutEditing.current = false
      if (busy.current) return
      const next = Number(raw)
      if (String(raw).trim() === '' || !Number.isInteger(next) || next < 25 || next > 60) {
        setError('等待上限需要是 25–60 秒之间的整数。')
        setTimeoutDraft(String(resolveValues(form.getSnapshot().value).timeoutSeconds))
        return
      }
      if (!await write('timeoutSeconds', next)) {
        if (mounted.current) setTimeoutDraft(String(resolveValues(form.getSnapshot().value).timeoutSeconds))
      }
    }

    async function preview() {
      if (previewing || busy.current || !ready) return
      setError('')
      const bridge = window.__DSH_AWAKENING_PLUGIN__
      if (typeof bridge?.preview !== 'function') {
        setNotice('预览桥接尚未加载。请重新打开 DSH 后再试；这不会改动当前播放设置。')
        return
      }
      setPreviewing(true)
      setNotice('预览可随时按 Esc 退出。')
      try {
        await bridge.preview({ ...resolveValues(form.getSnapshot().value) })
      } catch (caught) {
        if (mounted.current) setError(`预览未能启动：${caught instanceof Error ? caught.message : '请重新打开 DSH 后再试。'}`)
      } finally {
        if (mounted.current) setPreviewing(false)
      }
    }

    async function reset() {
      if (!editable || busy.current) return
      volumeEditing.current = false
      timeoutEditing.current = false
      const accepted = await commit(
        () => form.mutate(Object.entries(DEFAULTS).map(([field, value]) => ({ op: 'set', path: [field], value }))),
        '已恢复默认：每次启动播放、声音开启、音量 85%、等待上限 45 秒。',
      )
      if (accepted && mounted.current) {
        setVolumeDraft(DEFAULTS.volume)
        setTimeoutDraft(String(DEFAULTS.timeoutSeconds))
      }
    }

    const loadingCopy = snapshot.status === 'loading'
      ? '正在读取宿主保存的设置…'
      : !ready
        ? '宿主尚未提供鲸启配置。请确认插件已完整加载后再试。'
        : !snapshot.writable
          ? '当前连接的宿主设置只读，可以查看设置与预览动画。'
          : ''

    return <section className="dsh-awakening-settings" aria-label="鲸启启动动画设置">
      <style>{CSS}</style>
      <header className="awa-header">
        <div>
          <h2>鲸启</h2>
          <p className="awa-muted">DSH Awakening · 完整动画 22 秒</p>
        </div>
        <button type="button" className="awa-primary" disabled={!ready || pending || previewing} onClick={preview}>
          {previewing ? '预览中…' : '完整预览'}
        </button>
      </header>

      {loadingCopy && <p className="awa-info" role="status">{loadingCopy}</p>}

      <div className="awa-row">
        <div className="awa-copy">
          <label className="awa-heading" htmlFor="awa-enabled">开启启动动画</label>
          <p className="awa-muted">插件接管加载画面后播放鲸启；关闭后直接进入工作界面。</p>
        </div>
        <input className="awa-switch" id="awa-enabled" type="checkbox" role="switch" checked={values.enabled} disabled={disabled} onChange={event => write('enabled', event.target.checked)} />
      </div>

      <div className="awa-row">
        <div className="awa-copy">
          <label className="awa-heading" htmlFor="awa-frequency">播放频率</label>
          <p className="awa-muted">每日首次按这台设备的本地日期计算，手动预览不受限制。</p>
        </div>
        <select id="awa-frequency" value={values.frequency} disabled={disabled} onChange={event => write('frequency', event.target.value)}>
          <option value="startup">每次启动</option>
          <option value="daily">每日首次</option>
        </select>
      </div>

      <div className="awa-row">
        <div className="awa-copy">
          <label className="awa-heading" htmlFor="awa-sound">播放声音</label>
          <p className="awa-muted">包含界面音效与角色原声欢迎语，音量统一调节。</p>
        </div>
        <input className="awa-switch" id="awa-sound" type="checkbox" role="switch" checked={values.sound} disabled={disabled} onChange={event => write('sound', event.target.checked)} />
      </div>

      <div className="awa-volume">
        <label htmlFor="awa-volume">音量</label>
        <input
          id="awa-volume" type="range" min="0" max="100" step="1" value={volumeDraft}
          disabled={disabled || !values.sound} aria-valuetext={`${volumeDraft}%`}
          onPointerDown={() => { volumeEditing.current = true }}
          onChange={event => { volumeEditing.current = true; setVolumeDraft(Number(event.target.value)) }}
          onPointerUp={event => commitVolume(event.currentTarget.value)}
          onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) commitVolume(event.currentTarget.value) }}
          onBlur={event => commitVolume(event.currentTarget.value)}
        />
        <output htmlFor="awa-volume">{volumeDraft}%</output>
      </div>

      <details>
        <summary>高级设置</summary>
        <div className="awa-row">
          <div className="awa-copy">
            <label className="awa-heading" htmlFor="awa-timeout">启动等待上限</label>
            <p className="awa-muted">DSH 迟迟未就绪时，超过上限自动退出动画，显示底层界面。</p>
          </div>
          <div className="awa-number">
            <input id="awa-timeout" type="number" min="25" max="60" step="1" value={timeoutDraft} disabled={disabled}
              onFocus={() => { timeoutEditing.current = true }}
              onChange={event => setTimeoutDraft(event.target.value)}
              onBlur={event => commitTimeout(event.currentTarget.value)}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
            />
            <span>秒</span>
          </div>
        </div>
      </details>

      <footer className="awa-footer">
        <p className="awa-muted">按窗口实际宽高调整构图，横竖切换不重播。<br />保持 22 秒节奏与原声口型。播放中按 Esc 或点击“跳过”退出。</p>
        <button type="button" disabled={disabled} onClick={reset}>恢复默认</button>
      </footer>
      <p className="awa-attribution awa-muted">尾段角色影像与原声：dsh-boot-animation · MIT。<br /><a href="https://github.com/MingoYung/dsh-awakening/blob/main/CREDITS.md" target="_blank" rel="noreferrer">素材来源、作者与许可 ↗</a></p>
      <div className={`awa-feedback${error ? ' awa-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">
        {error || (pending ? '正在保存…' : notice)}
      </div>
    </section>
  }
}

export function apply(ctx) {
  const form = ctx.configForms.get(ENTRY_ID)
  const Panel = createSettingsPanel(form)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-awakening',
    order: 35,
    label: () => '鲸启启动动画',
  }, Panel))
}

export default { name, inject, apply }

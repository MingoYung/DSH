import React from 'react'
import { NativeBootPanel } from './native-settings.jsx'
import { AnimationLibraryPanel, BUILTIN_ANIMATION } from './library-settings.jsx'
import { Icon, SettingsTabs, SETTINGS_CSS, useThemeContrast } from './settings-ui.jsx'

export const name = 'dsh-awakening'
export const inject = ['slots', 'configForms']

const ENTRY_ID = 'dsh-awakening'
const DEFAULTS = Object.freeze({
  enabled: true,
  sound: true,
  volume: 85,
  frequency: 'startup',
  timeoutSeconds: 45,
  animationId: 'builtin:awakening',
  videoFit: 'cover',
})

const TABS = [{ value: 'current', label: '当前动画', icon: 'play' }, { value: 'library', label: '动画库', icon: 'library' }, { value: 'settings', label: '播放设置', icon: 'settings' }]

function resolveValues(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULTS.enabled,
    sound: typeof input.sound === 'boolean' ? input.sound : DEFAULTS.sound,
    volume: Number.isInteger(input.volume) && input.volume >= 0 && input.volume <= 100 ? input.volume : DEFAULTS.volume,
    frequency: input.frequency === 'daily' ? 'daily' : DEFAULTS.frequency,
    timeoutSeconds: Number.isInteger(input.timeoutSeconds) && input.timeoutSeconds >= 25 && input.timeoutSeconds <= 60 ? input.timeoutSeconds : DEFAULTS.timeoutSeconds,
    animationId: typeof input.animationId === 'string' && /^(builtin:(?:awakening|codex|claude-code)|video:[a-f0-9]{24})$/.test(input.animationId) ? input.animationId : DEFAULTS.animationId,
    videoFit: input.videoFit === 'contain' ? 'contain' : DEFAULTS.videoFit,
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
    const [libraryBusy, setLibraryBusy] = React.useState(false)
    const [selectedAnimation, setSelectedAnimation] = React.useState(BUILTIN_ANIMATION)
    const [tab, setTab] = React.useState('current')
    const prefix = React.useId()
    const panelRef = React.useRef(null)
    useThemeContrast(panelRef)
    const [volumeDraft, setVolumeDraft] = React.useState(values.volume)
    const [timeoutDraft, setTimeoutDraft] = React.useState(String(values.timeoutSeconds))
    const busy = React.useRef(false)
    const mounted = React.useRef(true)
    const volumeEditing = React.useRef(false)
    const timeoutEditing = React.useRef(false)
    const previewFocusTarget = React.useRef(null)

    React.useEffect(() => {
      mounted.current = true
      return () => {
        mounted.current = false
        previewFocusTarget.current = null
      }
    }, [])
    React.useEffect(() => {
      if (!volumeEditing.current) setVolumeDraft(values.volume)
    }, [values.volume])
    React.useEffect(() => {
      if (!timeoutEditing.current) setTimeoutDraft(String(values.timeoutSeconds))
    }, [values.timeoutSeconds])

    const ready = snapshot.status === 'ready' && snapshot.value !== undefined
    const editable = ready && snapshot.writable === true
    const disabled = !editable || pending || libraryBusy || previewing

    React.useLayoutEffect(() => {
      if (previewing) return
      const target = previewFocusTarget.current
      previewFocusTarget.current = null
      // Run after React has committed disabled=false on the preview button.
      if (mounted.current && target?.isConnected && !target.disabled && typeof target.focus === 'function') target.focus({ preventScroll: true })
    }, [previewing])

    async function commit(operation, successText = '已保存，下次启动生效。') {
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

    async function preview(animation) {
      if (previewing || busy.current || !ready) return
      const descriptor = animation?.sourceUrl ? animation : selectedAnimation
      if (!descriptor || (animation?.sourceUrl ? false : descriptor.id !== resolveValues(form.getSnapshot().value).animationId)) {
        setError('当前动画尚未读取或文件已不可用，请重新读取本地动画后选择一部作品。')
        return
      }
      setError('')
      const bridge = window.__DSH_AWAKENING_PLUGIN__
      if (typeof bridge?.preview !== 'function') {
        setNotice('预览桥接尚未加载。请重新打开 DSH 后再试；这不会改动当前播放设置。')
        return
      }
      const previewTrigger = document.activeElement
      previewFocusTarget.current = null
      setPreviewing(true)
      setNotice('预览可随时按 Esc 退出。')
      try {
        const result = await bridge.preview({ ...resolveValues(form.getSnapshot().value) }, descriptor)
        if (mounted.current) {
          if (['media-error', 'animation-unavailable'].includes(result?.reason)) setError('视频未能正常播放。请确认格式可用，或重新下载这部作品。')
          else setNotice(result?.reason === 'complete' ? '预览结束。' : '已退出预览。')
        }
      } catch (caught) {
        if (mounted.current) setError(`预览未能启动：${caught instanceof Error ? caught.message : '请重新打开 DSH 后再试。'}`)
      } finally {
        if (mounted.current) {
          previewFocusTarget.current = previewTrigger
          setPreviewing(false)
        }
      }
    }

    async function reset() {
      if (!editable || busy.current) return
      volumeEditing.current = false
      timeoutEditing.current = false
      const accepted = await commit(
        () => form.mutate(Object.entries(DEFAULTS).map(([field, value]) => ({ op: 'set', path: [field], value }))),
        '已重置播放设置，已添加的动画和首屏兼容层保留。',
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

    const navigationDisabled = pending || previewing || libraryBusy
    const frequencyText = values.frequency === 'daily' ? '每日首次播放' : '每次启动播放'
    const soundText = values.sound ? `声音 ${values.volume}%` : '声音已关闭'

    return <section ref={panelRef} className="dsh-awakening-settings" aria-label="鲸启启动动画设置">
      <style>{SETTINGS_CSS}</style>
      <header className="awa-head">
        <div><h2>鲸启</h2><p className="awa-muted">管理开机动画与播放方式</p></div>
        <label className="awa-enable" htmlFor="awa-enabled">
          <span>{values.enabled ? '已开启' : '已关闭'}</span>
          <input className="awa-switch" id="awa-enabled" type="checkbox" role="switch" aria-label="开启启动动画" checked={values.enabled} disabled={disabled} onChange={event => write('enabled', event.target.checked)} />
        </label>
      </header>

      <SettingsTabs items={TABS} value={tab} onChange={setTab} disabled={navigationDisabled} prefix={prefix} />
      {loadingCopy && <p className="awa-notice" role="status" style={{ marginBottom: 14 }}>{loadingCopy}</p>}

      {TABS.filter(item => item.value !== tab).map(item => <div key={item.value} hidden id={`${prefix}-panel-${item.value}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${item.value}`} />)}
      <div className="awa-page" id={`${prefix}-panel-${tab}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${tab}`}>
        <AnimationLibraryPanel selectedId={values.animationId} fit={values.videoFit}
          disabled={!ready || pending} readOnly={!editable} previewing={previewing} view={tab}
          onSelect={id => write('animationId', id)} onPreview={preview}
          onSelectionChange={setSelectedAnimation} onBusyChange={setLibraryBusy}
          onOpenLibrary={() => setTab('library')} onOpenSettings={() => setTab('settings')} />

        {tab === 'current' && <button type="button" className="awa-summary-link" disabled={navigationDisabled} onClick={() => setTab('settings')}>
          <span className="awa-summary-copy"><Icon name="settings" /><span>{values.enabled ? frequencyText : '启动动画已关闭'} · {soundText}</span></span>
          <Icon name="chevronRight" size={15} />
        </button>}

        {tab === 'settings' && <div className="awa-page">
          <section className="awa-settings-group" aria-labelledby={`${prefix}-playback-title`}>
            <h3 id={`${prefix}-playback-title`}>播放方式</h3>
            <div className="awa-row">
              <div className="awa-copy"><label className="awa-heading" htmlFor="awa-frequency">播放频率</label><p className="awa-muted">预览不受频率限制。</p></div>
              <select id="awa-frequency" value={values.frequency} disabled={disabled} onChange={event => write('frequency', event.target.value)}>
                <option value="startup">每次启动</option><option value="daily">每日首次</option>
              </select>
            </div>
            <div className="awa-row awa-row--fit">
              <div className="awa-copy"><p className="awa-heading" id={`${prefix}-fit-label`}>视频显示</p><p className="awa-muted">用于导入和社区视频；三部内置作品自动保留关键构图。</p></div>
              <div className="awa-choice" role="group" aria-labelledby={`${prefix}-fit-label`}>
                <button type="button" aria-pressed={values.videoFit === 'cover'} disabled={disabled} onClick={() => write('videoFit', 'cover')}>填满窗口</button>
                <button type="button" aria-pressed={values.videoFit === 'contain'} disabled={disabled} onClick={() => write('videoFit', 'contain')}>完整画面</button>
              </div>
            </div>
          </section>

          <section className="awa-settings-group" aria-labelledby={`${prefix}-audio-title`}>
            <h3 id={`${prefix}-audio-title`}>声音</h3>
            <div className="awa-row" style={{ borderBottom: 0 }}>
              <div className="awa-copy"><label className="awa-heading" htmlFor="awa-sound">播放作品音轨</label><p className="awa-muted">内置作品保留各自的音效和角色欢迎语。</p></div>
              <input className="awa-switch" id="awa-sound" type="checkbox" role="switch" checked={values.sound} disabled={disabled} onChange={event => write('sound', event.target.checked)} />
            </div>
            <div className="awa-volume">
              <label className="awa-volume-label" htmlFor="awa-volume">音量</label>
              <input id="awa-volume" type="range" min="0" max="100" step="1" value={volumeDraft}
                disabled={disabled || !values.sound} aria-valuetext={`${volumeDraft}%`}
                onPointerDown={() => { volumeEditing.current = true }}
                onChange={event => { volumeEditing.current = true; setVolumeDraft(Number(event.target.value)) }}
                onPointerUp={event => commitVolume(event.currentTarget.value)}
                onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) commitVolume(event.currentTarget.value) }}
                onBlur={event => commitVolume(event.currentTarget.value)} />
              <output htmlFor="awa-volume">{volumeDraft}%</output>
            </div>
          </section>

          <details className="awa-disclosure">
            <summary><span>首屏播放</span><Icon name="chevronDown" size={16} /></summary>
            <div className="awa-disclosure-body"><NativeBootPanel disabled={disabled} /></div>
          </details>
          <details className="awa-disclosure" style={{ marginTop: 0 }}>
            <summary><span>高级设置</span><Icon name="chevronDown" size={16} /></summary>
            <div className="awa-disclosure-body">
              <div className="awa-row">
                <div className="awa-copy"><label className="awa-heading" htmlFor="awa-timeout">启动等待上限</label><p className="awa-muted">至少容纳作品长度与 3 秒缓冲，最长 60 秒。</p></div>
                <div className="awa-number"><input id="awa-timeout" type="number" min="25" max="60" step="1" value={timeoutDraft} disabled={disabled}
                  onFocus={() => { timeoutEditing.current = true }} onChange={event => setTimeoutDraft(event.target.value)}
                  onBlur={event => commitTimeout(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} /><span>秒</span></div>
              </div>
              <div className="awa-reset"><div><p className="awa-heading">恢复播放默认值</p><p className="awa-muted">切回内置鲸启，保留动画库和首屏兼容层。</p></div><button type="button" className="awa-btn" disabled={disabled} onClick={reset}>重置播放设置</button></div>
            </div>
          </details>
          <details className="awa-disclosure" style={{ marginTop: 0 }}>
            <summary><span>关于与素材署名</span><Icon name="chevronDown" size={16} /></summary>
            <div className="awa-disclosure-body"><p className="awa-muted">鲸启是 DSH 社区插件。三部内置动画由本项目制作，使用 CC BY 4.0 许可的项目有权部分；模型名称与品牌图形的权利归各自权利人。</p><p className="awa-muted" style={{ marginTop: 8 }}><a href="https://github.com/MingoYung/dsh-awakening/blob/main/CREDITS.md" target="_blank" rel="noreferrer">查看完整素材来源与许可</a></p></div>
          </details>
        </div>}
      </div>
      {(error || pending || notice) && <div className={`awa-feedback awa-notice${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">{error || (pending ? '正在保存…' : notice)}</div>}
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

import React from 'react'

const paths = {
  play: <path d="m9 5 11 7-11 7z" />,
  library: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="16" rx="1.5" /><path d="m18 4 4 15-4 1-4-15" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  download: <><path d="M12 3v13m-5-5 5 5 5-5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17" /></>,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.2" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14" /><path d="M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8m-8 4h5" /></>,
  volume: <><path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  settings: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="M8 3v6m8 0v6m-6 0v6" /></>,
}

export function Icon({ name, size = 16, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name] || paths.file}</svg>
}

// A host may choose a pale brand color without exposing its matching on-brand
// token. Derive only that text fallback; the host palette still owns the UI.
export function useThemeContrast(ref) {
  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    let frame = 0
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;color:var(--awa-accent);background-color:var(--dsw-alias-bg-base,Canvas)'
    element.append(probe)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    function measure() {
      frame = 0
      const computed = getComputedStyle(probe)
      let channels
      if (context) {
        // Canvas converts modern CSS colors (including color(srgb)/oklch)
        // into sRGB bytes, and composites translucent brand colors correctly.
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = computed.backgroundColor
        context.fillRect(0, 0, 1, 1)
        context.fillStyle = computed.color
        context.fillRect(0, 0, 1, 1)
        channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      } else if (/^rgba?\(/.test(computed.color)) channels = computed.color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
      if (!channels || channels.length !== 3) return
      const rgb = channels.map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 })
      const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
      const foreground = (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000' : '#fff'
      if (element.style.getPropertyValue('--awa-accent-contrast') !== foreground) element.style.setProperty('--awa-accent-contrast', foreground)
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(measure) }
    const observer = new MutationObserver(schedule)
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) observer.observe(ancestor, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'] })
    if (document.head) observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', schedule)
    measure()
    return () => { observer.disconnect(); scheme.removeEventListener('change', schedule); if (frame) cancelAnimationFrame(frame); probe.remove() }
  }, [ref])
}

export function SettingsTabs({ items, value, onChange, disabled = false, prefix }) {
  const buttons = React.useRef([])
  function move(event, index) {
    if (disabled) return
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault(); onChange(items[next].value); buttons.current[next]?.focus()
  }
  return <div className="awa-tabs" role="tablist" aria-label="启动动画功能">
    {items.map((item, index) => <button key={item.value} ref={node => { buttons.current[index] = node }}
      id={`${prefix}-tab-${item.value}`} type="button" role="tab" aria-selected={value === item.value}
      aria-controls={`${prefix}-panel-${item.value}`} tabIndex={value === item.value ? 0 : -1}
      disabled={disabled} onClick={() => onChange(item.value)} onKeyDown={event => move(event, index)}>
      <Icon name={item.icon} size={16} /><span>{item.label}</span>
    </button>)}
  </div>
}

export const SETTINGS_CSS = `
.dsh-awakening-settings{
 --awa-fg:var(--dsw-alias-label-primary,CanvasText);
 --awa-muted:var(--dsw-alias-label-secondary,color-mix(in srgb,CanvasText 62%,Canvas));
 --awa-border:var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 14%,transparent));
 --awa-surface:var(--dsw-alias-bg-layer-1,color-mix(in srgb,CanvasText 3%,Canvas));
 --awa-surface-hover:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,Canvas));
 --awa-accent:var(--dsw-alias-brand-primary,Highlight);
 --awa-accent-fg:var(--dsw-alias-label-on-brand,var(--awa-accent-contrast,HighlightText));
 --awa-error:var(--dsw-alias-status-error,CanvasText);
 color:var(--awa-fg);font:inherit;font-size:14px;line-height:1.5;width:100%;max-width:760px;min-width:0;
}
.dsh-awakening-settings :where(*){box-sizing:border-box}
.dsh-awakening-settings :where(h2,h3,h4,p){margin:0}
.dsh-awakening-settings :where(button,input,select,textarea){font:inherit;color:inherit}
.dsh-awakening-settings :where(button){display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:7px 12px;border:1px solid var(--awa-border);border-radius:8px;background:var(--awa-surface);font-size:12px;line-height:1.4;cursor:pointer;transition:background-color 150ms ease,border-color 150ms ease,opacity 150ms ease}
.dsh-awakening-settings :where(button:hover:not(:disabled)){background:var(--awa-surface-hover)}
.dsh-awakening-settings :where(button:disabled,input:disabled,select:disabled){cursor:default;opacity:.48}
.dsh-awakening-settings :where(button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible,a:focus-visible){outline:2px solid var(--awa-accent);outline-offset:3px}
.dsh-awakening-settings .awa-btn{font-size:12px;white-space:nowrap;text-decoration:none}
.dsh-awakening-settings .awa-btn--primary,.dsh-awakening-settings .awa-primary{background:var(--awa-accent);border-color:var(--awa-accent);color:var(--awa-accent-fg)}
.dsh-awakening-settings .awa-btn--primary:hover:not(:disabled),.dsh-awakening-settings .awa-primary:hover:not(:disabled){background:var(--awa-accent);filter:brightness(1.04)}
.dsh-awakening-settings .awa-btn--ghost{background:transparent;border-color:transparent}
.dsh-awakening-settings .awa-btn--ghost:hover:not(:disabled){background:var(--awa-surface-hover)}
.dsh-awakening-settings .awa-icon-btn{width:34px;min-width:34px;padding:7px;flex-shrink:0}
.dsh-awakening-settings .awa-muted{color:var(--awa-muted);font-size:12px;line-height:1.65}
.dsh-awakening-settings .awa-heading{font-size:14px;font-weight:500}
.dsh-awakening-settings .awa-notice{color:var(--awa-muted);font-size:12px;line-height:1.65;padding:10px 12px;border-radius:8px;background:var(--awa-surface);overflow-wrap:anywhere}
.dsh-awakening-settings .awa-notice.is-error,.dsh-awakening-settings .awa-error{color:var(--awa-error)}
.dsh-awakening-settings .awa-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
.dsh-awakening-settings .awa-head h2{font-size:18px;font-weight:600;line-height:1.4;letter-spacing:0}
.dsh-awakening-settings .awa-head .awa-muted{margin-top:3px}
.dsh-awakening-settings .awa-enable{display:flex;align-items:center;gap:9px;font-size:12px;color:var(--awa-muted);white-space:nowrap}
.dsh-awakening-settings .awa-tabs{display:flex;gap:4px;padding:4px;margin-bottom:22px;background:var(--awa-surface);border-radius:10px;min-width:0}
.dsh-awakening-settings .awa-tabs [role=tab]{flex:1;min-width:0;gap:7px;min-height:36px;padding:7px 10px;background:transparent;border-color:transparent;border-radius:7px;font-size:13px;color:var(--awa-muted);white-space:nowrap}
.dsh-awakening-settings .awa-tabs [aria-selected=true]{background:var(--dsw-alias-bg-base,Canvas);color:var(--awa-fg);box-shadow:0 1px 3px color-mix(in srgb,CanvasText 7%,transparent)}
.dsh-awakening-settings .awa-tabs [role=tab]:hover:not(:disabled):not([aria-selected=true]){background:var(--awa-surface-hover)}
.dsh-awakening-settings .awa-page{animation:awa-page-enter 160ms ease both;min-width:0}
.dsh-awakening-settings .awa-page[hidden]{display:none}
.dsh-awakening-settings .awa-summary-link{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:14px 0;margin-top:14px;border:0;border-top:1px solid var(--awa-border);border-radius:0;background:transparent;text-align:left;color:var(--awa-muted);font-size:12px}
.dsh-awakening-settings .awa-summary-link:hover:not(:disabled){background:transparent;color:var(--awa-fg)}
.dsh-awakening-settings .awa-summary-copy{display:flex;align-items:center;gap:9px;min-width:0}
.dsh-awakening-settings .awa-settings-group+.awa-settings-group{margin-top:24px}
.dsh-awakening-settings .awa-settings-group h3{font-size:13px;font-weight:600;margin-bottom:4px}
.dsh-awakening-settings .awa-settings-group>p{margin-bottom:10px}
.dsh-awakening-settings .awa-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 0;border-bottom:1px solid var(--awa-border)}
.dsh-awakening-settings .awa-row:last-child{border-bottom:0}
.dsh-awakening-settings .awa-copy{flex:1;min-width:0}
.dsh-awakening-settings .awa-copy .awa-muted{margin-top:4px;max-width:46em}
.dsh-awakening-settings :where(select,input[type=number],input[type=text],textarea){border:1px solid var(--awa-border);border-radius:8px;background:var(--dsw-alias-bg-base,Canvas);min-height:34px;padding:7px 10px;font-size:12px;line-height:1.4}
.dsh-awakening-settings select{max-width:100%;min-width:130px}
.dsh-awakening-settings input[type=number]{width:78px;font-variant-numeric:tabular-nums}
.dsh-awakening-settings .awa-switch{appearance:none;-webkit-appearance:none;display:block;width:34px;min-width:34px;height:21px;min-height:0;padding:0;position:relative;margin:0;background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 25%,Canvas));border:1px solid var(--awa-border);border-radius:20px;cursor:pointer}
.dsh-awakening-settings .awa-switch::before{content:'';position:absolute;width:15px;height:15px;top:2px;left:2px;background:var(--dsw-alias-label-on-brand,Canvas);border-radius:50%;box-shadow:0 1px 2px #0002;transition:transform 150ms ease}
.dsh-awakening-settings .awa-switch:checked{background:var(--awa-accent);border-color:var(--awa-accent)}
.dsh-awakening-settings .awa-switch:checked::before{transform:translateX(13px);background:var(--awa-accent-fg)}
.dsh-awakening-settings .awa-choice{display:inline-flex;flex-shrink:0;gap:3px;padding:3px;border:1px solid var(--awa-border);border-radius:9px}
.dsh-awakening-settings .awa-choice button{min-height:29px;padding:5px 9px;font-size:12px;border-color:transparent;background:transparent;border-radius:6px;color:var(--awa-muted);white-space:nowrap}
.dsh-awakening-settings .awa-choice button[aria-pressed=true]{background:var(--awa-surface-hover);color:var(--awa-fg)}
.dsh-awakening-settings .awa-volume{display:flex;align-items:center;gap:12px;margin:0;padding:7px 0 4px}
.dsh-awakening-settings .awa-volume input{min-width:0;flex:1;accent-color:var(--awa-accent);height:5px;margin:0;cursor:pointer}
.dsh-awakening-settings .awa-volume output{font-size:12px;min-width:39px;text-align:right;color:var(--awa-muted);font-variant-numeric:tabular-nums}
.dsh-awakening-settings .awa-volume-label{font-size:12px;min-width:27px;color:var(--awa-muted)}
.dsh-awakening-settings .awa-disclosure{border-top:1px solid var(--awa-border);margin-top:20px}
.dsh-awakening-settings .awa-disclosure>summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;font-size:13px;font-weight:500;cursor:pointer;list-style:none}
.dsh-awakening-settings .awa-disclosure>summary::-webkit-details-marker{display:none}
.dsh-awakening-settings .awa-disclosure>summary>svg{color:var(--awa-muted);transition:transform 150ms ease}
.dsh-awakening-settings .awa-disclosure[open]>summary>svg{transform:rotate(180deg)}
.dsh-awakening-settings .awa-disclosure-body{padding-bottom:4px}
.dsh-awakening-settings .awa-number{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--awa-muted);white-space:nowrap}
.dsh-awakening-settings .awa-reset{display:flex;justify-content:space-between;align-items:center;gap:16px;border-top:1px solid var(--awa-border);padding-top:16px;margin-top:16px}
.dsh-awakening-settings .awa-feedback{margin-top:14px}
.dsh-awakening-settings a{color:var(--awa-accent);text-underline-offset:3px}
@keyframes awa-page-enter{from{opacity:.45;transform:translateY(3px)}to{opacity:1;transform:none}}
@media(max-width:480px){.dsh-awakening-settings .awa-head{gap:12px}.dsh-awakening-settings .awa-tabs{gap:2px;margin-bottom:18px}.dsh-awakening-settings .awa-tabs [role=tab]{gap:5px;padding:7px 5px;font-size:12px}.dsh-awakening-settings .awa-row{gap:12px}.dsh-awakening-settings .awa-row--fit{align-items:flex-start;flex-wrap:wrap}.dsh-awakening-settings .awa-row--fit>.awa-copy{flex-basis:100%}.dsh-awakening-settings .awa-choice{width:100%}.dsh-awakening-settings .awa-choice button{flex:1}.dsh-awakening-settings .awa-enable>span{display:none}.dsh-awakening-settings .awa-reset{align-items:flex-start}.dsh-awakening-settings .awa-summary-copy{align-items:flex-start}}
@media(prefers-reduced-motion:reduce){.dsh-awakening-settings :where(*),.dsh-awakening-settings :where(*)::before,.dsh-awakening-settings :where(*)::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(forced-colors:active){.dsh-awakening-settings .awa-tabs [aria-selected=true]{outline:1px solid Highlight;box-shadow:none}.dsh-awakening-settings .awa-switch{appearance:auto;-webkit-appearance:auto;accent-color:Highlight}.dsh-awakening-settings .awa-switch::before{display:none}}
`

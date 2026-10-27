export const LIBRARY_CSS = `
.dsh-awakening-settings .awa-library{min-width:0}
.dsh-awakening-settings .awa-library p,.dsh-awakening-settings .awa-library h3,.dsh-awakening-settings .awa-library h4{margin:0}
.dsh-awakening-settings .awa-library h3{font-size:18px;line-height:1.45;font-weight:600;letter-spacing:0}
.dsh-awakening-settings .awa-library h4{font-size:14px;line-height:1.5;font-weight:600}
.dsh-awakening-settings .awa-artwork{position:relative;display:block;overflow:hidden;background:color-mix(in srgb,var(--awa-fg) 4%,transparent);width:100%;height:100%;isolation:isolate}
.dsh-awakening-settings .awa-artwork img{width:100%;height:100%;display:block;object-fit:cover}
.dsh-awakening-settings .awa-artwork-empty{height:100%;min-height:110px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--awa-muted);font-size:12px}
.dsh-awakening-settings .awa-current-card{border:1px solid var(--awa-border);border-radius:12px;overflow:hidden}
.dsh-awakening-settings .awa-current-cover{position:relative;display:block;width:100%;aspect-ratio:16/9;max-height:280px;border:0;border-radius:0;padding:0;overflow:hidden;cursor:pointer;background:var(--awa-surface)}
.dsh-awakening-settings .awa-cover-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,Canvas 85%,transparent);color:CanvasText;box-shadow:0 2px 12px #0002;transition:opacity 160ms ease,background 160ms ease;opacity:.92}
.dsh-awakening-settings .awa-current-cover:hover .awa-cover-play{opacity:1;background:Canvas}
.dsh-awakening-settings .awa-current-copy{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dsh-awakening-settings .awa-current-text{flex:1;min-width:130px}
.dsh-awakening-settings .awa-current-text h3{font-size:17px}
.dsh-awakening-settings .awa-current-text h3,.dsh-awakening-settings .awa-detail-title h3{overflow-wrap:anywhere}
.dsh-awakening-settings .awa-work-meta{font-size:12px;color:var(--awa-muted);line-height:1.7;margin-top:4px!important;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dsh-awakening-settings .awa-work-meta span{min-width:0;max-width:100%;overflow-wrap:anywhere}
.dsh-awakening-settings .awa-work-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-awakening-settings .awa-library-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.dsh-awakening-settings .awa-library-head p{font-size:12px;color:var(--awa-muted);line-height:1.6;margin-top:4px}
.dsh-awakening-settings .awa-library-tools{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.dsh-awakening-settings .awa-library-tools>.awa-icon-btn{flex:none}
.dsh-awakening-settings .awa-library-search{display:flex;align-items:center;gap:8px;min-width:0;flex:1;border:1px solid var(--awa-border);border-radius:8px;min-height:36px;padding:0 11px;color:var(--awa-muted);background:var(--awa-surface)}
.dsh-awakening-settings .awa-library-search:focus-within{outline:2px solid var(--awa-accent);outline-offset:2px}
.dsh-awakening-settings .awa-library-search input{border:0;outline:none;min-width:0;width:100%;background:none;color:var(--awa-fg);font:inherit;font-size:13px;padding:8px 0;box-shadow:none}
.dsh-awakening-settings .awa-library-search input:focus-visible{outline:none}
.dsh-awakening-settings .awa-library-filter-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.dsh-awakening-settings .awa-library-scopes{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.dsh-awakening-settings .awa-library-scopes button{min-height:30px;padding:5px 10px;font:inherit;font-size:12px;color:var(--awa-muted);border:0;border-radius:7px;background:transparent;cursor:pointer;transition:background 160ms ease,color 160ms ease}
.dsh-awakening-settings .awa-library-scopes button:hover{background:var(--awa-surface-hover);color:var(--awa-fg)}
.dsh-awakening-settings .awa-library-scopes button[aria-selected=true]{background:var(--awa-surface-hover);color:var(--awa-fg);font-weight:600}
.dsh-awakening-settings .awa-library-count{font-size:11px;color:var(--awa-muted)}
.dsh-awakening-settings .awa-work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.dsh-awakening-settings .awa-work-card{border:1px solid var(--awa-border);border-radius:12px;overflow:hidden;min-width:0;transition:border-color 160ms ease;background:transparent}
.dsh-awakening-settings .awa-work-card.is-current{border-color:var(--awa-accent)}
.dsh-awakening-settings .awa-work-open{display:block;width:100%;border:0;background:none;color:inherit;text-align:left;padding:0;cursor:pointer;border-radius:0;font:inherit}
.dsh-awakening-settings .awa-work-cover{display:block;position:relative;width:100%;aspect-ratio:16/10;overflow:hidden}
.dsh-awakening-settings .awa-work-open .awa-cover-play{width:34px;height:34px;opacity:0;transition:opacity 160ms ease}
.dsh-awakening-settings .awa-work-open:hover .awa-cover-play,.dsh-awakening-settings .awa-work-open:focus-visible .awa-cover-play{opacity:1}
.dsh-awakening-settings .awa-work-duration{position:absolute;bottom:8px;right:8px;border-radius:5px;background:#000a;color:white;font-size:11px;line-height:1.4;padding:3px 6px;font-variant-numeric:tabular-nums}
.dsh-awakening-settings .awa-work-info{padding:12px 12px 0;display:block;min-width:0}
.dsh-awakening-settings .awa-work-title{display:block;font-weight:600;font-size:13px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;line-height:1.5}
.dsh-awakening-settings .awa-work-author{display:block;font-size:11px;color:var(--awa-muted);line-height:1.6;margin-top:3px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.dsh-awakening-settings .awa-work-footer{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 12px 12px;min-height:49px}
.dsh-awakening-settings .awa-work-footer .awa-btn{min-height:30px;padding:5px 9px;font-size:12px}
.dsh-awakening-settings .awa-work-status{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--awa-muted)}
.dsh-awakening-settings .awa-work-status.is-selected{color:var(--awa-accent)}
.dsh-awakening-settings .awa-library-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid var(--awa-border);flex-wrap:wrap}
.dsh-awakening-settings .awa-library-bottom p{font-size:11px;color:var(--awa-muted);line-height:1.65}
.dsh-awakening-settings .awa-library-empty{padding:36px 18px;text-align:center;border:1px dashed var(--awa-border);border-radius:12px;color:var(--awa-muted);font-size:13px;line-height:1.8}
.dsh-awakening-settings .awa-library-empty svg{display:block;margin:0 auto 10px}
.dsh-awakening-settings .awa-library-empty .awa-btn{margin-top:12px}
.dsh-awakening-settings .awa-inline-note{font-size:12px;color:var(--awa-muted);line-height:1.7;margin:12px 0!important}
.dsh-awakening-settings .awa-library-feedback{margin:12px 0 0;min-height:0;font-size:12px;line-height:1.7;overflow-wrap:anywhere}
.dsh-awakening-settings .awa-library-feedback:empty{display:none}
.dsh-awakening-settings .awa-library-feedback .awa-notice{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dsh-awakening-settings .awa-library-back{display:flex;align-items:center;gap:6px;min-height:30px;margin:0 0 14px;padding:3px 0;border:0;background:transparent;color:var(--awa-muted);font:inherit;font-size:12px;cursor:pointer}
.dsh-awakening-settings .awa-library-back:hover{color:var(--awa-fg)}
.dsh-awakening-settings .awa-detail-cover{aspect-ratio:16/9;max-height:310px;border-radius:12px;overflow:hidden;border:1px solid var(--awa-border)}
.dsh-awakening-settings .awa-detail-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-top:18px}
.dsh-awakening-settings .awa-detail-title>div{min-width:0;flex:1}
.dsh-awakening-settings .awa-detail-description{font-size:13px;line-height:1.75;color:var(--awa-muted);margin-top:14px!important;white-space:pre-line}
.dsh-awakening-settings .awa-detail-actions{display:flex;align-items:center;gap:8px;margin-top:18px;flex-wrap:wrap}
.dsh-awakening-settings .awa-detail-extra{margin-top:22px;border-top:1px solid var(--awa-border);padding-top:12px;font-size:12px;color:var(--awa-muted)}
.dsh-awakening-settings .awa-detail-extra summary{cursor:pointer;padding:3px 0;font-size:12px;line-height:1.6}
.dsh-awakening-settings .awa-detail-extra dl{display:grid;grid-template-columns:64px 1fr;gap:8px 12px;line-height:1.7;margin:12px 0 0}
.dsh-awakening-settings .awa-detail-extra dt,.dsh-awakening-settings .awa-detail-extra dd{margin:0;min-width:0;overflow-wrap:anywhere}
.dsh-awakening-settings .awa-detail-extra a{color:var(--awa-accent);text-underline-offset:3px;display:inline-flex;align-items:center;gap:4px}
.dsh-awakening-settings .awa-library-form{border:1px solid var(--awa-border);border-radius:12px;padding:18px}
.dsh-awakening-settings .awa-import-summary{display:flex;align-items:center;gap:12px;margin:16px 0 18px;padding-bottom:16px;border-bottom:1px solid var(--awa-border)}
.dsh-awakening-settings .awa-import-summary>svg{flex:none;color:var(--awa-muted)}
.dsh-awakening-settings .awa-import-summary>div{min-width:0;overflow-wrap:anywhere}
.dsh-awakening-settings .awa-library-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px 12px}
.dsh-awakening-settings .awa-library-field{min-width:0;display:flex;flex-direction:column;gap:6px;font-size:12px;line-height:1.5;color:var(--awa-muted)}
.dsh-awakening-settings .awa-library-field input,.dsh-awakening-settings .awa-library-field select{width:100%;min-width:0;min-height:36px;border:1px solid var(--awa-border);border-radius:8px;background:var(--awa-surface);color:var(--awa-fg);font:inherit;font-size:13px;padding:7px 10px}
.dsh-awakening-settings .awa-library-field-wide{grid-column:1/-1}
.dsh-awakening-settings .awa-import-license{font-size:12px;color:var(--awa-muted);margin-top:16px}
.dsh-awakening-settings .awa-import-license summary{cursor:pointer;line-height:1.6}
.dsh-awakening-settings .awa-import-license .awa-library-field{margin-top:10px}
.dsh-awakening-settings .awa-import-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap}
.dsh-awakening-settings .awa-remove-confirm{margin-top:16px;padding:14px;border:1px solid var(--awa-border);border-radius:8px;font-size:12px;line-height:1.7}
.dsh-awakening-settings .awa-remove-confirm .awa-work-actions{justify-content:flex-end;margin-top:12px}
.dsh-awakening-settings .awa-contribute-list{list-style:none;padding:0;margin:20px 0;display:grid;gap:18px}
.dsh-awakening-settings .awa-contribute-list li{font-size:13px;line-height:1.7;padding-left:0}
.dsh-awakening-settings .awa-contribute-list strong{display:block;font-size:13px;font-weight:600;margin-bottom:3px;color:var(--awa-fg)}
.dsh-awakening-settings .awa-contribute-list p{font-size:12px;color:var(--awa-muted)}
.dsh-awakening-settings .awa-template{font:11px/1.7 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto;border-radius:8px;border:1px solid var(--awa-border);padding:12px;background:var(--awa-surface);margin:12px 0 0;color:var(--awa-muted)}
.dsh-awakening-settings .awa-file-drop{outline:2px dashed transparent;outline-offset:7px;border-radius:12px;transition:outline-color 160ms ease}
.dsh-awakening-settings .awa-file-drop.is-dragging{outline-color:var(--awa-accent)}
.dsh-awakening-settings .awa-library-subpage{animation:awa-library-reveal 160ms ease-out}
@keyframes awa-library-reveal{from{opacity:.4;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:460px){.dsh-awakening-settings .awa-work-grid{grid-template-columns:minmax(0,1fr)}.dsh-awakening-settings .awa-library-tools{flex-wrap:nowrap}.dsh-awakening-settings .awa-library-search{flex-basis:auto}.dsh-awakening-settings .awa-library-fields{grid-template-columns:minmax(0,1fr)}.dsh-awakening-settings .awa-current-copy{padding:15px;align-items:flex-start}.dsh-awakening-settings .awa-current-copy .awa-work-actions{width:100%}.dsh-awakening-settings .awa-current-copy .awa-work-actions .awa-btn{flex:1}.dsh-awakening-settings .awa-library-form{padding:15px}.dsh-awakening-settings .awa-import-actions .awa-btn{flex:1}.dsh-awakening-settings .awa-work-open .awa-cover-play{opacity:1}.dsh-awakening-settings .awa-detail-actions .awa-btn--primary{flex:1}}
@media(prefers-reduced-motion:reduce){.dsh-awakening-settings .awa-library *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`

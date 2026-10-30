import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../media/builtins.json',import.meta.url),'utf8'));
const required=['builtin:awakening','builtin:codex','builtin:claude-code'];
if(data.schemaVersion!==1||!Array.isArray(data.entries)||data.entries.length!==3||required.some(id=>!data.entries.some(e=>e.id===id&&e.builtin===true&&e.kind==='video'&&e.presentation?.mode==='safe-camera')))throw new Error('Bundled animation manifest is invalid.');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const BUILTIN_ANIMATIONS=freeze(data.entries);
export const DEFAULT_ANIMATION=BUILTIN_ANIMATIONS[0];
export const builtinForId=id=>BUILTIN_ANIMATIONS.find(e=>e.id===id);

import {readFileSync} from 'node:fs';
import {createInstaller} from './engine.mjs';
const policy=JSON.parse(readFileSync(new URL('./policy.json',import.meta.url),'utf8'));
const installer=createInstaller({policy});
export const inspect=installer.inspect;
export const prepare=installer.prepare;
export const cancel=installer.cancel;

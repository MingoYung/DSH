import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const result=await build({absWorkingDir:root,entryPoints:[path.join(root,'src/entry.jsx')],bundle:true,write:false,format:'cjs',platform:'browser',external:['react'],target:['chrome120']});
// DSH executes each client file as a classic script. It must REGISTER a lazy
// factory; bare CommonJS at top level has no `module` and breaks web boot.
const output=`window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:function(require){\nvar module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;\n}});\n`;
await mkdir(path.join(root,'lib'),{recursive:true});
await writeFile(path.join(root,'lib/client.js'),output,'utf8');
console.log(`Built registered DSH client ${manifest.name}@${manifest.version}`);

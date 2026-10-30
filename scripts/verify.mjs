// Verify the shipped package without executing its Host/client or installer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=rel=>fs.readFileSync(path.join(root,rel));
const json=rel=>JSON.parse(read(rel));
const sha=b=>createHash('sha256').update(b).digest('hex');
function inside(rel){assert.ok(typeof rel==='string'&&!path.isAbsolute(rel));const full=path.resolve(root,rel),r=path.relative(root,full);assert.ok(r&&!r.startsWith('..')&&!path.isAbsolute(r));assert.ok(fs.statSync(full).isFile());return full;}
const pkg=json('package.json'),lock=json('package-lock.json');
assert.equal(pkg.version,lock.version);assert.equal(pkg.version,lock.packages[''].version);
assert.equal(pkg.dsh.bundle.patch,'cordis.patch.yml');inside(pkg.dsh.bundle.patch);
assert.ok(!['preinstall','install','postinstall','prepare','prepublish','postpublish'].some(k=>k in pkg.scripts));
const media=json('media/builtins.json');
assert.equal(media.schemaVersion,1);assert.equal(media.entries.length,3);
assert.deepEqual(media.entries.map(e=>e.id).sort(),['builtin:awakening','builtin:claude-code','builtin:codex']);
for(const entry of media.entries){
 assert.equal(entry.builtin,true);assert.equal(entry.removable,false);assert.equal(entry.kind,'video');assert.equal(entry.fit,'safe');
 assert.equal(entry.durationSeconds,22);assert.equal(entry.presentation.mode,'safe-camera');assert.equal(entry.license,'CC-BY-4.0');
 const url=new URL(entry.sourceUrl,'http://local');assert.ok(url.pathname.startsWith('/dsh-awakening/media/'));
 const rel='media/'+path.posix.basename(url.pathname),b=read(rel);assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256);assert.equal(b.toString('ascii',4,8),'ftyp');
 assert.ok(entry.presentation.keyframes.length>=2);for(const f of entry.presentation.keyframes){const[x,y,w,h]=f.safe;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1280&&y+h<=720);}
 for(const key of ['posterUrl','thumbnailUrl'])inside('media/'+path.posix.basename(new URL(entry[key],'http://local').pathname));
}
const policy=json('tools/native-install/policy.json');
assert.ok(policy.packageVersions.includes(pkg.version));
for(const rel of ['runtime/safe-video.js','runtime/stage.js','runtime/bootstrap.js','media/builtins.json','media/boot.mp4','media/codex.mp4','media/claude-code.mp4'])assert.ok(rel in policy.runtimeFiles,'Missing native pin: '+rel);
for(const[rel,digest]of Object.entries(policy.runtimeFiles)){inside(rel);assert.equal(sha(read(rel)),digest,'Runtime/media pin differs: '+rel);}
for(const[rel,digest]of Object.entries(policy.files)){assert.ok(rel.startsWith('lib/'));const local='tools/native-install/payload/'+rel.slice(4);inside(local);assert.equal(sha(read(local)),digest,'Native payload pin differs: '+local);}
const nextRoot='tools/native-install/builds/2.0.21-next',next=json(nextRoot+'/policy.json');
assert.equal(next.desktopVersion,'2.0.21-next');assert.ok(next.packageVersions.includes(pkg.version));
assert.equal(next.exeSha256,'423feb86156366aa2bc3374933f579027aef44bcc439c5743b72231d480afc00');
assert.equal(next.originalSha256,'16f2c62b1ccc98a968d9c7cf5edcd7af7a1e7690c2fba8cea361d1726d0db349');
assert.deepEqual(next.runtimeFiles,policy.runtimeFiles,'The desktop builds must share the reviewed movies and player.');
for(const[rel,digest]of Object.entries(next.files)){assert.ok(rel.startsWith('lib/'));const local=nextRoot+'/payload/'+rel.slice(4);inside(local);assert.equal(sha(read(local)),digest,'New desktop payload differs: '+local);}
const client=read('lib/client.js').toString('utf8');assert.ok(client.startsWith('window.__ModuleLoader__.load('));new vm.Script(client);
const output=await build({absWorkingDir:root,entryPoints:[path.join(root,'src/entry.jsx')],bundle:true,write:false,format:'cjs',platform:'browser',external:['react'],target:['chrome120']});
const expected=`window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:function(require){\nvar module={exports:{}};var exports=module.exports;\n${output.outputFiles[0].text}\nreturn module.exports;\n}});\n`;
assert.equal(client,expected,'Compiled client is stale; run npm run build.');
for(const rel of ['lib/index.js','lib/animation-library.mjs','lib/builtins.mjs',...Object.keys(policy.runtimeFiles).filter(p=>p.endsWith('.js'))])execFileSync(process.execPath,['--check',inside(rel)],{stdio:'pipe',windowsHide:true});
const shots=json('screenshots.json');assert.ok(shots.length>=1&&shots.length<=8);shots.forEach(inside);
inside('CREDITS.md');inside('licenses/ORIGINAL-ANIMATIONS-CC-BY-4.0.md');
console.log(JSON.stringify({passed:true,version:pkg.version,builtinMovies:3,desktopBuilds:[policy.desktopVersion,next.desktopVersion],nativePinsPerBuild:Object.keys(policy.runtimeFiles).length,payloadPins:Object.keys(policy.files).length+Object.keys(next.files).length,registeredClient:true,clientReproducible:true,clientSha256:sha(Buffer.from(client)),screenshots:shots.length,installerExecuted:false}));

// Check emitted modules, not only TS: Rollup may move side effects across chunks.
import {readFile} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.argv[2]??'dist'),html=await readFile(resolve(root,'index.html'),'utf8');
const entry=resolve(root,html.match(/src="\.\/([^" ]+\.js)"/)[1]),source=await readFile(entry,'utf8');
const dynamic=[...source.matchAll(/import\("(\.\/[^" ]+\.js)"\)/g)].map(m=>resolve(dirname(entry),m[1]));
const stages=['scene','loadingPreview','environment','city','night','focus','labels','camera'];let previous=-1;
for(const name of stages){const index=dynamic.findIndex(p=>basename(p).startsWith(name+'-'));assert.ok(index>previous,`${name} must have its own awaited boot stage, after ${stages[stages.indexOf(name)-1]??'entry'}`);previous=index;}
const city=dynamic.find(p=>basename(p).startsWith('city-')),visited=new Set();
async function inspect(file){if(visited.has(file))return;visited.add(file);const code=await readFile(file,'utf8');for(const m of code.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/g)){const dep=resolve(dirname(file),m[1]);assert.ok(!/^(camera|labels|focus|night)-/.test(basename(dep)),`city must finish before ${basename(dep)} side effects execute`);await inspect(dep);}}
await inspect(city);console.log('Production boot stage/dependency checks passed');

// The cheap first frame must never import runtime terrain or the full builders.
const preview=dynamic.find(p=>basename(p).startsWith('loadingPreview-')),previewVisited=new Set();
async function inspectPreview(file){if(previewVisited.has(file))return;previewVisited.add(file);const code=await readFile(file,'utf8');for(const m of code.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/g)){const dep=resolve(dirname(file),m[1]);assert.ok(!/^(city|environment|terrainSurface|groundRoadMaterial|camera|labels|focus|night)-/.test(basename(dep)),`preview must precede heavy/interactive side effects: ${basename(dep)}`);await inspectPreview(dep);}}
await inspectPreview(preview);console.log('Production lightweight preview dependency checks passed');

import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
await mkdir('public/engine',{recursive:true});await mkdir('public/licenses',{recursive:true});
const manifest=[];
for(const file of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm']){await copyFile('node_modules/stockfish/bin/'+file,'public/engine/'+file);const bytes=await readFile('public/engine/'+file);manifest.push({file:'engine/'+file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),license:'GPL-3.0',source:'https://github.com/nmrugg/stockfish.js/tree/v19.0.1',npm:'stockfish@19.0.1'});}
await copyFile('node_modules/stockfish/Copying.txt','public/licenses/Stockfish-GPL-3.0.txt');
await writeFile('public/asset-manifest.json',JSON.stringify({engine:manifest,pieces:'Original procedural geometry; no external models',content:'Original Chess Workshop authored compositions and explanations',fonts:'System fonts only',audio:'Optional synthesized tones'},null,2));
console.log(manifest);

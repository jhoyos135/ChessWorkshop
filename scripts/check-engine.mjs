import { createRequire } from 'node:module';
import { writeFile,mkdir } from 'node:fs/promises';
const require=createRequire(import.meta.url),start=performance.now(),memory=process.memoryUsage();
const lines=[];let stop;const timeout=setTimeout(()=>{console.error('Engine handshake timeout',JSON.stringify(lines.slice(0,20)));process.exitCode=1;stop?.();},15000);
const factory=require('../node_modules/stockfish/bin/stockfish-19-lite-single.js');
let engine=factory();engine.listener=raw=>{const line=String(raw).trim();lines.push(line);if(lines.length<5)console.log(line);if(line==='uciok')queueMicrotask(()=>engine.processCommand('isready'));if(line==='readyok')queueMicrotask(()=>{engine.processCommand('position startpos moves e2e4 e7e5');engine.processCommand('go movetime 250');});if(line.startsWith('bestmove ')){const report={runtime:process.version,name:lines.find(l=>l.startsWith('id name ')),options:lines.filter(l=>l.startsWith('option name ')),bestmove:line,elapsedMs:performance.now()-start,memoryBefore:memory,memoryAfter:process.memoryUsage(),notes:'Node execution of the exact bundled single-threaded WASM provides startup/options and process memory evidence. Browser-worker legal output and cancellation are tested separately.'};clearTimeout(timeout);mkdir('docs/evidence',{recursive:true}).then(()=>writeFile('docs/evidence/engine.json',JSON.stringify(report,null,2))).then(()=>{console.log(JSON.stringify(report,null,2));stop();});}};
stop=()=>engine.processCommand('quit');engine.processCommand('uci');



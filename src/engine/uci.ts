import { rebuild, playUci } from '../chess/rules';
import type { Session } from '../sessions/model';
import { TeachingClient } from './teachingClient';
export type Score = {kind:'cp'|'mate';value:number};
export type Candidate = {move:string;san:string;pv:string[];notation:string[];score:Score;depth:number;rank:number};
export type Analysis = {session:string;key:string;generation:number;candidates:Candidate[];best:string;milliseconds:number;engine:string;budget?:number;provisional?:boolean};
export type SearchOptions = {ms:number;skill:number;multi:number;signal?:AbortSignal;only?:string[]};
export const positionKey=(s:Pick<Session,'initialFen'|'moves'>)=>s.initialFen+' moves '+s.moves.join(' ');
export function parseInfo(line:string,side:'w'|'b'):Omit<Candidate,'san'|'notation'>|null{const m=line.match(/\bdepth (\d+).*?\bscore (cp|mate) (-?\d+)(?!\d)/);const pv=line.match(/\bpv (.+)$/);if(!m||!pv||/\b(upperbound|lowerbound)\b/.test(line))return null;const moves=pv[1].trim().split(/\s+/);return {move:moves[0],pv:moves,score:{kind:m[2] as Score['kind'],value:Number(m[3])*(side==='w'?1:-1)},depth:Number(m[1]),rank:Number(line.match(/\bmultipv (\d+)/)?.[1]??1)};}
export class UciEngine {
 worker:Worker|null=null;generation=0;options=new Map<string,string>();name='Stockfish';private listeners=new Set<(line:string)=>void>();private boot:Promise<void>|null=null;private busy:Promise<void>=Promise.resolve();private lastSession='';
 private send(s:string){this.worker!.postMessage(s);}
 private wait(test:(s:string)=>boolean,ms=12000){return new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>{this.listeners.delete(fn);reject(Error('Engine timeout. Retry engine.'));},ms);const fn=(s:string)=>{if(s==='__ERROR__'){clearTimeout(timer);this.listeners.delete(fn);reject(Error('Engine failed to load. Retry engine.'));}else if(test(s)){clearTimeout(timer);this.listeners.delete(fn);resolve(s);}};this.listeners.add(fn);});}
 async ready(){if(this.boot)return this.boot;this.boot=(async()=>{const workerGeneration=this.generation;this.worker=new Worker('/engine/stockfish-19-lite-single.js');this.worker.onmessage=e=>{if(workerGeneration!==this.generation)return;for(const line of String(e.data).split('\n')){if(line.startsWith('option name ')){const name=line.match(/^option name (.+?) type /)?.[1];if(name)this.options.set(name,line);}if(line.startsWith('id name '))this.name=line.slice(8);for(const f of [...this.listeners])f(line);}};this.worker.onerror=()=>{if(workerGeneration!==this.generation)return;for(const f of [...this.listeners])f('__ERROR__');};const handshake=this.wait(s=>s==='uciok');this.send('uci');await handshake;this.option('Hash',16);this.option('Ponder',false);const idle=this.wait(s=>s==='readyok');this.send('isready');await idle;})().catch(e=>{this.destroy();throw e;});return this.boot;}
 private option(name:string,value:number|boolean){const info=this.options.get(name);if(!info)return;if(typeof value==='number'){const min=Number(info.match(/\bmin (-?\d+)/)?.[1]??value),max=Number(info.match(/\bmax (-?\d+)/)?.[1]??value);if(value<min||value>max)throw Error(`Engine option ${name} is out of range`);}this.send(`setoption name ${name} value ${value}`);}
 search(s:Pick<Session,'id'|'initialFen'|'moves'>,o:SearchOptions):Promise<Analysis>{let release!:()=>void;const before=this.busy;this.busy=new Promise<void>(r=>{release=r;});return (async()=>{await before;try{return await this.run(s,o);}finally{release();}})();}
 private async run(s:Pick<Session,'id'|'initialFen'|'moves'>,o:SearchOptions):Promise<Analysis>{if(o.signal?.aborted)throw new DOMException('Cancelled','AbortError');await this.ready();if(o.signal?.aborted)throw new DOMException('Cancelled','AbortError');const generation=this.generation;const g=rebuild(s);if(this.lastSession!==s.id){this.send('ucinewgame');this.lastSession=s.id;}this.option('UCI_LimitStrength',false);this.option('Skill Level',o.skill);this.option('MultiPV',o.multi);this.send('setoption name Clear Hash');const idle=this.wait(l=>l==='readyok');this.send('isready');await idle;if(o.signal?.aborted)throw new DOMException('Cancelled','AbortError');
 this.send(`position fen ${s.initialFen} moves ${s.moves.join(' ')}`.trim());const iterations=new Map<number,Map<number,Omit<Candidate,'san'|'notation'>>>();const collect=(l:string)=>{const c=parseInfo(l,g.turn());if(c){if(!iterations.has(c.depth))iterations.set(c.depth,new Map());iterations.get(c.depth)!.set(c.rank,c);}};this.listeners.add(collect);const start=performance.now();const done=this.wait(l=>l.startsWith('bestmove '),o.ms+6000);const abort=()=>this.send('stop');o.signal?.addEventListener('abort',abort,{once:true});this.send(`go movetime ${o.ms}${o.only?.length?' searchmoves '+o.only.join(' '):''}`);let end:string;
 try{end=await done;}catch(e){this.destroy();throw e;}finally{this.listeners.delete(collect);o.signal?.removeEventListener('abort',abort);}
 if(o.signal?.aborted||generation!==this.generation)throw new DOMException('Cancelled','AbortError');const best=end.split(' ')[1];if(best!=='(none)'&&best!=='0000')playUci(rebuild(s),best);
 const count=Math.min(o.multi,g.moves().length),depths=[...iterations.keys()].sort((a,b)=>b-a);
 // A completed older MultiPV iteration may disagree with final bestmove.
 // Keep a coherent completed set only when its primary is that final move.
 const complete=depths.find(d=>iterations.get(d)!.size>=count&&iterations.get(d)!.get(1)?.move===best),latest=depths.find(d=>iterations.get(d)!.get(1)?.move===best),depth=complete??latest;
 const rows=depth===undefined?[]:complete!==undefined?[...iterations.get(depth)!.values()].sort((a,b)=>a.rank-b.rank).slice(0,o.multi):[iterations.get(depth)!.get(1)!];
 const candidates:Candidate[]=[];for(const raw of rows){const copy=rebuild(s),notation:string[]=[];const valid:string[]=[];for(const move of raw.pv){try{notation.push(playUci(copy,move).san);valid.push(move);}catch{break;}}if(valid.length)candidates.push({...raw,pv:valid,notation,san:notation[0]});}
 if(o.skill===20&&best!=='(none)'&&best!=='0000'&&candidates[0]?.move!==best)throw Error('The engine did not provide a verified line for its final choice. Retry analysis.');
 return {session:s.id,key:positionKey(s),generation,candidates,best,budget:o.ms,provisional:complete===undefined,milliseconds:performance.now()-start,engine:this.name};}
 destroy(){this.generation++;for(const f of [...this.listeners])f('__ERROR__');this.worker?.terminate();this.worker=null;this.boot=null;this.listeners.clear();this.lastSession='';}
}
// One heavy search at a time across isolated option sets. Abort queued work before it starts.
export class EngineCoordinator {
 opponent=new UciEngine();coach=new UciEngine();private teaching=new TeachingClient();private queue:Promise<unknown>=Promise.resolve();private cache=new Map<string,Analysis>();
 searchTeaching(s:Session,signal?:AbortSignal){const task=this.queue.catch(()=>{}).then(()=>this.teaching.search(s,signal));this.queue=task;return task;}
 search(purpose:'opponent'|'coach',s:Pick<Session,'id'|'initialFen'|'moves'>,o:SearchOptions){const cacheKey=JSON.stringify(['stockfish.js-19.0.1-lite-single',this[purpose].generation,purpose,positionKey(s),o.skill,o.multi,o.ms,o.only??[]]);const task=this.queue.catch(()=>{}).then(async()=>{if(o.signal?.aborted)throw new DOMException('Cancelled','AbortError');let cached=purpose==='coach'?this.cache.get(cacheKey):undefined;
 // An exact position with stronger completed analysis must not regress when
 // a subsequent hint asks for the default shorter budget.
 if(purpose==='coach'){const requested=JSON.parse(cacheKey),signature=JSON.stringify(requested.filter((_:unknown,index:number)=>index!==6));let budget=cached?.budget??-1;for(const [key,answer] of this.cache){const candidate=JSON.parse(key);if(candidate[6]>=o.ms&&candidate[6]>budget&&JSON.stringify(candidate.filter((_:unknown,index:number)=>index!==6))===signature){cached=answer;budget=candidate[6];}}}
 if(cached)return {...structuredClone(cached),session:s.id};const answer=await this[purpose].search(s,o);if(purpose==='coach'&&!o.signal?.aborted){this.cache.set(cacheKey,structuredClone(answer));if(this.cache.size>80)this.cache.delete(this.cache.keys().next().value!);}return answer;});this.queue=task;return task;}
 reset(){this.opponent.destroy();this.coach.destroy();this.teaching.destroy();this.cache.clear();}
}
export const engines=new EngineCoordinator();


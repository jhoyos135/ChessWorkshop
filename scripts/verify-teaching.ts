import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import os from 'node:os';
import { Chess } from 'chess.js';
import { createSession,type Side } from '../src/sessions/model';
import { commitMove,claim } from '../src/sessions/commands';
import { rebuild,playUci,claimable } from '../src/chess/rules';
import { teachingMove,teachingPolicyVersion,teachingProfiles } from '../src/engine/teaching';
import { validateSession } from '../src/storage/repository';

// A paired, seeded policy regression, not a human strength or learning study.
const seeds=[12345,0x5eed,0x12345678,0xa5a5a5a5];
const openings=[[],['e2e4','e7e5','g1f3','b8c6'],['d2d4','d7d5','c2c4','e7e6'],['e2e4','c7c5','g1f3','d7d6']];
const maxPlies=200;
const timings:Record<'First steps'|'Beginner',number[]>={'First steps':[],Beginner:[]};
function hash(value:string){return createHash('sha256').update(value).digest('hex');}
function game(seed:number,beginner:Side,opening:string[],measure:boolean,restore:boolean){
 let s=createSession('computer');s.id=`policy-${seed}-${beginner}`;s.title='Seeded teaching-policy regression';s.clock.paused=false;
 const states={w:(seed^0x9e3779b9)>>>0||1,b:(seed^0x85ebca6b)>>>0||1};
 const g=new Chess(s.initialFen);let checkpointVerified=false,captures=0,promotions=0,castles=0;
 for(const move of opening){s=commitMove(s,move);playUci(g,move);}
 while(!s.result&&s.moves.length<maxPlies){
  if(claimable(s)){s=claim(s);break;}
  const side=g.turn(),level=side===beginner?'Beginner':'First steps';s.level=level;s.seed=states[side];
  const started=performance.now(),answer=teachingMove(s),elapsed=performance.now()-started;
  if(measure)timings[level].push(elapsed);
  const move=playUci(g,answer.move);captures+=Number(!!move.captured);promotions+=Number(!!move.promotion);castles+=Number(move.isKingsideCastle()||move.isQueensideCastle());
  s=commitMove(s,answer.move);s.seed=answer.seed;states[side]=answer.seed;
  if(s.fen!==g.fen())throw Error('Committed state differs from legal reference replay');
  if(restore&&s.moves.length===40){
   const checkpoint=JSON.parse(JSON.stringify({session:s,randomStates:states}));
   const restored=validateSession(checkpoint.session);
   if(rebuild(restored).fen()!==g.fen()||restored.seed!==states[side]||!restored.clock.paused)throw Error('Paused seed/history checkpoint failed');
   states.w=checkpoint.randomStates.w;states.b=checkpoint.randomStates.b;
   s=restored;s.clock.paused=false;checkpointVerified=true;
  }
 }
 const result=s.result?{...s.result,termination:'rules'}:{winner:null,reason:`Stopped at ${maxPlies} plies; no result asserted`,termination:'limit'};
 g.header('Event','Chess Workshop seeded policy regression','White',beginner==='w'?'Beginner':'First steps','Black',beginner==='b'?'Beginner':'First steps','Seed',String(seed),'Policy',s.policyVersion,'Result',s.result?(s.result.winner==='w'?'1-0':s.result.winner==='b'?'0-1':'1/2-1/2'):'*');
 return {seed,beginner,opening,moves:s.moves,plies:s.moves.length,finalFen:s.fen,result,randomStates:states,checkpointVerified,captures,promotions,castles,lineSha256:hash(s.moves.join(' ')),pgn:g.pgn()};
}
const games=[];
for(let i=0;i<seeds.length;i++)for(const beginner of ['w','b'] as const){
 const first=game(seeds[i],beginner,openings[i],true,false),replayed=game(seeds[i],beginner,openings[i],false,true);
 if(first.lineSha256!==replayed.lineSha256||first.finalFen!==replayed.finalFen||JSON.stringify(first.randomStates)!==JSON.stringify(replayed.randomStates)||JSON.stringify(first.result)!==JSON.stringify(replayed.result))throw Error('Seeded replay/resume diverged');
 if(first.plies>=40&&!replayed.checkpointVerified)throw Error('Required midpoint restore was not exercised');
 games.push({...first,replayIdentical:true,checkpointVerified:replayed.checkpointVerified});
 console.log(`Verified ${games.length}/8: seed ${first.seed}, Beginner ${beginner}, ${first.plies} plies, ${first.result.reason}`);
}
const stats=Object.fromEntries(Object.entries(timings).map(([level,values])=>{
 const sorted=[...values].sort((a,b)=>a-b),budgetMs=level==='Beginner'?500:250;
 return [level,{decisions:values.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),budgetMs,allWithinBudget:values.every(v=>v<=budgetMs)}];
}));
const totals={games:games.length,plies:games.reduce((n,g)=>n+g.plies,0),beginnerWins:games.filter(g=>g.result.termination==='rules'&&g.result.winner===g.beginner).length,firstStepsWins:games.filter(g=>g.result.termination==='rules'&&g.result.winner&&g.result.winner!==g.beginner).length,draws:games.filter(g=>g.result.termination==='rules'&&!g.result.winner).length,moveLimits:games.filter(g=>g.result.termination==='limit').length,midpointRestores:games.filter(g=>g.checkpointVerified).length};
const report={date:new Date().toISOString(),passed:Object.values(stats).every(value=>(value as {allWithinBudget:boolean}).allWithinBudget),machine:{node:process.version,os:os.version(),cpu:os.cpus()[0].model,threads:os.cpus().length},policyVersion:teachingPolicyVersion,profiles:teachingProfiles,policySourceSha256:hash(await readFile('src/engine/teaching.ts','utf8')),protocol:{seeds,pairedColors:true,openings,maxPlies,claims:'Claims taken at current position; intended claims are tested separately by rules/browser tests.',replay:'Each game replayed from the same seed, with a JSON checkpoint of the session and both regression players’ random states after ply 40 where reached. Restored sessions must be paused before an explicit resume.',timing:'Node policy calculation including full-history reconstruction; excludes the UI presentation delay, rules adjudication and disk I/O.'},totals,timings:stats,games,limitations:'Eight paired policy games do not establish a human rating, measured learning outcomes, beginner suitability, or calibrated error probabilities. User feedback accepted lessons for now and found the previous Beginner too hard. This revision needs follow-up difficulty feedback; no human rating or learning outcome is claimed.'};
await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/teaching-games.json',JSON.stringify(report,null,2));await writeFile('docs/evidence/teaching-games.pgn',games.map(g=>g.pgn).join('\n\n'));
console.log(JSON.stringify({totals,timings:stats},null,2));
if(Object.values(stats).some(value=>!(value as {allWithinBudget:boolean}).allWithinBudget)){console.error('One or more policy decisions exceeded the specified budget.');process.exitCode=1;}

import { it,expect,vi } from 'vitest';
import { UciEngine,EngineCoordinator,positionKey } from '../../src/engine/uci';
import { createSession } from '../../src/sessions/model';
import { Chess } from 'chess.js';
for(const side of ['w','b'] as const)it(`the displayed ${side} recommendation matches final bestmove after an incomplete newer iteration`,async()=>{
 const commands:string[]=[];const moves=side==='w'?['e2e4','d2d4','g1f3']:['e7e5','c7c5','g8f6'];
 class Worker {onmessage:((e:{data:string})=>void)|null=null;onerror:null=null;terminate(){}postMessage(command:string){commands.push(command);const emit=(line:string)=>queueMicrotask(()=>this.onmessage?.({data:line}));if(command==='uci'){for(const line of ['id name Test engine','option name Skill Level type spin default 20 min 0 max 20','option name MultiPV type spin default 1 min 1 max 256','uciok'])emit(line);}if(command==='isready')emit('readyok');if(command.startsWith('go ')){for(let rank=1;rank<=3;rank++)emit(`info depth 10 multipv ${rank} score cp ${40-rank*10} pv ${moves[rank-1]}`);emit(`info depth 11 multipv 1 score cp 55 pv ${moves[1]}`);emit('bestmove '+moves[1]);}}}
 vi.stubGlobal('Worker',Worker);const engine=new UciEngine();try{const session=createSession();if(side==='b'){session.initialFen=session.initialFen.replace(' w ',' b ');session.fen=session.initialFen;}const result=await engine.search(session,{ms:10,skill:20,multi:3});expect(commands).toContain('setoption name Skill Level value 20');expect(commands).toContain(('position fen '+session.initialFen+' moves ').trim());expect(result.best).toBe(moves[1]);expect(result.candidates[0].move).toBe(result.best);expect(result.candidates[0].depth).toBe(11);expect(result.candidates).toHaveLength(1);expect(result.candidates[0].score.value).toBe(side==='w'?55:-55);}finally{engine.destroy();vi.unstubAllGlobals();}
});
it('a later hint reuses stronger same-position analysis without reusing a different history or restricted search',async()=>{
 let searches=0;class Worker {onmessage:((e:{data:string})=>void)|null=null;onerror:null=null;terminate(){}postMessage(command:string){const emit=(line:string)=>queueMicrotask(()=>this.onmessage?.({data:line}));if(command==='uci')emit('uciok');if(command==='isready')emit('readyok');if(command.startsWith('go ')){searches++;emit('info depth 12 multipv 1 score cp 35 pv d2d4');emit('bestmove d2d4');}}}
 vi.stubGlobal('Worker',Worker);const coordinator=new EngineCoordinator(),session=createSession();try{const shallow=await coordinator.search('coach',session,{ms:1000,skill:20,multi:1});const deeper=await coordinator.search('coach',session,{ms:3000,skill:20,multi:1});expect(shallow.budget).toBe(1000);expect(deeper.budget).toBe(3000);expect((await coordinator.search('coach',session,{ms:1000,skill:20,multi:1})).budget).toBe(3000);expect(searches).toBe(2);const changed={...session,moves:['e2e4','e7e5']};const fresh=await coordinator.search('coach',changed,{ms:1000,skill:20,multi:1});expect(fresh.key).toBe(positionKey(changed));expect(searches).toBe(3);await coordinator.search('coach',session,{ms:1000,skill:20,multi:1,only:['d2d4']});expect(searches).toBe(4);}finally{coordinator.reset();vi.unstubAllGlobals();}
});

for(const [side,fen,promotion] of [
 ['w','4k3/1P6/8/8/8/8/8/4K3 w - - 0 1','b7b8'],
 ['b','4k3/8/8/8/8/8/1p6/4K3 b - - 0 1','b2b1'],
] as const)it(`lists every legal ${side} move, including all promotion choices, even when only one line is scored`,async()=>{
 class Worker {onmessage:((e:{data:string})=>void)|null=null;onerror:null=null;terminate(){}postMessage(command:string){const emit=(line:string)=>queueMicrotask(()=>this.onmessage?.({data:line}));if(command==='uci'){emit('option name MultiPV type spin default 1 min 1 max 256');emit('uciok');}if(command==='isready')emit('readyok');if(command.startsWith('go ')){emit(`info depth 9 multipv 1 score cp 100 pv ${promotion}q`);emit(`bestmove ${promotion}q`);}}}
 vi.stubGlobal('Worker',Worker);const engine=new UciEngine();try{
  const session=createSession('local',fen),analysis=await engine.search(session,{ms:10,skill:20,multi:3});
  const expected=new Chess(fen).moves({verbose:true}).map(move=>move.from+move.to+(move.promotion??''));
  expect(analysis.legalMoves.map(move=>move.move).sort()).toEqual(expected.sort());
  expect(new Set(analysis.legalMoves.map(move=>move.move)).size).toBe(expected.length);
  for(const piece of 'qrbn')expect(analysis.legalMoves.map(move=>move.move)).toContain(promotion+piece);
  expect(analysis.legalMoves.every(move=>move.san.length>0)).toBe(true);
  expect(analysis.candidates).toHaveLength(1);
  expect(analysis.candidates[0].move).toBe(promotion+'q');
  expect(analysis.provisional).toBe(true);
 }finally{engine.destroy();vi.unstubAllGlobals();}
});

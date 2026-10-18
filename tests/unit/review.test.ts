import 'fake-indexeddb/auto';
import { it,expect } from 'vitest';
import { Chess,DEFAULT_POSITION } from 'chess.js';
import { playUci } from '../../src/chess/rules';
import { explanation } from '../../src/coaching/explain';
import { reviewDecision,reviewedMove,importantMoments } from '../../src/coaching/review';
import type { Candidate,Score } from '../../src/engine/uci';
import { createSession } from '../../src/sessions/model';
import { commitMove,undo } from '../../src/sessions/commands';
import { saveSession,loadSession,importJson,exportSession,validateSession,listSessions } from '../../src/storage/repository';
const candidate=(fen:string,move:string,score:Score):Candidate=>({move,san:playUci(new Chess(fen),move).san,pv:[move],notation:[],score,depth:12,rank:1});
it('review differences use the moving side for both colors',()=>{
 const black=new Chess();black.move('e4');
 for(const [fen,bestMove,playedMove,bestValue,playedValue,loss] of [[DEFAULT_POSITION,'e2e4','f2f3',50,-200,250],[black.fen(),'e7e5','f7f6',-40,250,290]] as const){const result=reviewDecision(fen,candidate(fen,bestMove,{kind:'cp',value:bestValue}),candidate(fen,playedMove,{kind:'cp',value:playedValue}),120);expect(result.loss).toBe(loss);expect(result.label).toBe('Costly move');}
});
it('missed and allowed mates are separate from pawn differences for either color',()=>{
 const mate='7k/8/5KQ1/8/8/8/8/8 w - - 0 1';
 const missed=reviewDecision(mate,candidate(mate,'g6g7',{kind:'mate',value:1}),candidate(mate,'g6g5',{kind:'cp',value:800}),120);expect(missed.label).toBe('Missed mate');expect(missed.loss).toBeUndefined();expect(missed.skill).toBe('Checkmate patterns');
 const black=new Chess();black.move('e4');for(const [fen,good,bad,value] of [[DEFAULT_POSITION,'e2e4','f2f3',-2],[black.fen(),'e7e5','f7f6',2]] as const){const allowed=reviewDecision(fen,candidate(fen,good,{kind:'cp',value:0}),candidate(fen,bad,{kind:'mate',value}),120);expect(allowed.label).toBe('Allows mate');expect(allowed.loss).toBeUndefined();}
});
it('retained forced mates and comparable alternatives are not called lost mates',()=>{
 const fen='7k/8/5KQ1/8/8/8/8/8 w - - 0 1',best=candidate(fen,'g6g7',{kind:'mate',value:3}),played=candidate(fen,'g6g5',{kind:'mate',value:4});expect(reviewDecision(fen,best,played,120).label).toBeUndefined();expect(reviewDecision(fen,best,played,120).verdict).toBe('Retains a mating line');
 best.score={kind:'cp',value:40};played.score={kind:'cp',value:25};expect(reviewDecision(fen,best,played,120).verdict).toBe('Comparable in this search');
});
it('complete move-review entries survive session exchange and undo clears their context',async()=>{
 let session=createSession('local');session.clock.paused=false;session=commitMove(session,'e2e4');const {entry}=reviewedMove(0,DEFAULT_POSITION,candidate(DEFAULT_POSITION,'d2d4',{kind:'cp',value:40}),candidate(DEFAULT_POSITION,'e2e4',{kind:'cp',value:30}),120,'Actual test engine',350);session.reviewMoves=[entry];session.reviewProgress=1;
 session.reviewReveals=[{fen:DEFAULT_POSITION,at:1000}];const saved=await saveSession(session),loaded=await loadSession(saved.id),[imported]=await importJson(exportSession(saved));expect(loaded.reviewMoves).toEqual([entry]);expect(imported.reviewMoves).toEqual([entry]);expect(imported.reviewReveals).toEqual(session.reviewReveals);expect(imported.id).not.toBe(saved.id);expect(undo(loaded).reviewMoves).toEqual([]);expect(undo(loaded).reviewProgress).toBe(0);expect(undo(loaded).reviewReveals).toEqual(session.reviewReveals);
});
it('forged review histories, illegal continuations and invented mate pawn losses cannot be imported',async()=>{
 let session=createSession('local');session.clock.paused=false;session=commitMove(session,'e2e4');session.reviewMoves=[reviewedMove(0,DEFAULT_POSITION,candidate(DEFAULT_POSITION,'d2d4',{kind:'cp',value:40}),candidate(DEFAULT_POSITION,'e2e4',{kind:'cp',value:30}),120,'Test engine',350).entry];session.reviewProgress=1;
 for(const patch of [{ply:1},{played:'d2d4'},{line:['g1g3']},{loss:999},{bestScore:{kind:'mate',value:1},loss:120},{lessonId:'not-a-lesson'}]){const bad=structuredClone(session);Object.assign(bad.reviewMoves![0],patch);expect(()=>validateSession(bad)).toThrow();const before=(await listSessions()).length;await expect(importJson(exportSession(bad))).rejects.toThrow();expect(await listSessions()).toHaveLength(before);}
});
it('an authored quiet demonstration never claims an engine proved it strongest',()=>{const fen='4k3/8/8/8/8/8/8/R3K3 w - - 0 1';expect(explanation(fen,'a1a4','example')).toContain('moves the rook from a1 to a4');expect(explanation(fen,'a1a4','example')).not.toContain('strongest');});
it('a previously verified continuation never hides changed moves or forged metadata',()=>{
 let session=createSession('local');session.clock.paused=false;session=commitMove(session,'e2e4');const best=candidate(DEFAULT_POSITION,'d2d4',{kind:'cp',value:40});best.pv=['d2d4','d7d5','c2c4'];session.reviewMoves=[reviewedMove(0,DEFAULT_POSITION,best,candidate(DEFAULT_POSITION,'e2e4',{kind:'cp',value:30}),120,'Test engine',350).entry];session.reviewProgress=1;
 expect(validateSession(session).reviewMoves).toEqual(session.reviewMoves);
 const line=session.reviewMoves[0].line;line[1]='d7d4';expect(()=>validateSession(session)).toThrow();line[1]='d7d5';expect(validateSession(session).reviewMoves).toEqual(session.reviewMoves);
 for(const patch of [{loss:999},{played:'a2a4'},{best:'e2e4'},{fen:new Chess().fen().replace(' w ',' b ')}]){const changed=structuredClone(session);Object.assign(changed.reviewMoves![0],patch);expect(()=>validateSession(changed)).toThrow();}
});
it('short review always prioritizes mate opportunities and remains limited to five moments',()=>{const base={ply:0,fen:DEFAULT_POSITION,played:'e2e4',best:'d2d4',line:['d2d4'],label:'Costly move',explanation:'A test comparison.'},moments=Array.from({length:8},(_,ply)=>({...base,ply,loss:2000-ply}));const mate={...base,ply:9,label:'Missed mate'};const result=importantMoments([...moments,mate]);expect(result).toHaveLength(5);expect(result[0]).toEqual(mate);expect(result[1].ply).toBe(0);expect(moments).toHaveLength(8);});
it('multiple key moments are checked against their exact mainline prefixes',()=>{
 let session=createSession('local');session.clock.paused=false;const game=new Chess();
 for(const [ply,move] of ['e2e4','e7e5','g1f3','b8c6'].entries()){const fen=game.fen(),best=candidate(fen,move,{kind:'cp',value:0}),comparison=reviewedMove(ply,fen,best,{...best,score:{kind:'cp',value:game.turn()==='w'?-300:300}},120,'Test engine',350);session=commitMove(session,move);playUci(game,move);session.review.push(comparison.moment!);}
 expect(validateSession(session).review).toHaveLength(4);const wrong=structuredClone(session);wrong.review[2].fen=wrong.review[0].fen;expect(()=>validateSession(wrong)).toThrow(/original game/);
 const moved=structuredClone(session);moved.review[2].ply=1;expect(()=>validateSession(moved)).toThrow();
});

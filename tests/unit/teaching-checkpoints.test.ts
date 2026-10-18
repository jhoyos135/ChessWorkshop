import 'fake-indexeddb/auto';
import { it,expect } from 'vitest';
import { Chess } from 'chess.js';
import { lessons,guidedGame,type Exercise } from '../../content/curriculum';
import { grade,validateExercise,decisionFor } from '../../src/lessons/runner';
import { createSession,type Session } from '../../src/sessions/model';
import { playUci } from '../../src/chess/rules';
import { validateSession,saveSession,loadSession,exportSession,importJson,listSessions,database,exportBackup } from '../../src/storage/repository';
function checkpoint(lessonIndex=0,exercise=0){const lesson=lessons[lessonIndex],ex=lesson.exercises[exercise],session=createSession('lesson',ex.fen);session.teaching={contentVersion:1,kind:'lesson',id:lesson.id,exercise,phase:'Attempt',demoStep:0,attempts:0,hints:0,solved:false,assisted:false,linePly:0,feedback:'',completedExercises:[]};return session;}
function advance(session:Session,exercise:Exercise,move:string){const result=grade(exercise,session.moves,move),game=new Chess(session.fen);playUci(game,move);session.moves.push(move);if(result.reply){playUci(game,result.reply);session.moves.push(result.reply);}session.fen=game.fen();const t=session.teaching!;t.linePly=session.moves.length;t.solved=result.complete;t.feedback=result.feedback;if(result.complete||!result.correct)t.attempts++;t.phase=result.complete?'Feedback':result.correct?'Attempt':'Retry';if(result.complete){t.completedExercises!.push(t.exercise);if(exercise.completeGame)t.completedGame={initialFen:session.initialFen,moves:[...session.moves]};}return result;}
it('the full guided game begins at move one, teaches every decision, and ends at verified checkmate',()=>{
 expect(validateExercise(guidedGame)).toBe(true);expect(lessons[17].exercises).toHaveLength(4);const session=checkpoint(17,3),line=guidedGame.accepted[0];
 for(let ply=0;ply<line.length;ply+=2){expect(decisionFor(guidedGame,session.moves)?.objective).toBeTruthy();const result=advance(session,guidedGame,line[ply]);expect(result.correct).toBe(true);expect(result.complete).toBe(ply+2>=line.length);expect(validateSession(session).moves).toEqual(session.moves);}
 expect(session.moves).toHaveLength(13);expect(new Chess(session.fen).isCheckmate()).toBe(true);expect(session.teaching!.completedGame!.moves).toEqual(line);
 const bad=structuredClone(guidedGame);bad.accepted[0].pop();expect(()=>validateExercise(bad)).toThrow(/not mate/);
});
it('every new learner/reply checkpoint replays semantically for all authored exercises and branches',()=>{
 for(const [lessonIndex,lesson] of lessons.entries())for(const [exerciseIndex,exercise] of lesson.exercises.entries())for(const line of exercise.accepted){const session=checkpoint(lessonIndex,exerciseIndex);expect(()=>validateSession(session)).not.toThrow();for(let ply=0;ply<line.length;ply+=2){advance(session,exercise,line[ply]);expect(()=>validateSession(session),exercise.id+' '+ply).not.toThrow();}}
});
it('wrong solved/assisted flags, phases, replies, initial positions and counters cannot be imported',async()=>{
 const valid=checkpoint();advance(valid,lessons[0].exercises[0],'a1a4');
 for(const patch of [{solved:'yes'},{assisted:0},{solved:false},{phase:'Attempt'},{linePly:0},{demoStep:1},{attempts:0},{hints:1},{phase:'Complete',completedExercises:[0]},{completedExercises:[3]}]){const bad=structuredClone(valid);Object.assign(bad.teaching!,patch);expect(()=>validateSession(bad)).toThrow();const before=(await listSessions()).length;await expect(importJson(exportSession(bad))).rejects.toThrow();expect(await listSessions()).toHaveLength(before);}
 const initial=checkpoint();initial.initialFen=lessons[0].exercises[2].fen;initial.fen=initial.initialFen;expect(()=>validateSession(initial)).toThrow(/position/);
 const partial=checkpoint(24);advance(partial,lessons[24].exercises[0],lessons[24].exercises[0].accepted[0][0]);partial.moves[1]='a6b5';const game=new Chess(partial.initialFen);for(const move of partial.moves)playUci(game,move);partial.fen=game.fen();expect(()=>validateSession(partial)).toThrow(/reply/);
});
it('demonstrations must exactly match their example step and completed guided-game proof survives exchange',async()=>{
 const demo=checkpoint();demo.teaching!.phase='Demonstration';const line=lessons[0].demo.accepted[0];for(const move of line){playUci(new Chess(demo.fen),move);demo.moves.push(move);}demo.fen=new Chess(demo.initialFen).move(line[0]).after;demo.teaching!.demoStep=demo.moves.length;expect(()=>validateSession(demo)).not.toThrow();demo.teaching!.demoStep=0;expect(()=>validateSession(demo)).toThrow(/step/);
 const game=checkpoint(17,3);for(let ply=0;ply<guidedGame.accepted[0].length;ply+=2)advance(game,guidedGame,guidedGame.accepted[0][ply]);const saved=await saveSession(game),loaded=await loadSession(saved.id),[imported]=await importJson(exportSession(saved));for(const item of [loaded,imported])expect(item.teaching!.completedGame).toEqual(game.teaching!.completedGame);
 const bad=structuredClone(game);bad.teaching!.completedGame!.moves.pop();expect(()=>validateSession(bad)).toThrow(/completed guided game/i);
});
it('older completed three-decision lessons reopen before the additive full-game exercise without erasing progress',()=>{
 const old=checkpoint(17,2);advance(old,lessons[17].exercises[2],'e1g1');old.teaching!.phase='Complete';old.teaching!.completedExercises=[0,1,2];const restored=validateSession(old);expect(restored.teaching!.phase).toBe('Feedback');expect(restored.teaching!.completedExercises).toEqual([0,1,2]);expect(restored.moves).toEqual(old.moves);expect(restored.teaching!.feedback).toContain('complete guided-game exercise');expect(old.teaching!.phase).toBe('Complete');
});
it('teaching imports reject contradictory game lifecycle fields before changing any saves',async()=>{
 const source=checkpoint();
 for(const patch of [{result:{winner:'b',reason:'Resignation'}},{clock:{...source.clock,initial:600000,remaining:{w:600000,b:600000}}},{clock:{...source.clock,increment:1000}},{clock:{...source.clock,remaining:{w:1,b:0}}},{historyPly:0},{handoff:true},{rotate:true},{teaching:undefined}]){
  const bad={...structuredClone(source),...patch};expect(()=>validateSession(bad)).toThrow(/teaching/i);const before=(await listSessions()).map(value=>value.id);await expect(importJson(JSON.stringify({format:'chessworkshop-library',version:1,sessions:[createSession('local'),bad]}))).rejects.toThrow(/teaching/i);expect((await listSessions()).map(value=>value.id)).toEqual(before);
 }
});
it('library reads and backups expose a normalized legacy lesson without rewriting the original record',async()=>{
 const old=checkpoint(17,2);advance(old,lessons[17].exercises[2],'e1g1');old.teaching!.phase='Complete';old.teaching!.completedExercises=[0,1,2];const db=await database();await db.put('sessions',old);
 expect((await listSessions()).find(value=>value.id===old.id)?.teaching?.phase).toBe('Feedback');expect((await db.get('sessions',old.id)).teaching.phase).toBe('Complete');
 const backup=JSON.parse(await exportBackup());expect(backup.sessions.find((value:Session)=>value.id===old.id).teaching.completedExercises).toEqual([0,1,2]);expect(backup.sessions.find((value:Session)=>value.id===old.id).teaching.phase).toBe('Feedback');
 await db.delete('sessions',old.id);
});

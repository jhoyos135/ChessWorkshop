import { Chess } from 'chess.js';
import { lessons,guidedGame,type Exercise } from '../../content/curriculum';
import puzzleData from '../../content/puzzles.json';
import type { Session } from '../sessions/model';
import { grade,validateExercise } from '../lessons/runner';
import { playUci } from '../chess/rules';

// Replays learner decisions and authored replies, including any legal mate.
export function teachingHistory(exercise:Exercise,moves:string[]){
 const prefix:string[]=[];let correct=true,complete=false;
 for(let at=0;at<moves.length;){
  if(complete||!correct)throw Error('Teaching history continues after feedback');
  const result=grade(exercise,prefix,moves[at++]);prefix.push(moves[at-1]);correct=result.correct;complete=result.complete;
  if(result.reply){if(moves[at]!==result.reply)throw Error('Teaching reply does not match its branch');prefix.push(moves[at++]);}
 }
 return {correct,complete};
}

export function validateTeachingCheckpoint(session:Session){
 const t=session.teaching;if(!t){if(session.mode==='lesson')throw Error('Missing teaching checkpoint for lesson');return false;}
 if(session.result!==null||session.clock.initial!==0||session.clock.increment!==0||session.clock.remaining.w!==0||session.clock.remaining.b!==0||session.historyPly!==null||session.handoff||session.rotate)throw Error('Teaching checkpoint cannot contain a game result, timed clock, history navigation or turn handoff');
 const lesson=t.kind==='lesson'?lessons.find(value=>value.id===t.id):undefined;
 const exercise:Exercise|undefined=t.kind==='review'?t.reviewExercise:t.kind==='puzzle'?(puzzleData as Exercise[]).find(value=>value.id===t.id):lesson?.exercises[t.exercise];
 if(!exercise||t.kind==='lesson'&&!lesson||session.mode!==(t.kind==='lesson'?'lesson':'practice'))throw Error('Teaching checkpoint has no matching content');
 if(typeof t.solved!=='boolean'||typeof t.assisted!=='boolean'||t.linePly>session.moves.length||t.feedback.length>10000)throw Error('Invalid teaching flags or move count');
 if(t.hints>0&&(!t.assisted||!session.helpUsed)||t.assisted&&!session.helpUsed)throw Error('Teaching assistance flags disagree');
 if(t.kind!=='lesson'&&(t.exercise!==0||t.demoStep!==0||['Introduction','Demonstration','Complete'].includes(t.phase)))throw Error('Invalid practice phase');
 if(t.sourceSession!==undefined&&(t.kind!=='review'||typeof t.sourceSession!=='string'||!t.sourceSession))throw Error('Invalid teaching source session');
 if(t.kind==='review'){if(exercise.id!==t.id||exercise.version!==1)throw Error('Review exercise identity does not match checkpoint');validateExercise(exercise);}
 const indices=t.completedExercises;
 if(indices!==undefined&&(!Array.isArray(indices)||new Set(indices).size!==indices.length||indices.some(index=>!Number.isInteger(index)||index<0||index>=(lesson?.exercises.length??0))))throw Error('Invalid completed exercise set');
 const legacyExtension=t.kind==='lesson'&&t.id==='lesson-18'&&t.phase==='Complete'&&t.solved&&t.exercise<3&&!t.completedGame&&(indices?indices.length===3&&[0,1,2].every(index=>indices.includes(index)):t.exercise===2);
 if(t.completedGame){
  if(t.id!=='lesson-18'||!t.completedGame||t.completedGame.initialFen!==guidedGame.fen||!Array.isArray(t.completedGame.moves)||t.completedGame.moves.length>256)throw Error('Invalid completed guided game');
  const state=teachingHistory(guidedGame,t.completedGame.moves),game=new Chess(t.completedGame.initialFen);for(const move of t.completedGame.moves)playUci(game,move);
  if(!state.correct||!state.complete||!game.isCheckmate()||!indices?.includes(3))throw Error('Completed guided game does not reach its objective');
 }
 if(t.id==='lesson-18'&&indices?.includes(3)&&!t.completedGame)throw Error('Missing completed guided-game history');
 if(t.phase==='Introduction'||t.phase==='Demonstration'){
  const expected=t.phase==='Demonstration'?lesson!.demo:exercise;
  if(session.initialFen!==expected.fen||t.solved||t.linePly!==0||t.hints!==0||t.attempts!==0||t.assisted)throw Error('Invalid lesson introduction or demonstration');
  if(t.phase==='Introduction'?(session.moves.length!==0||t.demoStep!==0):t.demoStep!==session.moves.length||!session.moves.every((move,index)=>lesson!.demo.accepted[0][index]===move))throw Error('Demonstration step does not match the example');
  return false;
 }
 if(session.initialFen!==exercise.fen||t.linePly!==session.moves.length||t.demoStep!==0)throw Error('Teaching position does not match exercise checkpoint');
 const state=teachingHistory(exercise,session.moves);
 if(t.solved!==state.complete||t.phase==='Retry'&&state.correct||t.phase==='Attempt'&&(!state.correct||state.complete)||['Feedback','Complete'].includes(t.phase)&&!state.complete)throw Error('Teaching phase and solved state disagree with the moves');
 if(!state.correct&&t.phase!=='Retry'||state.complete&&t.attempts<1||!state.correct&&t.attempts<1)throw Error('Invalid teaching attempt state');
 if(t.solved&&lesson&&indices&&!indices.includes(t.exercise))throw Error('Solved exercise missing from completion set');
 if(t.phase==='Complete'&&!legacyExtension&&(!lesson||indices?.length!==lesson.exercises.length))throw Error('Lesson completion is missing exercises');
 return legacyExtension;
}

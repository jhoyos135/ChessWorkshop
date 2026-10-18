import { Chess } from 'chess.js';
import { playUci } from '../chess/rules';
import type { Session,ReviewedMove } from '../sessions/model';
import { lessons } from '../../content/curriculum';
import { validateLegalLine } from './legalLine';

export function validateReviewRecords(s:Session){
 if(s.reviewReveals!==undefined){
  if(!Array.isArray(s.reviewReveals)||s.reviewReveals.length>20000||new Set(s.reviewReveals.map(reveal=>reveal?.fen)).size!==s.reviewReveals.length)throw Error('Invalid review reveal history');
  for(const reveal of s.reviewReveals){if(!reveal||typeof reveal.fen!=='string'||!Number.isFinite(reveal.at)||reveal.at<0)throw Error('Invalid review reveal history');new Chess(reveal.fen);}
 }
 for(const moment of s.review){
  if(moment.played!==s.moves[moment.ply])throw Error('Review move does not match the original game');
  if(moment.skill!==undefined&&(typeof moment.skill!=='string'||!moment.skill||moment.skill.length>200))throw Error('Invalid review skill');
  if(moment.lessonId!==undefined&&!lessons.some(lesson=>lesson.id===moment.lessonId))throw Error('Unknown review practice lesson');
  if(moment.revealedAt!==undefined&&(!Number.isFinite(moment.revealedAt)||moment.revealedAt<0))throw Error('Invalid review reveal history');
 }
 if(s.reviewMoves!==undefined){
  if(!Array.isArray(s.reviewMoves)||s.reviewMoves.length!==s.reviewProgress)throw Error('Incomplete move-review checkpoint');
  const game=new Chess(s.initialFen);for(const [i,entry] of s.reviewMoves.entries()){validateComparison(entry,game,s,i);playUci(game,entry.played);}
 }
 if(s.feedback!==undefined){
  if(!Array.isArray(s.feedback)||s.feedback.length>s.moves.length)throw Error('Invalid coaching feedback');
  const game=new Chess(s.initialFen);let at=0;
  for(const entry of s.feedback){if(!entry||!Number.isInteger(entry.ply)||entry.ply<at||entry.ply>=s.moves.length)throw Error('Invalid feedback move');while(at<entry.ply)playUci(game,s.moves[at++]);validateComparison(entry,game,s,at);playUci(game,entry.played);at++;}
 }
}
function validateComparison(entry:ReviewedMove,game:Chess,s:Session,ply:number){
 if(!entry||entry.ply!==ply||entry.fen!==game.fen()||entry.played!==s.moves[ply])throw Error('Move review does not match game history');
  for(const score of [entry.bestScore,entry.playedScore])if(!score||!['cp','mate'].includes(score.kind)||!Number.isFinite(score.value))throw Error('Invalid review evaluation');
  if(entry.loss!==undefined&&(!Number.isFinite(entry.loss)||entry.loss<0||entry.bestScore.kind!=='cp'||entry.playedScore.kind!=='cp'))throw Error('Invalid review score difference');
  const expected=entry.bestScore.kind==='cp'&&entry.playedScore.kind==='cp'?Math.max(0,(entry.bestScore.value-entry.playedScore.value)*(game.turn()==='w'?1:-1)):undefined;
  if(expected===undefined?entry.loss!==undefined:entry.loss===undefined||Math.abs(entry.loss-expected)>0.000001)throw Error('Review difference does not match its evaluations');
  if(!['verdict','explanation','engine','skill'].every(key=>typeof entry[key as 'verdict']==='string'&&entry[key as 'verdict'].length>0)||!Number.isFinite(entry.budget)||entry.budget<100||entry.budget>5000||!lessons.some(lesson=>lesson.id===entry.lessonId))throw Error('Invalid move-review metadata');
  if(!Array.isArray(entry.line)||entry.line.length<1||entry.line.length>256||entry.line[0]!==entry.best)throw Error('Invalid review continuation');
  validateLegalLine(entry.fen,entry.line);
 if(entry.threshold!==undefined&&(!Number.isFinite(entry.threshold)||entry.threshold<30||entry.threshold>1000))throw Error('Invalid feedback threshold');
}

import { Chess } from 'chess.js';
import type { Candidate } from '../engine/uci';
import type { Moment, ReviewedMove } from '../sessions/model';
import { playUci } from '../chess/rules';
import { lossBetween } from './explain';
import { explainCandidate } from './reasons';

export function importantMoments(moments:Moment[],limit=5){return [...moments].sort((a,b)=>Number(/mate/i.test(b.label))-Number(/mate/i.test(a.label))||(b.loss??0)-(a.loss??0)||a.ply-b.ply).slice(0,limit);}

export function reviewSkill(fen:string,move:string,verdict:string){
 const g=new Chess(fen),m=playUci(g,move);
 if(/mate|mating/i.test(verdict)||g.isCheckmate())return {skill:'Checkmate patterns',lessonId:'lesson-28'};
 const attacks=g.board().flat().filter(p=>p&&p.color!==m.color&&p.type!=='k'&&g.attackers(p.square,m.color).includes(m.to));
 if(attacks.length+(g.isCheck()?1:0)>=2)return {skill:'Double attacks',lessonId:'lesson-23'};
 if(m.promotion)return {skill:'Promotion choices',lessonId:'lesson-14'};
 if(m.captured)return {skill:'Captures and hanging pieces',lessonId:'lesson-22'};
 if(m.isKingsideCastle()||m.isQueensideCastle())return {skill:'King safety',lessonId:'lesson-20'};
 if(g.isCheck())return {skill:'Checks and responses',lessonId:'lesson-10'};
 if(['n','b'].includes(m.piece)&&m.from[1]===(m.color==='w'?'1':'8'))return {skill:'Development',lessonId:'lesson-19'};
 return {skill:'Checks, captures and threats',lessonId:'lesson-17'};
}

// Scores are already normalized to White. Mate distances are never converted to pawns.
export function reviewDecision(fen:string,best:Candidate,played:Candidate,threshold:number){
 const sign=new Chess(fen).turn()==='w'?1:-1,loss=lossBetween(best.score,played.score,new Chess(fen).turn());
 const winningMate=best.score.kind==='mate'&&best.score.value*sign>0;
 const retainedMate=played.score.kind==='mate'&&played.score.value*sign>0;
 let label:string|undefined;
 if(winningMate&&!retainedMate)label='Missed mate';
 else if(winningMate&&retainedMate&&Math.abs(best.score.value)===1&&Math.abs(played.score.value)>1)label='Missed mate in one';
 else if(played.score.kind==='mate'&&played.score.value*sign<0&&!(best.score.kind==='mate'&&best.score.value*sign<0))label='Allows mate';
 else if(loss!==null&&loss>=threshold)label='Costly move';
 const verdict=label??(loss!==null?loss<=30?'Comparable in this search':'Another continuation scored higher':winningMate&&retainedMate?'Retains a mating line':'Mate estimate — inspect the continuations');
 return {loss:loss??undefined,label,verdict,...reviewSkill(fen,best.move,verdict)};
}

export function reviewedMove(ply:number,fen:string,best:Candidate,played:Candidate,threshold:number,engine:string,budget:number):{entry:ReviewedMove;moment?:Moment}{
 const decision=reviewDecision(fen,best,played,threshold);
 const entry:ReviewedMove={ply,fen,played:played.move,best:best.move,line:[...best.pv],bestScore:best.score,playedScore:played.score,loss:decision.loss,verdict:decision.verdict,explanation:explainCandidate(fen,best).summary,engine,budget,threshold,skill:decision.skill,lessonId:decision.lessonId};
 const moment=decision.label?{ply,fen,played:played.move,best:best.move,line:[...best.pv],loss:decision.loss,label:decision.label,explanation:entry.explanation,engine,budget,skill:entry.skill,lessonId:entry.lessonId}:undefined;
 return {entry,moment};
}

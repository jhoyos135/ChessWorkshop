import { Chess,DEFAULT_POSITION } from 'chess.js';
import type { Exercise } from '../../content/curriculum';
import { playUci } from '../chess/rules';
import { describeMove } from '../coaching/moveGuide';
import { wrongMoveFeedback } from './feedback';
export function grade(ex:Exercise,history:string[],move:string):{correct:boolean;complete:boolean;reply?:string;feedback:string}{
 const g=new Chess(ex.fen);for(const m of history)playUci(g,m);const played=playUci(g,move);
 if(ex.completeGame&&g.isCheckmate())return {correct:true,complete:true,feedback:ex.explanation};
 if(ex.predicate==='mate'){
  const correct=g.isCheckmate(),replies=g.moves();
  return {correct,complete:correct,feedback:correct?'That is checkmate: the king is in check and there is no legal way to escape.':g.isStalemate()?'The king is not in check and has no legal move. That is stalemate, a draw. Try giving checkmate instead.':!g.isCheck()?'The opposing king is not in check. Checkmate requires a check with no legal reply. Reset and try a checking move.':`The opponent can answer this check with ${replies[0]??'another legal move'}. Look for a check that leaves no legal reply.`};
 }
 const prefix=[...history,move],branch=ex.accepted.find(b=>prefix.every((m,i)=>b[i]===m));
 if(!branch)return {correct:false,complete:false,feedback:wrongMoveFeedback(ex,history,g,played,decisionFor(ex,history)?.objective??ex.objective)};
 const reply=branch[prefix.length],complete=branch.length<=prefix.length+(reply?1:0);
 let feedback=ex.explanation;
 if(!complete&&reply){const response=describeMove(g.fen(),reply);feedback=`${decisionFor(ex,history)?.why??'Good first move.'} The opponent moves the ${response.piece} from ${response.from} to ${response.to}. ${ex.completeGame?'Repeat your decision routine for the next turn.':'Now finish the task with your next move.'}`;}
 return {correct:true,complete,reply,feedback};
}
export function decisionFor(ex:Exercise,history:string[]){return ex.decisions?.find(decision=>decision.ply===history.length);}
export function validateExercise(ex:Exercise){
 if(!ex||ex.version!==1||typeof ex.id!=='string'||!ex.id||!['w','b'].includes(ex.side)||!['objective','explanation','feedback','source'].every(key=>typeof ex[key as 'objective']==='string'&&ex[key as 'objective'].length>0&&ex[key as 'objective'].length<=10000))throw Error('Invalid exercise metadata');
 if(!Array.isArray(ex.hints)||ex.hints.length!==3||ex.hints.some(hint=>typeof hint!=='string'||!hint||hint.length>10000)||!Array.isArray(ex.tags)||ex.tags.some(tag=>typeof tag!=='string')||!Array.isArray(ex.targets)||ex.targets.some(square=>typeof square!=='string'||!/^[a-h][1-8]$/.test(square)))throw Error(ex.id+': invalid hints or tags');
 if(!Array.isArray(ex.accepted)||!ex.accepted.length||ex.accepted.length>256||ex.accepted.some(line=>!Array.isArray(line)||!line.length||line.length>512||line.some(move=>typeof move!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))))throw Error(ex.id+': invalid solution branches');
 if(ex.predicate!==undefined&&ex.predicate!=='mate'||ex.completeGame!==undefined&&typeof ex.completeGame!=='boolean')throw Error(ex.id+': unknown objective predicate');
 const initial=new Chess(ex.fen);if(initial.turn()!==ex.side)throw Error(ex.id+': incorrect learner side');
 const opponent=initial.board().flat().find(piece=>piece?.type==='k'&&piece.color!==initial.turn());if(opponent&&initial.isAttacked(opponent.square,initial.turn()))throw Error(ex.id+': opponent king already in check');
 for(const line of ex.accepted){const game=new Chess(ex.fen);for(const move of line)playUci(game,move);if((ex.predicate==='mate'||ex.completeGame)&&!game.isCheckmate())throw Error(ex.id+': solution is not mate');}
 if(ex.completeGame){
  if(ex.fen!==DEFAULT_POSITION||ex.side!=='w'||!Array.isArray(ex.decisions)||ex.decisions.length!==Math.ceil(ex.accepted[0].length/2))throw Error(ex.id+': incomplete full-game routine');
  for(const [index,decision] of ex.decisions.entries())if(!decision||decision.ply!==index*2||typeof decision.objective!=='string'||!decision.objective||typeof decision.why!=='string'||!decision.why||!Array.isArray(decision.hints)||decision.hints.length!==3||decision.hints.some(hint=>typeof hint!=='string'||!hint))throw Error(ex.id+': invalid guided decision');
 }
 return true;
}

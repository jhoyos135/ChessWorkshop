import { Chess,type Move } from 'chess.js';
import type { Exercise } from '../../content/curriculum';
import { playUci } from '../chess/rules';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

/** Explain a rejected legal attempt using the resulting position. These are
 * available replies and board facts, never an unsearched claim of a forced loss. */
export function wrongMoveFeedback(exercise:Exercise,history:string[],after:Chess,move:Move,objective:string){
 const expected=exercise.accepted.filter(line=>line.length>history.length&&history.every((value,index)=>line[index]===value)).map(line=>{const game=new Chess(move.before),next=playUci(game,line[history.length]);return {game,move:next};});
 const description=`Your ${names[move.piece]} moves from ${move.from} to ${move.to} (${move.san})${move.promotion?', promoting to a '+names[move.promotion]:''}${move.captured?' and captures a '+names[move.captured]+(move.isEnPassant()?' en passant':''):''}.`;
 const replies=after.moves({verbose:true}),capture=replies.find(reply=>reply.captured&&(reply.to===move.to||reply.isEnPassant()&&reply.to[0]+reply.from[1]===move.to));
 const fork=expected.some(({game,move:next})=>{const king=game.board().flat().find(piece=>piece?.type==='k'&&piece.color!==next.color);return king&&game.attackers(king.square,next.color).includes(next.to)&&game.board().flat().some(piece=>piece&&piece.color!==next.color&&piece.type!=='k'&&game.attackers(piece.square,next.color).includes(next.to));});
 let consequence:string;
 if(after.isCheckmate())consequence='That gives checkmate and ends the game, although this task has a different objective.';
 else if(after.isStalemate())consequence='The opponent has no legal move and is not in check. That is stalemate, a draw.';
 else if(fork){
  const king=after.board().flat().find(piece=>piece?.type==='k'&&piece.color!==move.color),checks=!!king&&after.attackers(king.square,move.color).includes(move.to),targets=after.board().flat().filter(piece=>piece&&piece.color!==move.color&&piece.type!=='k'&&after.attackers(piece.square,move.color).includes(move.to));
  consequence=`From ${move.to}, your ${names[move.promotion??move.piece]} ${checks?'checks':'does not check'} the opposing king and ${targets.length?'attacks '+targets.slice(0,2).map(piece=>'the '+names[piece!.type]+' on '+piece!.square).join(' and '):'does not attack a second opposing piece'}. Compare both targets in the requested fork.`;
 }else if(capture)consequence=`The opponent can now play ${capture.san} and capture your moved ${names[move.promotion??move.piece]}. This is a legal reply, not a claim that the capture is forced.`;
 else if(after.isCheck())consequence=`This gives check, but the opponent can answer with ${replies[0].san}. Giving check alone does not complete this task.`;
 else if(expected.length&&expected.every(value=>value.move.piece!==move.piece))consequence=`This task uses ${[...new Set(expected.map(value=>'a '+names[value.move.piece]))].join(' or ')}, while you moved the ${names[move.piece]}.`;
 else if(!move.captured&&expected.length&&expected.every(value=>value.move.captured))consequence='No opposing piece was captured. This task asks you to make a capture.';
 else consequence=move.from[0]===move.to[0]?`It stays on the ${move.to[0]}-file and stops on rank ${move.to[1]}.`:move.from[1]===move.to[1]?`It stays on rank ${move.to[1]} and reaches the ${move.to[0]}-file.`:`The piece now stands on file ${move.to[0]}, rank ${move.to[1]}.`;
 return `${description} ${consequence} This exercise asks: ${objective} ${exercise.completeGame?'The guided game follows a chosen reply line. ':''}Reset the position and try that goal again.`;
}

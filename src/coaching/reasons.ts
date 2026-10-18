import { Chess,type Square,type Color } from 'chess.js';
import { playUci } from '../chess/rules';
import type { Candidate } from '../engine/uci';
import { scoreText } from './explain';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'},values={p:1,n:3,b:3,r:5,q:9,k:0};
const center=['d4','e4','d5','e5'] as Square[];
const squares=Array.from({length:64},(_,index)=>('abcdefgh'[index%8]+(1+Math.floor(index/8))) as Square);
const side=(color:Color)=>color==='w'?'White':'Black';
function balance(game:Chess,color:Color){return game.board().flat().reduce((sum,piece)=>sum+(piece?(piece.color===color?1:-1)*values[piece.type]:0),0);}

/** Position facts and a replayed search example. Strategic benefits are described
 * as plans; a geometric attack is never presented as a forced material win. */
export function explainCandidate(fen:string,candidate:Candidate,others:Candidate[]=[]){
 const before=new Chess(fen),after=new Chess(fen),wasCheck=before.isCheck(),move=playUci(after,candidate.move),opponent=move.color==='w'?'b':'w';
 const benefits:string[]=[],watch:string[]=[];
 if(after.isCheckmate())benefits.push('It ends the game: the opposing king is in check and has no legal escape, capture or block.');
 else if(after.isStalemate())benefits.push('It ends the game in stalemate: the opponent has no legal move and is not in check. That is a draw.');
 else{
  if(wasCheck)benefits.push('It answers the check and removes the current attack on your king. King safety has to come before another plan.');
  if(move.isKingsideCastle()||move.isQueensideCastle())benefits.push(`It moves your king away from the central e-file to ${move.to}, and brings the rook from ${move.isKingsideCastle()?'h':'a'}${move.from[1]} to ${move.isKingsideCastle()?'f':'d'}${move.from[1]}. This combines a king-safety plan with bringing the rook toward the center.`);
  if(move.promotion)benefits.push(`Your pawn becomes a ${names[move.promotion]}, giving it that piece’s movement and attacking power.`);
  if(move.captured)benefits.push(`It captures a ${names[move.captured]}${move.isEnPassant()?' en passant':''}, worth about ${values[move.captured]} ${values[move.captured]===1?'pawn':'pawns'} in the usual material guide. Check the reply before counting this as a lasting gain.`);
  if(['n','b'].includes(move.piece)&&move.from[1]===(move.color==='w'?'1':'8'))benefits.push(`It develops your ${names[move.piece]} from its starting rank, bringing another piece into the game.`);
  if(move.piece==='p'&&center.includes(move.to))benefits.push(`It occupies ${move.to}, one of the four central squares. A central pawn gives your pieces more room to work around the middle of the board.`);
  const controlled=center.filter(square=>after.attackers(square,move.color).includes(move.to)&&!before.attackers(square,move.color).includes(move.from));
  if(controlled.length)benefits.push(`The ${names[move.promotion??move.piece]} now controls ${controlled.join(' and ')} in the center. That gives it influence over useful routes for both armies.`);
  if(move.piece==='p'){
   const opened=before.board().flat().filter(piece=>piece&&piece.color===move.color&&['b','q'].includes(piece.type)&&after.get(piece.square)?.type===piece.type&&squares.some(square=>after.attackers(square,move.color).includes(piece.square)&&!before.attackers(square,move.color).includes(piece.square)));
   const openedPiece=opened.find(piece=>piece?.type==='b')??opened[0];if(openedPiece)benefits.push(`Moving the pawn opens a line for your ${names[openedPiece.type]} on ${openedPiece.square}, giving that piece access to squares it could not reach before.`);
  }
  const targets=after.board().flat().filter(piece=>piece&&piece.color===opponent&&piece.type!=='k'&&after.attackers(piece.square,move.color).includes(move.to));
  if(after.isCheck())benefits.push(`It gives check, so ${side(opponent)} must deal with the king’s attack. There ${after.moves().length===1?'is 1 legal reply':'are '+after.moves().length+' legal replies'} in this position.`);
  if(targets.length)benefits.push(`It puts pressure on ${targets.slice(0,2).map(piece=>`the ${names[piece!.type]} on ${piece!.square}`).join(' and ')}.${targets.length+(after.isCheck()?1:0)>1?' Attacking two targets at once can make the opponent’s reply harder; use the line below to test what actually happens.':''}`);
  if(!after.isCheck()&&['b','r','q'].includes(move.piece)){
   const king=after.board().flat().find(piece=>piece?.type==='k'&&piece.color===opponent);
   for(const target of targets){const test=new Chess(after.fen());test.remove(target!.square);if(king&&test.attackers(king.square,move.color).includes(move.to)){benefits.push(`It pins the ${names[target!.type]} on ${target!.square} to its king. That piece cannot leave the line of attack if doing so exposes its king to check.`);break;}}
  }
  if(before.attackers(move.from,opponent).length&&!after.attackers(move.to,opponent).length&&!wasCheck)benefits.push(`It moves your ${names[move.piece]} out of direct attack. No opposing piece currently attacks ${move.to} after the move.`);
  const defended=after.board().flat().find(piece=>piece&&piece.color===move.color&&piece.square!==move.to&&piece.type!=='k'&&before.attackers(piece.square,opponent).length&&after.attackers(piece.square,move.color).includes(move.to)&&!before.attackers(piece.square,move.color).includes(move.from));
  if(defended)benefits.push(`It adds a defender to your ${names[defended.type]} on ${defended.square}, which the opponent is attacking. Compare captures and recaptures before deciding whether that piece is safe.`);
  if(move.piece==='r'&&!after.board().flat().some(piece=>piece?.type==='p'&&piece.square[0]===move.to[0]))benefits.push(`It places your rook on the open ${move.to[0]}-file: there are no pawns on that file to block its straight routes.`);
  if(move.piece==='p'&&!after.board().flat().some(piece=>piece?.type==='p'&&piece.color===opponent&&Math.abs(piece.square.charCodeAt(0)-move.to.charCodeAt(0))<=1&&(Number(piece.square[1])-Number(move.to[1]))*(move.color==='w'?1:-1)>0))benefits.push('This is a passed pawn: there are no opposing pawns ahead on its file or either neighboring file. Advancing it toward promotion is a useful plan, while still checking the king and other pieces that could stop it.');
  if(move.piece==='k'){
   const king=after.board().flat().find(piece=>piece?.type==='k'&&piece.color===opponent);if(king){const sameFile=king.square[0]===move.to[0]&&Math.abs(Number(king.square[1])-Number(move.to[1]))===2,sameRank=king.square[1]===move.to[1]&&Math.abs(king.square.charCodeAt(0)-move.to.charCodeAt(0))===2;
    const middle=(sameFile?move.to[0]+(Number(king.square[1])+Number(move.to[1]))/2:sameRank?String.fromCharCode((king.square.charCodeAt(0)+move.to.charCodeAt(0))/2)+move.to[1]:undefined) as Square|undefined;
    if(middle&&!after.get(middle))benefits.push(`The kings now face each other with one square between them, and ${side(opponent)} is to move. This is direct opposition; a pawn move can change its timing.`);
   }
  }
 }
 const replies=after.moves({verbose:true}).filter(reply=>reply.captured&&(reply.to===move.to||reply.isEnPassant()&&reply.to[0]+reply.from[1]===move.to));
 if(replies[0])watch.push(`${side(opponent)} can immediately capture the moved ${names[move.promotion??move.piece]} with ${replies[0].san}. Examine the continuation before leaving it there.`);
 const leading=others[0],sign=move.color==='w'?1:-1;
 if(leading&&leading.move!==candidate.move){
  if(leading.score.kind==='cp'&&candidate.score.kind==='cp'&&(leading.score.value-candidate.score.value)*sign>=120)watch.unshift(`This option scored ${(((leading.score.value-candidate.score.value)*sign)/100).toFixed(2)} pawns below the leading candidate for ${side(move.color)} in this search. Compare the first suggestion before choosing it.`);
  else if(leading.score.kind==='mate'&&leading.score.value*sign>0&&!(candidate.score.kind==='mate'&&candidate.score.value*sign>0))watch.unshift('The leading candidate has a mating estimate; this option does not preserve that estimate.');
  else if(candidate.score.kind==='mate'&&candidate.score.value*sign<0&&!(leading.score.kind==='mate'&&leading.score.value*sign<0))watch.unshift(`The search found a mating line for ${side(opponent)} after this option. Compare the leading candidate.`);
 }
 if(!benefits.length)benefits.push('This recommendation depends on the longer plan in the calculated line. Compare the opponent’s reply and alternatives; there is no immediate capture or check to explain it.');
 const replay=new Chess(fen),notation:string[]=[],line=candidate.pv[0]===candidate.move?candidate.pv.slice(0,7):[candidate.move];let reply:string|undefined;
 for(const [index,uci] of line.entries()){const played=playUci(replay,uci);notation.push(played.san);if(index===1)reply=`${side(played.color)} can answer ${played.san}: the ${names[played.piece]} moves from ${played.from} to ${played.to}${played.captured?' and captures your '+names[played.captured]:''}${replay.isCheck()?', giving check':''}.`;}
 const materialChange=balance(replay,move.color)-balance(before,move.color),lineOutcome=replay.isCheckmate()?'This illustrated line ends in checkmate.':replay.isStalemate()?'This illustrated line ends in stalemate.':materialChange!==0&&notation.length>1?`In these ${notation.length} illustrated plies, ${side(move.color)} ${materialChange>0?'gains':'gives up'} ${Math.abs(materialChange)} ${Math.abs(materialChange)===1?'pawn':'pawns'} of material relative to the starting position. Other replies can change that outcome.`:undefined;
 const similar=candidate.score.kind==='cp'&&others.some(other=>other.move!==candidate.move&&other.score.kind==='cp'&&Math.abs(other.score.value-candidate.score.value)<=30);
 const assessment=`Search estimate: ${scoreText(candidate.score)} at depth ${candidate.depth}.${similar?' Several analyzed moves scored similarly; compare their plans.':''}`;
 const priority=(text:string)=>text.startsWith('It ends')||text.startsWith('It answers')?0:text.startsWith('It gives check')?1:text.startsWith('Your pawn becomes')||text.startsWith('It captures')||text.startsWith('It moves your king away')?2:text.startsWith('It pins')||text.startsWith('It puts pressure')||text.startsWith('It moves your')||text.startsWith('It adds a defender')?3:4;
 benefits.sort((a,b)=>priority(a)-priority(b));
 return {benefits:benefits.slice(0,3),reply,watch,notation,lineOutcome,assessment,summary:[...benefits.slice(0,3),reply,lineOutcome].filter(Boolean).join(' ')};
}

import { Chess } from 'chess.js';
import { playUci } from '../chess/rules';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function describeMove(fen:string,uci:string){
 const move=playUci(new Chess(fen),uci),piece=names[move.piece],promotion=move.promotion?names[move.promotion]:undefined;
 const action=move.captured?`Capture the ${names[move.captured]} on ${move.to}`:`Move to ${move.to}`;
 const extra=move.isKingsideCastle()||move.isQueensideCastle()?`Your rook moves too: ${move.isKingsideCastle()?'h':'a'}${move.from[1]} → ${move.isKingsideCastle()?'f':'d'}${move.from[1]}.`:move.isEnPassant()?`En passant: the pawn on ${move.to[0]}${move.from[1]} is removed.`:promotion?`Choose a ${promotion} in the promotion dialog.`:'';
 return {from:move.from,to:move.to,piece,color:move.color,promotion,action,extra,san:move.san,instruction:`Select your ${piece} on ${move.from}. ${action}.${promotion?` Promote to ${promotion}.`:''}`};
}

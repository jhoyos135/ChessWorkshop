import { Chess } from 'chess.js';
import { playUci } from '../chess/rules';

// Cache only this pure legality proof. Metadata and its relationship to the
// authoritative history are still checked on every save/import. A changed FEN
// or move changes the key, including edits made in place to an existing array.
const verified=new Map<string,true>();
export function validateLegalLine(fen:string,moves:string[]){
 if(!Array.isArray(moves)||moves.some(move=>typeof move!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)))throw Error('Invalid review move notation');
 const key=JSON.stringify([fen,moves]);if(verified.has(key))return;
 const game=new Chess(fen);for(const move of moves)playUci(game,move);
 if(verified.size>=512)verified.delete(verified.keys().next().value!);
 verified.set(key,true);
}

import { Chess } from 'chess.js';
export const BLOCKED_FEN='4k3/8/8/p1p1p1p1/PpPpPpPp/1P1P1P1P/8/4K3 w - - 0 1';
// Exhaustive finite graph, independent of the runtime barrier classifier.
// Ignore counters: proving no check in this larger graph also covers games
// ended earlier by repetition/75 moves. Any pawn move/capture breaks the proof.
export function proveBlockedFixture(){const key=(fen:string)=>fen.split(' ').slice(0,4).join(' ')+' 0 1',queue=[key(BLOCKED_FEN),key(BLOCKED_FEN.replace(' w ',' b '))],seen=new Set(queue);let edges=0;for(let at=0;at<queue.length;at++){const game=new Chess(queue[at]);if(game.isCheck())throw Error('Reachable check invalidates the barrier proof');for(const move of game.moves({verbose:true})){if(move.piece!=='k'||move.captured)throw Error('Reachable pawn move/capture invalidates the barrier proof');const next=key(move.after);edges++;if(!seen.has(next)){seen.add(next);queue.push(next);}}}return {positions:seen.size,edges,reachableChecks:0,reachablePawnMoves:0,reachableCaptures:0};}

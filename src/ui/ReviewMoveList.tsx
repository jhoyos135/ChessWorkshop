import { Chess } from 'chess.js';
import type { ReviewedMove } from '../sessions/model';
import { playUci } from '../chess/rules';
import { scoreText } from '../coaching/explain';

export function reviewNotation(fen:string,moves:string[]){const game=new Chess(fen);return moves.map(move=>playUci(game,move).san).join(' ');}
export function ReviewMoveList({entries,onPosition}:{entries:ReviewedMove[];onPosition:(ply:number)=>void}){
 return <details className="full-move-review"><summary>Every analyzed move ({entries.length})</summary><p>Opening this list reveals the suggested continuations. Try an answer-hidden mistake card first if you want an independent attempt. Evaluations favor White when positive.</p>{entries.map(entry=><article className="reviewed-move" key={entry.ply}>
  <h3>Move {Number(entry.fen.split(' ')[5])} · {new Chess(entry.fen).turn()==='w'?'White':'Black'} played {reviewNotation(entry.fen,[entry.played])}</h3>
  <strong>{entry.verdict}</strong><p>{entry.skill}</p>
  <dl className="review-comparison"><div><dt>Played move</dt><dd>{reviewNotation(entry.fen,[entry.played])} · {scoreText(entry.playedScore)}</dd></div><div><dt>Strongest found</dt><dd>{reviewNotation(entry.fen,[entry.best])} · {scoreText(entry.bestScore)}</dd></div></dl>
  {entry.loss!==undefined&&<p>Estimated difference: {(entry.loss/100).toFixed(2)} pawns for the player who moved.</p>}<p>{entry.explanation}</p><p>Example line: {reviewNotation(entry.fen,entry.line)}</p><small>{entry.engine} · {entry.budget} ms per search · estimates may change with more analysis</small><div><button onClick={()=>onPosition(entry.ply)}>View this position</button></div>
 </article>)}{!entries.length&&<p>Analyze the game to build a move-by-move review. Earlier saves with only key moments are rebuilt when analysis restarts.</p>}</details>;
}

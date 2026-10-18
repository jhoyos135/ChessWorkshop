import { useMemo } from 'react';
import { describeMove } from '../coaching/moveGuide';
import { scoreText } from '../coaching/explain';
import { explainCandidate } from '../coaching/reasons';
import type { Candidate } from '../engine/uci';

type Props = {
 move:string;
 san:string;
 candidate?:Candidate;
 candidates:Candidate[];
 fen:string;
 rank?:number;
 active:boolean;
 pieceSelected:boolean;
 onSelect:()=>void;
 explain:boolean;
 showOnBoard:boolean;
};

export function MoveSuggestion({move,san,candidate,candidates,fen,rank,active,pieceSelected,onSelect,explain,showOnBoard}:Props){
 const guide=useMemo(()=>describeMove(fen,move),[fen,move]);
 const reasons=useMemo(()=>explain&&candidate&&active?explainCandidate(fen,candidate,candidates):null,[fen,candidate,candidates,explain,active]);
 return <article role="listitem" className={`candidate move-suggestion ${active?'suggestion-selected':''}`} data-move={move} data-ranked={candidate?'true':'false'}>
  <button className="suggestion-route" aria-pressed={active} aria-label={`${candidate?`Rank ${rank}`:'Not ranked'}: ${guide.piece} from ${guide.from} to ${guide.to}. ${showOnBoard?'Show this route on the board.':'Read this move.'}`} onClick={onSelect}>
   <span className={`candidate-rank ${candidate?'candidate-ranked':'candidate-unranked'}`}>{candidate?rank:'Not ranked'}</span>
   <span className="candidate-piece"><strong>{guide.piece}{guide.promotion?` → ${guide.promotion}`:''}</strong><small>{san}</small></span>
   <span className="candidate-route"><b>{guide.from} <span aria-hidden="true">→</span> {guide.to}</b><small>{candidate?.san.includes('x')?'Capture':guide.action.startsWith('Capture')?'Capture':'Move'}</small></span>
   <span className="candidate-score">{candidate?scoreText(candidate.score):'Legal option'}</span>
  </button>
  {active&&<div className="suggestion-detail">
   <p className="suggestion-instruction">{pieceSelected?`Your ${guide.piece} on ${guide.from} is selected. Choose ${guide.to} on the board to play this move.`:guide.instruction}</p>
   {guide.extra&&<p>{guide.extra}</p>}
   {showOnBoard&&<p className="suggestion-ready">Gold marks the {guide.piece} on {guide.from}. Blue marks {guide.to}. Select another row to preview another legal move.</p>}
   {!candidate&&<p className="unranked-note">This move is legal, but this search did not score it. “Not ranked” does not mean it is a bad move.</p>}
   {reasons&&<section className="move-explanation" aria-label="Why this move helps"><h5>Why this move helps</h5><ul>{reasons.benefits.map(reason=><li key={reason}>{reason}</li>)}</ul>{reasons.reply&&<><h5>One calculated reply</h5><p>{reasons.reply}</p></>}{reasons.watch.map(reason=><p className="explanation-watch" key={reason}><strong>Watch for:</strong> {reason}</p>)}{reasons.lineOutcome&&<p>{reasons.lineOutcome}</p>}<p className="explanation-estimate">{reasons.assessment} The calculated line is an example, and the opponent can choose another legal reply.</p></section>}
   {candidate&&<details className="suggestion-details"><summary>Chess notation & analysis</summary><p>{guide.san} · {scoreText(candidate.score)} · Search depth {candidate.depth}</p><p>{candidate.notation.slice(0,7).join(' ')}</p></details>}
  </div>}
 </article>;
}

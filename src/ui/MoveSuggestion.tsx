import { useMemo } from 'react';
import { describeMove } from '../coaching/moveGuide';
import { scoreText } from '../coaching/explain';
import { explainCandidate } from '../coaching/reasons';
import type { Candidate } from '../engine/uci';
export function MoveSuggestion({candidate,candidates=[],fen,index,active,pieceSelected,onSelect,explain}:{candidate:Candidate;candidates?:Candidate[];fen:string;index:number;active:boolean;pieceSelected:boolean;onSelect:()=>void;explain:boolean}){
 const guide=useMemo(()=>describeMove(fen,candidate.move),[fen,candidate.move]);
 const reasons=useMemo(()=>explain?explainCandidate(fen,candidate,candidates):null,[fen,candidate,candidates,explain]);
 return <article className={`candidate move-suggestion ${active?'suggestion-selected':''}`} data-move={candidate.move}>
  <div className="suggestion-heading"><span className="candidate-number">{index+1}</span><div><span className="suggestion-rank">{index===0?'Try this move':`Another option · ${index+1}`}</span><h4>{guide.piece}{guide.promotion?` → ${guide.promotion}`:''}</h4></div></div>
  <button className="suggestion-route" aria-pressed={active} aria-label={`Show ${guide.piece} from ${guide.from} to ${guide.to} on board`} onClick={onSelect}>
   <span><small>PIECE IS ON</small><strong>{guide.from}</strong></span><span className="route-arrow" aria-hidden="true">→</span><span><small>{candidate.san.includes('x')?'CAPTURE ON':'MOVE IT TO'}</small><strong>{guide.to}</strong></span>
  </button>
  <p className="suggestion-instruction">{pieceSelected?`Your ${guide.piece} on ${guide.from} is selected. Click ${guide.to} to ${candidate.san.includes('x')?'capture':'move'}.`:guide.instruction}</p>{guide.extra&&<p>{guide.extra}</p>}
  {active&&<p className="suggestion-ready">Gold marks the suggested piece. Blue marks its destination. The guide stays visible while you choose.</p>}
  {reasons&&<section className="move-explanation" aria-label="Why this move helps"><h5>Why this move helps</h5><ul>{reasons.benefits.map(reason=><li key={reason}>{reason}</li>)}</ul>{reasons.reply&&<><h5>One calculated reply</h5><p>{reasons.reply}</p></>}{reasons.watch.map(reason=><p className="explanation-watch" key={reason}><strong>Watch for:</strong> {reason}</p>)}{reasons.lineOutcome&&<p>{reasons.lineOutcome}</p>}<p className="explanation-estimate">{reasons.assessment} The calculated line is an example, and the opponent can choose another legal reply.</p></section>}
  <details className="suggestion-details"><summary>Chess notation & analysis</summary><p>{guide.san} · {scoreText(candidate.score)} · Search depth {candidate.depth}</p><p>{candidate.notation.slice(0,7).join(' ')}</p></details>
 </article>;
}

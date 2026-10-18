import { useEffect,useState } from 'react';
import type { Help } from '../sessions/model';
import { sideName } from '../sessions/model';
import type { useMoveFeedback } from './useMoveFeedback';
import { importantFeedback } from '../coaching/helpPolicy';
import { explanation,scoreText } from '../coaching/explain';
import { describeMove } from '../coaching/moveGuide';
import { reviewNotation } from './ReviewMoveList';

type Props={feedback:ReturnType<typeof useMoveFeedback>;help:Help;onHelpUsed:()=>void;onReveal:()=>void;onRetry:(seen:boolean)=>void};
export function PostMoveFeedback(p:Props){
 const f=p.feedback,[explained,setExplained]=useState(false),[revealed,setRevealed]=useState(false),important=!!f.comparison&&importantFeedback(f.comparison.verdict);
 const showFacts=f.visible&&(f.mode==='Every move'||important)&&(p.help.explanations==='Automatic'||p.help.explanations==='On request'&&explained);
 useEffect(()=>{if(showFacts)p.onHelpUsed();},[showFacts,f.target?.key]);
 if(!f.visible||!f.target||f.mode==='Mistakes'&&f.comparison&&!important||f.mode==='Mistakes'&&!f.busy&&!f.error&&!f.comparison)return null;
 const guide=describeMove(f.target.fen,f.target.move),entry=f.comparison;
 return <section className={`move-feedback ${important?'feedback-important':''}`} aria-label={`${sideName(f.target.side)} previous-move feedback`}>
  <div role="status" aria-live="polite"><span className="feedback-kicker">{sideName(f.target.side).toUpperCase()} · PREVIOUS MOVE</span><h3>{guide.piece} {guide.from} → {guide.to} <small>({guide.san})</small></h3>{showFacts&&<p>{explanation(f.target.fen,f.target.move,'played')}</p>}{entry&&<><strong>{entry.verdict}</strong>{entry.loss!==undefined&&important&&<p>The local search estimates a difference of {(entry.loss/100).toFixed(2)} pawns for {sideName(f.target.side)}.</p>}<p className="feedback-estimate">A local estimate from the earlier position.</p></>}{f.busy&&<p>Checking the previous move… You can keep playing.</p>}{f.error&&<p>The previous-move check could not finish. Your game is still available. {f.error}</p>}</div>
  {p.help.explanations==='On request'&&!explained&&(f.mode==='Every move'||important)&&<button onClick={()=>{setExplained(true);p.onHelpUsed();}}>Explain this previous move</button>}
  {important&&entry&&<><div className="button-row"><button onClick={()=>p.onRetry(revealed)}>Retry this decision · answer hidden</button><button aria-expanded={revealed} onClick={()=>{if(!revealed)p.onReveal();setRevealed(value=>!value);}}>{revealed?'Hide previous-position comparison':'Show previous-position comparison'}</button></div>{revealed&&<div className="feedback-comparison"><p><strong>Played:</strong> {guide.san} · {scoreText(entry.playedScore)}</p><p><strong>Alternative:</strong> {reviewNotation(entry.fen,[entry.best])} · {scoreText(entry.bestScore)}</p>{p.help.explanations!=='Off'&&<p>{entry.explanation}</p>}<p>Example: {reviewNotation(entry.fen,entry.line)}</p><small>{entry.engine} · {entry.budget} ms per search. These moves describe your earlier decision.</small></div>}</>}
  {f.error&&<button onClick={f.retry}>Retry previous-move check</button>}
 </section>;
}

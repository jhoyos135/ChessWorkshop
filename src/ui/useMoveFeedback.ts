import { useEffect,useMemo,useState } from 'react';
import type { Session } from '../sessions/model';
import { engines,positionKey } from '../engine/uci';
import { lastFeedbackMove,helpBehavior,importantFeedback } from '../coaching/helpPolicy';
import { reviewedMove } from '../coaching/review';

export const FEEDBACK_BUDGET=700;
type Props={session:Session|null;current:{current:Session|null};control:{current:AbortController|null};readOnly:boolean;thinking:boolean;analyzing:boolean;searchEpoch:number;threshold:number;update:(fn:(session:Session)=>Session)=>void};
export function useMoveFeedback(p:Props){
 const key=p.session?positionKey(p.session):'',target=useMemo(()=>p.session?lastFeedbackMove(p.session):null,[key,p.session?.id,p.session?.human,p.session?.mode]);
 const [busyKey,setBusyKey]=useState(''),[error,setError]=useState<{key:string;message:string}|null>(null),[retryEpoch,setRetryEpoch]=useState(0);
 const help=target?p.session!.help[target.side]:undefined,mode=help?helpBehavior(help).feedback:'Off',policy=JSON.stringify(help);
 const visible=!!(target&&p.session&&!p.session.teaching&&p.session.historyPly===null&&!p.session.handoff&&(!p.session.clock.paused||p.session.result)&&mode!=='Off');
 const comparison=target?p.session?.feedback?.find(entry=>entry.ply===target?.ply&&entry.fen===target.fen&&entry.played===target.move&&entry.threshold===p.threshold&&entry.budget===FEEDBACK_BUDGET):undefined;
 useEffect(()=>setError(null),[target?.key,p.searchEpoch]);
 useEffect(()=>{
  const session=p.session;
  if(!visible||!session||!target||p.readOnly||p.thinking||p.analyzing||session.result||session.clock.paused||session.mode==='computer'&&session.fen.split(' ')[1]!==session.human||comparison||error?.key===target.key)return;
  const control=new AbortController();p.control.current=control;setBusyKey(target.key);
  const snapshot={id:session.id,initialFen:session.initialFen,moves:session.moves.slice(0,target.ply)};
  void(async()=>{
   try{
    const before=await engines.search('coach',snapshot,{ms:FEEDBACK_BUDGET,skill:20,multi:3,signal:control.signal}),best=before.candidates[0];
    if(!best)throw Error('The coach did not return a comparison.');
    const played=before.candidates.find(candidate=>candidate.move===target.move)??(await engines.search('coach',snapshot,{ms:FEEDBACK_BUDGET,skill:20,multi:1,only:[target.move],signal:control.signal})).candidates[0];
    if(!played||played.move!==target.move)throw Error('The played move could not be checked.');
    const current=p.current.current;
    if(control.signal.aborted||!current||current.id!==target.session||positionKey(current)!==key||current.clock.paused||current.handoff||current.result||current.historyPly!==null||JSON.stringify(current.help[target.side])!==policy)return;
    const result=reviewedMove(target.ply,target.fen,best,played,p.threshold,before.engine,FEEDBACK_BUDGET);
    p.update(value=>{const next=structuredClone(value);next.feedback=[...(next.feedback??[]).filter(entry=>entry.ply!==target.ply),result.entry].sort((a,b)=>a.ply-b.ply);if(result.moment&&!next.review.some(moment=>moment.ply===target.ply)){result.moment.revealedAt=next.reviewReveals?.find(reveal=>reveal.fen===target.fen)?.at;next.review.push(result.moment);}if(mode==='Every move'||importantFeedback(result.entry.verdict))next.helpUsed=true;return next;});
   }catch(reason){if(!control.signal.aborted)setError({key:target.key,message:reason instanceof Error?reason.message:String(reason)});}
   finally{if(p.control.current===control){p.control.current=null;setBusyKey('');}}
  })();
  return()=>control.abort();
 },[key,target?.key,visible,p.readOnly,p.thinking,p.analyzing,p.searchEpoch,p.threshold,policy,comparison,error?.key,retryEpoch,p.update]);
 return {target,mode,visible,comparison,busy:busyKey===target?.key,error:error&&error.key===target?.key?error.message:'',retry:()=>{setError(null);setRetryEpoch(value=>value+1);}};
}

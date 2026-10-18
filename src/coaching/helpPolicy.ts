import type { Help,Session,Side } from '../sessions/model';
import { other,assistance } from '../sessions/model';
import { Chess } from 'chess.js';
import { playUci } from '../chess/rules';

export const helpBehavior=(help:Help)=>({hintAvailable:help.coaching!=='Off',automaticHint:help.coaching==='Automatic',arrowsAvailable:help.arrows!=='Off',automaticArrows:help.arrows==='Automatic',explanationAvailable:help.explanations!=='Off',automaticExplanation:help.explanations==='Automatic',feedback:help.feedback??'Off'});
export function turnAssistance(session:Session|null,side:Side,context:{readOnly:boolean;variation:boolean}){
 const help=session?.help[side]??assistance('Off'),profile=helpBehavior(help),active=!!(session&&session.fen.split(' ')[1]===side&&!session.teaching&&!session.clock.paused&&!session.handoff&&!session.result&&session.historyPly===null&&!context.readOnly&&!context.variation&&(session.mode!=='computer'||side===session.human));
 return {...profile,active,hintAvailable:active&&profile.hintAvailable,arrowsAvailable:active&&profile.arrowsAvailable,explanationAvailable:active&&profile.explanationAvailable,automaticAnalysis:active&&(profile.automaticHint||profile.automaticArrows||profile.automaticExplanation||help.threats||help.evaluation)};
}
export function identifiedPreset(help:Help){return (['Off','Guided','Coached','Independent'] as const).find(name=>{const preset=assistance(name);return (['coaching','arrows','explanations','legal','threats','evaluation','protection'] as const).every(key=>preset[key]===help[key])&&(preset.feedback??'Off')===(help.feedback??'Off');})??'custom';}
export type FeedbackTarget={session:string;ply:number;fen:string;move:string;side:Side;key:string};
export function lastFeedbackMove(session:Session):FeedbackTarget|null{
 if(session.teaching)return null;
 const game=new Chess(session.initialFen),side=session.mode==='computer'?session.human:session.moves.length%2?other(game.turn()):game.turn();let target:FeedbackTarget|null=null;
 for(const [ply,move] of session.moves.entries()){const fen=game.fen(),played=playUci(game,move);if(played.color===side)target={session:session.id,ply,fen,move,side,key:session.id+':'+ply+':'+fen+':'+move};}
 return target;
}
export function importantFeedback(verdict:string){return /^(Missed mate|Allows mate|Costly move)/.test(verdict);}

import type { Session } from '../sessions/model';
import { sideName } from '../sessions/model';
import { rebuild,playUci } from '../chess/rules';
import { pendingTimeout } from '../sessions/commands';

export function gameAnnouncement(previous:Session|null,current:Session|null){
 if(!current||current.teaching||current.historyPly!==null)return null;
 const flagged=pendingTimeout(current);if(flagged&&(previous?.id!==current.id||pendingTimeout(previous)!==flagged||previous.historyPly!==null))return `${previous?.id!==current.id?'Opened '+current.title+'. ':''}Time expired for ${sideName(flagged)}. Whether ${sideName(flagged==='w'?'b':'w')} could possibly give checkmate needs your decision. Play and clocks are paused.`;
 if(previous?.id!==current.id){const turn=sideName(rebuild(current).turn());return `Opened ${current.title}. ${current.result?resultText(current):`${current.clock.paused?'Paused. ':''}${turn} to move.`}`;}
 if(current.result&&JSON.stringify(current.result)!==JSON.stringify(previous.result)){const added=current.moves.length===previous.moves.length+1&&previous.moves.every((move,index)=>current.moves[index]===move);if(added){const game=rebuild(current,current.moves.length-1),move=playUci(game,current.moves.at(-1)!);return `${sideName(move.color)} played ${move.san}. ${resultText(current)}`;}return resultText(current);}
 if(current.mode!=='computer'||current.moves.length!==previous.moves.length+1||!previous.moves.every((move,index)=>current.moves[index]===move))return null;
 const game=rebuild(current,current.moves.length-1),move=playUci(game,current.moves.at(-1)!);
 if(move.color===current.human)return null;
 return `${sideName(move.color)} played ${move.san}.${game.isCheck()?' Check.':''} ${sideName(game.turn())} to move.`;
}
function resultText(session:Session){return `${session.result!.winner?sideName(session.result!.winner)+' wins':'Draw'}. ${session.result!.reason}.`;}

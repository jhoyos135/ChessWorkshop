import { it,expect } from 'vitest';
import { createSession } from '../../src/sessions/model';
import { commitMove,resign,tick,resolveTimeout } from '../../src/sessions/commands';
import { gameAnnouncement } from '../../src/ui/gameAnnouncement';
it('opponent moves announce the actual side, notation and next turn for both human colors',()=>{
 for(const human of ['w','b'] as const){let session=createSession('computer');session.clock.paused=false;session.human=human;if(human==='w')session=commitMove(session,'e2e4');const next=commitMove(session,human==='w'?'e7e5':'e2e4');expect(gameAnnouncement(session,next)).toBe(human==='w'?'Black played e5. White to move.':'White played e4. Black to move.');expect(gameAnnouncement({...session,human:human==='w'?'b':'w'}, {...next,human:human==='w'?'b':'w'})).toBeNull();expect(gameAnnouncement(next,session)).toBeNull();}
});
it('checkmate announces the final move and result, while resignation and agreement announce their reason',()=>{
 let session=createSession('local','7k/8/5KQ1/8/8/8/8/8 w - - 0 1');session.clock.paused=false;expect(gameAnnouncement(session,commitMove(session,'g6g7'))).toBe('White played Qg7#. White wins. Checkmate.');expect(gameAnnouncement(session,resign(session,'w'))).toBe('Black wins. Resignation.');expect(gameAnnouncement(session,{...session,result:{winner:null,reason:'Draw by agreement'}})).toBe('Draw. Draw by agreement.');
});
it('loading a save announces its actual state without inventing a new opponent move',()=>{
 const session=createSession('local');expect(gameAnnouncement(null,session)).toBe('Opened Across the table. Paused. White to move.');expect(gameAnnouncement(session,{...session,historyPly:0})).toBeNull();expect(gameAnnouncement(session,session)).toBeNull();
});

it('timeout decisions announce both colors once and announce the agreed result',()=>{for(const side of ['w','b'] as const){const session=createSession('local','4k3/8/8/p1p1p1p1/PpPpPpPp/1P1P1P1P/8/4K3 '+side+' - - 0 1');session.clock={initial:1000,increment:0,remaining:{w:1000,b:1000,[side]:1},paused:false};const pending=tick(session,2);expect(gameAnnouncement(session,pending)).toContain('Time expired for '+(side==='w'?'White':'Black'));expect(gameAnnouncement(pending,pending)).toBeNull();expect(gameAnnouncement(null,pending)).toContain('needs your decision');expect(gameAnnouncement(pending,resolveTimeout(pending,false))).toBe('Draw. Time expired \u00b7 players adjudicated no possible mate.');}});

import { it,expect } from 'vitest';
import { createSession } from '../../src/sessions/model';
import { settleClock,commitMove } from '../../src/sessions/commands';
it('normal clock samples charge the moving side while an interrupted interval preserves the checkpoint',()=>{
 for(const side of ['w','b']){let s=createSession('local');s.clock={initial:600000,increment:10000,remaining:{w:600000,b:600000},paused:false};if(side==='b')s=commitMove(s,'e2e4');const normal=settleClock(s,1000);expect(normal.clock.remaining[side as 'w'|'b']).toBe(s.clock.remaining[side as 'w'|'b']-1000);const paused=settleClock(normal,4500);expect(paused.clock.remaining).toEqual(normal.clock.remaining);expect(paused.clock.paused).toBe(true);expect(paused.result).toBeNull();expect(paused.events.at(-1)).toContain('last checkpoint retained');expect(paused.moves).toEqual(normal.moves);}
});
it('paused, untimed and finished games do not acquire a fabricated interruption or timeout',()=>{
 const base=createSession('local');for(const session of [base,{...base,clock:{...base.clock,paused:false}},{...base,result:{winner:null,reason:'Draw'}}])expect(settleClock(session,600000).events).toEqual(session.events);
 const timed={...base,clock:{initial:600000,increment:0,remaining:{w:300,b:300},paused:false}};expect(settleClock(timed,1000).result?.reason).toBe('Time expired');
});

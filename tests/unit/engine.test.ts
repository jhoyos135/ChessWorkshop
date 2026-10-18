import { it,expect } from 'vitest';
import { createSession,levels } from '../../src/sessions/model';
import { teachingMove } from '../../src/engine/teaching';
import { playUci,rebuild } from '../../src/chess/rules';
import { parseInfo } from '../../src/engine/uci';
import { lossBetween,explanation } from '../../src/coaching/explain';
import { describeMove } from '../../src/coaching/moveGuide';
it('move guidance names the actual piece, destination and special-move effects',()=>{
 expect(describeMove(createSession().fen,'g1f3')).toMatchObject({piece:'knight',from:'g1',to:'f3',instruction:'Select your knight on g1. Move to f3.'});
 for(const side of ['w','b']){const row=side==='w'?'1':'8';expect(describeMove(`r3k2r/8/8/8/8/8/8/R3K2R ${side} KQkq - 0 1`,`e${row}g${row}`).extra).toContain(`h${row} → f${row}`);}
 expect(describeMove('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2','e5d6')).toMatchObject({action:'Capture the pawn on d6',extra:'En passant: the pawn on d5 is removed.'});
 expect(describeMove('7r/6P1/7k/8/8/8/8/K7 w - - 0 1','g7h8n')).toMatchObject({piece:'pawn',promotion:'knight',action:'Capture the rook on h8',extra:'Choose a knight in the promotion dialog.'});
});
it('teaching policy legal, deterministic and seed advances at both levels/colors',()=>{for(const level of levels.slice(0,2))for(const color of ['w','b'] as const){const s=createSession();s.level=level;s.human=color;s.seed=12345;if(color==='b'){s.moves=['e2e4'];s.fen=rebuild(s).fen();}const a=teachingMove(s),b=teachingMove(s);expect(a).toEqual(b);expect(a.seed).not.toBe(s.seed);expect(()=>playUci(rebuild(s),a.move)).not.toThrow();}});
it('normalizes score signs including mate, never fabricates cp for mate',()=>{const line='info depth 12 seldepth 16 multipv 1 score cp 35 nodes 111 pv e2e4 e7e5';expect(parseInfo(line,'w')?.score.value).toBe(35);expect(parseInfo(line,'b')?.score.value).toBe(-35);expect(parseInfo(line.replace('cp 35','mate -3'),'b')?.score).toEqual({kind:'mate',value:3});expect(lossBetween({kind:'mate',value:2},{kind:'cp',value:900},'w')).toBeNull();expect(parseInfo(line.replace('score cp 35','score cp 35 lowerbound'),'w')).toBeNull();});
it('explains only supported observations',()=>{expect(explanation('8/4k3/5q2/8/8/2N5/8/4K3 w - - 0 1','c3d5')).toMatch(/checks.*attacks queen on f6/);});

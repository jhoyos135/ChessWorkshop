import { it,expect } from 'vitest';
import { Chess } from 'chess.js';
import { createSession } from '../../src/sessions/model';
import { teachingMove } from '../../src/engine/teaching';
import { playUci } from '../../src/chess/rules';

for(const [side,fen,capture] of [
 ['w','6k1/8/8/3r4/2B5/8/8/6K1 w - - 0 1','c4d5'],
 ['b','6k1/8/8/2b5/3R4/8/8/6K1 b - - 0 1','c5d4'],
] as const)it(`${side}: teaching opponents sometimes overlook a free rook, First steps more often`,()=>{
 const counts={'First steps':0,Beginner:0};
 for(const level of ['First steps','Beginner'] as const)for(let i=1;i<=64;i++){
  const session=createSession('computer',fen);session.level=level;session.seed=Math.imul(i,0x9e3779b9)>>>0;
  const answer=teachingMove(session);expect(answer).toEqual(teachingMove(session));
  const game=new Chess(fen);const move=playUci(game,answer.move);
  if(answer.move!==capture){counts[level]++;expect(move.captured).toBeUndefined();expect(game.isCheck()).toBe(false);}
 }
 expect(counts.Beginner).toBeGreaterThanOrEqual(24);expect(counts.Beginner).toBeLessThanOrEqual(48);
 expect(counts['First steps']).toBeGreaterThanOrEqual(counts.Beginner+8);
});

it('a zero saved seed enters a deterministic advancing random stream',()=>{
 const session=createSession('computer');session.seed=0;const answer=teachingMove(session);
 expect(answer).toEqual(teachingMove(session));expect(answer.seed).not.toBe(0);
 expect(()=>playUci(new Chess(session.fen),answer.move)).not.toThrow();
});

it('both levels still finish an available mate for either color',()=>{
 for(const fen of ['7k/8/5KQ1/8/8/8/8/8 w - - 0 1','8/8/8/8/8/5kq1/8/7K b - - 0 1'])
 for(const level of ['First steps','Beginner'] as const){
  const session=createSession('computer',fen);session.level=level;session.seed=12345;
  const game=new Chess(fen);playUci(game,teachingMove(session).move);expect(game.isCheckmate()).toBe(true);
 }
});

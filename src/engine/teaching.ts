import { Chess, type Move } from 'chess.js';
import { rebuild, uci } from '../chess/rules';
import type { Session, Side } from '../sessions/model';
const values={p:100,n:310,b:325,r:500,q:900,k:0};
export const teachingPolicyVersion='teaching-2';
// Quiet turns intentionally overlook opportunities, rather than manufacturing
// illegal moves or always finding the best capture. First steps overlooks more.
export const teachingProfiles={
 'First steps':{quietProbability:.75},
 Beginner:{quietProbability:.55},
} as const;
export function material(g:Chess,side:Side){return g.board().flat().reduce((v,p)=>v+(p?(p.color===side?1:-1)*values[p.type]:0),0);}
function positional(g:Chess,m:Move,side:Side){let score=material(g,side);if(g.isCheckmate())return 100000;if(g.isCheck())score+=18;if(m.piece==='n'||m.piece==='b'){if(m.from[1]===(side==='w'?'1':'8'))score+=25;}if(m.isKingsideCastle()||m.isQueensideCastle())score+=45;const central=3.5-Math.abs(m.to.charCodeAt(0)-97-3.5);if(m.piece!=='k')score+=central*3;const p=g.get(m.to);if(p&&g.isAttacked(m.to,g.turn()))score-=values[p.type]*0.75;return score;}
export function teachingMove(s:Session):{move:string;seed:number}{
 const g=rebuild(s),side=g.turn();let seed=s.seed>>>0||0x9e3779b9;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
 const beginner=s.level==='Beginner',profile=teachingProfiles[beginner?'Beginner':'First steps'];
 const quietTurn=random()<profile.quietProbability;
 const ranked=g.moves({verbose:true}).map(m=>{
  g.move(m);const simple=positional(g,m,side),mate=g.isCheckmate();
  const quiet=!m.captured&&!m.promotion&&!g.isCheck()&&!g.isStalemate();
  let score=simple;
  if(beginner&&!quietTurn){
   let worst=Infinity;for(const reply of g.moves({verbose:true})){g.move(reply);worst=Math.min(worst,material(g,side)+(g.isCheckmate()?-100000:0));g.undo();}
   if(worst!==Infinity)score=score*.3+worst*.7;
  }
  g.undo();return {move:uci(m),score,simple,quiet,mate};
 }).sort((a,b)=>b.score-a.score);
 if(!ranked.length)throw Error('No legal move');
 const mates=ranked.filter(x=>x.mate),quiet=ranked.filter(x=>x.quiet);
 const bestQuiet=Math.max(...quiet.map(x=>x.simple));
 // Do not deliberately throw away a heavy piece on a quiet turn. Missing a
 // tactic or declining a capture still gives the learner room to recover.
 const plausible=mates.length?mates:quietTurn&&quiet.length
  ?quiet.filter(x=>x.simple>=bestQuiet-100)
  :ranked.filter(x=>x.score>=ranked[0].score-80);
 const selected=plausible[Math.floor(random()*plausible.length)];return {move:selected.move,seed};
}
export const engineSettings={Casual:{skill:2,ms:500},Developing:{skill:6,ms:750},Challenging:{skill:12,ms:1000},Strong:{skill:20,ms:2000}};

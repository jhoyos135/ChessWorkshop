import { writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { createSession } from '../src/sessions/model';
import { teachingMove,teachingPolicyVersion,teachingProfiles } from '../src/engine/teaching';
import { playUci } from '../src/chess/rules';
const fixtures=[
 {side:'w',fen:'6k1/8/8/3r4/2B5/8/8/6K1 w - - 0 1',capture:'c4d5'},
 {side:'b',fen:'6k1/8/8/2b5/3R4/8/8/6K1 b - - 0 1',capture:'c5d4'},
];
const cases=[];
for(const fixture of fixtures)for(const level of ['First steps','Beginner'] as const){
 let quiet=0,captures=0;const decisions=[];
 for(let i=1;i<=64;i++){
  const session=createSession('computer',fixture.fen);session.level=level;session.seed=Math.imul(i,0x9e3779b9)>>>0;
  const answer=teachingMove(session),again=teachingMove(session);
  if(JSON.stringify(answer)!==JSON.stringify(again))throw Error('Seeded replay diverged');
  const game=new Chess(fixture.fen),move=playUci(game,answer.move);
  if(answer.move===fixture.capture)captures++;else{if(move.captured||game.isCheck())throw Error('Expected a quiet alternative');quiet++;}
  decisions.push({seed:session.seed,...answer});
 }
 cases.push({...fixture,level,quiet,captures,decisions});
}
for(const side of ['w','b']){
 const beginner=cases.find(c=>c.side===side&&c.level==='Beginner')!,first=cases.find(c=>c.side===side&&c.level==='First steps')!;
 if(beginner.quiet<24||beginner.quiet>48||first.quiet<beginner.quiet+8)throw Error('Difficulty separation regression');
}
const report={date:new Date().toISOString(),passed:true,policyVersion:teachingPolicyVersion,profiles:teachingProfiles,
 userFeedback:{date:'2026-10-18',lessons:'lessons are ok for now',beginner:'beginner seems to hard'},
 scope:'Both-color free-rook opportunities across 64 spread seeds per level; legal move replay and exact seeded reproduction.',
 limitations:'Quiet-turn probability is not a measured error rate or human rating. These fixtures show opportunities are sometimes missed; they do not prove subjective ease. Follow-up user difficulty feedback is optional for this tuning iteration.',cases};
await writeFile('docs/evidence/beginner-tuning.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(cases.map(({side,level,quiet,captures})=>({side,level,quiet,captures})),null,2));

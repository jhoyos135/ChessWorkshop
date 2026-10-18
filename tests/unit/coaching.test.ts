import 'fake-indexeddb/auto';
import { it,expect } from 'vitest';
import { Chess,DEFAULT_POSITION } from 'chess.js';
import { assistance,createSession,type Side,type FeedbackMode } from '../../src/sessions/model';
import { helpBehavior,identifiedPreset,turnAssistance,lastFeedbackMove } from '../../src/coaching/helpPolicy';
import { reviewedMove } from '../../src/coaching/review';
import { commitMove,undo } from '../../src/sessions/commands';
import { playUci } from '../../src/chess/rules';
import type { Candidate,Score } from '../../src/engine/uci';
import { validateSession,saveSession,loadSession,exportSession,importJson } from '../../src/storage/repository';
const candidate=(fen:string,move:string,score:Score):Candidate=>({move,san:playUci(new Chess(fen),move).san,pv:[move],notation:[],score,depth:12,rank:1});
it('presets separate automatic guidance, requested help, and post-move feedback',()=>{
 for(const name of ['Off','Guided','Coached','Independent'] as const)expect(identifiedPreset(assistance(name))).toBe(name);
 expect(helpBehavior(assistance('Guided'))).toMatchObject({automaticHint:true,automaticArrows:true,automaticExplanation:true,feedback:'Every move'});
 expect(helpBehavior(assistance('Coached'))).toMatchObject({automaticHint:false,hintAvailable:true,arrowsAvailable:true,explanationAvailable:true,feedback:'Mistakes'});
 expect(helpBehavior(assistance('Independent'))).toMatchObject({automaticHint:false,automaticArrows:false,automaticExplanation:false,hintAvailable:true,arrowsAvailable:true,explanationAvailable:true,feedback:'Off'});
 expect(assistance('Independent').legal).toBe(false);expect(helpBehavior(assistance('Off')).hintAvailable).toBe(false);
 const legacy=assistance('Coached');delete legacy.feedback;expect(helpBehavior(legacy).feedback).toBe('Off');expect(identifiedPreset({...assistance('Guided'),arrows:'Off'})).toBe('custom');
});
it('all 6,561 independent side policies produce the requested and automatic behavior on both turns',()=>{
 const modes=['Off','On request','Automatic'] as const,feedback:FeedbackMode[]=['Off','Mistakes','Every move'];let checked=0;
 const white=createSession('local');white.clock.paused=false;const black=commitMove(white,'e2e4');
 for(let code=0;code<729;code++)for(let post=0;post<9;post++){
  let value=code;const help={w:assistance('Off'),b:assistance('Off')};
  for(const side of ['w','b'] as const)for(const feature of ['coaching','arrows','explanations'] as const){help[side][feature]=modes[value%3];value=Math.floor(value/3);}
  help.w.feedback=feedback[post%3];help.b.feedback=feedback[Math.floor(post/3)];
  for(const side of ['w','b'] as const){const session={...(side==='w'?white:black),help},actual=turnAssistance(session,side,{readOnly:false,variation:false}),own=help[side];
   const expected={active:true,hintAvailable:own.coaching!=='Off',automaticHint:own.coaching==='Automatic',arrowsAvailable:own.arrows!=='Off',automaticArrows:own.arrows==='Automatic',explanationAvailable:own.explanations!=='Off',automaticExplanation:own.explanations==='Automatic',feedback:own.feedback,automaticAnalysis:[own.coaching,own.arrows,own.explanations].includes('Automatic')};
   expect(actual).toEqual(expected);checked++;
  }
 }
 expect(checked).toBe(13122);
});
it('analysis and requests are disabled outside the human live position',()=>{
 const base=createSession();base.clock.paused=false;base.help.w=assistance('Guided');
 for(const patch of [{clock:{...base.clock,paused:true}},{handoff:true},{historyPly:0},{result:{winner:null,reason:'Draw'}},{human:'b' as Side}])expect(turnAssistance({...base,...patch},'w',{readOnly:false,variation:false})).toMatchObject({active:false,hintAvailable:false,arrowsAvailable:false,explanationAvailable:false,automaticAnalysis:false});
 for(const context of [{readOnly:true,variation:false},{readOnly:false,variation:true}])expect(turnAssistance(base,'w',context).active).toBe(false);
 expect(turnAssistance(base,'b',{readOnly:false,variation:false}).active).toBe(false);
 for(const flag of ['threats','evaluation'] as const){const session=structuredClone(base);session.help.w=assistance('Off');session.help.w[flag]=true;expect(turnAssistance(session,'w',{readOnly:false,variation:false}).automaticAnalysis).toBe(true);}
});
it('previous-move feedback follows human color and hides the other local player decision',()=>{
 let session=createSession('local');session.clock.paused=false;expect(lastFeedbackMove(session)).toBeNull();session=commitMove(session,'e2e4');expect(lastFeedbackMove(session)).toBeNull();session=commitMove(session,'e7e5');expect(lastFeedbackMove(session)).toMatchObject({ply:0,move:'e2e4',side:'w',fen:DEFAULT_POSITION});
 session=commitMove(session,'g1f3');expect(lastFeedbackMove(session)).toMatchObject({ply:1,move:'e7e5',side:'b'});
 for(const human of ['w','b'] as const)expect(lastFeedbackMove({...session,mode:'computer',human})).toMatchObject({side:human,ply:human==='w'?2:1});
 let black=createSession('local','8/8/8/8/8/1qk5/8/K7 b - - 0 1');black.clock.paused=false;black=commitMove(black,'b3b4');expect(lastFeedbackMove(black)).toBeNull();black=commitMove(black,'a1a2');expect(lastFeedbackMove(black)).toMatchObject({side:'b',ply:0,move:'b3b4'});
});
it('sparse post-move comparisons and camera lock restore exactly and undo clears obsolete feedback',async()=>{
 let session=createSession('local');session.clock.paused=false;session.cameraLocked=true;
 for(const move of ['e2e4','e7e5','g1f3'])session=commitMove(session,move);
 session.feedback=[reviewedMove(0,DEFAULT_POSITION,candidate(DEFAULT_POSITION,'d2d4',{kind:'cp',value:40}),candidate(DEFAULT_POSITION,'e2e4',{kind:'cp',value:30}),120,'Test engine',700).entry];
 const saved=await saveSession(session),loaded=await loadSession(saved.id),[imported]=await importJson(exportSession(saved));
 for(const result of [loaded,imported]){expect(result.feedback).toEqual(session.feedback);expect(result.cameraLocked).toBe(true);expect(result.help).toEqual(session.help);expect(result.moves).toEqual(session.moves);}
 expect(undo(loaded).feedback).toEqual([]);expect(undo(loaded).cameraLocked).toBe(true);
 for(const patch of [{ply:1},{played:'d2d4'},{fen:session.fen},{line:['g1g3']},{threshold:0},{loss:500}]){const bad=structuredClone(session);Object.assign(bad.feedback![0],patch);expect(()=>validateSession(bad)).toThrow();}
 expect(()=>validateSession({...session,feedback:[session.feedback![0],session.feedback![0]]})).toThrow();
 expect(()=>validateSession({...session,cameraLocked:'yes'})).toThrow(/camera lock/i);
 expect(()=>validateSession({...session,help:{...session.help,w:{...session.help.w,feedback:'Sometimes'}}})).toThrow(/feedback setting/i);
 const legacy=structuredClone(session);delete legacy.cameraLocked;delete legacy.help.w.feedback;expect(validateSession(legacy).cameraLocked).toBe(false);
});

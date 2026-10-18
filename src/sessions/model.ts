import { DEFAULT_POSITION } from 'chess.js';
export type Side = 'w'|'b';
export type HelpMode = 'Off'|'On request'|'Automatic';
export type FeedbackMode = 'Off'|'Mistakes'|'Every move';
export type Help = {coaching:HelpMode;arrows:HelpMode;explanations:HelpMode;legal:boolean;threats:boolean;evaluation:boolean;protection:boolean;feedback?:FeedbackMode};
export const levels = ['First steps','Beginner','Casual','Developing','Challenging','Strong'] as const;
export type Level = typeof levels[number];
export type Preset = 'Guided'|'Coached'|'Independent';
export const assistance = (preset:Preset|'Off'='Coached'):Help => ({coaching:preset==='Guided'?'Automatic':preset==='Off'?'Off':'On request',arrows:preset==='Guided'?'Automatic':preset==='Off'?'Off':'On request',explanations:preset==='Guided'?'Automatic':preset==='Off'?'Off':'On request',legal:preset==='Guided'||preset==='Coached',threats:false,evaluation:false,protection:false,feedback:preset==='Guided'?'Every move':preset==='Coached'?'Mistakes':'Off'});
export type Result = {winner:Side|null;reason:string};
export type Teaching = {contentVersion:number;kind:'lesson'|'puzzle'|'review';id:string;exercise:number;phase:'Introduction'|'Demonstration'|'Attempt'|'Feedback'|'Retry'|'Complete';demoStep:number;attempts:number;hints:number;solved:boolean;assisted:boolean;linePly:number;feedback:string;reviewExercise?:import('../../content/curriculum').Exercise;sourceSession?:string;completedExercises?:number[];completedGame?:{initialFen:string;moves:string[]};learningView?:'flat'|'3d'};
export type ReviewScore = {kind:'cp'|'mate';value:number};
export type ReviewedMove = {ply:number;fen:string;played:string;best:string;line:string[];bestScore:ReviewScore;playedScore:ReviewScore;loss?:number;verdict:string;explanation:string;engine:string;budget:number;threshold?:number;skill:string;lessonId:string};
export type Moment = {ply:number;fen:string;played:string;best:string;line:string[];loss?:number;label:string;explanation:string;engine?:string;budget?:number;alternatives?:string[];skill?:string;lessonId?:string;revealedAt?:number};
export type Session = {
 schema:1;appVersion:string;contentVersion:number;id:string;title:string;mode:'computer'|'local'|'lesson'|'practice';created:number;updated:number;revision:number;
 initialFen:string;moves:string[];fen:string;historyPly:number|null;result:Result|null;historyKnown:boolean;ruleProfile:string;events:string[];
 players:Record<Side,string>;human:Side;level:Level;engineVersion:string;policyVersion:string;seed:number;
 clock:{initial:number;increment:number;remaining:Record<Side,number>;paused:boolean};
 orientation:Side;camera:'perspective'|'overhead';cameraLocked?:boolean;rotate:boolean;handoff:boolean;help:Record<Side,Help>;branches:{name:string;moves:string[];annotations?:{ply:number;text:string}[]}[];annotations:{ply:number;text:string}[];teaching?:Teaching;
 review:Moment[];reviewMoves?:ReviewedMove[];feedback?:ReviewedMove[];reviewReveals?:{fen:string;at:number}[];reviewProgress:number;helpUsed:boolean;presentation?:Settings;
};
export type Skill = {id:string;completed:boolean;successes:{time:number;session:string;independent:boolean}[];due:number;interval:number};
export type Settings = {flat:boolean;contrast:boolean;reducedMotion:boolean;lowQuality:boolean;sound:boolean;textScale:number;reviewBudget:number;mistakeThreshold:number;onboarded:boolean};
export const defaultSettings:Settings = {flat:false,contrast:false,reducedMotion:false,lowQuality:false,sound:false,textScale:1,reviewBudget:350,mistakeThreshold:120,onboarded:false};
export function createSession(mode:Session['mode']='computer',initialFen=DEFAULT_POSITION):Session {
 const now=Date.now();return {schema:1,appVersion:'1.0.0',contentVersion:1,id:crypto.randomUUID(),title:mode==='computer'?'A game to grow with':mode==='local'?'Across the table':'Workshop practice',mode,created:now,updated:now,revision:0,initialFen,moves:[],fen:initialFen,historyPly:null,result:null,historyKnown:initialFen===DEFAULT_POSITION,ruleProfile:'training-fide-claims-v1',events:[],players:{w:'White',b:'Black'},human:'w',level:'Beginner',engineVersion:'Stockfish.js 19.0.1 lite single',policyVersion:'teaching-1',seed:Math.floor(Math.random()*0xffffffff),clock:{initial:0,increment:0,remaining:{w:0,b:0},paused:true},orientation:'w',camera:'perspective',cameraLocked:false,annotations:[],rotate:false,handoff:false,help:{w:assistance(mode==='computer'?'Coached':'Off'),b:assistance('Off')},branches:[],review:[],reviewProgress:0,helpUsed:false};
}
export const other = (s:Side):Side=>s==='w'?'b':'w';
export const sideName = (s:Side)=>s==='w'?'White':'Black';


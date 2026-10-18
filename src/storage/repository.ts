import { openDB, type IDBPDatabase } from 'idb';
import { Chess } from 'chess.js';
import { rebuild,playUci,assertLegalTurn,possibleMate } from '../chess/rules';
import { createSession, defaultSettings, levels, type Session, type Settings, type Skill } from '../sessions/model';
import { lessons } from '../../content/curriculum';
import puzzles from '../../content/puzzles.json';
import { validateExercise } from '../lessons/runner';
import { validateReviewRecords } from './reviewValidation';
import { validateTeachingCheckpoint } from './teachingValidation';
import { validateLegalLine } from './legalLine';
export const SESSION_LIMIT=10*1024*1024, BACKUP_LIMIT=50*1024*1024;
export function validateSession(value:unknown):Session {
 if(!value||typeof value!=='object')throw Error('Session must be an object');const s=value as Session;
 if(s.schema!==1)throw Error('Unsupported schema version. Keep this file for a compatible release.');
 if(typeof s.id!=='string'||typeof s.title!=='string'||s.title.length>200||!Array.isArray(s.moves)||s.moves.length>20000||!['computer','local','lesson','practice'].includes(s.mode)||typeof s.initialFen!=='string'||typeof s.fen!=='string')throw Error('Invalid session structure');
 const historyGame=new Chess(s.initialFen),historyFens:string[]=[];assertLegalTurn(historyGame);for(const move of s.moves){historyFens.push(historyGame.fen());playUci(historyGame,move);}if(historyGame.fen()!==s.fen)throw Error('Saved position does not match its full move history');
 if(!s.clock||!Number.isFinite(s.clock.initial)||s.clock.initial<0||!Number.isFinite(s.clock.increment)||s.clock.increment<0||!['w','b'].every(c=>Number.isFinite(s.clock.remaining[c as 'w'|'b'])&&s.clock.remaining[c as 'w'|'b']>=0))throw Error('Invalid clock');
 if(!Number.isInteger(s.revision)||s.revision<0||!Number.isFinite(s.updated)||!Number.isFinite(s.created)||!s.help||!s.players||!['w','b'].includes(s.human)||!['w','b'].includes(s.orientation))throw Error('Invalid session metadata');
 if(['historyKnown','rotate','handoff','helpUsed'].some(k=>typeof s[k as 'historyKnown']!=='boolean')||typeof s.clock.paused!=='boolean'||s.result!==null&&typeof s.result!=='object')throw Error('Invalid session flags');
 if((['appVersion','engineVersion','policyVersion'] as const).some(k=>typeof s[k]!=='string'||!s[k]||s[k].length>256)||s.seed<0||s.seed>0xffffffff)throw Error('Invalid session version or random state');
 for(const side of ['w','b'] as const)if(!s.help[side]||(['legal','threats','evaluation','protection'] as const).some(k=>typeof s.help[side][k]!=='boolean'))throw Error('Invalid assistance flags');
 for(const side of ['w','b'] as const)if(s.help[side].feedback!==undefined&&!['Off','Mistakes','Every move'].includes(s.help[side].feedback!))throw Error('Invalid post-move feedback setting');
 for(const side of ['w','b'] as const){if(typeof s.players[side]!=='string'||s.players[side].length>100||!s.help[side]||!['coaching','arrows','explanations'].every(k=>['Off','On request','Automatic'].includes(s.help[side][k as 'coaching'])))throw Error('Invalid assistance settings');}
 if(!levels.includes(s.level)||!Number.isInteger(s.seed)||!['training-fide-claims-v1'].includes(s.ruleProfile)||!Number.isInteger(s.contentVersion)||s.contentVersion!==1)throw Error('Unsupported content, opponent, or rules version');
 if(s.historyPly!==null&&(!Number.isInteger(s.historyPly)||s.historyPly<0||s.historyPly>s.moves.length))throw Error('Invalid history selection');
 if(s.result&&(typeof s.result.reason!=='string'||!['w','b',null].includes(s.result.winner)))throw Error('Invalid game result');
 if(!Array.isArray(s.branches)||s.branches.length>1000||!Array.isArray(s.events)||s.events.some(e=>typeof e!=='string')||!Array.isArray(s.review)||!Number.isInteger(s.reviewProgress)||s.reviewProgress<0||s.reviewProgress>s.moves.length)throw Error('Invalid review data');for(const b of s.branches){if(typeof b.name!=='string'||!Array.isArray(b.moves))throw Error('Invalid branch');rebuild({initialFen:s.initialFen,moves:b.moves});}
 if(s.teaching){const t=s.teaching;if(t.contentVersion!==1||!['lesson','puzzle','review'].includes(t.kind)||typeof t.id!=='string'||!['Introduction','Demonstration','Attempt','Feedback','Retry','Complete'].includes(t.phase)||!['exercise','demoStep','attempts','hints','linePly'].every(k=>Number.isInteger(t[k as 'exercise'])&&t[k as 'exercise']>=0)||t.hints>3||t.exercise>4||typeof t.feedback!=='string')throw Error('Invalid or unsupported lesson checkpoint');if(t.kind==='review'){if(!t.reviewExercise)throw Error('Missing review exercise');validateExercise(t.reviewExercise);}else if(t.kind==='lesson'){const l=lessons.find(l=>l.id===t.id);if(!l||!l.exercises[t.exercise])throw Error('Unknown lesson or exercise version');}else if(!puzzles.some(p=>p.id===t.id))throw Error('Unknown puzzle version');}
 if(s.cameraLocked!==undefined&&typeof s.cameraLocked!=='boolean')throw Error('Invalid camera lock');
 if(s.camera!==undefined&&!['perspective','overhead'].includes(s.camera))throw Error('Invalid camera preset');if(s.annotations!==undefined&&(!Array.isArray(s.annotations)||s.annotations.some(a=>typeof a.text!=='string'||a.text.length>2000||!Number.isInteger(a.ply)||a.ply<0||a.ply>s.moves.length)))throw Error('Invalid position notes');
 if(s.teaching?.learningView!==undefined&&!['flat','3d'].includes(s.teaching.learningView))throw Error('Invalid lesson board view');

 for(const moment of s.review){if(!Number.isInteger(moment.ply)||moment.ply<0||moment.ply>=s.moves.length||typeof moment.explanation!=='string'||typeof moment.label!=='string'||!Array.isArray(moment.line)||moment.line.length>256)throw Error('Invalid review moment');if(moment.fen!==historyFens[moment.ply])throw Error('Review moment does not match the original game');validateLegalLine(moment.fen,moment.line);validateLegalLine(moment.fen,[moment.best]);}
 const extendGuidedGame=validateTeachingCheckpoint(s);
 validateReviewRecords(s);
 const copy=structuredClone(s);if(s.presentation!==undefined)copy.presentation=validateSettings(s.presentation);copy.camera??='perspective';copy.cameraLocked??=false;copy.annotations??=[];copy.clock.paused=true;copy.handoff=false;if(copy.result?.reason==='Time expired'&&copy.clock.initial>0&&copy.clock.remaining[historyGame.turn()]===0&&copy.result.winner===(historyGame.turn()==='w'?'b':'w')&&possibleMate(historyGame,copy.result.winner)==='uncertain'){copy.result=null;if(!copy.events.includes('Flag fell: adjudication required'))copy.events.push('Flag fell: adjudication required');copy.events.push('Previous automatic timeout result reopened for adjudication');}if(extendGuidedGame){copy.teaching!.phase='Feedback';copy.teaching!.completedExercises=[0,1,2];copy.teaching!.feedback+=' Continue to the new complete guided-game exercise.';}return copy;
}
let dbPromise:Promise<IDBPDatabase>|null=null;
export function database(){return dbPromise??=openDB('chess-workshop',1,{upgrade(db){db.createObjectStore('sessions',{keyPath:'id'});db.createObjectStore('snapshots',{keyPath:'id'});db.createObjectStore('meta');db.createObjectStore('skills',{keyPath:'id'});}}).catch(e=>{dbPromise=null;throw e;});}
const tails=new Map<string,Promise<unknown>>();
const owned=new Set<string>();
export function markSessionOwned(id:string,value:boolean){if(value)owned.add(id);else owned.delete(id);}
async function writeAccess<T>(id:string,fn:()=>Promise<T>):Promise<T>{if(typeof navigator==='undefined'||!navigator.locks||owned.has(id))return fn();return navigator.locks.request('chess-workshop-'+id,{ifAvailable:true},async lock=>{if(!lock)throw Error('This session is open in another tab. Close that tab or duplicate the session before changing it.');return fn();});}
export async function saveSession(s:Session,expected=s.revision):Promise<Session>{
 const metricStart=performance.now();
 const previous=tails.get(s.id)??Promise.resolve();const job=previous.catch(()=>{}).then(()=>writeAccess(s.id,async()=>{validateSession(s);const db=await database();const tx=db.transaction(['sessions','snapshots'],'readwrite');const old=await tx.objectStore('sessions').get(s.id) as Session|undefined;if(old&&old.revision!==expected){tx.abort();await tx.done.catch(()=>{});throw Error('Another tab changed this session. Open the latest copy or duplicate your in-memory game.');}if(old)await tx.objectStore('snapshots').put(old);const next={...structuredClone(s),revision:expected+1};await tx.objectStore('sessions').put(next);await tx.done;performance.measure('cw-save',{start:metricStart,end:performance.now()});return next;}));tails.set(s.id,job);return job;
}
export function migrateLegacySession(raw:unknown):Session{const old=raw as Partial<Session>;if((raw as {schema?:number})?.schema!==0)throw Error('Unsupported legacy schema');if(typeof old.initialFen!=='string'||!Array.isArray(old.moves)||typeof old.fen!=='string'||typeof old.id!=='string')throw Error('Legacy migration failed: missing authoritative history');const base=createSession(old.mode??'local',old.initialFen);const next={...base,...old,schema:1,contentVersion:1,ruleProfile:'training-fide-claims-v1',revision:old.revision??0,clock:old.clock??base.clock,help:old.help??base.help,review:old.review??[],reviewProgress:old.reviewProgress??0} as Session;return validateSession(next);}
export async function migrateStoredSession(id:string){const db=await database();const tx=db.transaction(['sessions','snapshots'],'readwrite');try{const raw=await tx.objectStore('sessions').get(id);const next=migrateLegacySession(raw);await tx.objectStore('snapshots').put(raw);await tx.objectStore('sessions').put({...next,revision:next.revision+1});await tx.done;return {...next,revision:next.revision+1};}catch(e){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw e;}}
export async function listSessions():Promise<Session[]>{return (await (await database()).getAll('sessions')).flatMap(s=>{try{return [validateSession(s)];}catch{return [];}}).sort((a,b)=>b.updated-a.updated);}
export async function recoveryRecords():Promise<{id:string;title:string;reason:string;raw:unknown}[]>{const out=[];for(const raw of await (await database()).getAll('sessions')){try{validateSession(raw);}catch(e){out.push({id:String(raw.id),title:String(raw.title??'Unreadable session'),reason:String(e),raw});}}return out;}
export async function loadSession(id:string){const raw=await (await database()).get('sessions',id);if(!raw)throw Error('Session not found');if(raw.schema===0)return migrateStoredSession(id);return validateSession(raw);}
export async function recoverSession(id:string){const raw=await (await database()).get('snapshots',id);if(!raw)throw Error('No previous snapshot available');const s=raw.schema===0?migrateLegacySession(raw):validateSession(raw);s.id=crypto.randomUUID();s.title=s.title.slice(0,185)+' (recovered)';s.revision=0;return saveSession(s);}
export async function deleteSession(id:string){return writeAccess(id,async()=>{const db=await database();const tx=db.transaction(['sessions','snapshots'],'readwrite');await Promise.all([tx.objectStore('sessions').delete(id),tx.objectStore('snapshots').delete(id)]);await tx.done;});}
export async function duplicate(s:Session){const n=structuredClone(s);n.id=crypto.randomUUID();n.title=n.title.slice(0,190)+' (copy)';n.revision=0;n.clock.paused=true;n.updated=Date.now();return saveSession(n);}
export async function getSettings(defaults=defaultSettings):Promise<Settings>{return validateSettings(await (await database()).get('meta','settings')??defaults);}
export async function saveSettings(s:Settings){await (await database()).put('meta',validateSettings(s),'settings');}
export async function skills():Promise<Skill[]>{return (await database()).getAll('skills');}
export async function recordAttempt(id:string,session:string,independent:boolean,success:boolean){const db=await database();const tx=db.transaction('skills','readwrite');const old:Skill=await tx.store.get(id)??{id,completed:false,successes:[],due:0,interval:0};const prior=old.successes.filter(x=>x.independent).length;old.completed ||= success;if(success)old.successes.push({time:Date.now(),session,independent});old.interval=success&&independent?Math.min(3,prior):0;old.due=Date.now()+[1,3,7,14][old.interval]*86400000;await tx.store.put(old);await tx.done;return old;}
export function mastered(s:Skill){const a=s.successes.filter(x=>x.independent);return a.length>=3&&new Set(a.map(x=>x.session)).size>=2&&a.at(-1)!.time-a[0].time>=86400000;}
export function exportSession(s:Session){return JSON.stringify({format:'chessworkshop-session',version:1,session:s},null,2);}
export async function exportBackup(){return JSON.stringify({format:'chessworkshop-library',version:1,sessions:await listSessions(),skills:await skills(),settings:await getSettings()},null,2);}
export async function importJson(text:string):Promise<Session[]> {
 if(new TextEncoder().encode(text).length>BACKUP_LIMIT)throw Error('Backup exceeds 50 MB');
 const data=JSON.parse(text);if(!data||data.version!==1)throw Error('Unsupported backup version');
 const values=data.format==='chessworkshop-session'?[data.session]:data.format==='chessworkshop-library'?data.sessions:null;
 if(!Array.isArray(values)||values.length>10000)throw Error('Invalid backup format');
 if(data.format==='chessworkshop-session'&&new TextEncoder().encode(text).length>SESSION_LIMIT)throw Error('Session exceeds 10 MB');
 const valid=values.map(x=>x?.schema===0?migrateLegacySession(x):validateSession(x));
 if(new Set(valid.map(s=>s.id)).size!==valid.length)throw Error('Duplicate session identity in backup');
 const incomingSkills=data.skills??[];
 if(!Array.isArray(incomingSkills)||incomingSkills.some((x:Skill)=>!x||typeof x.id!=='string'||typeof x.completed!=='boolean'||!Array.isArray(x.successes)||!Number.isFinite(x.due)||x.due<0||!Number.isInteger(x.interval)||x.interval<0||x.interval>3||x.successes.some(a=>!a||!Number.isFinite(a.time)||a.time<0||typeof a.session!=='string'||typeof a.independent!=='boolean')))throw Error('Invalid learning records');
 if(new Set(incomingSkills.map((x:Skill)=>x.id)).size!==incomingSkills.length)throw Error('Duplicate learning identity in backup');
 const settings=data.settings?validateSettings(data.settings):null;
 const sessionIds=new Map(valid.map(s=>[s.id,crypto.randomUUID()])),reviewIds=new Map<string,string>();
 for(const s of valid){
  const t=s.teaching,source=t?.sourceSession;
  if(t?.kind==='review'&&source&&sessionIds.has(source)){
   t.sourceSession=sessionIds.get(source)!;
   const prefix='review-'+source+'-';
   if(t.id.startsWith(prefix)){
    const previous=t.id;t.id='review-'+t.sourceSession+'-'+t.id.slice(prefix.length);reviewIds.set(previous,t.id);
    if(t.reviewExercise?.id===previous)t.reviewExercise.id=t.id;
   }
  }
  s.id=sessionIds.get(s.id)!;s.revision=1;s.title=s.title.slice(0,185)+' (imported)';
 }
 const restoredSkills:Skill[]=incomingSkills.map((skill:Skill)=>({...skill,id:reviewIds.get(skill.id)??skill.id,successes:skill.successes.map(success=>({...success,session:sessionIds.get(success.session)??success.session}))}));
 // All validation and identity rewrites finish before opening the atomic transaction.
 const db=await database(),tx=db.transaction(['sessions','skills','meta'],'readwrite');
 for(const s of valid)await tx.objectStore('sessions').put(s);
 for(const skill of restoredSkills)await tx.objectStore('skills').put(skill);
 if(settings)await tx.objectStore('meta').put(settings,'settings');
 await tx.done;return valid;
}
export function validateSettings(raw:unknown):Settings{if(!raw||typeof raw!=='object')throw Error('Invalid settings');const s={...defaultSettings,...raw};for(const k of ['flat','contrast','reducedMotion','lowQuality','sound','onboarded'] as const)if(typeof s[k]!=='boolean')throw Error('Invalid display setting');if(!Number.isFinite(s.textScale)||s.textScale<.75||s.textScale>2||!Number.isFinite(s.reviewBudget)||s.reviewBudget<100||s.reviewBudget>5000||!Number.isFinite(s.mistakeThreshold)||s.mistakeThreshold<30||s.mistakeThreshold>1000)throw Error('Invalid review or text-size settings');return s;}
export async function withSessionLock(id:string,task:()=>Promise<void>){if(!navigator.locks)throw Error('This browser does not support safe session locks. Export or use a current Chrome, Edge, or Firefox.');return navigator.locks.request('chess-workshop-'+id,{ifAvailable:true},async lock=>{if(!lock)throw Error('This game is open in another tab. It is read-only here. Close that tab or duplicate this session.');await task();});}







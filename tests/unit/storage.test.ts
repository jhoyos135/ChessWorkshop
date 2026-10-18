import 'fake-indexeddb/auto';
import { describe,it,expect } from 'vitest';
import { createSession,assistance,defaultSettings } from '../../src/sessions/model';
import { commitMove,undo } from '../../src/sessions/commands';
import { claimable } from '../../src/chess/rules';
import { saveSession,loadSession,validateSession,recoverSession,importJson,exportSession,exportBackup,listSessions,database,migrateStoredSession,recoveryRecords,recordAttempt,mastered,skills,getSettings,saveSettings } from '../../src/storage/repository';
import { importFen,importPgn,pgn } from '../../src/storage/exchange';
describe('transactional persistence',()=>{
 it('session JSON, PGN and FEN agree on legal starting turns for both colors',async()=>{
  for(const invalid of ['4k3/8/8/8/8/8/8/K3R3 w - - 0 1','k3r3/8/8/8/8/8/8/4K3 b - - 0 1']){
   expect(()=>importFen(invalid)).toThrow(/king in check/);expect(()=>importPgn('[SetUp '+String.fromCharCode(34)+'1'+String.fromCharCode(34)+']\n[FEN '+String.fromCharCode(34)+invalid+String.fromCharCode(34)+']\n\n*')).toThrow(/king in check/);expect(()=>validateSession(createSession('local',invalid))).toThrow(/king in check/);const before=(await listSessions()).map(value=>value.id);await expect(importJson(exportSession(createSession('local',invalid)))).rejects.toThrow(/king in check/);expect((await listSessions()).map(value=>value.id)).toEqual(before);
   const fields=invalid.split(' ');fields[1]=fields[1]==='w'?'b':'w';const valid=fields.join(' ');expect(()=>importFen(valid)).not.toThrow();expect(()=>validateSession(createSession('local',valid))).not.toThrow();
  }
 });
 it('keeps a portable session’s sound, motion, board and text preferences',async()=>{
  const source=createSession('local');source.presentation={...defaultSettings,sound:true,flat:true,contrast:true,textScale:1.5,reducedMotion:true};
  const [restored]=await importJson(exportSession(source));expect(restored.presentation).toEqual(source.presentation);expect((await loadSession(restored.id)).presentation).toEqual(source.presentation);
  expect(()=>validateSession({...source,presentation:{...source.presentation,textScale:'huge'}})).toThrow(/text-size/i);
 });
 it('restores library review links and learning-session references under new IDs',async()=>{
  let source=createSession('local');source.clock.paused=false;source=commitMove(source,'e2e4');
  const card=createSession('practice',source.initialFen),reviewId=`review-${source.id}-0`;
  card.teaching={contentVersion:1,kind:'review',id:reviewId,exercise:0,phase:'Attempt',demoStep:0,attempts:0,hints:0,solved:false,assisted:false,linePly:0,feedback:'',sourceSession:source.id,reviewExercise:{id:reviewId,version:1,fen:source.initialFen,side:'w',objective:'Advance the central pawn.',accepted:[['e2e4']],hints:['Choose a central pawn.','Use the pawn on e2.','Play e4.'],explanation:'e4 advances the pawn into the center.',feedback:'Try a central pawn move.',tags:['center'],source:'Local review test fixture',targets:[]}};
  const imported=await importJson(JSON.stringify({format:'chessworkshop-library',version:1,sessions:[source,card],skills:[{id:reviewId,completed:true,successes:[{time:Date.now(),session:card.id,independent:true}],due:Date.now(),interval:0}]}));
  const restoredSource=imported.find(s=>s.mode==='local')!,restoredCard=imported.find(s=>s.teaching)!;
  expect(restoredSource.id).not.toBe(source.id);expect(restoredCard.id).not.toBe(card.id);
  expect(restoredCard.teaching!.sourceSession).toBe(restoredSource.id);expect(restoredCard.teaching!.id).toBe(`review-${restoredSource.id}-0`);
  expect(restoredCard.teaching!.reviewExercise!.id).toBe(restoredCard.teaching!.id);
  expect((await skills()).find(s=>s.id===restoredCard.teaching!.id)!.successes[0].session).toBe(restoredCard.id);
 });
 it('rejects malformed flags, versions and ambiguous backup identities before writing',async()=>{
  const base=createSession(),invalid=[{...base,historyKnown:'yes'},{...base,rotate:1},{...base,helpUsed:null},{...base,engineVersion:42},{...base,seed:-1},{...base,help:{...base.help,w:{...base.help.w,legal:'yes'}}}];
  for(const value of invalid)expect(()=>validateSession(value)).toThrow();
  const before=(await listSessions()).length;
  await expect(importJson(JSON.stringify({format:'chessworkshop-library',version:1,sessions:[base,base]}))).rejects.toThrow(/identity|duplicate/i);
  await expect(importJson(JSON.stringify({format:'chessworkshop-library',version:1,sessions:[base],skills:[{id:'bad',completed:'yes',successes:[],due:0,interval:0}]}))).rejects.toThrow(/learning/i);
  expect(await listSessions()).toHaveLength(before);
 });
 it('validates stored preferences before reading or acknowledging them',async()=>{
  const db=await database(),prior=await db.get('meta','settings');await db.put('meta',{textScale:'huge'},'settings');
  try{await expect(getSettings()).rejects.toThrow(/settings|text-size/i);await expect(saveSettings({textScale:99} as never)).rejects.toThrow();}finally{if(prior===undefined)await db.delete('meta','settings');else await db.put('meta',prior,'settings');}
 });
 it('reconstructs history, clocks, rights and independent side settings paused',async()=>{let s=createSession('local');s.help.w=assistance('Guided');s.help.b.explanations='On request';s.clock.paused=false;s=commitMove(s,'e2e4');s=commitMove(s,'e7e5');const saved=await saveSession(s);const loaded=await loadSession(s.id);expect(loaded.fen).toBe(saved.fen);expect(loaded.moves).toEqual(s.moves);expect(loaded.clock.paused).toBe(true);expect(loaded.help).toEqual(s.help);});
 it('rejects stale writes and keeps a recoverable prior snapshot',async()=>{const s=await saveSession(createSession());const next=await saveSession({...s,title:'new title'});await expect(saveSession({...s,title:'stale'})).rejects.toThrow(/Another tab/);expect((await loadSession(s.id)).title).toBe('new title');const recovered=await recoverSession(next.id);expect(recovered.id).not.toBe(s.id);expect(recovered.title).toMatch(/recovered/);});
 it('validates a whole backup before changing storage',async()=>{const before=await listSessions();const good=createSession();const bad={...createSession(),fen:'bad'};await expect(importJson(JSON.stringify({format:'chessworkshop-library',version:1,sessions:[good,bad]}))).rejects.toThrow();expect(await listSessions()).toHaveLength(before.length);});
 it('round-trips portable JSON as a new session',async()=>{const s=createSession();const a=await importJson(exportSession(s));expect(a[0].id).not.toBe(s.id);expect(a[0].fen).toBe(s.fen);expect(a[0].clock.paused).toBe(true);const backup=JSON.parse(await exportBackup());expect(backup.format).toBe('chessworkshop-library');});
 it('future schema, corrupt history and wrong clocks never load',()=>{const s=createSession();expect(()=>validateSession({...s,schema:99})).toThrow(/Unsupported/);expect(()=>validateSession({...s,moves:['e2e5']})).toThrow();expect(()=>validateSession({...s,clock:{...s.clock,remaining:{w:-1,b:0}}})).toThrow(/clock/);});
 it('a failed transaction cannot acknowledge a write',async()=>{const db=await database();const tx=db.transaction('sessions','readwrite');const s=createSession();await tx.store.put(s);tx.abort();await expect(tx.done).rejects.toThrow();expect(await db.get('sessions',s.id)).toBeUndefined();});
 it('PGN and FEN preserve legal known history, unsupported features disclosed',()=>{let s=createSession('local');s.clock.paused=false;s=commitMove(s,'d2d4');s=commitMove(s,'g8f6');expect(importPgn(pgn(s)).moves).toEqual(s.moves);expect(()=>importPgn('1. e4 {comment} e5')).toThrow(/mainline/);expect(importPgn('1. e4 {comment} e5',true).moves).toHaveLength(2);expect(importFen(s.fen).historyKnown).toBe(false);expect(()=>importFen('bad')).toThrow();});
 it('migration commits with raw snapshot, corrupt migration rolls back',async()=>{const db=await database(),legacy={...createSession(),schema:0};await db.put('sessions',legacy);const migrated=await migrateStoredSession(legacy.id);expect(migrated.schema).toBe(1);expect((await db.get('snapshots',legacy.id)).schema).toBe(0);const broken={...createSession(),schema:0,fen:'invalid'};await db.put('sessions',broken);await expect(migrateStoredSession(broken.id)).rejects.toThrow();expect((await db.get('sessions',broken.id)).schema).toBe(0);expect((await recoveryRecords()).some(x=>x.id===broken.id)).toBe(true);});
 it('all 729 combinations of independent per-side features round-trip',()=>{const modes=['Off','On request','Automatic'] as const;for(let code=0;code<729;code++){let n=code;const s=createSession('local');for(const side of ['w','b'] as const)for(const feature of ['coaching','arrows','explanations'] as const){s.help[side][feature]=modes[n%3];n=Math.floor(n/3);}expect(validateSession(JSON.parse(exportSession(s)).session).help).toEqual(s.help);}});
 it('independent mastery requires a later review across sessions, reveals reset early due date',async()=>{const first=await recordAttempt('test-skill','one',true,true);expect(first.due-Date.now()).toBeGreaterThan(86399000);expect(first.due-Date.now()).toBeLessThanOrEqual(86400000);const second=await recordAttempt('test-skill','two',true,true);expect(mastered(second)).toBe(false);const revealed=await recordAttempt('test-skill','two',false,false);expect(revealed.interval).toBe(0);const modeled={...second,successes:[...second.successes,{session:'three',time:first.successes[0].time+86400001,independent:true}]};expect(mastered(modeled)).toBe(true);});
 it('draw claims survive save, undo branch, PGN and full-session export/import',async()=>{let s=createSession('local');s.clock.paused=false;for(const m of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8'])s=commitMove(s,m);expect(claimable(s)).toMatch(/Threefold/);const saved=await saveSession(s);expect(claimable(await loadSession(saved.id))).toMatch(/Threefold/);expect(claimable(importPgn(pgn(s)))).toMatch(/Threefold/);expect(claimable((await importJson(exportSession(s)))[0])).toMatch(/Threefold/);const undone=undo(s);expect(claimable(undone)).toBeNull();expect(claimable(undone,'f6g8')).toMatch(/Threefold/);expect(claimable({initialFen:s.initialFen,moves:undone.branches[0].moves})).toMatch(/Threefold/);});
});


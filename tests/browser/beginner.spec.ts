import { test,expect } from '@playwright/test';
import { createSession,assistance,defaultSettings } from '../../src/sessions/model';
import { teachingMove } from '../../src/engine/teaching';

for(const [side,fen,capture] of [
 ['w','6k1/8/8/3r4/2B5/8/8/6K1 w - - 0 1','c4d5'],
 ['b','6k1/8/8/2b5/3R4/8/8/6K1 b - - 0 1','c5d4'],
] as const)test(`${side}: a resumed older Beginner game uses the gentler opponent and saves its exact decision`,async({page})=>{
 const session=createSession('computer',fen);session.human=side==='w'?'b':'w';session.orientation=session.human;
 session.policyVersion='teaching-1';session.help={w:assistance('Off'),b:assistance('Off')};
 session.presentation={...defaultSettings,flat:true,reducedMotion:true};
 session.seed=0x9e3779b9;const expected=teachingMove(session);expect(expected.move).not.toBe(capture);
 await page.goto('/');await page.getByRole('button',{name:'Saved games',exact:true}).click();
 await page.getByLabel('File type').selectOption('JSON');await page.getByLabel('Paste JSON').fill(JSON.stringify({format:'chessworkshop-session',version:1,session}));
 await page.getByRole('button',{name:'Validate & import'}).click();await page.locator('.saved-card').getByRole('button',{name:'Resume',exact:true}).click();
 await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();
 await expect(page.getByText('Saved',{exact:true})).toBeVisible();
 const saved=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('chess-workshop');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const rows=await new Promise<any[]>((resolve,reject)=>{const request=db.transaction('sessions').objectStore('sessions').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();return rows[0];
 });
 expect(saved.moves).toEqual([expected.move]);expect(saved.seed).toBe(expected.seed);expect(saved.policyVersion).toBe('teaching-2');
 expect(saved.events).toContain('Teaching opponent updated to teaching-2');
 await page.reload();await page.getByRole('button',{name:/Continue game/}).click();
 await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
});

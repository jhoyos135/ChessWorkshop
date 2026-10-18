import { test,expect } from '@playwright/test';
import { createSession,assistance } from '../../src/sessions/model';
import { teachingMove } from '../../src/engine/teaching';

test('teaching worker load failure retries the same seeded legal decision exactly once',async({page})=>{
 const fixture=createSession('computer');fixture.human='b';fixture.orientation='b';fixture.seed=12345;fixture.level='Beginner';fixture.policyVersion='teaching-1';fixture.help={w:assistance('Off'),b:assistance('Coached')};
 const expected=teachingMove(fixture);let attempts=0;
 await page.route(/\/assets\/teaching\.worker-[^/]+\.js$/,route=>++attempts===1?route.abort():route.continue());
 await page.goto('/');await page.getByRole('button',{name:'Saved games',exact:true}).click();await page.getByRole('combobox',{name:'File type',exact:true}).selectOption('JSON');
 await page.getByLabel('Paste JSON').fill(JSON.stringify({format:'chessworkshop-session',version:1,session:fixture}));await page.getByRole('button',{name:'Validate & import'}).click();
 await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Teaching engine failed');await expect(page.getByText('0 PLIES',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Retry engine',exact:true}).click();await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();await page.waitForTimeout(800);
 const saved=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('chess-workshop');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});const rows=await new Promise<any[]>((resolve,reject)=>{const request=db.transaction('sessions').objectStore('sessions').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();return rows[0];});
 expect(saved.moves).toEqual([expected.move]);expect(saved.seed).toBe(expected.seed);expect(saved.policyVersion).toBe('teaching-2');expect(saved.events).toContain('Teaching opponent updated to teaching-2');expect(attempts).toBe(2);await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a busy teaching worker leaves the interface responsive and cancels on resignation',async({page})=>{
 let workerRequested=false;
 await page.route(/\/assets\/teaching\.worker-[^/]+\.js$/,async route=>{const response=await route.fetch(),source=await response.text();await route.fulfill({response,body:source+'\nconst regressionStop=performance.now()+1200;while(performance.now()<regressionStop){};'});workerRequested=true;});
 await page.goto('/');await page.getByRole('button',{name:'Play computer ↗',exact:true}).click();await page.getByLabel('Your color').selectOption('b');await page.getByRole('button',{name:'Set up the board →'}).click();await page.waitForTimeout(500);
 await page.evaluate(()=>{const frameGaps:number[]=[];let last=performance.now();(window as any).__policyFrames=frameGaps;const end=last+1100;function frame(now:number){frameGaps.push(now-last);last=now;if(now<end)requestAnimationFrame(frame);}requestAnimationFrame(frame);});
 await page.getByRole('button',{name:'Resume',exact:true}).click();await expect.poll(()=>workerRequested).toBe(true);
 await page.getByText('Game actions & draws',{exact:true}).click();await page.getByRole('button',{name:'Resign',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByRole('heading',{name:'White wins',exact:true})).toBeVisible();await page.waitForTimeout(1400);await expect(page.getByText('0 PLIES',{exact:true})).toBeVisible();
 const gaps=await page.evaluate(()=>(window as any).__policyFrames as number[]);expect(gaps.length).toBeGreaterThan(30);expect(Math.max(...gaps)).toBeLessThan(150);
});

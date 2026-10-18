import { test,expect } from '@playwright/test';
test('failed initial persistence still permits local play and an export',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='sessions')throw new DOMException('Storage is full','QuotaExceededError');return original.apply(this,args);};});
 await page.getByRole('button',{name:/Across the table/}).click();await page.getByRole('button',{name:'Set up the board →'}).click();
 await expect(page.getByRole('alert')).toContainText('available in memory');await expect(page.getByText('Not saved',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByLabel('Enter a move').fill('e4');await page.getByRole('button',{name:'Play move',exact:true}).click();
 await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Export current state'})).toBeVisible();
});
test('WebGL failure preserves a playable accessible flat board',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:any,...args:any[]){if(type==='webgl2'||type==='webgl')return null;return original.apply(this,[type,...args] as any);} as typeof original;});
 await page.goto('/');await page.getByRole('button',{name:/Across the table/}).click();await page.getByRole('button',{name:'Set up the board →'}).click();
 await expect(page.getByText('3D rendering is unavailable.',{exact:false}).first()).toBeVisible();await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.getByRole('gridcell',{name:'e2, White pawn',exact:true}).click();await page.getByRole('gridcell',{name:'e4, empty',exact:true}).click();
 await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();await expect(page.getByText('Saved',{exact:true})).toBeVisible();
});
test('engine load failure preserves the game and Retry engine restarts one legal reply',async({page})=>{
 let fail=true;await page.route('**/engine/*.wasm',route=>{if(fail){fail=false;return route.abort();}return route.continue();});
 await page.goto('/');await page.getByRole('button',{name:'Play computer ↗',exact:true}).click();await page.getByRole('combobox',{name:'Opponent',exact:true}).selectOption('Casual');
 await page.getByRole('button',{name:'Set up the board →'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.getByLabel('Enter a move').fill('e4');await page.getByRole('button',{name:'Play move',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText(/Engine (failed|timeout)/,{timeout:15000});await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Retry engine',exact:true}).click();await expect(page.getByText('2 PLIES',{exact:true})).toBeVisible({timeout:15000});
 await page.waitForTimeout(700);await expect(page.getByText('2 PLIES',{exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});



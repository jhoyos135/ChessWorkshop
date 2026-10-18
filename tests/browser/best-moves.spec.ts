import { test,expect } from '@playwright/test';
async function move(page:import('@playwright/test').Page,text:string){await page.getByLabel('Enter a move').fill(text);await page.getByRole('button',{name:'Play move',exact:true}).click();}
for(const color of ['w','b'])test(`best moves stay on across turns and resume, and can turn off as ${color}`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Play computer ↗',exact:true}).click();
 await page.getByLabel('Your color').selectOption(color);await page.getByRole('combobox',{name:'Opponent',exact:true}).selectOption('First steps');
 await page.getByRole('button',{name:'Set up the board →'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
 if(color==='b')await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();
 const toggle=page.getByRole('button',{name:'Show best moves',exact:true});await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.candidate')).toHaveCount(3);await expect(page.locator('.move-guide-banner')).toBeVisible();
 if(color==='w')await page.screenshot({path:'test-results/best-move-guidance-3d.png',fullPage:false});const first=await page.locator('.candidate').first().getAttribute('data-move');
 await page.getByRole('button',{name:'Flat board',exact:true}).click();
 await expect(page.getByRole('gridcell',{name:new RegExp('^'+first!.slice(0,2)+',')})).toHaveAttribute('aria-selected','true');await page.getByRole('gridcell',{name:new RegExp('^'+first!.slice(0,2)+',')}).click();await page.getByRole('gridcell',{name:new RegExp('^'+first!.slice(0,2)+',')}).click();await expect(page.locator('.move-guide-banner')).toBeVisible();await page.getByRole('gridcell',{name:new RegExp('^'+(color==='w'?'a1':'h8')+',')}).click();await expect(page.locator('.move-guide-banner')).toBeVisible();
 await expect(page.getByRole('gridcell',{name:new RegExp('^'+first!.slice(2,4)+',.*suggested destination')})).toBeVisible();
 await page.getByRole('button',{name:'Other suggestions (2)',exact:true}).click();const alternative=page.locator('.candidate').nth(1),alternativeMove=await alternative.getAttribute('data-move');await alternative.getByRole('button').click();
 await expect(page.getByRole('gridcell',{name:new RegExp('^'+alternativeMove!.slice(0,2)+',')})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('gridcell',{name:new RegExp('^'+alternativeMove!.slice(2,4)+',.*suggested destination')})).toBeVisible();if(color==='w')await page.screenshot({path:'test-results/best-move-guidance-flat.png',fullPage:false});
 await expect(page.getByText(color==='w'?'0 PLIES':'1 PLIES',{exact:true})).toBeVisible();await page.getByRole('gridcell',{name:new RegExp('^'+alternativeMove!.slice(2,4)+',.*suggested destination')}).click();
 await expect(page.getByText(color==='w'?'2 PLIES':'3 PLIES',{exact:true})).toBeVisible();await expect(page.locator('.candidate')).toHaveCount(3);
 await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(page.getByText('Saved',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:/Continue game/}).click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.candidate')).toHaveCount(0);await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.candidate')).toHaveCount(3);
 const next=await page.locator('.candidate').first().getAttribute('data-move'),isMate=(await page.locator('.candidate .suggestion-details p').first().textContent())?.includes('#');await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');await expect(page.locator('.candidate')).toHaveCount(0);
 await move(page,next!);await expect(page.getByText(isMate?(color==='w'?'3 PLIES':'4 PLIES'):(color==='w'?'4 PLIES':'5 PLIES'),{exact:true})).toBeVisible();if(isMate)await expect(page.getByText('Game finished',{exact:true})).toBeVisible();await page.waitForTimeout(1300);await expect(page.locator('.candidate')).toHaveCount(0);
 await expect(toggle).toHaveAttribute('aria-pressed','false');
});
test('local best-move toggle needs both acknowledgments and follows only its configured side',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Across the table/}).click();await page.getByRole('combobox',{name:'Help for',exact:true}).selectOption('Both sides');
 await page.getByRole('button',{name:'Set up the board →'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
 const toggle=page.getByRole('button',{name:'Show best moves for White',exact:true}),black=page.getByRole('button',{name:'Show best moves for Black',exact:true});await toggle.click();await page.getByRole('button',{name:'White acknowledges'}).click();
 await expect(toggle).toHaveAttribute('aria-pressed','false');await page.getByRole('button',{name:'Black acknowledges'}).click();await expect(page.locator('.candidate')).toHaveCount(3);
 await expect(black).toHaveAttribute('aria-pressed','false');await move(page,'e4');await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(black).toHaveAttribute('aria-pressed','false');await expect(page.locator('.candidate')).toHaveCount(0);await page.waitForTimeout(350);await move(page,'e5');
 await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(page.locator('.candidate')).toHaveCount(3);
});
test('White and Black have separate persistent toggles, including enabling help from Off',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Across the table/}).click();await page.getByRole('button',{name:'Set up the board →'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
 const white=page.getByRole('button',{name:'Show best moves for White',exact:true}),black=page.getByRole('button',{name:'Show best moves for Black',exact:true});
 for(const toggle of [white,black])await expect(toggle).toHaveAttribute('aria-pressed','false');
 async function set(toggle:import('@playwright/test').Locator){await toggle.click();await page.getByRole('button',{name:'White acknowledges'}).click();await page.getByRole('button',{name:'Black acknowledges'}).click();}
 await set(black);await expect(black).toHaveAttribute('aria-pressed','true');await expect(white).toHaveAttribute('aria-pressed','false');await expect(page.locator('.candidate')).toHaveCount(0);
 await move(page,'e4');await expect(page.locator('.candidate')).toHaveCount(3);await expect(page.locator('.move-guide-banner')).toBeVisible();
 await set(white);await expect(black).toHaveAttribute('aria-pressed','true');await expect(white).toHaveAttribute('aria-pressed','true');await expect(page.locator('.candidate')).toHaveCount(3);
 await move(page,'e5');await expect(page.locator('.candidate')).toHaveCount(3);await set(white);await expect(white).toHaveAttribute('aria-pressed','false');await expect(black).toHaveAttribute('aria-pressed','true');await expect(page.locator('.candidate')).toHaveCount(0);
 await page.screenshot({path:'test-results/separate-best-move-toggles.png',fullPage:true});await expect(page.getByText('Saved',{exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:/Continue game/}).click();
 await expect(white).toHaveAttribute('aria-pressed','false');await expect(black).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.candidate')).toHaveCount(0);await move(page,'Nf3');await expect(page.locator('.candidate')).toHaveCount(3);
});

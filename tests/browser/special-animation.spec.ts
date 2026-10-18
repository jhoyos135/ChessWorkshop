import { test,expect } from '@playwright/test';
const cases=[
 {name:'white-kingside',fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',move:'e1g1',pieces:[['g1','White king'],['f1','White rook']],empty:['e1','h1']},
 {name:'white-queenside',fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',move:'e1c1',pieces:[['c1','White king'],['d1','White rook']],empty:['e1','a1']},
 {name:'black-kingside',fen:'r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1',move:'e8g8',pieces:[['g8','Black king'],['f8','Black rook']],empty:['e8','h8']},
 {name:'black-queenside',fen:'r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1',move:'e8c8',pieces:[['c8','Black king'],['d8','Black rook']],empty:['e8','a8']},
 {name:'white-en-passant',fen:'4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',move:'e5d6',pieces:[['d6','White pawn']],empty:['e5','d5']},
 {name:'black-en-passant',fen:'4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 2',move:'e4d3',pieces:[['d3','Black pawn']],empty:['e4','d4']},
 {name:'white-capture-underpromotion',fen:'7r/6P1/7k/8/8/8/8/K7 w - - 0 1',move:'g7h8n',pieces:[['h8','White knight']],empty:['g7']},
 {name:'black-capture-promotion',fen:'7k/8/8/8/8/7K/1p6/R7 b - - 0 1',move:'b2a1q',pieces:[['a1','Black queen']],empty:['b2']}
];
for(const fixture of cases)test(`real 3D animation and final pieces: ${fixture.name}`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Saved games',exact:true}).click();await page.getByLabel('Paste FEN').fill(fixture.fen);await page.getByRole('button',{name:'Validate & import'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();if(fixture.name.startsWith('black')){await page.getByRole('button',{name:'↻ Flip',exact:true}).click();await page.waitForTimeout(650);}const canvas=page.locator('canvas').first();await page.waitForTimeout(250);const before=await canvas.screenshot();await page.getByLabel('Enter a move').fill(fixture.move);await page.getByRole('button',{name:'Play move',exact:true}).click();await page.waitForTimeout(40);const moving=await canvas.screenshot({path:`test-results/${fixture.name}-moving.png`});await page.waitForTimeout(350);const after=await canvas.screenshot({path:`test-results/${fixture.name}-settled.png`});expect(before.equals(after)).toBe(false);expect(moving.equals(after),'special move must have an intermediate rendered position').toBe(false);await page.waitForTimeout(150);expect((await canvas.screenshot()).equals(after),'animation settles after the committed move').toBe(true);
 await page.getByText('Open keyboard board',{exact:true}).click();for(const [square,piece] of fixture.pieces)await expect(page.getByRole('gridcell',{name:new RegExp('^'+square+', '+piece)})).toBeVisible();for(const square of fixture.empty)await expect(page.getByRole('gridcell',{name:new RegExp('^'+square+', empty')})).toBeVisible();await expect(page.getByText('1 PLIES',{exact:true})).toBeVisible();await expect(page.getByText('Saved',{exact:true})).toBeVisible();
});

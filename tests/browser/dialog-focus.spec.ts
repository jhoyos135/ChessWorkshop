import { test,expect } from '@playwright/test';
test('closing setup returns keyboard focus to its opener',async({page})=>{
 await page.goto('/');const opener=page.getByRole('button',{name:'Play computer ↗',exact:true});await opener.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(opener).toBeFocused();
});
test('cancelled and acknowledged assistance dialogs return focus to the same toggle',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Across the table/}).click();await page.getByRole('button',{name:'Set up the board →'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();const toggle=page.getByRole('button',{name:'Show best moves for White',exact:true});await toggle.click();await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-pressed','false');await toggle.click();await page.getByRole('button',{name:'White acknowledges'}).click();await page.getByRole('button',{name:'Black acknowledges'}).click();await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-pressed','true');
});

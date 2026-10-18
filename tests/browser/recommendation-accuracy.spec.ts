import { test, expect, type Page } from '@playwright/test';
import { Chess } from 'chess.js';
import { createSession, assistance, defaultSettings, type Session } from '../../src/sessions/model';
import { positionKey } from '../../src/engine/uci';

async function open(page: Page, session: Session) {
  session.help = {
    w: { ...assistance('Off'), arrows: 'Automatic' },
    b: { ...assistance('Off'), arrows: 'Automatic' },
  };
  session.presentation = { ...defaultSettings, flat: true, reducedMotion: true };
  await page.goto('/');
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await page.getByLabel('File type').selectOption('JSON');
  await page.getByLabel('Paste JSON').fill(JSON.stringify({ format: 'chessworkshop-session', version: 1, session }));
  await page.getByRole('button', { name: 'Validate & import' }).click();
  await page.locator('.saved-card').getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
}

function legalUci(fen: string) {
  return new Chess(fen).moves({ verbose: true }).map(move => move.from + move.to + (move.promotion ?? ''));
}

async function expectCompleteCatalog(page: Page, fen: string) {
  const legal = legalUci(fen);
  const rows = page.locator('.candidate');
  await expect(rows).toHaveCount(legal.length, { timeout: 15000 });
  await expect(rows.first().locator('.candidate-rank')).toHaveText('1', { timeout: 15000 });
  const displayed = await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-move')));
  expect(displayed.every(Boolean)).toBe(true);
  expect(new Set(displayed).size).toBe(legal.length);
  expect([...displayed].sort()).toEqual([...legal].sort());
  await expect(page.locator('.move-list-summary')).toContainText(`${legal.length} legal moves`);

  const labels = (await rows.locator('.candidate-rank').allTextContents()).map(label => label.trim());
  expect(labels).toHaveLength(legal.length);
  const ranked = labels.filter(label => /^\d+$/.test(label)).length;
  expect(ranked).toBeGreaterThanOrEqual(1);
  expect(ranked).toBeLessThanOrEqual(3);
  expect(labels.slice(0, ranked)).toEqual(Array.from({ length: ranked }, (_, index) => String(index + 1)));
  expect(labels.slice(ranked)).toEqual(Array.from({ length: legal.length - ranked }, () => 'Not ranked'));
  await expect(page.locator('.move-list-summary')).toContainText(`${ranked} ranked by local search`);
  const best = await page.locator('.move-recommendations').getAttribute('data-bestmove');
  expect(displayed[0]).toBe(best);
  return displayed;
}

for (const side of ['w', 'b'] as const) {
  test(`all legal ${side} moves appear, with honest ranks and a stable best move`, async ({ page }) => {
    test.setTimeout(45000);
    const fen = createSession('local').initialFen.replace(' w ', ` ${side} `);
    const session = createSession('local', fen);
    session.orientation = side;
    await open(page, session);
    const recommendations = page.locator('.move-recommendations');
    await expect(recommendations).toHaveAttribute('data-search-budget', '1000', { timeout: 15000 });
    const displayed = await expectCompleteCatalog(page, fen);
    const best = displayed[0];
    await expect(recommendations).toHaveAttribute('data-position-key', positionKey(session));

    // The same position must not silently switch its leading move a few seconds later.
    await page.waitForTimeout(4300);
    await expect(recommendations).toHaveAttribute('data-bestmove', best!);
    await expect(recommendations).toHaveAttribute('data-search-budget', '1000');
    expect(await page.locator('.candidate').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-move')))).toEqual(displayed);

    const alternative = page.locator('.candidate').nth(4);
    await expect(alternative.locator('.candidate-rank')).toHaveText('Not ranked');
    await expect(alternative).not.toContainText('Search depth');
    const selectedMove = (await alternative.getAttribute('data-move'))!;
    await alternative.locator('.suggestion-route').click();
    await expect(page.getByRole('gridcell', { name: new RegExp(`^${selectedMove.slice(0, 2)},`) })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('gridcell', { name: new RegExp(`^${selectedMove.slice(2, 4)},.*suggested destination`) })).toBeVisible();
    await expect(recommendations).toHaveAttribute('data-bestmove', best!);
  });
}

for (const [side, mate, fen, expected] of [
  ['w', true, '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', null],
  ['b', true, '8/8/8/8/8/5kq1/8/7K b - - 0 1', null],
  ['w', false, '8/4k3/5q2/8/8/2N5/8/4K3 w - - 0 1', 'c3d5'],
  ['b', false, '3k4/8/5n2/8/8/2Q5/3K4/8 b - - 0 1', 'f6e4'],
] as const) {
  test(`actual WASM finds ${side} ${mate ? 'mate in one' : 'the checking knight fork'} and names the suggested piece`, async ({ page }) => {
    const session = createSession('local', fen);
    session.orientation = side;
    await open(page, session);
    await expectCompleteCatalog(page, fen);
    // A deeper check is explicit. It may change the ranking, while an idle board cannot.
    await page.getByRole('button', { name: 'More analysis · 5 seconds →' }).click();
    const recommendations = page.locator('.move-recommendations');
    await expect(recommendations).toHaveAttribute('data-search-budget', '5000', { timeout: 15000 });
    const top = (await page.locator('.candidate').first().getAttribute('data-move'))!;
    expect(top).toBe(await recommendations.getAttribute('data-bestmove'));
    const game = new Chess(fen);
    const move = game.move({ from: top.slice(0, 2), to: top.slice(2, 4), promotion: top[4] });
    if (mate) expect(game.isCheckmate()).toBe(true);
    else expect(top).toBe(expected);
    const source = page.getByRole('gridcell', { name: new RegExp(`^${move.from},`) });
    await expect(source.locator('.guide-badge')).toHaveText(mate ? 'QUEEN' : 'KNIGHT');
    await expect(recommendations).toHaveAttribute('data-position-key', positionKey(session));
    await expectCompleteCatalog(page, fen);
  });
}

test('playing a move replaces the old legal catalog and ignores stale analysis', async ({ page }) => {
  const session = createSession('local');
  await open(page, session);
  await expectCompleteCatalog(page, session.fen);
  const move = 'e2e4';
  await page.getByLabel('Enter a move').fill(move);
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  const after = new Chess(session.initialFen);
  after.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
  const key = positionKey({ ...session, moves: [move] });
  await expect(page.locator('.move-recommendations')).toHaveAttribute('data-position-key', key);
  await expectCompleteCatalog(page, after.fen());
  await page.waitForTimeout(4300);
  await expect(page.locator('.move-recommendations')).toHaveAttribute('data-position-key', key);
  await expectCompleteCatalog(page, after.fen());
});

test('hints, assistance changes and pause/resume retain the cached recommendation for this position', async ({ page }) => {
  const session = createSession('local');
  await open(page, session);
  const recommendations = page.locator('.move-recommendations');
  await expect(recommendations).toHaveAttribute('data-search-budget', '1000', { timeout: 15000 });
  const best = await recommendations.getAttribute('data-bestmove');
  await page.getByRole('button', { name: 'Adjust assistance →' }).click();
  await page.getByRole('dialog').locator('fieldset').first().getByLabel('coaching', { exact: true }).selectOption('On request');
  await page.getByRole('button', { name: 'Apply assistance settings' }).click();
  await page.getByRole('button', { name: 'White acknowledges' }).click();
  await page.getByRole('button', { name: 'Black acknowledges' }).click();
  await expect(recommendations).toHaveAttribute('data-bestmove', best!);
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hint 2/3', exact: true })).toBeEnabled();
  await expect(recommendations).toHaveAttribute('data-bestmove', best!);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.candidate')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expectCompleteCatalog(page, session.fen);
  await expect(recommendations).toHaveAttribute('data-bestmove', best!);
});

test('variation moves never display recommendations from the live game', async ({ page }) => {
  const session = createSession('local');
  await open(page, session);
  await expectCompleteCatalog(page, session.fen);
  await page.getByRole('button', { name: 'Try a line', exact: true }).click();
  await expect(page.locator('.candidate')).toHaveCount(0);
  await expect(page.locator('.move-guide-banner')).toHaveCount(0);
  await page.getByLabel('Enter a move').fill('e4');
  await page.getByRole('button', { name: 'Play move', exact: true }).click();
  await expect(page.locator('.candidate')).toHaveCount(0);
  await expect(page.locator('.move-guide-banner')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save variation & return', exact: true }).click();
  await expect(page.getByText('0 PLIES', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expectCompleteCatalog(page, session.fen);
});

test('the legal-move list remains readable and keyboard usable at 200% text scale', async ({ page }) => {
  const session = createSession('local');
  await open(page, session);
  await expectCompleteCatalog(page, session.fen);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const list = page.locator('.move-options');
  const finalRow = page.locator('.candidate').last();
  const button = finalRow.locator('.suggestion-route');
  await button.scrollIntoViewIfNeeded();
  const layout = await list.evaluate(element => {
    const outer = element.getBoundingClientRect();
    const last = element.lastElementChild!.getBoundingClientRect();
    return { viewport: innerWidth, outerRight: outer.right, contentWidth: element.scrollWidth, visibleWidth: element.clientWidth, lastLeft: last.left, lastRight: last.right };
  });
  expect(layout.outerRight).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.visibleWidth + 1);
  expect(layout.lastLeft).toBeGreaterThanOrEqual(0);
  expect(layout.lastRight).toBeLessThanOrEqual(layout.viewport + 1);
  await button.focus();
  await expect(button).toBeFocused();
  const move = (await finalRow.getAttribute('data-move'))!;
  await page.keyboard.press('Enter');
  await expect(page.getByRole('gridcell', { name: new RegExp(`^${move.slice(0, 2)},`) })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('gridcell', { name: new RegExp(`^${move.slice(2, 4)},.*suggested destination`) })).toBeVisible();
});

import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { baseURL, launchBrowser, watchErrors } from './helpers.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 400 }, reducedMotion: 'reduce' });
  const errors = watchErrors(page);
  // Fixed obstacle placement makes the full-route test repeatable. Only frame
  // timestamps are accelerated; the actual simulation, renderer and storage run.
  await page.addInitScript(() => {
    Math.random = () => .01;
    let simulatedTime = performance.now();
    window.requestAnimationFrame = callback => window.setTimeout(() => { simulatedTime += 40; callback(simulatedTime); }, 0);
    window.cancelAnimationFrame = id => clearTimeout(id);
    localStorage.setItem('oui-low', 'true');
  });
  await page.goto(baseURL);
  const rewards = ['Спектр', 'Стриж', 'Беркут', 'Феникс', 'Аврора', 'Орион', 'Титан', 'Небула'];
  const distances = [5500, 6200, 7000, 7800, 8800, 9500, 10200, 11000];
  for (let stage = 1; stage <= 8; stage++) {
    await page.getByRole('button', { name: 'Начать полёт', exact: true }).click();
    await page.getByRole('heading', { name: 'Маяк достигнут.', exact: true }).waitFor({ timeout: 180000 });
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oui-flights')).length)).toBe(stage);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('oui-flights')));
    assert.equal(saved.at(-1).missionId, stage);
    assert.equal(saved.at(-1).success, true);
    assert.equal(saved.at(-1).distance, distances[stage - 1]);
    assert.ok(saved.at(-1).score >= stage * 500);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('oui-completed'))), Array.from({ length: stage }, (_, i) => i + 1));
    await page.getByRole('button', { name: 'Выбрать корабль в ангаре', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Твой флот.', exact: true })).toBeVisible();
    const card = page.locator('.hangar-ship').filter({ has: page.getByRole('heading', { name: rewards[stage - 1], exact: true }) });
    await card.getByRole('button', { name: 'Выбрать корабль', exact: true }).click();
    await page.reload();
    await expect(page.locator('.current-ship').getByRole('heading', { name: rewards[stage - 1], exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('oui-flights')).length), stage);
    console.log('PASS: stage ' + stage + ', reward ' + rewards[stage - 1] + ', flight history and selection survive reload.');
  }
  assert.deepEqual(errors, []);
  await page.close();

  const legacy = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const legacyErrors = watchErrors(legacy);
  await legacy.goto(baseURL);
  await legacy.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('oui-flights', JSON.stringify([
      { id: 1700000000000, ship: 'Пионер', date: '2026-09-14T10:00:00Z', success: true, distance: 5500, time: 90 },
      { id: 2, ship: 'Пионер', date: 'bad-date', success: true, distance: 5500, time: 90 },
      { id: 3, ship: 'Пионер', date: '2026-09-14T10:00:00Z', success: true, distance: 5500, time: 90, score: {} },
    ]));
    localStorage.setItem('oui-ship', JSON.stringify('Спектр'));
  });
  await legacy.reload();
  await expect(legacy.locator('.current-ship').getByRole('heading', { name: 'Спектр', exact: true })).toBeVisible();
  assert.deepEqual(await legacy.evaluate(() => JSON.parse(localStorage.getItem('oui-completed'))), [1]);
  assert.equal(await legacy.evaluate(() => JSON.parse(localStorage.getItem('oui-flights')).length), 1);
  await legacy.getByRole('button', { name: 'Настройки', exact: true }).click();
  await legacy.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await legacy.getByRole('button', { name: 'Отмена', exact: true }).click();
  assert.deepEqual(await legacy.evaluate(() => JSON.parse(localStorage.getItem('oui-completed'))), [1]);
  await legacy.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await legacy.getByRole('button', { name: 'Удалить прогресс', exact: true }).click();
  await legacy.reload();
  assert.deepEqual(await legacy.evaluate(() => JSON.parse(localStorage.getItem('oui-completed'))), []);
  assert.deepEqual(await legacy.evaluate(() => JSON.parse(localStorage.getItem('oui-flights'))), []);
  assert.equal(await legacy.evaluate(() => JSON.parse(localStorage.getItem('oui-ship'))), 'Пионер');
  assert.deepEqual(legacyErrors, []);
  console.log('PASS: legacy numeric IDs migrate, malformed records are removed, reset cancellation and confirmed reset persist.');
} finally { await browser.close(); }

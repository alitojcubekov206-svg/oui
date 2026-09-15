import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { baseURL, launchBrowser, navigate, watchErrors } from './helpers.mjs';

await mkdir('test-results', { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = watchErrors(page);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Готов к вылету, Пилот?' })).toBeVisible();
  assert.ok(await page.evaluate(async () => {
    const image = new Image();
    image.src = new URL('images/orbit.jpg', location.href).href;
    await image.decode();
    return image.naturalWidth > 0;
  }), 'station artwork loads under the GitHub Pages path');
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Управление', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Открыть ангар', exact: true }).click();
  await expect(page.locator('.hangar-ship')).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'Пройди этап 1', exact: true })).toBeDisabled();
  await navigate(page, 'Этапы');
  await expect(page.locator('.stage-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Начать этап 1', exact: true })).toBeEnabled();
  await expect(page.locator('.stage-card').nth(1).getByRole('button')).toBeDisabled();
  await navigate(page, 'Настройки');
  await page.getByRole('switch', { name: 'Режим производительности' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oui-low')))).toBe(true);
  await navigate(page, 'Как играть');
  await expect(page.getByRole('heading', { name: 'Лети. Стреляй. Открывай.' })).toBeVisible();
  await navigate(page, 'Центр полётов');
  await page.getByRole('button', { name: 'Начать полёт', exact: true }).click();
  await expect(page.locator('.flight-canvas canvas')).toBeVisible();
  await expect.poll(async () => Number(await page.locator('.speed>b').innerText()), { timeout: 15000 }).toBeGreaterThan(30);
  await page.keyboard.down('Shift');
  await expect.poll(async () => Number(await page.locator('.speed>b').innerText()), { timeout: 30000 }).toBeGreaterThan(80);
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Сменить камеру', exact: true }).click();
  await page.getByRole('button', { name: 'Сменить камеру', exact: true }).click();
  await page.screenshot({ path: 'test-results/flight-desktop.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Космос подождёт.' })).toBeVisible();
  const pausedDistance = await page.locator('.flight-progress b').innerText();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.flight-progress b').innerText(), pausedDistance);
  await page.getByRole('button', { name: 'Продолжить полёт' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('oui-pause')));
  await expect(page.getByRole('heading', { name: 'Космос подождёт.' })).toBeVisible();
  await page.getByRole('button', { name: 'Вернуться в меню', exact: true }).click();
  assert.deepEqual(errors, []);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const mobileErrors = watchErrors(mobile);
  await mobile.goto(baseURL);
  for (const width of [320, 390, 720]) {
    await mobile.setViewportSize({ width, height: 844 });
    for (const name of ['Центр полётов', 'Ангар', 'Этапы', 'Настройки', 'Как играть', 'Журнал полётов']) {
      await navigate(mobile, name);
      assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow: ' + name + ' at ' + width);
    }
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await navigate(mobile, 'Центр полётов');
  await mobile.screenshot({ path: 'test-results/mobile-menu.png', fullPage: true });
  await mobile.getByRole('button', { name: 'Начать полёт', exact: true }).click();
  await expect(mobile.locator('.flight-canvas canvas')).toBeVisible();
  await expect(mobile.getByRole('button', { name: 'Стрелять', exact: true })).toBeVisible();
  const cdp = await mobile.context().newCDPSession(mobile);
  const center = async name => {
    const box = await mobile.getByRole('button', { name, exact: true }).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const move = await center('Лететь вправо'), fire = await center('Стрелять');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...move, id: 1 }, { ...fire, id: 2 }] });
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({ path: 'test-results/flight-mobile.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await mobile.setViewportSize(viewport);
    for (const name of ['Лететь вверх', 'Лететь влево', 'Лететь вниз', 'Лететь вправо', 'Стрелять', 'Форсаж', 'Сменить камеру', 'Пауза']) {
      const box = await mobile.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, 'visible touch target: ' + name);
      assert.ok(box.width >= 44 && box.height >= 44, 'large touch target: ' + name);
    }
  }
  await mobile.screenshot({ path: 'test-results/flight-landscape.png' });
  const handled = await mobile.evaluate(() => window.dispatchEvent(new Event('oui-back', { cancelable: true })));
  assert.equal(handled, false);
  await expect(mobile.getByRole('heading', { name: 'Космос подождёт.' })).toBeVisible();
  await mobile.getByRole('button', { name: 'Вернуться в меню', exact: true }).click();
  assert.deepEqual(mobileErrors, []);
  console.log('PASS: desktop, 320/390/720px menus, portrait/landscape touch controls, multitouch, camera, boost, pause and Back; no browser errors.');
} finally { await browser.close(); }

import { chromium } from '@playwright/test';

export const baseURL = process.env.OUI_TEST_URL || 'http://127.0.0.1:4173/oui/';
export const launchBrowser = () => chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  args: ['--enable-unsafe-swiftshader'],
});

export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

export async function navigate(page, name) {
  if (await page.locator('.mobile-menu').isVisible()) await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
  await page.getByRole('navigation', { name: 'Главное меню', exact: true }).getByRole('button', { name, exact: false }).click();
}

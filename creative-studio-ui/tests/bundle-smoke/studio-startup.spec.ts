import { expect, test } from '@playwright/test';

test('production bundle opens the browser launcher without an Electron preload or live providers', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // This is an offline startup check, not a provider or generation acceptance
  // test. Only serve the production assets; no account or live backend is used.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173' && !url.pathname.startsWith('/api/')) {
      await route.continue();
    } else {
      await route.abort('blockedbyclient');
    }
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Welcome to StoryCore', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create New Project/ })).toBeEnabled();
  expect(await page.evaluate(() => window.electronAPI)).toBeUndefined();
  expect(pageErrors).toEqual([]);
});

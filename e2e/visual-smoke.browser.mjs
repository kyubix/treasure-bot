import { test, expect } from '@playwright/test';

// Full screenshots are evidence for review, NOT automatic proof of art quality.
// Browser runs can use software-rendered WebGL: real Android QA still matters.
test('mobile home -> room -> board -> world -> board', async ({ page }, testInfo) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const capture = async name => {
    await page.screenshot({
      path: testInfo.outputPath(name + '.png'),
      animations: 'disabled',
      fullPage: false,
    });
  };

  try {
    await page.goto('/?map3d=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#create')).toBeEnabled();
    await capture('01-home');

    await page.locator('#playerName').fill('Visual QA');
    await page.locator('#create').click();
    await expect(page.locator('#lobby')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#start')).toBeEnabled();
    await capture('02-lobby');

    await page.locator('#galleryCount').selectOption('3');
    await page.locator('#mapShape').selectOption('RING');
    await page.locator('#start').click();

    await expect(page.locator('#match')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#match')).toHaveAttribute('data-view', 'board');
    await expect(page.locator('#board canvas').first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800); // Allow first WebGL frame and assets to settle.
    await capture('03-board');

    await expect(page.locator('#openWorld')).toBeEnabled();
    await page.locator('#openWorld').click();
    await expect(page.locator('#match')).toHaveAttribute('data-view', 'world');
    await expect(page.locator('#worldHud')).toBeVisible();
    await page.waitForTimeout(1500); // Lazy-loaded World Map renderer.
    await capture('04-world');

    await page.locator('#backBoard').click();
    await expect(page.locator('#match')).toHaveAttribute('data-view', 'board');
    await capture('05-return-board');

    expect(pageErrors, 'Uncaught JavaScript exceptions').toEqual([]);
  } finally {
    await testInfo.attach('browser-diagnostics', {
      body: Buffer.from(JSON.stringify({ pageErrors, consoleErrors }, null, 2)),
      contentType: 'application/json',
    });
  }
});

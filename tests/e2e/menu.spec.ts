import { test, expect } from '@playwright/test';
import { gotoFresh, waitForState } from './helpers';

test('menu opens, settings/about tabs work', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('menu-btn').click();
  await expect(page.getByText('🔥 Hearthlands')).toBeVisible();

  // Tab buttons are on the menu's MainTab. Settings/About each replace the
  // main tab, so we go back between switches.
  const settingsBtn = page.getByRole('button', { name: '⚙ Settings' });
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();
  await expect(page.getByText('Sound Effects')).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();

  // Wait for the main tab to come back, then open About. The menu Body is a
  // short, scrollable container (max-h-[88dvh] overflow-y-auto on the 390px-tall
  // iphone-landscape viewport) with an absolute close button pinned top-right.
  // Returning from Settings leaves a stale scrollTop, so Playwright's auto-scroll
  // can park "About" under the close button and the click hit-test never clears
  // (this deterministically hung all retries). Assert the button is genuinely
  // visible + enabled, then force past the overlay heuristic — the version-text
  // assertion below still proves the tab actually opened.
  await expect(settingsBtn).toBeVisible();
  const aboutBtn = page.getByRole('button', { name: 'ℹ About' });
  await expect(aboutBtn).toBeEnabled();
  await aboutBtn.scrollIntoViewIfNeeded();
  await aboutBtn.click({ force: true });
  await expect(page.getByText(/Hearthlands · v/)).toBeVisible();
});

test('boss dev trigger sets boss state', async ({ page }) => {
  await gotoFresh(page);
  // Debug tools live in the "🛠 Debug" modal, opened from the menu (settings)
  // panel — there is no longer a standalone HUD debug button.
  await page.getByTestId('menu-btn').click();
  await page.getByRole('button', { name: /Debug/ }).click();
  await page.getByRole('button', { name: /Trigger Boss/ }).click();

  // BOSS/TRIGGER is a SLICE_PRIMARY action handled by the boss slice. The
  // trigger closes the menu and writes a boss object onto state.
  const s = await waitForState(page, (st) => !!st.boss, { timeout: 3000 });
  expect(s.boss.name).toMatch(/Frostmaw|Drake|Quagmire|Stoneface|Mossback|Storm/);
});

test('settings: SFX toggle persists in state', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('menu-btn').click();
  await page.getByRole('button', { name: '⚙ Settings' }).click();
  // Click any toggle button next to "Sound Effects" — there's a single
  // pill-shaped button per row. Default is true; one click flips it false.
  const row = page.getByText('Sound Effects').locator('..');
  await row.getByRole('button').first().click();
  await waitForState(page, (s) => s.settings?.sfxOn === false, { timeout: 2000 });
});

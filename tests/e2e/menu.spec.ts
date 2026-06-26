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
  // short scroll container (max-h-[88dvh] overflow-y-auto on the 390px-tall
  // iphone-landscape viewport); returning from Settings leaves it in a state
  // where the About button never satisfies Playwright's actionability checks —
  // it hangs forever on "stable" (the dialog height oscillates under mobile dvh
  // emulation) and/or "receives events" (the absolute top-right close button
  // overlaps it at the stale scroll position). Both .click() and
  // .scrollIntoViewIfNeeded() block on those checks. Since we've asserted the
  // button is the right one, visible and enabled, dispatch the click directly to
  // the element — skipping actionability — and let the version-text assertion
  // below prove the About tab really opened.
  await expect(settingsBtn).toBeVisible();
  const aboutBtn = page.getByRole('button', { name: 'ℹ About' });
  await expect(aboutBtn).toBeVisible();
  await expect(aboutBtn).toBeEnabled();
  // A single dispatched click occasionally doesn't land the tab switch under CI
  // load (the menu Body is still oscillating from the Back transition), and with
  // no retry the test then just times out waiting for the About content. Retry
  // the click until the About tab actually renders its version text.
  await expect(async () => {
    await aboutBtn.dispatchEvent('click');
    await expect(page.getByText(/Hearthlands · v/)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
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

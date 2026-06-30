import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers';

test.describe('CUJ: tools + hotbar journeys', () => {
  // These portrait modal/hotbar journeys are the heaviest UI specs (mount the
  // board, open an animated dropdown, arm/cancel). They settle fast locally but
  // the slower headless CI runner needs headroom over the 30s default — the
  // animation-disable in seedQuietSave does the heavy lifting; this is margin.
  test.describe.configure({ timeout: 60_000 });

  // The hotbar dropdown → tool-modal → backdrop flow is the PORTRAIT layout.
  // In landscape (≥500px) puzzleBoard.tsx hides [data-area="hotbar"] (display:none)
  // and surfaces tools through the always-visible tool grid instead (that path is
  // covered by tools.spec). Force a portrait viewport so the hotbar UI renders.
  test.use({ viewport: { width: 390, height: 844 } });

  test('arming from dropdown closes modal and sets armed state', async ({ page }) => {
    await gotoFresh(page, { tools: { rake: 2 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

    await page.getByTestId('puzzle-hotbar-open').click();
    await expect(page.getByTestId('puzzle-tool-modal')).toBeVisible();

    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="rake"]').first().click();
    // Arm from the dropdown's OWN "ARM" button (handleUse) — it arms the tool and
    // closes the dropdown. The on-board action panel's aria-label="Arm tool"
    // button sits *under* the open dropdown in portrait, so it can't be clicked
    // while the modal is up.
    await page.getByTestId('puzzle-tool-modal').getByRole('button', { name: 'ARM', exact: true }).click();

    await expect(page.getByTestId('puzzle-tool-modal')).toHaveCount(0);
    await expect(page.getByTestId('board-armed-border')).toBeVisible();
    const state = await waitForState(page, (s) => s.toolPending === 'rake');
    expect(state.tools.rake).toBe(2);
  });

  test('tap-target cancel path preserves count', async ({ page }) => {
    await gotoFresh(page, { tools: { magic_wand: 1 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

    await page.getByTestId('puzzle-hotbar-open').click();
    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="magic_wand"]').first().click();
    // Arm via the dropdown's own ARM button (arms + closes — see the arming test).
    await page.getByTestId('puzzle-tool-modal').getByRole('button', { name: 'ARM', exact: true }).click();
    await expect(page.getByTestId('puzzle-tool-modal')).toHaveCount(0);
    await expect(page.getByTestId('board-armed-border')).toBeVisible();

    // Modal closed → the on-board action panel's Disarm button is now reachable.
    await page.getByRole('button', { name: /disarm tool/i }).click();

    const s = await waitForState(page, (st) => st.toolPending === null);
    expect(s.tools.magic_wand).toBe(1);
  });

  test('zero-count tap-target tool is inspectable but cannot be armed', async ({ page }) => {
    // Use `rake`: a REACHABLE tap-target tool (clear_component), so it stays
    // listed in the tool modal even at count 0 (visiblePuzzleTools keeps a tool
    // when it is reachable OR owned). magic_wand is a rune-gated portal tool that
    // is unreachable until late-game, so at count 0 it is hidden entirely — it
    // can't drive an "inspectable while unowned" assertion.
    await gotoFresh(page, { tools: { rake: 0 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

    await page.getByTestId('puzzle-hotbar-open').click();
    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="rake"]').first().click();
    const arm = page.getByRole('button', { name: /arm tool/i });
    await expect(arm).toBeDisabled();

    const before = await getReactState(page);
    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="rake"]').first().click();
    const after = await getReactState(page);
    expect(after.toolPending ?? null).toBe(before.toolPending ?? null);
  });

  test('tool modal backdrop blocks pointer leakage to board', async ({ page }) => {
    await gotoFresh(page, { tools: { rake: 1 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
    const before = await getReactState(page);

    await page.getByTestId('puzzle-hotbar-open').click();
    await expect(page.getByTestId('puzzle-tool-modal')).toBeVisible();
    // The backdrop spans far off-screen (left:-50vw … bottom:-200vh), so an
    // element-relative {x:8,y:8} lands outside the viewport. Click a real
    // on-screen point low over the board — it's covered by the backdrop (the
    // bottom nav is hidden on the board view), which closes the modal and (via
    // onPointerDown stopPropagation) swallows the event so the board never moves.
    await page.mouse.click(195, 800);

    await expect(page.getByTestId('puzzle-tool-modal')).toHaveCount(0);
    const after = await getReactState(page);
    expect(after.turnsUsed).toBe(before.turnsUsed);
    expect(after.chainPreview?.count ?? 0).toBe(before.chainPreview?.count ?? 0);
  });
});

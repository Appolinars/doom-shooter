// Smoke E2E (T-11, test-plan §E2E) — 1–2 flows against the built bundle. The exhaustive AC
// walkthrough and NFR measurement stay the manual T-11 gate; these just prove the wiring is
// live: the page boots clean, and a real click on a demon travels input → weapon → hit → score.

import { test, expect, type Page } from '@playwright/test';

interface DebugDemon {
  x: number;
  y: number;
}
interface DebugState {
  round: { score: number; status: 'running' | 'ended' };
  demons: DebugDemon[];
}

const VIRTUAL_SIZE = 1000; // config.VIRTUAL_WIDTH / VIRTUAL_HEIGHT — canvas fills the viewport.

const readState = (page: Page): Promise<DebugState> =>
  page.evaluate(() => {
    const { round, demons } = (window as unknown as { __doom: { state: DebugState } }).__doom.state;
    return { round: { score: round.score, status: round.status }, demons: demons.map((d) => ({ x: d.x, y: d.y })) };
  });

test('boots clean with no page errors and a visible canvas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.locator('#game')).toBeVisible();

  // Let a few frames + the first scheduled spawn run.
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test('a click on a demon scores, and the round can reach its end screen', async ({ page }) => {
  await page.goto('/?e2e=1');
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const { width, height } = viewport!;

  // Wait for the first scheduled demon (schedule spawns one at ~500 ms).
  await expect.poll(async () => (await readState(page)).demons.length, { timeout: 5000 }).toBeGreaterThan(0);

  const demon = (await readState(page)).demons[0]!;
  const pixelX = (demon.x / VIRTUAL_SIZE) * width;
  const pixelY = (demon.y / VIRTUAL_SIZE) * height;
  await page.mouse.click(pixelX, pixelY);

  // The intent drains on the next fixed step, resolves to a kill, and the score climbs.
  await expect.poll(async () => (await readState(page)).round.score, { timeout: 3000 }).toBeGreaterThan(0);

  // Wind the clock down and confirm the round freezes on its end screen (AC-04 / ADR-0004).
  await page.evaluate(() => (window as unknown as { __doom: { endRoundSoon: () => void } }).__doom.endRoundSoon());
  await expect.poll(async () => (await readState(page)).round.status, { timeout: 3000 }).toBe('ended');
});

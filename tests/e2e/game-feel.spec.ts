// game-feel QG measurement pass (T-10) — the three quality gates that need a running
// browser, measured against the built bundle with the full juice layer wired (T-09).
// QG-1: every action's event→(play() trigger + first feedback frame) delta ≤ 100 ms,
// read from the ?e2e sfx log + effects snapshot inside the page (no Playwright
// round-trips in the measured window). QG-2: frame-time p95 ≤ 33.3 ms under 30 demons
// with viewmodel + concurrent deaths + backdrop. QG-3: every asset request blocked →
// silence + placeholders, and a full round (spawn → kill → end → retry) still plays.
// Numbers are logged so the run itself is the recorded evidence (see T-10-results.md).
// `__doom` is accessed through inline casts (as in play-round.spec.ts) — nfr.spec.ts
// already owns the `declare global` augmentation with a narrower shape.

import { test, expect } from '@playwright/test';

interface SfxLogEntry {
  key: string;
  atMs: number;
}

interface EffectsSnapshot {
  splats: number;
  deaths: number;
  viewmodelBase: string;
  viewmodelFlash: string | null;
}

interface DoomApi {
  state: {
    round: { score: number; status: 'running' | 'paused' | 'ended' };
    weapon: { status: 'ready' | 'pumping' };
    demons: { id: number; typeId: number; x: number; y: number }[];
  };
  frameStats: () => { fps: number; p95Ms: number };
  spawnStress: (count: number) => void;
  fireWorld: (x: number, y: number) => void;
  endRoundSoon: () => void;
  sfxLog: readonly SfxLogEntry[];
  effectsSnapshot: () => EffectsSnapshot;
}

test('QG-1 — action → feedback latency ≤ 100 ms for all 6 actions', async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect(page.locator('#game')).toBeVisible();

  const latencies = await page.evaluate(async () => {
    const doom = (window as unknown as { __doom: DoomApi }).__doom;
    const raf = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
    const until = async (pred: () => boolean, timeoutMs = 4000): Promise<number> => {
      const startedAt = performance.now();
      while (!pred()) {
        if (performance.now() - startedAt > timeoutMs) {
          throw new Error('feedback did not appear within the probe window');
        }
        await raf();
      }
      return performance.now();
    };
    const sfxAt = (key: string, sinceMs: number): number | null =>
      doom.sfxLog.find((entry) => entry.key === key && entry.atMs >= sinceMs)?.atMs ?? null;
    const weaponReady = (): Promise<number> => until(() => doom.state.weapon.status === 'ready');
    const results: Record<string, number> = {};

    // spawn — feedback = the demon's spawn SFX trigger on the next observed frame.
    const tSpawn = performance.now();
    doom.spawnStress(2); // one fast + one brute, at path starts
    await until(() => sfxAt('demon-brute-spawn', tSpawn) !== null);
    results.spawn = sfxAt('demon-brute-spawn', tSpawn)! - tSpawn;

    // shoot — deliberate miss into an empty corner: shot SFX + muzzle flash / pump frame.
    const tShoot = performance.now();
    doom.fireWorld(990, 990);
    const shootVisualAt = await until(() => {
      const snapshot = doom.effectsSnapshot();
      return sfxAt('shoot', tShoot) !== null && (snapshot.viewmodelFlash !== null || snapshot.viewmodelBase !== 'idle');
    });
    results.shoot = Math.max(sfxAt('shoot', tShoot)! - tShoot, shootVisualAt - tShoot);

    // pump — same shot: the weapon gate closes and the viewmodel leaves idle.
    const pumpSeenAt = await until(() => {
      const snapshot = doom.effectsSnapshot();
      return doom.state.weapon.status === 'pumping' && (snapshot.viewmodelFlash !== null || snapshot.viewmodelBase !== 'idle');
    });
    results.pump = pumpSeenAt - tShoot;

    // hurt — first hit on the 2-HP brute: hurt SFX + a new splat.
    await weaponReady();
    const brute = doom.state.demons.find((demon) => demon.typeId === 2);
    if (!brute) {
      throw new Error('stress-spawned brute is missing');
    }
    const splatsBefore = doom.effectsSnapshot().splats;
    const tHurt = performance.now();
    doom.fireWorld(brute.x, brute.y);
    const hurtVisualAt = await until(
      () => sfxAt('demon-brute-hurt', tHurt) !== null && doom.effectsSnapshot().splats > splatsBefore,
    );
    results.hurt = Math.max(sfxAt('demon-brute-hurt', tHurt)! - tHurt, hurtVisualAt - tHurt);

    // death — second hit kills it: death SFX + a death visual in the store.
    await weaponReady();
    const deathsBefore = doom.effectsSnapshot().deaths;
    const tDeath = performance.now();
    doom.fireWorld(brute.x, brute.y);
    const deathVisualAt = await until(
      () => sfxAt('demon-brute-death', tDeath) !== null && doom.effectsSnapshot().deaths > deathsBefore,
    );
    results.death = Math.max(sfxAt('demon-brute-death', tDeath)! - tDeath, deathVisualAt - tDeath);

    // retry — end the round, click TRY AGAIN in-page: fresh zeroed round is the feedback.
    doom.endRoundSoon();
    await until(() => doom.state.round.status === 'ended');
    const tRetry = performance.now();
    (document.getElementById('retry') as HTMLButtonElement).click();
    const retrySeenAt = await until(
      () => doom.state.round.status === 'running' && doom.state.round.score === 0 && doom.state.demons.length === 0,
    );
    results.retry = retrySeenAt - tRetry;

    return results;
  });

  for (const [action, ms] of Object.entries(latencies)) {
    console.log(`[QG-1] ${action}: ${ms.toFixed(1)} ms (target ≤ 100)`);
    expect(ms, `${action} feedback latency`).toBeLessThanOrEqual(100);
  }
  expect(Object.keys(latencies).sort()).toEqual(['death', 'hurt', 'pump', 'retry', 'shoot', 'spawn']);
});

test('QG-2 — frame-time p95 ≤ 33.3 ms under 30 demons + viewmodel + concurrent deaths + backdrop', async ({ page }) => {
  await page.goto('/?e2e=1');
  await page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.spawnStress(30));

  // Keep firing at the front demon for ~4 s: continuous viewmodel animation, splats and
  // overlapping death visuals stack on top of the 30-demon field + backdrop.
  await page.evaluate(async () => {
    const doom = (window as unknown as { __doom: DoomApi }).__doom;
    const raf = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
    const startedAt = performance.now();
    while (performance.now() - startedAt < 4000) {
      const target = doom.state.demons[0];
      if (target && doom.state.weapon.status === 'ready') {
        doom.fireWorld(target.x, target.y);
      }
      await raf();
    }
  });

  const stats = await page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.frameStats());
  console.log(`[QG-2] stress wave with juice: ${stats.fps} FPS, frame p95 ${stats.p95Ms} ms (target ≤ 33.3)`);
  expect(stats.p95Ms).toBeLessThanOrEqual(33.3);
  expect(stats.fps).toBeGreaterThanOrEqual(30);
});

test('QG-3 — every asset blocked: fail-soft round is fully playable, retry included', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Only the game's asset tree — the built app bundle also lives under /assets/.
  await page.route(/\/assets\/(sprites|audio|backdrops)\//, (route) => route.abort());

  await page.goto('/?e2e=1');
  await expect(page.locator('#game')).toBeVisible();

  // The scheduled round still runs: first wave slot spawns at ~500 ms.
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.state.demons.length), {
      timeout: 5000,
    })
    .toBeGreaterThan(0);

  // A full kill resolves on placeholders + silence (fast demon: 3 shots through the pump gate).
  await page.evaluate(async () => {
    const doom = (window as unknown as { __doom: DoomApi }).__doom;
    const raf = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
    const startedAt = performance.now();
    while (doom.state.round.score === 0) {
      if (performance.now() - startedAt > 5000) {
        throw new Error('no kill resolved with assets blocked');
      }
      const target = doom.state.demons[0];
      if (target && doom.state.weapon.status === 'ready') {
        doom.fireWorld(target.x, target.y);
      }
      await raf();
    }
  });

  // Round end + retry still work — finale music and backdrop reroll fail soft too.
  await page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.endRoundSoon());
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.state.round.status), {
      timeout: 3000,
    })
    .toBe('ended');
  await page.click('#retry');
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.state.round.score), {
      timeout: 3000,
    })
    .toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __doom: DoomApi }).__doom.state.round.status)).toBe(
    'running',
  );

  expect(errors).toEqual([]);
});

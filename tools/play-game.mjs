// Visual smoke playthrough (.claude/skills/run-game): drives the BUILT game like a player —
// real mouse clicks on the canvas, Esc from the keyboard, the real TRY AGAIN button — and
// screenshots every key state so the run can be verified by looking at the pictures.
// ?e2e is used only to READ GameState for aiming; no debug hook fires a shot.
//
// Usage: node tools/play-game.mjs [outDir] [baseUrl]
//   outDir  — where the numbered PNGs land (default ./playthrough, gitignored-safe temp ok)
//   baseUrl — a served build (default http://localhost:4173, i.e. `npm run preview`)

/* global window, console, process, setTimeout */

import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? './playthrough';
const BASE_URL = process.argv[3] ?? 'http://localhost:4173';
const VIEWPORT = { width: 1280, height: 720 };
const VIRTUAL = 1000; // config.VIRTUAL_WIDTH / VIRTUAL_HEIGHT — canvas fills the viewport
const PUMP_GAP_MS = 400; // > PUMP_DURATION_MS so every click fires

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readState = () =>
  page.evaluate(() => {
    const { round, weapon, demons } = window.__doom.state;
    return {
      round,
      weapon,
      demons: demons.map(({ id, typeId, hp, x, y }) => ({ id, typeId, hp, x, y })),
    };
  });
const toPixels = ({ x, y }) => ({
  x: (x / VIRTUAL) * VIEWPORT.width,
  y: (y / VIRTUAL) * VIEWPORT.height,
});

await page.goto(`${BASE_URL}/?e2e=1`);
await sleep(1200); // first scheduled demon spawns at ~500 ms
await shot('1-boot-first-demon');
console.log('boot:', JSON.stringify(await readState()));

// Click the front demon with the real mouse, through the pump gate, until a kill lands.
let killed = false;
for (let attempt = 0; attempt < 14 && !killed; attempt++) {
  const state = await readState();
  const target = state.demons[0];
  if (target) {
    const pixel = toPixels(target);
    await page.mouse.click(pixel.x, pixel.y);
    if (attempt === 0) {
      await sleep(60); // inside the muzzle-flash window
      await shot('2-first-shot-flash');
    }
    if (attempt === 1) {
      await shot('3-hurt-demon-splat');
    }
    killed = (await readState()).round.score > 0;
  }
  await sleep(PUMP_GAP_MS);
}
await shot('4-after-kill');
console.log('after shooting:', JSON.stringify(await readState()));
if (!killed) {
  throw new Error('no kill landed in 14 clicks — aim mapping or hit path is off');
}

// Esc pause: overlay appears, timer freezes.
await page.keyboard.press('Escape');
await sleep(300);
await shot('5-paused-overlay');
const paused = (await readState()).round;
console.log('paused:', JSON.stringify(paused));
if (paused.status !== 'paused') {
  throw new Error(`Esc did not pause the round (status ${paused.status})`);
}
await page.keyboard.press('Escape');
await sleep(300);

// End screen, then retry via the real button.
await page.evaluate(() => window.__doom.endRoundSoon());
await sleep(600);
await shot('6-end-screen');
console.log('ended:', JSON.stringify((await readState()).round));
await page.click('#retry');
await sleep(800);
await shot('7-after-retry');
const fresh = await readState();
console.log('after retry:', JSON.stringify(fresh));
if (fresh.round.score !== 0 || fresh.round.status !== 'running') {
  throw new Error('retry did not rebuild a fresh round');
}

await browser.close();
console.log(`DONE — screenshots in ${OUT}`);

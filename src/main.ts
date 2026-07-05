import { createViewport, resizeToWindow, clearFrame } from './render/canvas2d.ts';
import { startLoop } from './core/loop.ts';

const bootstrap = (): void => {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#game canvas element not found');
  }

  const view = createViewport(canvas);
  window.addEventListener('resize', () => resizeToWindow(view));

  // No-op update until systems land (T-05/T-06); render just clears (T-09 renderer).
  startLoop({
    update: () => {},
    render: () => clearFrame(view),
  });
};

bootstrap();

import { createViewport, resizeToWindow, clearFrame } from './render/canvas2d.ts';

function bootstrap(): void {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#game canvas element not found');
  }

  const view = createViewport(canvas);
  window.addEventListener('resize', () => resizeToWindow(view));

  // Placeholder render stub — replaced by the fixed-timestep loop in T-03.
  function frame(): void {
    clearFrame(view);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

bootstrap();

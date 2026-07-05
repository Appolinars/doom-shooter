export interface Viewport {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** CSS pixel dimensions of the drawing surface (backing store is DPR-scaled). */
  cssWidth: number;
  cssHeight: number;
  dpr: number;
}

/**
 * Sizes the canvas backing store to `cssSize * devicePixelRatio` so drawing is
 * crisp on HiDPI displays, and scales the context so all draw calls use CSS
 * pixel coordinates regardless of DPR.
 */
export function resizeToWindow(view: Viewport): void {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;

  view.canvas.width = Math.round(cssWidth * dpr);
  view.canvas.height = Math.round(cssHeight * dpr);

  view.cssWidth = cssWidth;
  view.cssHeight = cssHeight;
  view.dpr = dpr;

  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function createViewport(canvas: HTMLCanvasElement): Viewport {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  const view: Viewport = { canvas, ctx, cssWidth: 0, cssHeight: 0, dpr: 1 };
  resizeToWindow(view);
  return view;
}

/** Placeholder frame — clears the surface. The T-03 loop + T-09 renderer replace this. */
export function clearFrame(view: Viewport): void {
  view.ctx.clearRect(0, 0, view.cssWidth, view.cssHeight);
}

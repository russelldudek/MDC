(() => {
  'use strict';
  const { EngagementRenderer, createWebGPUBackend, createWebGL2Backend, createCanvasBackend } = window.__MDCGPU;

  async function create(canvas, { reducedMotion = false, forceFallback = false } = {}) {
    let backend = null;
    if (!forceFallback && !reducedMotion) {
      try { backend = await createWebGPUBackend(canvas); } catch (error) { console.warn('WebGPU engagement renderer unavailable:', error); }
      if (!backend) backend = createWebGL2Backend(canvas);
    }
    if (!backend) backend = createCanvasBackend(canvas);
    if (!backend) throw new Error('No supported canvas renderer is available.');
    return new EngagementRenderer(canvas, backend, reducedMotion);
  }

  window.EngagementLoadRenderer = { create };
})();

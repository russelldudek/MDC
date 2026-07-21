(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);

  const PALETTE = {
    background: [8 / 255, 16 / 255, 27 / 255],
    calm: [78 / 255, 170 / 255, 157 / 255],
    watch: [220 / 255, 168 / 255, 74 / 255],
    risk: [222 / 255, 91 / 255, 77 / 255],
    copper: [221 / 255, 128 / 255, 68 / 255],
    paper: [244 / 255, 237 / 255, 224 / 255]
  };

  function colorForStress(stress) {
    const t = clamp(stress);
    const a = t < 0.5 ? PALETTE.calm : PALETTE.watch;
    const b = t < 0.5 ? PALETTE.watch : PALETTE.risk;
    const f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    return a.map((value, index) => mix(value, b[index], f));
  }

  class EngagementRenderer {
    constructor(canvas, backend, reducedMotion = false) {
      this.canvas = canvas;
      this.backend = backend;
      this.reducedMotion = reducedMotion;
      this.currentStress = [0, 0, 0, 0, 0, 0];
      this.startStress = [...this.currentStress];
      this.targetStress = [...this.currentStress];
      this.currentFounder = 0;
      this.startFounder = 0;
      this.targetFounder = 0;
      this.loadProgress = 1;
      this.startedAt = performance.now();
      this.duration = 1580;
      this.transitioning = false;
      this.pointer = [0, 0];
      this.frame = 0;
      this.destroyed = false;
      this.mode = backend.mode;
      this.canvas.dataset.renderer = this.mode;
      this.canvas.setAttribute('aria-label', `GPU engagement load simulation using ${this.mode}.`);
      this.onPointerMove = (event) => {
        if (this.reducedMotion) return;
        const bounds = this.canvas.getBoundingClientRect();
        this.pointer[0] = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
        this.pointer[1] = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
      };
      this.onPointerLeave = () => { this.pointer = [0, 0]; };
      this.canvas.addEventListener('pointermove', this.onPointerMove, { passive: true });
      this.canvas.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      this.tick = this.tick.bind(this);
      this.frame = requestAnimationFrame(this.tick);
    }

    setScenario({ stress, founder }, { immediate = false } = {}) {
      const nextStress = stress.map((value) => clamp(value));
      const nextFounder = clamp(founder);
      if (immediate || this.reducedMotion) {
        this.currentStress = [...nextStress];
        this.startStress = [...nextStress];
        this.targetStress = [...nextStress];
        this.currentFounder = nextFounder;
        this.startFounder = nextFounder;
        this.targetFounder = nextFounder;
        this.loadProgress = 1;
        this.transitioning = false;
        this.canvas.dataset.motion = 'settled';
        this.draw(performance.now());
        return;
      }
      this.startStress = [...this.currentStress];
      this.targetStress = [...nextStress];
      this.startFounder = this.currentFounder;
      this.targetFounder = nextFounder;
      this.startedAt = performance.now();
      this.loadProgress = 0;
      this.transitioning = true;
      this.canvas.dataset.motion = 'running';
    }

    replay() {
      if (this.reducedMotion) {
        this.loadProgress = 1;
        this.canvas.dataset.motion = 'settled';
        this.draw(performance.now());
        return;
      }
      this.startStress = [...this.currentStress];
      this.targetStress = [...this.currentStress];
      this.startFounder = this.currentFounder;
      this.targetFounder = this.currentFounder;
      this.startedAt = performance.now();
      this.loadProgress = 0;
      this.transitioning = true;
      this.canvas.dataset.motion = 'running';
    }

    tick(now) {
      if (this.destroyed) return;
      if (this.transitioning) {
        const raw = clamp((now - this.startedAt) / this.duration);
        const geometryT = ease(clamp(raw / 0.48));
        this.currentStress = this.startStress.map((value, index) => mix(value, this.targetStress[index], geometryT));
        this.currentFounder = mix(this.startFounder, this.targetFounder, geometryT);
        this.loadProgress = raw < 0.19 ? 0 : ease(clamp((raw - 0.19) / 0.68));
        if (raw >= 1) {
          this.currentStress = [...this.targetStress];
          this.currentFounder = this.targetFounder;
          this.loadProgress = 1;
          this.transitioning = false;
          this.canvas.dataset.motion = 'settled';
        }
      }
      this.draw(now);
      this.frame = requestAnimationFrame(this.tick);
    }

    draw(now) {
      this.backend.draw({
        time: now / 1000,
        stress: this.currentStress,
        founder: this.currentFounder,
        progress: this.loadProgress,
        pointer: this.pointer
      });
    }

    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this.frame);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
      this.backend.destroy?.();
    }
  }

  async function createWebGPUBackend(canvas) {
    if (!navigator.gpu || !window.isSecureContext) return null;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) return null;
    const format = navigator.gpu.getPreferredCanvasFormat();

    const shader = device.createShaderModule({ code: `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  progress: f32,
  pointer: vec2f,
  founder: f32,
  load: f32,
  stressA: vec4f,
  stressB: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

fn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
fn stressAt(i: i32) -> f32 {
  if (i == 0) { return u.stressA.x; }
  if (i == 1) { return u.stressA.y; }
  if (i == 2) { return u.stressA.z; }
  if (i == 3) { return u.stressA.w; }
  if (i == 4) { return u.stressB.x; }
  return u.stressB.y;
}
fn stressColor(s: f32) -> vec3f {
  let calm = vec3f(0.306, 0.667, 0.616);
  let watch = vec3f(0.863, 0.659, 0.290);
  let risk = vec3f(0.871, 0.357, 0.302);
  if (s < 0.5) { return mix(calm, watch, s * 2.0); }
  return mix(watch, risk, (s - 0.5) * 2.0);
}
fn curveY(x: f32) -> f32 {
  var sag = 0.0;
  for (var i = 0; i < 6; i = i + 1) {
    let nodeX = mix(0.10, 0.90, f32(i) / 5.0);
    let dx = (x - nodeX) / 0.13;
    sag = sag + stressAt(i) * exp(-dx * dx) * 0.055;
  }
  return 0.365 + sag;
}
fn beamDistance(p: vec2f) -> f32 {
  var d = 1.0;
  var prev = vec2f(0.075, curveY(0.075));
  for (var i = 1; i <= 42; i = i + 1) {
    let x = mix(0.075, 0.925, f32(i) / 42.0);
    let next = vec2f(x, curveY(x));
    d = min(d, segmentDistance(p, prev, next));
    prev = next;
  }
  return d;
}

@vertex fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}

@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  var uv = position.xy / u.resolution;
  let aspect = u.resolution.x / max(u.resolution.y, 1.0);
  let parallax = u.pointer * vec2f(0.007, 0.005);
  uv = uv + parallax;
  let centered = vec2f((uv.x - 0.5) * aspect, uv.y - 0.5);

  var color = mix(vec3f(0.032, 0.063, 0.106), vec3f(0.010, 0.020, 0.034), smoothstep(-0.45, 0.52, centered.y));
  let vignette = smoothstep(0.78, 0.18, length(centered * vec2f(0.82, 1.0)));
  color = color * (0.60 + 0.40 * vignette);

  let gridY = abs(fract((uv.y - 0.50) * 16.0) - 0.5);
  let gridX = abs(fract((uv.x - 0.5) * (11.0 + uv.y * 8.0)) - 0.5);
  let gridMask = smoothstep(0.035, 0.0, min(gridX, gridY)) * smoothstep(0.48, 0.86, uv.y);
  color = color + vec3f(0.09, 0.14, 0.18) * gridMask * 0.36;

  let baseTop = 0.765;
  let baseBottom = 0.875;
  let leftEdge = mix(0.105, 0.035, smoothstep(baseTop, baseBottom, uv.y));
  let rightEdge = 1.0 - leftEdge;
  let inBase = step(baseTop, uv.y) * step(uv.y, baseBottom) * step(leftEdge, uv.x) * step(uv.x, rightEdge);
  let baseDepth = smoothstep(baseTop, baseBottom, uv.y);
  color = mix(color, mix(vec3f(0.095, 0.13, 0.13), vec3f(0.025, 0.055, 0.060), baseDepth), inBase * 0.94);
  let copperEdge = smoothstep(0.006, 0.0, abs(uv.y - baseTop)) * step(0.075, uv.x) * step(uv.x, 0.925);
  color = color + vec3f(0.866, 0.502, 0.267) * copperEdge * 0.9;

  let beamD = beamDistance(uv);
  let beamGlow = exp(-beamD * 95.0);
  let beamCore = smoothstep(0.013, 0.003, beamD);
  color = color + vec3f(0.866, 0.502, 0.267) * beamGlow * 0.32;
  color = mix(color, vec3f(0.86, 0.53, 0.31), beamCore * 0.92);

  for (var i = 0; i < 6; i = i + 1) {
    let x = mix(0.10, 0.90, f32(i) / 5.0);
    let s = stressAt(i);
    let top = curveY(x) + 0.017;
    let width = mix(0.013, 0.020, uv.y);
    let vertical = step(abs(uv.x - x), width) * step(top, uv.y) * step(uv.y, baseTop);
    let c = stressColor(s);
    let depthFade = mix(0.95, 0.48, smoothstep(top, baseTop, uv.y));
    color = mix(color, c * depthFade, vertical * 0.92);
    let nodeD = distance(uv, vec2f(x, curveY(x)));
    color = color + c * exp(-nodeD * 75.0) * (0.22 + s * 0.18);
    color = mix(color, c + vec3f(0.15), smoothstep(0.017, 0.006, nodeD));
    let footD = abs(uv.x - x);
    let foot = smoothstep(0.033, 0.028, footD) * smoothstep(0.012, 0.0, abs(uv.y - baseTop));
    color = mix(color, c * 0.72, foot);
  }

  let packetX = mix(0.075, 0.925, u.progress);
  let packetY = curveY(packetX);
  let packetD = distance(uv, vec2f(packetX, packetY));
  let packetColor = mix(vec3f(0.866, 0.502, 0.267), vec3f(0.95, 0.86, 0.66), u.progress);
  color = color + packetColor * exp(-packetD * 70.0) * (0.55 + 0.15 * sin(u.time * 6.0));
  color = mix(color, packetColor, smoothstep(0.015, 0.004, packetD));

  var maxStress = 0.0;
  var weakIndex = 0;
  for (var i = 0; i < 6; i = i + 1) {
    if (stressAt(i) > maxStress) { maxStress = stressAt(i); weakIndex = i; }
  }
  let weakX = mix(0.10, 0.90, f32(weakIndex) / 5.0);
  let braceA = vec2f(0.94, 0.17);
  let braceB = vec2f(weakX, curveY(weakX) + 0.008);
  let braceD = segmentDistance(uv, braceA, braceB);
  let brace = smoothstep(0.010, 0.003, braceD) * u.founder;
  let braceGlow = exp(-braceD * 68.0) * u.founder;
  color = color + vec3f(0.87, 0.35, 0.30) * braceGlow * 0.18;
  color = mix(color, vec3f(0.96, 0.34, 0.27), brace * 0.95);

  let scan = smoothstep(0.008, 0.0, abs(uv.y - (0.22 + 0.006 * sin(u.time * 0.7)))) * 0.035;
  color = color + vec3f(0.55, 0.69, 0.74) * scan;
  return vec4f(pow(color, vec3f(0.92)), 1.0);
}` });

    const uniformBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: shader, entryPoint: 'vertexMain' },
      fragment: { module: shader, entryPoint: 'fragmentMain', targets: [{ format }] },
      primitive: { topology: 'triangle-list' }
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });

    let configuredWidth = 0;
    let configuredHeight = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(2, Math.round(rect.width * dpr));
      const height = Math.max(2, Math.round(rect.height * dpr));
      if (width === configuredWidth && height === configuredHeight) return;
      configuredWidth = width;
      configuredHeight = height;
      canvas.width = width;
      canvas.height = height;
      context.configure({ device, format, alphaMode: 'opaque' });
    }

    return {
      mode: 'webgpu',
      draw(frame) {
        resize();
        const data = new Float32Array(16);
        data[0] = canvas.width; data[1] = canvas.height;
        data[2] = frame.time; data[3] = frame.progress;
        data[4] = frame.pointer[0]; data[5] = frame.pointer[1];
        data[6] = frame.founder; data[7] = frame.progress;
        data.set(frame.stress.slice(0, 4), 8);
        data[12] = frame.stress[4]; data[13] = frame.stress[5];
        device.queue.writeBuffer(uniformBuffer, 0, data);
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.01, g: 0.02, b: 0.034, a: 1 },
            loadOp: 'clear', storeOp: 'store'
          }]
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);
      }
    };
  }

  window.__MDCGPU = { clamp, mix, ease, PALETTE, colorForStress, EngagementRenderer, createWebGPUBackend };
})();

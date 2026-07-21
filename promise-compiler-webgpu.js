(() => {
  'use strict';

  const SHADER = `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  progress: f32,
  rawProgress: f32,
  scenario: f32,
  previousScenario: f32,
  padding0: f32,
  pointer: vec2f,
  padding1: vec2f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash11(p: f32) -> f32 { return fract(sin(p * 127.1) * 43758.5453123); }
fn hash31(p: f32) -> vec3f {
  return fract(sin(vec3f(p * 127.1, p * 311.7, p * 74.7)) * 43758.5453123);
}
fn rot2(v: vec2f, a: f32) -> vec2f {
  let c = cos(a);
  let s = sin(a);
  return vec2f(c * v.x - s * v.y, s * v.x + c * v.y);
}
fn sdRoundBox(p: vec3f, b: vec3f, r: f32) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
fn sdSphere(p: vec3f, r: f32) -> f32 { return length(p) - r; }
fn sdOctahedron(p0: vec3f, s: f32) -> f32 {
  let p = abs(p0);
  let m = p.x + p.y + p.z - s;
  var q: vec3f;
  if (3.0 * p.x < m) { q = p.xyz; }
  else if (3.0 * p.y < m) { q = p.yzx; }
  else if (3.0 * p.z < m) { q = p.zxy; }
  else { return m * 0.57735027; }
  let k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3f(q.x, q.y - s + k, q.z - k));
}
fn scenarioTransform(p0: vec3f, scenario: f32) -> vec3f {
  var p = p0;
  let rotated = rot2(p.xz, -0.18 + p.y * 0.12);
  p.x = rotated.x;
  p.z = rotated.y;
  if (scenario > 3.5) {
    p.x = p.x + 0.34 * smoothstep(-1.4, 1.25, p.y);
    p.y = p.y * 0.88;
  }
  return p;
}
fn mapObject(world: vec3f, scenario: f32) -> vec4f {
  let p = scenarioTransform(world, scenario);
  let body = sdRoundBox(p, vec3f(0.82, 1.28, 0.68), 0.30);
  let facet = sdOctahedron(p * vec3f(0.95, 0.76, 1.08), 1.58) * 0.74;
  var d = max(body, facet - 0.08);
  var fault = 0.0;
  let core = sdSphere(p * vec3f(1.0, 0.78, 1.0), 0.54);

  if (scenario > 0.5 && scenario < 1.5) {
    let hole = sdSphere(p - vec3f(0.52, 0.74, 0.04), 0.38);
    d = max(d, -hole);
    let shard = sdOctahedron(p - vec3f(1.08, 0.98, 0.16), 0.36);
    d = min(d, shard);
    fault = exp(-18.0 * abs(hole));
  } else if (scenario > 1.5 && scenario < 2.5) {
    let seam = abs(p.x + 0.19 * p.y) - 0.055;
    d = max(d, -seam);
    let shardA = sdOctahedron(p - vec3f(1.03, -0.10, 0.20), 0.30);
    let shardB = sdOctahedron(p - vec3f(-1.06, 0.20, -0.14), 0.24);
    d = min(d, min(shardA, shardB));
    fault = exp(-32.0 * abs(seam));
  } else if (scenario > 2.5 && scenario < 3.5) {
    fault = exp(-7.5 * abs(core));
  } else if (scenario > 3.5) {
    let cut = sdSphere(p - vec3f(0.54, -0.30, 0.04), 0.57);
    d = max(d, -cut);
    let debris = sdOctahedron(p - vec3f(1.24, -0.52, 0.18), 0.40);
    d = min(d, debris);
    fault = exp(-14.0 * abs(cut));
  }
  return vec4f(d, fault, core, scenario);
}
fn mapScene(p: vec3f) -> vec4f {
  let blend = smoothstep(0.20, 0.72, u.progress);
  let prev = mapObject(p, u.previousScenario);
  let next = mapObject(p, u.scenario);
  return mix(prev, next, blend);
}
fn normalAt(p: vec3f) -> vec3f {
  let e = 0.0022;
  let d = mapScene(p).x;
  return normalize(vec3f(
    mapScene(p + vec3f(e, 0.0, 0.0)).x - d,
    mapScene(p + vec3f(0.0, e, 0.0)).x - d,
    mapScene(p + vec3f(0.0, 0.0, e)).x - d
  ));
}
fn cameraForward(ro: vec3f, target: vec3f) -> vec3f { return normalize(target - ro); }
fn projectPoint(point: vec3f, ro: vec3f, target: vec3f, aspect: f32) -> vec2f {
  let f = cameraForward(ro, target);
  let right = normalize(cross(f, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, f);
  let v = point - ro;
  let z = max(0.15, dot(v, f));
  return vec2f(dot(v, right) / aspect, dot(v, up)) / (z * 0.54);
}
fn targetPoint(i: f32, scenario: f32) -> vec3f {
  let h = hash31(i * 13.17 + scenario * 19.31);
  let phi = acos(1.0 - 2.0 * h.x);
  let theta = 6.2831853 * h.y;
  var p = vec3f(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
  p = p * vec3f(0.82, 1.28, 0.68) * (0.78 + h.z * 0.24);
  let rotated = rot2(p.xz, -0.18 + p.y * 0.12);
  p.x = rotated.x;
  p.z = rotated.y;
  if (scenario > 0.5 && scenario < 1.5 && p.x > 0.25 && p.y > 0.35) { p = p + vec3f(0.72, 0.32, 0.12); }
  if (scenario > 1.5 && scenario < 2.5 && abs(p.x + 0.19 * p.y) < 0.20) { p.x = p.x + select(-0.60, 0.60, p.x >= 0.0); }
  if (scenario > 2.5 && scenario < 3.5 && length(p) < 0.82) { p = p + (h - 0.5) * 1.2; }
  if (scenario > 3.5 && (h.x > 0.62 || p.x > 0.35)) { p = p + vec3f(0.88 + h.z, -0.30 + h.y * 0.25, (h.y - 0.5) * 0.6); }
  return p;
}
fn rawPoint(i: f32) -> vec3f {
  let h = hash31(i * 31.77 + 9.0);
  return vec3f(-2.15 + h.x * 1.6, (h.y - 0.5) * 3.4, (h.z - 0.5) * 2.2);
}
fn palette(scenario: f32, y: f32, fault: f32) -> vec3f {
  let teal = vec3f(0.26, 0.82, 0.74);
  let copper = vec3f(0.96, 0.51, 0.25);
  let amber = vec3f(0.95, 0.69, 0.29);
  let red = vec3f(1.0, 0.22, 0.18);
  var base = mix(teal, copper, smoothstep(-1.2, 1.2, y));
  if (scenario > 0.5 && scenario < 1.5) { base = mix(base, amber, fault * 0.82); }
  if (scenario > 1.5) { base = mix(base, red, fault * 0.90); }
  return base;
}

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = position.xy;
  let uv = (frag * 2.0 - u.resolution) / u.resolution.y;
  let aspect = u.resolution.x / u.resolution.y;
  let ro = vec3f(0.15 + u.pointer.x * 0.34, 0.05 - u.pointer.y * 0.22, 5.35);
  let target = vec3f(0.42, 0.02, 0.0);
  let f = normalize(target - ro);
  let right = normalize(cross(f, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, f);
  let rd = normalize(f + uv.x * right * 0.56 + uv.y * up * 0.56);

  let bgTop = vec3f(0.027, 0.061, 0.091);
  let bgBottom = vec3f(0.006, 0.012, 0.022);
  var color = mix(bgBottom, bgTop, smoothstep(-0.95, 0.72, uv.y));
  color = color + vec3f(0.035, 0.12, 0.15) * exp(-length(uv - vec2f(0.42, 0.02)) * 1.25);
  color = color + vec3f(0.12, 0.055, 0.025) * exp(-length(uv - vec2f(0.82, 0.20)) * 3.1);

  var t = 0.0;
  var glowAccum = 0.0;
  var hitData = vec4f(0.0);
  var hitPos = vec3f(0.0);
  var hit = false;
  for (var i = 0; i < 78; i = i + 1) {
    let p = ro + rd * t;
    let data = mapScene(p);
    let d = data.x;
    glowAccum = glowAccum + exp(-abs(d) * 9.5) * 0.0075;
    if (abs(d) < 0.0015) {
      hit = true;
      hitData = data;
      hitPos = p;
      break;
    }
    t = t + max(abs(d) * 0.62, 0.012);
    if (t > 12.0) { break; }
  }

  let releaseFade = 1.0 - smoothstep(0.03, 0.29, u.progress);
  let resolveFade = smoothstep(0.30, 0.82, u.progress);
  let objectAlpha = max(releaseFade, resolveFade);
  if (hit) {
    let n = normalAt(hitPos);
    let lightA = normalize(vec3f(-0.45, 0.85, 0.55));
    let lightB = normalize(vec3f(0.72, -0.18, 0.50));
    let diffuse = max(dot(n, lightA), 0.0) * 0.72 + max(dot(n, lightB), 0.0) * 0.30;
    let fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.4);
    let band = pow(1.0 - abs(fract((hitPos.y + 1.45) * 1.92) - 0.5) * 2.0, 9.0);
    let base = palette(u.scenario, hitPos.y, hitData.y);
    var surface = base * (0.18 + diffuse * 0.82);
    surface = surface + vec3f(0.74, 0.95, 1.0) * fresnel * 0.70;
    surface = surface + base * band * 0.52;
    if (u.scenario > 2.5 && u.scenario < 3.5) {
      let internal = exp(-8.0 * abs(hitData.z));
      surface = surface + vec3f(1.0, 0.12, 0.09) * internal * 1.15;
    }
    color = mix(color, surface, objectAlpha * (0.78 + fresnel * 0.18));
  }

  let resolve = smoothstep(0.16, 0.94, u.progress);
  let turbulence = sin(u.rawProgress * 3.14159265) * 0.34;
  var particleColor = vec3f(0.0);
  for (var i = 0; i < 34; i = i + 1) {
    let fi = f32(i);
    let raw = rawPoint(fi);
    let targetP = targetPoint(fi, u.scenario);
    var p = mix(raw, targetP, resolve);
    let h = hash31(fi * 7.93);
    p = p + (h - 0.5) * turbulence;
    let particleOffset = vec2f(sin(fi * 2.2 + u.time * 2.6), cos(fi * 1.7 + u.time * 2.1)) * turbulence * 0.28;
    p.x = p.x + particleOffset.x;
    p.y = p.y + particleOffset.y;
    let sp = projectPoint(p, ro, target, aspect);
    let dist = length(uv - sp);
    let glow = exp(-dist * dist * 1050.0) * (0.65 + h.z * 0.8);
    var c = mix(vec3f(0.39, 0.90, 0.82), vec3f(0.95, 0.55, 0.28), h.y);
    if (u.scenario > 1.5 && (h.x > 0.64 || u.scenario > 3.5)) { c = mix(c, vec3f(1.0, 0.23, 0.18), 0.65); }
    particleColor = particleColor + c * glow;
  }
  color = color + particleColor * (0.62 + sin(u.rawProgress * 3.14159265) * 0.50);
  color = color + palette(u.scenario, 0.0, 1.0) * glowAccum * objectAlpha * 0.52;

  let horizon = exp(-abs(uv.y + 0.74) * 90.0) * smoothstep(1.35, 0.12, abs(uv.x));
  color = color + vec3f(0.12, 0.25, 0.27) * horizon * 0.22;
  let vignette = smoothstep(1.42, 0.42, length(uv * vec2f(0.72, 1.0)));
  color = color * (0.60 + 0.40 * vignette);
  let grain = hash11(dot(frag, vec2f(0.06711056, 0.00583715)) + u.scenario * 19.0) - 0.5;
  color = color + grain * 0.018;
  color = pow(max(color, vec3f(0.0)), vec3f(0.86));
  return vec4f(color, 1.0);
}`;

  async function createWebGPUBackend(canvas) {
    if (!navigator.gpu || !window.isSecureContext) return null;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) return null;
    const format = navigator.gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({ code: SHADER });
    const compilation = await module.getCompilationInfo();
    const shaderErrors = compilation.messages.filter((message) => message.type === 'error');
    if (shaderErrors.length) {
      throw new Error(shaderErrors.map((message) => `${message.lineNum}:${message.linePos} ${message.message}`).join('\n'));
    }
    const pipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: { module, entryPoint: 'fragmentMain', targets: [{ format }] },
      primitive: { topology: 'triangle-list' }
    });
    const uniformBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });
    let configuredWidth = 0;
    let configuredHeight = 0;

    function resize() {
      const box = canvas.getBoundingClientRect();
      const mobile = box.width < 760;
      const ratio = Math.min(devicePixelRatio || 1, mobile ? 1.1 : 1.35);
      const width = Math.max(1, Math.round(box.width * ratio));
      const height = Math.max(1, Math.round(box.height * ratio));
      if (width !== configuredWidth || height !== configuredHeight) {
        configuredWidth = width;
        configuredHeight = height;
        canvas.width = width;
        canvas.height = height;
        context.configure({ device, format, alphaMode: 'opaque' });
      }
    }

    return {
      mode: 'webgpu-raymarch',
      destroy() { uniformBuffer.destroy(); },
      draw(frame) {
        resize();
        const data = new Float32Array(16);
        data[0] = canvas.width;
        data[1] = canvas.height;
        data[2] = frame.time;
        data[3] = frame.progress;
        data[4] = frame.rawProgress;
        data[5] = frame.scenario;
        data[6] = frame.previousScenario;
        data[8] = frame.pointer[0];
        data[9] = frame.pointer[1];
        device.queue.writeBuffer(uniformBuffer, 0, data);
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.006, g: 0.012, b: 0.022, a: 1 },
            loadOp: 'clear',
            storeOp: 'store'
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

  window.PromiseCompilerBackends = window.PromiseCompilerBackends || {};
  window.PromiseCompilerBackends.createWebGPUBackend = createWebGPUBackend;
})();

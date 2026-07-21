(() => {
  'use strict';

  const root = document.getElementById('promise-compiler');
  const canvas = document.getElementById('compiler-canvas');
  if (!root || !canvas || !window.PromiseCompilerCore) return;

  const scenarios = {
    baseline: {
      index: 0,
      input: 'Measured outcome accepted',
      status: 'Executable',
      decision: 'Release founder attention',
      owner: 'COO / engagement lead',
      evidence: 'outcome, margin, and renewal record'
    },
    'new-logo': {
      index: 1,
      input: 'New client commitment signed',
      status: 'Conditional',
      decision: 'Run the pre-start compile review',
      owner: 'COO + sales + delivery',
      evidence: 'signed outcome, bounded scope, and staffing record'
    },
    scope: {
      index: 2,
      input: 'Client need changed midstream',
      status: 'Recompile required',
      decision: 'Pause, price, and reset authority',
      owner: 'COO / commercial owner',
      evidence: 'change record and revised economics'
    },
    agent: {
      index: 3,
      input: 'Agent output no longer dependable',
      status: 'Autonomy rejected',
      decision: 'Hold autonomy; restore evidence',
      owner: 'agent owner + delivery lead',
      evidence: 'evaluation trace, override, and release decision'
    },
    forecast: {
      index: 4,
      input: 'Forecast and actuals diverged',
      status: 'Forecast rejected',
      decision: 'Reconcile pipeline to capacity and cash',
      owner: 'COO + finance + sales',
      evidence: 'variance root cause and corrected forecast'
    }
  };

  const tabs = [...document.querySelectorAll('[data-compiler-scenario]')];
  const input = document.getElementById('compiler-input');
  const status = document.getElementById('compile-status');
  const verdict = document.getElementById('compiler-verdict');
  const replay = document.getElementById('replay-compiler');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer = null;
  let currentKey = 'baseline';
  let generation = 0;

  function verdictSentence(scenario) {
    return `${scenario.decision} — decision owner: ${scenario.owner}. Evidence required: ${scenario.evidence}.`;
  }

  function updateDOM(key, { focus = false } = {}) {
    const scenario = scenarios[key];
    currentKey = key;
    root.dataset.state = key;
    input.textContent = scenario.input;
    status.textContent = scenario.status;
    verdict.textContent = verdictSentence(scenario);
    root.setAttribute('aria-label', `${scenario.input}. Compile status: ${scenario.status}. ${verdictSentence(scenario)}`);
    tabs.forEach((tab) => {
      const selected = tab.dataset.compilerScenario === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
  }

  function select(key, { focus = false, replaySelected = true } = {}) {
    const nextKey = scenarios[key] ? key : 'baseline';
    const same = nextKey === currentKey;
    updateDOM(nextKey, { focus });
    if (!renderer) return;
    if (same && replaySelected) renderer.replay();
    else renderer.setScenario(scenarios[nextKey].index, { immediate: reducedMotion.matches });
    root.dataset.motion = renderer.canvas.dataset.motion;
    window.__promiseCompiler.currentScenario = nextKey;
  }

  function syncMotion() {
    root.dataset.motion = canvas.dataset.motion || 'settled';
  }

  async function initialize() {
    const activeGeneration = ++generation;
    const backends = window.PromiseCompilerBackends || {};
    let backend = null;

    if (!reducedMotion.matches && backends.createWebGPUBackend) {
      try { backend = await backends.createWebGPUBackend(canvas); } catch (error) { console.warn('Promise Compiler WebGPU path unavailable:', error); }
    }
    if (!backend && backends.createWebGLBackend) {
      try { backend = backends.createWebGLBackend(canvas); } catch (error) { console.warn('Promise Compiler WebGL2 path unavailable:', error); }
    }
    if (!backend) backend = window.PromiseCompilerCore.createCanvas2DBackend(canvas);
    if (!backend || activeGeneration !== generation) return;

    renderer?.destroy();
    renderer = new window.PromiseCompilerCore.PromiseCompilerRenderer(canvas, backend, { reducedMotion: reducedMotion.matches });
    window.__promiseCompiler.rendererMode = renderer.mode;
    canvas.addEventListener('compiler-settled', syncMotion);
    renderer.setScenario(scenarios[currentKey].index, { immediate: reducedMotion.matches });
    root.dataset.motion = canvas.dataset.motion;
  }

  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => select(tab.dataset.compilerScenario));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      select(tabs[next].dataset.compilerScenario, { focus: true, replaySelected: false });
    });
  });

  replay?.addEventListener('click', () => renderer?.replay());
  canvas.addEventListener('compiler-settled', () => { root.dataset.motion = 'settled'; });
  const observer = new MutationObserver(syncMotion);
  observer.observe(canvas, { attributes: true, attributeFilter: ['data-motion'] });

  reducedMotion.addEventListener?.('change', () => initialize());

  window.__promiseCompiler = {
    currentScenario: currentKey,
    rendererMode: 'pending',
    select: (key) => select(key),
    replay: () => renderer?.replay(),
    get motion() { return root.dataset.motion || 'settled'; }
  };

  updateDOM('baseline');
  initialize();
})();

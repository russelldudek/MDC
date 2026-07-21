(() => {
  'use strict';

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('is-open', !open);
    });
    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        navToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      }
    });
  }

  const documentRoot = document.querySelector('.document[data-pdf]');
  const pdfAction = document.querySelector('.pdf-download');
  if (documentRoot && pdfAction) {
    const pdfPath = documentRoot.dataset.pdf;
    pdfAction.href = pdfPath;
    pdfAction.setAttribute('download', pdfPath.split('/').pop());
  }

  const stage = document.getElementById('frame-stage');
  const canvas = document.getElementById('load-canvas');
  if (!stage || !canvas) return;

  const tabs = [...document.querySelectorAll('.scenario-tabs [role="tab"]')];
  const reset = document.getElementById('reset-scenario');
  const replay = document.getElementById('replay-scenario');
  const rendererMode = document.getElementById('renderer-mode');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 700px)');
  let renderer = null;
  let currentKey = 'baseline';
  let rendererGeneration = 0;

  const scenarios = {
    baseline: {
      promise: 'Measured outcome accepted',
      states: {
        promise: ['Accepted', 'strong'], scope: ['Closed', 'strong'], capacity: ['Balanced', 'strong'],
        delivery: ['On plan', 'strong'], proof: ['Accepted', 'strong'], renewal: ['Earned', 'strong']
      },
      stress: [0.08, 0.06, 0.08, 0.05, 0.04, 0.03],
      foundation: 'Protected', founder: 'released', founderLabel: 'Released', founderLevel: 0,
      decision: 'Release founder attention', owner: 'COO / engagement lead', receipt: 'Outcome + margin + renewal record'
    },
    'new-logo': {
      promise: 'New client commitment signed',
      states: {
        promise: ['Signed', 'strong'], scope: ['Assumptions open', 'watch'], capacity: ['Coverage pending', 'watch'],
        delivery: ['Mobilizing', 'watch'], proof: ['Criteria drafted', 'watch'], renewal: ['Not yet earned', 'risk']
      },
      stress: [0.16, 0.55, 0.50, 0.42, 0.48, 0.82],
      foundation: 'Conditional', founder: 'watch', founderLabel: 'Signal only', founderLevel: 0.42,
      decision: 'Run pre-start load review', owner: 'COO + sales + delivery', receipt: 'Signed outcome + scope + staffing record'
    },
    scope: {
      promise: 'Client need changed midstream',
      states: {
        promise: ['Changed', 'watch'], scope: ['Re-opened', 'risk'], capacity: ['Rebalance', 'watch'],
        delivery: ['At risk', 'risk'], proof: ['Reconfirm', 'watch'], renewal: ['Recoverable', 'watch']
      },
      stress: [0.38, 1, 0.67, 0.88, 0.60, 0.56],
      foundation: 'Margin exposed', founder: 'required', founderLabel: 'Required', founderLevel: 1,
      decision: 'Pause, price, and reset authority', owner: 'COO / commercial owner', receipt: 'Change record + revised economics'
    },
    agent: {
      promise: 'Agent output no longer dependable',
      states: {
        promise: ['Stable', 'strong'], scope: ['Stable', 'strong'], capacity: ['Human backstop', 'watch'],
        delivery: ['Contained', 'watch'], proof: ['Eval failed', 'risk'], renewal: ['Trust at risk', 'risk']
      },
      stress: [0.10, 0.12, 0.56, 0.58, 1, 0.90],
      foundation: 'Cost rising', founder: 'watch', founderLabel: 'Signal only', founderLevel: 0.55,
      decision: 'Hold autonomy; restore evidence', owner: 'Agent owner + delivery lead', receipt: 'Eval trace + override + release decision'
    },
    forecast: {
      promise: 'Forecast and actuals diverged',
      states: {
        promise: ['Committed', 'strong'], scope: ['Mixed', 'watch'], capacity: ['Misaligned', 'risk'],
        delivery: ['Variance', 'watch'], proof: ['Late', 'watch'], renewal: ['Uncertain', 'risk']
      },
      stress: [0.20, 0.50, 0.94, 0.70, 0.64, 0.90],
      foundation: 'Cash uncertain', founder: 'required', founderLabel: 'Required', founderLevel: 1,
      decision: 'Reconcile pipeline to capacity and cash', owner: 'COO + finance + sales', receipt: 'Variance root cause + corrected forecast'
    }
  };

  const fields = {
    promise: document.getElementById('promise-label'),
    foundation: document.getElementById('foundation-state'),
    founder: document.getElementById('founder-state'),
    decision: document.getElementById('decision'),
    owner: document.getElementById('owner'),
    receipt: document.getElementById('receipt')
  };

  const stateFields = Object.fromEntries(
    ['promise', 'scope', 'capacity', 'delivery', 'proof', 'renewal'].map((member) => [member, document.getElementById(`${member}-state`)])
  );

  function semanticModeLabel() {
    if (mobileQuery.matches) return 'Semantic mobile path';
    if (motionQuery.matches) return 'Static reduced-motion path';
    return 'Canvas semantic fallback';
  }

  function updateRendererBadge(mode) {
    const labels = {
      webgpu: 'WebGPU · hardware accelerated',
      webgl2: 'WebGL2 · GPU fallback',
      'canvas2d-fallback': 'Canvas · resilient fallback',
      semantic: semanticModeLabel()
    };
    rendererMode.textContent = labels[mode] || labels.semantic;
    rendererMode.dataset.mode = mode;
  }

  function updateSemanticState(key) {
    const scenario = scenarios[key] || scenarios.baseline;
    stage.dataset.state = key;
    stage.dataset.founder = scenario.founder;
    fields.promise.textContent = scenario.promise;
    fields.foundation.textContent = scenario.foundation;
    fields.founder.textContent = scenario.founderLabel;
    fields.decision.textContent = scenario.decision;
    fields.owner.textContent = scenario.owner;
    fields.receipt.textContent = scenario.receipt;

    Object.entries(scenario.states).forEach(([member, [label, posture]]) => {
      stateFields[member].textContent = label;
      const phase = stage.parentElement.querySelector(`[data-member="${member}"]`);
      phase.classList.remove('is-risk', 'is-watch', 'is-strong');
      phase.classList.add(`is-${posture}`);
    });

    stage.setAttribute(
      'aria-label',
      `${scenario.promise}. Margin and cash: ${scenario.foundation}. Founder attention: ${scenario.founderLabel}. Decision: ${scenario.decision}. Owner: ${scenario.owner}. Required receipt: ${scenario.receipt}.`
    );
  }

  function applyScenario(key, { focus = false, animate = true } = {}) {
    currentKey = scenarios[key] ? key : 'baseline';
    const scenario = scenarios[currentKey];
    tabs.forEach((tab) => {
      const selected = tab.dataset.scenario === currentKey;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    updateSemanticState(currentKey);
    renderer?.setScenario(
      { stress: scenario.stress, founder: scenario.founderLevel },
      { immediate: !animate || motionQuery.matches }
    );
    window.__mdcHero.currentScenario = currentKey;
  }

  async function initializeRenderer() {
    const generation = ++rendererGeneration;
    renderer?.destroy();
    renderer = null;

    if (mobileQuery.matches || motionQuery.matches || !window.EngagementLoadRenderer) {
      stage.classList.add('is-semantic');
      canvas.dataset.renderer = 'semantic';
      canvas.dataset.motion = 'settled';
      updateRendererBadge('semantic');
      window.__mdcHero.rendererMode = 'semantic';
      return;
    }

    stage.classList.remove('is-semantic');
    rendererMode.textContent = 'Initializing GPU path';
    try {
      const nextRenderer = await window.EngagementLoadRenderer.create(canvas, { reducedMotion: false });
      if (generation !== rendererGeneration) {
        nextRenderer.destroy();
        return;
      }
      renderer = nextRenderer;
      updateRendererBadge(renderer.mode);
      window.__mdcHero.rendererMode = renderer.mode;
      const scenario = scenarios[currentKey];
      renderer.setScenario({ stress: scenario.stress, founder: scenario.founderLevel });
    } catch (error) {
      console.warn('Engagement renderer could not initialize:', error);
      stage.classList.add('is-semantic');
      canvas.dataset.renderer = 'semantic';
      canvas.dataset.motion = 'settled';
      updateRendererBadge('semantic');
      window.__mdcHero.rendererMode = 'semantic';
    }
  }

  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => applyScenario(tab.dataset.scenario));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      applyScenario(tabs[next].dataset.scenario, { focus: true });
    });
  });

  reset?.addEventListener('click', () => applyScenario('baseline', { focus: true }));
  replay?.addEventListener('click', () => {
    if (renderer) renderer.replay();
    else {
      stage.classList.remove('semantic-pulse');
      void stage.offsetWidth;
      stage.classList.add('semantic-pulse');
    }
  });

  window.__mdcHero = {
    currentScenario: currentKey,
    rendererMode: 'pending',
    select: (key) => applyScenario(key),
    replay: () => renderer?.replay(),
    get motion() { return canvas.dataset.motion || 'settled'; }
  };

  applyScenario('baseline', { animate: false });
  initializeRenderer();
})();

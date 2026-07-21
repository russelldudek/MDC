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
  if (!stage) return;

  const tabs = [...document.querySelectorAll('.scenario-tabs [role="tab"]')];
  const reset = document.getElementById('reset-scenario');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animationTimer = 0;

  const scenarios = {
    baseline: {
      promise: 'Measured outcome accepted',
      states: { scope: ['Closed','strong'], capacity: ['Balanced','strong'], delivery: ['On plan','strong'], proof: ['Accepted','strong'], renewal: ['Earned','strong'] },
      foundation: 'Protected', founder: 'released',
      decision: 'Release founder attention', owner: 'COO / engagement lead', receipt: 'Outcome + margin + renewal record'
    },
    'new-logo': {
      promise: 'New client commitment signed',
      states: { scope: ['Assumptions open','watch'], capacity: ['Coverage pending','watch'], delivery: ['Mobilizing','watch'], proof: ['Criteria drafted','watch'], renewal: ['Not yet earned','risk'] },
      foundation: 'Conditional', founder: 'watch',
      decision: 'Run pre-start load review', owner: 'COO + sales + delivery', receipt: 'Signed outcome + scope + staffing record'
    },
    scope: {
      promise: 'Client need changed midstream',
      states: { scope: ['Re-opened','risk'], capacity: ['Rebalance','watch'], delivery: ['At risk','risk'], proof: ['Reconfirm','watch'], renewal: ['Recoverable','watch'] },
      foundation: 'Margin exposed', founder: 'required',
      decision: 'Pause, price, and reset authority', owner: 'COO / commercial owner', receipt: 'Change record + revised economics'
    },
    agent: {
      promise: 'Agent output no longer dependable',
      states: { scope: ['Stable','strong'], capacity: ['Human backstop','watch'], delivery: ['Contained','watch'], proof: ['Eval failed','risk'], renewal: ['Trust at risk','risk'] },
      foundation: 'Cost rising', founder: 'watch',
      decision: 'Hold autonomy; restore evidence', owner: 'Agent owner + delivery lead', receipt: 'Eval trace + override + release decision'
    },
    forecast: {
      promise: 'Forecast and actuals diverged',
      states: { scope: ['Mixed','watch'], capacity: ['Misaligned','risk'], delivery: ['Variance','watch'], proof: ['Late','watch'], renewal: ['Uncertain','risk'] },
      foundation: 'Cash uncertain', founder: 'required',
      decision: 'Reconcile pipeline to capacity and cash', owner: 'COO + finance + sales', receipt: 'Variance root cause + corrected forecast'
    }
  };

  const fields = {
    promise: document.getElementById('promise-label'),
    foundation: document.getElementById('foundation-state'),
    decision: document.getElementById('decision'),
    owner: document.getElementById('owner'),
    receipt: document.getElementById('receipt')
  };

  const stateFields = {
    scope: document.getElementById('scope-state'),
    capacity: document.getElementById('capacity-state'),
    delivery: document.getElementById('delivery-state'),
    proof: document.getElementById('proof-state'),
    renewal: document.getElementById('renewal-state')
  };

  function animateLoad() {
    window.clearTimeout(animationTimer);
    stage.classList.remove('is-animating');
    void stage.offsetWidth;
    if (!motionQuery.matches) {
      stage.classList.add('is-animating');
      animationTimer = window.setTimeout(() => stage.classList.remove('is-animating'), 1120);
    }
  }

  function selectScenario(key, { focus = false } = {}) {
    const scenario = scenarios[key] || scenarios.baseline;
    tabs.forEach((tab) => {
      const selected = tab.dataset.scenario === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });

    stage.dataset.state = key;
    stage.dataset.founder = scenario.founder;
    fields.promise.textContent = scenario.promise;
    fields.foundation.textContent = scenario.foundation;
    fields.decision.textContent = scenario.decision;
    fields.owner.textContent = scenario.owner;
    fields.receipt.textContent = scenario.receipt;

    Object.entries(scenario.states).forEach(([member, [label, posture]]) => {
      stateFields[member].textContent = label;
      const support = stage.querySelector(`[data-member="${member}"]`);
      support.classList.remove('is-risk', 'is-watch', 'is-strong');
      support.classList.add(`is-${posture}`);
    });

    stage.setAttribute('aria-label', `${scenario.promise}. Decision: ${scenario.decision}. Owner: ${scenario.owner}. Required receipt: ${scenario.receipt}.`);
    animateLoad();
  }

  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => selectScenario(tab.dataset.scenario));
    tab.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight','ArrowLeft','Home','End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      selectScenario(tabs[next].dataset.scenario, { focus: true });
    });
  });
  reset?.addEventListener('click', () => selectScenario('baseline', { focus: true }));
  selectScenario('baseline');
})();

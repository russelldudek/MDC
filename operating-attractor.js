(() => {
  'use strict';

  const root = document.getElementById('operating-attractor');
  const canvas = document.getElementById('attractor-canvas');
  if (!root || !canvas) return;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = {
    teal: [101, 214, 202],
    copper: [226, 177, 141],
    white: [239, 248, 247],
    moss: [170, 179, 157],
    red: [205, 117, 106],
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let startedAt = 0;
  let raf = 0;
  let visible = true;
  let settled = false;

  const cycleTiming = { stabilize: 8200, hold: 3400, release: 3200 };
  cycleTiming.duration = cycleTiming.stabilize + cycleTiming.hold + cycleTiming.release;

  const fieldStops = [0.24, 0.43, 0.63, 0.82];
  const laneFractions = [0.32, 0.41, 0.5, 0.59, 0.68];

  class Particle {
    constructor(index, finalState = false) {
      this.index = index;
      this.lane = index % laneFractions.length;
      const seedAcrossField = index % 4 !== 0;
      this.x = finalState
        ? width * (0.72 + Math.random() * 0.28)
        : seedAcrossField
          ? width * (Math.random() * 0.78 - 0.08)
          : -Math.random() * width * 0.32;
      this.y = finalState
        ? height * laneFractions[this.lane] + (Math.random() - 0.5) * 5
        : height * (0.18 + Math.random() * 0.64);
      this.speed = width * (0.00078 + Math.random() * 0.00052);
      this.radius = 0.75 + Math.random() * 1.75;
      this.alpha = 0.3 + Math.random() * 0.58;
      this.phase = Math.random() * Math.PI * 2;
      this.tint = index % 9 === 0 ? palette.copper : index % 13 === 0 ? palette.moss : palette.teal;
      this.trail = [];
    }

    update(time, stabilization) {
      const normalized = this.x / Math.max(1, width);
      const finalY = height * laneFractions[this.lane];
      const volatility = Math.max(0, 1 - Math.max(0, normalized) * 1.55) * (1 - stabilization * 0.78);
      const wave = Math.sin(time * 0.0018 + this.phase) * height * 0.014 * volatility;
      const pull = normalized < 0.2 ? 0.008 : normalized < 0.56 ? 0.022 : 0.055;

      this.y += (finalY - this.y) * pull + wave * 0.024;
      this.x += this.speed * (0.86 + stabilization * 0.42);

      this.trail.push([this.x, this.y]);
      if (this.trail.length > 12) this.trail.shift();

      if (this.x > width + 18) {
        this.x = -18 - Math.random() * width * 0.16;
        this.y = height * (0.2 + Math.random() * 0.6);
        this.trail.length = 0;
      }
    }

    draw(stabilization) {
      if (this.trail.length > 2) {
        context.beginPath();
        for (let i = 0; i < this.trail.length; i += 1) {
          const point = this.trail[i];
          if (i === 0) context.moveTo(point[0], point[1]);
          else context.lineTo(point[0], point[1]);
        }
        const [r, g, b] = this.tint;
        context.strokeStyle = `rgba(${r},${g},${b},${0.05 + this.alpha * 0.15})`;
        context.lineWidth = Math.max(0.45, this.radius * 0.7);
        context.stroke();
      }

      const [r, g, b] = this.tint;
      const glow = this.radius * (3.2 + stabilization * 1.3);
      const gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, glow);
      gradient.addColorStop(0, `rgba(${r},${g},${b},${Math.min(0.92, this.alpha + 0.2)})`);
      gradient.addColorStop(0.3, `rgba(${r},${g},${b},${this.alpha * 0.52})`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(this.x, this.y, glow, 0, Math.PI * 2);
      context.fill();
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = width < 560 ? 94 : width < 900 ? 136 : 178;
    particles = Array.from({ length: count }, (_, index) => new Particle(index, reducedMotion.matches));
    settled = reducedMotion.matches;
    root.dataset.settled = String(settled);
    root.dataset.cycle = reducedMotion.matches ? 'holding' : 'stabilizing';
    draw(performance.now(), reducedMotion.matches ? 1 : 0);
  }

  function drawField(stabilization, elapsed) {
    context.save();

    fieldStops.forEach((fraction, index) => {
      const x = width * fraction;
      const strength = 0.28 + stabilization * 0.32;
      const radius = Math.min(width, height) * (0.075 + index * 0.006);

      for (let ring = 0; ring < 3; ring += 1) {
        context.beginPath();
        context.ellipse(x, height * 0.5, radius * (1 + ring * 0.42), height * (0.31 + ring * 0.065), 0, 0, Math.PI * 2);
        context.strokeStyle = `rgba(119,213,202,${0.035 + strength * 0.045 - ring * 0.008})`;
        context.lineWidth = 1;
        context.stroke();
      }

      context.beginPath();
      context.moveTo(x, height * 0.19);
      context.lineTo(x, height * 0.81);
      context.strokeStyle = `rgba(255,255,255,${0.045 + strength * 0.035})`;
      context.stroke();
    });

    laneFractions.forEach((lane, laneIndex) => {
      const y = height * lane;
      context.beginPath();
      context.moveTo(width * 0.58, y);
      context.bezierCurveTo(width * 0.68, y + Math.sin(laneIndex) * 5, width * 0.78, y, width, y);
      context.strokeStyle = `rgba(170,224,216,${0.055 + stabilization * 0.07})`;
      context.lineWidth = 1;
      context.stroke();
    });

    const founderProgress = Math.min(1, Math.max(0, (elapsed - 1500) / 4200));
    const founderFade = elapsed < 6200 ? 1 - founderProgress * 0.3 : Math.max(0, 1 - (elapsed - 6200) / 2200);
    if (founderFade > 0.01 && !reducedMotion.matches) {
      const startX = width * 0.92;
      const startY = height * 0.19;
      const endX = width * 0.61;
      const endY = height * 0.5;
      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(width * 0.86, height * 0.16, width * 0.74, height * 0.31, endX, endY);
      context.strokeStyle = `rgba(226,177,141,${0.34 * founderFade})`;
      context.lineWidth = 1.25;
      context.setLineDash([5, 8]);
      context.stroke();
      context.setLineDash([]);

      const pulse = 3 + Math.sin(elapsed * 0.006) * 1.2;
      context.fillStyle = `rgba(226,177,141,${0.42 * founderFade})`;
      context.beginPath();
      context.arc(endX, endY, pulse, 0, Math.PI * 2);
      context.fill();
    }

    const syncX = width * 0.57;
    const humanY = height * 0.445;
    const agentY = height * 0.555;
    context.strokeStyle = `rgba(239,248,247,${0.16 + stabilization * 0.18})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(syncX, humanY);
    context.lineTo(syncX, agentY);
    context.stroke();

    const syncNodes = [
      [humanY, palette.white, 5.2],
      [agentY, palette.teal, 4.2],
    ];
    syncNodes.forEach(([y, tint, radius]) => {
      const [r, g, b] = tint;
      context.fillStyle = `rgba(${r},${g},${b},${0.62 + stabilization * 0.26})`;
      context.beginPath();
      context.arc(syncX, y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(${r},${g},${b},.22)`;
      context.lineWidth = 8;
      context.stroke();
    });

    context.restore();
  }

  function smoothstep(value) {
    const t = Math.min(1, Math.max(0, value));
    return t * t * (3 - 2 * t);
  }

  function getCycleState(elapsed) {
    const cycleElapsed = elapsed % cycleTiming.duration;
    if (cycleElapsed < cycleTiming.stabilize) {
      return { elapsed: cycleElapsed, phase: 'stabilizing', stabilization: smoothstep(cycleElapsed / cycleTiming.stabilize) };
    }
    if (cycleElapsed < cycleTiming.stabilize + cycleTiming.hold) {
      return { elapsed: cycleElapsed, phase: 'holding', stabilization: 1 };
    }
    const releaseElapsed = cycleElapsed - cycleTiming.stabilize - cycleTiming.hold;
    return { elapsed: cycleElapsed, phase: 'releasing', stabilization: 1 - smoothstep(releaseElapsed / cycleTiming.release) };
  }

  function draw(time, forcedStabilization = null) {
    context.clearRect(0, 0, width, height);
    const elapsed = startedAt ? time - startedAt : 0;
    const cycle = forcedStabilization === null ? getCycleState(elapsed) : { elapsed: cycleTiming.stabilize, phase: 'holding', stabilization: forcedStabilization };
    const stabilization = cycle.stabilization;
    root.dataset.cycle = cycle.phase;
    settled = cycle.phase === 'holding';
    root.dataset.settled = String(settled);

    const haze = context.createLinearGradient(0, 0, width, 0);
    haze.addColorStop(0, 'rgba(205,117,106,.055)');
    haze.addColorStop(.42, 'rgba(101,214,202,.035)');
    haze.addColorStop(1, 'rgba(170,224,216,.07)');
    context.fillStyle = haze;
    context.fillRect(0, 0, width, height);

    drawField(stabilization, cycle.elapsed);

    particles.forEach((particle) => {
      if (forcedStabilization === null) particle.update(time, stabilization);
      particle.draw(stabilization);
    });

  }

  function frame(time) {
    if (!startedAt) startedAt = time;
    draw(time);
    if (visible && !reducedMotion.matches) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
    }
  }

  function start() {
    cancelAnimationFrame(raf);
    startedAt = 0;
    settled = reducedMotion.matches;
    root.dataset.settled = String(settled);
    root.dataset.cycle = reducedMotion.matches ? 'holding' : 'stabilizing';
    if (reducedMotion.matches) draw(performance.now(), 1);
    else raf = requestAnimationFrame(frame);
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible && !reducedMotion.matches && !raf) {
      raf = requestAnimationFrame(frame);
    } else if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }, { threshold: 0.08 });
  visibilityObserver.observe(root);

  reducedMotion.addEventListener('change', () => {
    resize();
    start();
  });

  resize();
  start();

  const scenarios = {
    scope: {
      intervention: 'Rebound the promise before work expands.',
      owner: 'COO with sales and engagement lead',
      evidence: 'Signed change record with price, timing, staffing, and acceptance impact.',
      effect: 'Protects margin and preserves trust by making the tradeoff explicit.',
    },
    capacity: {
      intervention: 'Re-sequence delivery around verified capacity.',
      owner: 'Delivery lead with COO',
      evidence: 'Updated staffing mix, utilization view, critical-path plan, and client decision.',
      effect: 'Prevents silent schedule debt and exposes whether the work should wait, narrow, or reprice.',
    },
    agent: {
      intervention: 'Remove the agent from dependable capacity until it passes evaluation.',
      owner: 'Agent owner with human decision authority',
      evidence: 'Failure trace, corrected evaluation set, escalation path, and re-entry threshold.',
      effect: 'Contains quality risk without abandoning leverage or hiding accountability behind automation.',
    },
    outcome: {
      intervention: 'Return to the client decision owner and redefine acceptance evidence.',
      owner: 'Engagement lead with COO',
      evidence: 'Decision-owner receipt tied to the promised business outcome, not activity volume.',
      effect: 'Restores renewal confidence by closing the gap between delivered work and accepted value.',
    },
    cash: {
      intervention: 'Reconcile delivery reality to revenue, margin, and collection timing.',
      owner: 'COO with finance',
      evidence: 'One forecast connecting signed work, milestones, staffing, margin, invoices, and cash dates.',
      effect: 'Prevents a healthy-looking pipeline from masking working-capital and staffing exposure.',
    },
  };

  const buttons = Array.from(document.querySelectorAll('[data-stress-scenario]'));
  const readout = {
    intervention: document.getElementById('stress-intervention'),
    owner: document.getElementById('stress-owner'),
    evidence: document.getElementById('stress-evidence'),
    effect: document.getElementById('stress-effect'),
  };

  function selectScenario(button, shouldFocus = false) {
    const key = button.dataset.stressScenario;
    const data = scenarios[key];
    if (!data) return;

    buttons.forEach((candidate) => {
      const selected = candidate === button;
      candidate.setAttribute('aria-selected', String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });

    Object.entries(readout).forEach(([field, node]) => {
      if (node) node.textContent = data[field];
    });

    const panel = document.getElementById('stress-panel');
    if (panel) panel.setAttribute('aria-labelledby', button.id);

    if (shouldFocus) button.focus();
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectScenario(button));
    button.addEventListener('keydown', (event) => {
      let nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = buttons.length - 1;
      else return;
      event.preventDefault();
      selectScenario(buttons[nextIndex], true);
    });
  });
})();

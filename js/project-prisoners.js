(function() {
  'use strict';

  var BLUE = '90,148,196';   // cooperate
  var ROSE = '200,104,136';  // defect
  var NEUTRAL = '170,180,195';

  var NUM_AGENTS = 12; // must be even
  var DEFECT_PROB = 0.7; // bias toward defection

  // Payoff matrix (T > R > P > S)
  var R_PAY = 3, S_PAY = 0, T_PAY = 5, P_PAY = 1;
  var MAX_PAY = T_PAY;

  // Phase durations (seconds)
  var DUR_REARRANGE = 1.6;
  var DUR_REVEAL = 0.45;   // color flip in
  var DUR_PAYOFF = 0.9;    // grow + shrink
  var DUR_HOLD = 0.4;      // hold after shrink

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-prisoners']) return;

    var canvas = reg['project-prisoners'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var rafId = null;
    var card = canvas.closest('.project-card');
    var hovered = false;

    var agents = [];
    for (var i = 0; i < NUM_AGENTS; i++) {
      agents.push({
        idx: i,
        // home = wandering position in unit square; reassigned at start of each rearrange
        homeX: Math.random(),
        homeY: Math.random(),
        // start = current position when a phase begins
        startX: Math.random(),
        startY: Math.random(),
        // target = pair position in unit square (set during rearrange)
        targetX: 0.5,
        targetY: 0.5,
        action: null,         // 'C' or 'D'
        partnerAction: null,
        payoff: 0,
        partnerIdx: -1,
        wPhase: Math.random() * Math.PI * 2,
      });
    }

    function shuffleIndices(n) {
      var arr = [];
      for (var i = 0; i < n; i++) arr.push(i);
      for (var j = n - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp;
      }
      return arr;
    }

    function startRearrange() {
      // Snapshot current displayed positions as start
      for (var i = 0; i < agents.length; i++) {
        var a = agents[i];
        a.startX = a.curX != null ? a.curX : a.homeX;
        a.startY = a.curY != null ? a.curY : a.homeY;
        a.action = null;
        a.partnerAction = null;
        a.payoff = 0;
      }
      // Pair up agents
      var order = shuffleIndices(NUM_AGENTS);
      var numPairs = NUM_AGENTS / 2;
      // Lay out pairs in a roughly grid pattern
      var cols = Math.ceil(Math.sqrt(numPairs));
      var rows = Math.ceil(numPairs / cols);
      for (var p = 0; p < numPairs; p++) {
        var col = p % cols;
        var row = Math.floor(p / cols);
        // Pair center
        var cx = (col + 0.5) / cols;
        var cy = (row + 0.5) / rows;
        // Slight per-pair jitter so it doesn't look like a perfect lattice
        cx += (Math.random() - 0.5) * 0.04;
        cy += (Math.random() - 0.5) * 0.04;
        var sep = 0.10 + Math.random() * 0.02;
        var ang = Math.random() * Math.PI * 2;
        var dx = Math.cos(ang) * sep;
        var dy = Math.sin(ang) * sep;

        var i1 = order[2 * p];
        var i2 = order[2 * p + 1];
        agents[i1].targetX = cx + dx;
        agents[i1].targetY = cy + dy;
        agents[i2].targetX = cx - dx;
        agents[i2].targetY = cy - dy;
        agents[i1].partnerIdx = i2;
        agents[i2].partnerIdx = i1;
      }
    }

    function decideActions() {
      // Each agent independently chooses C or D, biased toward D
      for (var i = 0; i < agents.length; i++) {
        agents[i].action = Math.random() < DEFECT_PROB ? 'D' : 'C';
      }
      // Compute payoffs from partner's action
      for (var j = 0; j < agents.length; j++) {
        var a = agents[j];
        var b = agents[a.partnerIdx];
        a.partnerAction = b.action;
        if (a.action === 'C' && b.action === 'C') a.payoff = R_PAY;
        else if (a.action === 'D' && b.action === 'D') a.payoff = P_PAY;
        else if (a.action === 'D' && b.action === 'C') a.payoff = T_PAY;
        else a.payoff = S_PAY;
      }
    }

    // Phase state machine
    // 'rearrange' -> 'reveal' -> 'payoff' -> 'hold' -> 'rearrange' ...
    var phase = 'rearrange';
    var phaseElapsed = 0;
    startRearrange();

    var lastTime = performance.now();
    var elapsed = 0;

    function advancePhase(dt) {
      phaseElapsed += dt;
      if (phase === 'rearrange' && phaseElapsed >= DUR_REARRANGE) {
        phase = 'reveal';
        phaseElapsed = 0;
        decideActions();
      } else if (phase === 'reveal' && phaseElapsed >= DUR_REVEAL) {
        phase = 'payoff';
        phaseElapsed = 0;
      } else if (phase === 'payoff' && phaseElapsed >= DUR_PAYOFF) {
        phase = 'hold';
        phaseElapsed = 0;
      } else if (phase === 'hold' && phaseElapsed >= DUR_HOLD) {
        phase = 'rearrange';
        phaseElapsed = 0;
        // Set new homes near current targets so transition is smooth
        for (var i = 0; i < agents.length; i++) {
          agents[i].homeX = agents[i].targetX;
          agents[i].homeY = agents[i].targetY;
        }
        startRearrange();
      }
    }

    function getAgentDisplay(a, w, h, pad) {
      var px, py, sizeMul, rgb, glowAlpha;
      var wAmp = Math.min(w, h) * 0.012;

      if (phase === 'rearrange') {
        var t = smoothstep(Math.min(1, phaseElapsed / DUR_REARRANGE));
        var ux = a.startX + (a.targetX - a.startX) * t;
        var uy = a.startY + (a.targetY - a.startY) * t;
        px = pad + ux * (w - 2 * pad);
        py = pad + uy * (h - 2 * pad);
        sizeMul = 1.0;
        rgb = NEUTRAL;
        glowAlpha = 0.18;
      } else {
        var ux2 = a.targetX;
        var uy2 = a.targetY;
        px = pad + ux2 * (w - 2 * pad);
        py = pad + uy2 * (h - 2 * pad);

        // Color: fade from neutral to action color during reveal; full color after
        var colorT;
        if (phase === 'reveal') colorT = smoothstep(Math.min(1, phaseElapsed / DUR_REVEAL));
        else colorT = 1;

        var actionRgb = a.action === 'C' ? BLUE : ROSE;
        rgb = lerpRgb(NEUTRAL, actionRgb, colorT);

        // Size pulse during payoff phase: grow then shrink, peak proportional to payoff
        sizeMul = 1.0;
        if (phase === 'payoff') {
          var pT = phaseElapsed / DUR_PAYOFF;
          // bell curve: sin(pi*t)
          var bell = Math.sin(Math.min(1, Math.max(0, pT)) * Math.PI);
          var maxGrowth = 0.2 + (a.payoff / MAX_PAY) * 1.4; // 0.2 .. 1.6 extra
          sizeMul = 1.0 + bell * maxGrowth;
        }
        glowAlpha = 0.28 + (sizeMul - 1.0) * 0.25;
      }

      // Tiny wander even when "still" so it feels alive
      var wob = Math.sin(elapsed * 0.9 + a.wPhase) * wAmp * 0.6;
      var wob2 = Math.cos(elapsed * 0.8 + a.wPhase * 1.3) * wAmp * 0.6;
      px += wob;
      py += wob2;

      a.curX = (px - pad) / (w - 2 * pad);
      a.curY = (py - pad) / (h - 2 * pad);

      return { px: px, py: py, sizeMul: sizeMul, rgb: rgb, glowAlpha: glowAlpha };
    }

    function lerpRgb(a, b, t) {
      var as = a.split(',').map(Number);
      var bs = b.split(',').map(Number);
      var r = Math.round(as[0] + (bs[0] - as[0]) * t);
      var g = Math.round(as[1] + (bs[1] - as[1]) * t);
      var bl = Math.round(as[2] + (bs[2] - as[2]) * t);
      return r + ',' + g + ',' + bl;
    }

    function draw(now) {
      var dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;
      elapsed += dt;
      advancePhase(dt);

      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var pad = Math.min(w, h) * 0.10;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Compute display state for all agents first
      var displays = [];
      for (var i = 0; i < agents.length; i++) {
        displays.push(getAgentDisplay(agents[i], w, h, pad));
      }

      // Draw connection lines for paired agents (only when not rearranging)
      if (phase !== 'rearrange') {
        var seen = {};
        for (var k = 0; k < agents.length; k++) {
          var a = agents[k];
          if (seen[a.partnerIdx]) continue;
          seen[k] = true;
          var d1 = displays[k];
          var d2 = displays[a.partnerIdx];
          // Line color: average of the two partners' rgb
          var rgb1 = d1.rgb.split(',').map(Number);
          var rgb2 = d2.rgb.split(',').map(Number);
          var lr = Math.round((rgb1[0] + rgb2[0]) / 2);
          var lg = Math.round((rgb1[1] + rgb2[1]) / 2);
          var lb = Math.round((rgb1[2] + rgb2[2]) / 2);
          var lineAlpha = phase === 'reveal'
            ? 0.15 + 0.35 * smoothstep(Math.min(1, phaseElapsed / DUR_REVEAL))
            : phase === 'payoff' ? 0.5 : 0.4;
          ctx.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + lineAlpha + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(d1.px, d1.py);
          ctx.lineTo(d2.px, d2.py);
          ctx.stroke();
        }
      }

      // Draw agents
      var baseR = Math.min(w, h) * 0.022;
      for (var j = 0; j < agents.length; j++) {
        var disp = displays[j];
        var dotR = baseR * disp.sizeMul;
        var glowR = dotR * 2.6;

        var grad = ctx.createRadialGradient(disp.px, disp.py, 0, disp.px, disp.py, glowR);
        grad.addColorStop(0, 'rgba(' + disp.rgb + ',' + disp.glowAlpha + ')');
        grad.addColorStop(1, 'rgba(' + disp.rgb + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(disp.px, disp.py, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(' + disp.rgb + ',0.92)';
        ctx.beginPath();
        ctx.arc(disp.px, disp.py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Pause when unhovered: stop the loop but keep all state so we resume in place.
      if (!hovered) {
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var pad = Math.min(w, h) * 0.10;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      var baseR = Math.min(w, h) * 0.022;
      for (var i = 0; i < agents.length; i++) {
        var a = agents[i];
        var ux = a.curX != null ? a.curX : a.homeX;
        var uy = a.curY != null ? a.curY : a.homeY;
        var px = pad + ux * (w - 2 * pad);
        var py = pad + uy * (h - 2 * pad);
        var rgb = NEUTRAL;
        var glowR = baseR * 2.6;
        var grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grad.addColorStop(0, 'rgba(' + rgb + ',0.18)');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        ctx.beginPath();
        ctx.arc(px, py, baseR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    canvas.addEventListener('canvas-resize', function() {
      if (rafId == null) drawStatic();
    });

    if (card) {
      card.addEventListener('mouseenter', function() {
        if (!hovered) {
          hovered = true;
          if (rafId == null) {
            lastTime = performance.now();
            rafId = requestAnimationFrame(draw);
          }
        }
      });
      card.addEventListener('mouseleave', function() {
        hovered = false;
      });
    }

    drawStatic();
    reg['project-prisoners'].active = true;
    canvas.closest('.canvas-placeholder').classList.add('canvas-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 150);
    });
  } else {
    setTimeout(init, 150);
  }
})();

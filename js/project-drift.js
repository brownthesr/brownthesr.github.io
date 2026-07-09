(function() {
  'use strict';

  var BLUE = '90,148,196';
  var ROSE = '200,104,136';
  var AXIS = '160,170,185';

  var NUM_PARTICLES = 36;
  var TRAIL_SEGMENTS = 14;
  var PERSISTENT_TRAIL_SEGMENTS = 2000; // effectively unbounded — keep the full cobweb ladder
  var NUM_PERSISTENT = 2;
  var STEP_DURATION = 0.55; // seconds per cobweb half-step (vertical or horizontal)
  var X_MIN = -1.35, X_MAX = 1.35;
  var KDE_FRAC = 0.22; // fraction of canvas height reserved for KDE strip at bottom
  var KDE_BANDWIDTH = 0.08;

  // Map: f(x) = x + 0.9 (x - x^3). Fixed points at 0 (unstable), +/-1 (stable).
  // Strong bulge while preserving the same fixed points (|f'(+/-1)| = 0.8 < 1).
  function f(x) { return x + 0.97 * (x - x * x * x); }

  function gaussian() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-drift']) return;

    var canvas = reg['project-drift'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var card = canvas.closest('.project-card');
    var hovered = false;
    var rafId = null;

    function plotRegion(w, h, pad) {
      var kdeH = h * KDE_FRAC;
      return {
        left: pad,
        right: w - pad,
        top: pad,
        bottom: h - kdeH - pad * 0.5,
        kdeTop: h - kdeH,
        kdeBottom: h - pad * 0.4,
      };
    }

    function toPx(x, y, w, h, pad) {
      var r = plotRegion(w, h, pad);
      var px = r.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (r.right - r.left);
      var py = r.bottom - ((y - X_MIN) / (X_MAX - X_MIN)) * (r.bottom - r.top);
      return [px, py];
    }

    function xToKdePx(x, w, h, pad) {
      var r = plotRegion(w, h, pad);
      return r.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (r.right - r.left);
    }

    var particles = [];
    function buildParticles() {
      particles.length = 0;
      var sigma = 0.06; // tight Gaussian near 0 (the unstable fixed point)
      for (var i = 0; i < NUM_PARTICLES; i++) {
        var x0 = gaussian() * sigma;
        // Bias slightly so none stay perfectly on the unstable fixed point
        if (Math.abs(x0) < 0.005) x0 += (Math.random() < 0.5 ? -1 : 1) * 0.005;
        var d0 = Math.random() * 0.35;
        particles.push({
          x0: x0,
          x: x0,
          xPrev: x0,
          xNext: f(x0),
          phase: 0,
          progress: 0,
          delay0: d0,
          delay: d0,
          trail: [],
          persistent: false,
          wPhaseX: Math.random() * Math.PI * 2,
          wPhaseY: Math.random() * Math.PI * 2,
          wSpeedX: 0.8 + Math.random() * 1.0,
          wSpeedY: 0.8 + Math.random() * 1.0,
        });
      }
      // Pick a couple of "highlighted" particles — one heading left, one right —
      // that retain a long cobweb trail and minimal wiggle for clean ladder structure.
      var leftIdx = -1, rightIdx = -1;
      for (var k = 0; k < particles.length; k++) {
        if (leftIdx < 0 && particles[k].x < -0.02) leftIdx = k;
        if (rightIdx < 0 && particles[k].x > 0.02) rightIdx = k;
        if (leftIdx >= 0 && rightIdx >= 0) break;
      }
      if (leftIdx >= 0) {
        particles[leftIdx].persistent = true;
        particles[leftIdx].delay = 0;
      }
      if (rightIdx >= 0 && NUM_PERSISTENT >= 2) {
        particles[rightIdx].persistent = true;
        particles[rightIdx].delay = 0;
      }
    }
    buildParticles();

    function resetIterationState() {
      // Snap iteration to home (each particle's original sampled x0).
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x = p.x0;
        p.xPrev = p.x0;
        p.xNext = f(p.x0);
        p.phase = 0;
        p.progress = 0;
        p.trail.length = 0;
        p._lastHx = null;
        p._lastHy = null;
        p.delay = p.delay0;
      }
    }

    // Phases: 'idle' (frozen wherever last left), 'returning' (drifting back to home on hover),
    // 'iterating' (active cobweb animation).
    var phase = 'idle';
    var returnDuration = 0.9; // seconds for the drift-home animation
    var returnElapsed = 0;
    // Captured pixel positions at the moment hover starts, so the drift-home is smooth from current state.
    function captureSnapshot() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        // Snapshot current displayed (data-space) position so we can lerp from it to home.
        var ax2, ay2, bx2, by2;
        if (p.phase === 0) { ax2 = p.x; ay2 = p.x; bx2 = p.x; by2 = p.xNext; }
        else { ax2 = p.x; ay2 = p.xNext; bx2 = p.xNext; by2 = p.xNext; }
        var e = smoothstep(p.progress);
        p.snapX = ax2 + (bx2 - ax2) * e;
        p.snapY = ay2 + (by2 - ay2) * e;
      }
    }

    if (card) {
      card.addEventListener('mouseenter', function() {
        if (phase === 'idle') {
          captureSnapshot();
          // If already at home (e.g. first hover), skip the return phase entirely.
          var atHome = true;
          for (var i = 0; i < particles.length; i++) {
            if (Math.abs(particles[i].snapX - particles[i].x0) > 1e-4 ||
                Math.abs(particles[i].snapY - particles[i].x0) > 1e-4) {
              atHome = false; break;
            }
          }
          if (atHome) {
            resetIterationState();
            phase = 'iterating';
          } else {
            returnElapsed = 0;
            phase = 'returning';
          }
        }
        hovered = true;
        if (rafId == null) {
          lastTime = performance.now();
          rafId = requestAnimationFrame(draw);
        }
      });
      card.addEventListener('mouseleave', function() {
        hovered = false;
        // Freeze in place: stop iterating, keep current trails/positions
        if (phase === 'iterating' || phase === 'returning') phase = 'idle';
      });
    }
    canvas.addEventListener('canvas-resize', function() {
      if (rafId == null) drawStatic();
    });

    // returnT: 0 = fully active iteration, 1 = fully home (idle).
    // When hovered, returnT animates toward 0; when not hovered, toward 1.
    var returnT = 1;
    var lastTime = performance.now();
    var elapsed = 0;

    function drawAxes(w, h, pad, alpha) {
      // Map curve y=f(x) and diagonal y=x, drawn faintly
      ctx.strokeStyle = 'rgba(' + AXIS + ',' + (0.18 * alpha) + ')';
      ctx.lineWidth = 1;

      // Diagonal y = x
      var p1 = toPx(X_MIN, X_MIN, w, h, pad);
      var p2 = toPx(X_MAX, X_MAX, w, h, pad);
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();

      // Curve y = f(x)
      ctx.strokeStyle = 'rgba(' + AXIS + ',' + (0.32 * alpha) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      var N = 80;
      for (var i = 0; i <= N; i++) {
        var x = X_MIN + (X_MAX - X_MIN) * (i / N);
        var pt = toPx(x, f(x), w, h, pad);
        if (i === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();

      // Mark fixed points at +/-1 (stable attractors)
      ctx.fillStyle = 'rgba(' + ROSE + ',' + (0.45 * alpha) + ')';
      var marks = [-1, 1];
      for (var k = 0; k < marks.length; k++) {
        var mp = toPx(marks[k], marks[k], w, h, pad);
        ctx.beginPath();
        ctx.arc(mp[0], mp[1], 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render a KDE strip at the bottom showing the current x-distribution of particles.
    function drawKDE(w, h, pad, alpha) {
      var r = plotRegion(w, h, pad);
      var bandPx = (r.right - r.left) * (KDE_BANDWIDTH / (X_MAX - X_MIN));
      var invH = 1 / KDE_BANDWIDTH;
      var norm = 1 / (Math.sqrt(2 * Math.PI) * KDE_BANDWIDTH);

      var SAMPLES = 96;
      var ys = new Array(SAMPLES);
      var maxY = 0;
      for (var i = 0; i < SAMPLES; i++) {
        var x = X_MIN + (X_MAX - X_MIN) * (i / (SAMPLES - 1));
        var sum = 0;
        for (var j = 0; j < particles.length; j++) {
          var dx = (x - particles[j].x) * invH;
          sum += Math.exp(-0.5 * dx * dx);
        }
        var y = (sum / particles.length) * norm;
        ys[i] = y;
        if (y > maxY) maxY = y;
      }
      if (maxY <= 0) return;

      var stripH = (r.kdeBottom - r.kdeTop);
      var baseY = r.kdeBottom;
      var topY = r.kdeTop + stripH * 0.05;
      var maxStripH = baseY - topY;

      // Baseline
      ctx.strokeStyle = 'rgba(' + AXIS + ',' + (0.22 * alpha) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.left, baseY);
      ctx.lineTo(r.right, baseY);
      ctx.stroke();

      // Filled curve
      ctx.beginPath();
      ctx.moveTo(r.left, baseY);
      for (var ii = 0; ii < SAMPLES; ii++) {
        var sx = r.left + (r.right - r.left) * (ii / (SAMPLES - 1));
        var sy = baseY - (ys[ii] / maxY) * maxStripH;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(r.right, baseY);
      ctx.closePath();

      var grad = ctx.createLinearGradient(0, topY, 0, baseY);
      grad.addColorStop(0, 'rgba(' + ROSE + ',' + (0.35 * alpha) + ')');
      grad.addColorStop(1, 'rgba(' + BLUE + ',' + (0.05 * alpha) + ')');
      ctx.fillStyle = grad;
      ctx.fill();

      // Outline
      ctx.beginPath();
      for (var k2 = 0; k2 < SAMPLES; k2++) {
        var ox = r.left + (r.right - r.left) * (k2 / (SAMPLES - 1));
        var oy = baseY - (ys[k2] / maxY) * maxStripH;
        if (k2 === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.strokeStyle = 'rgba(' + ROSE + ',' + (0.7 * alpha) + ')';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Tick marks at +/-1 fixed points and 0
      ctx.fillStyle = 'rgba(' + AXIS + ',' + (0.5 * alpha) + ')';
      var ticks = [-1, 0, 1];
      for (var t2 = 0; t2 < ticks.length; t2++) {
        var tx = xToKdePx(ticks[t2], w, h, pad);
        ctx.fillRect(tx - 0.5, baseY, 1, 4);
      }
    }

    function draw(now) {
      var dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;
      elapsed += dt;

      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var pad = Math.min(w, h) * 0.08;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Update phase: when returning home, advance the timer; flip to iterating when done.
      var rEase = 0;
      if (phase === 'returning') {
        returnElapsed += dt;
        var rT = Math.min(1, returnElapsed / returnDuration);
        rEase = smoothstep(rT);
        if (rT >= 1) {
          // Snap to fresh iteration state and begin
          resetIterationState();
          phase = 'iterating';
        }
      }

      drawAxes(w, h, pad, 1);

      var advance = (dt / STEP_DURATION) * (phase === 'iterating' ? 1 : 0);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        if (phase === 'iterating') {
          var delayLeft = p.delay;
          var localAdvance = advance;
          if (delayLeft > 0) {
            var consume = Math.min(delayLeft, localAdvance);
            p.delay -= consume;
            localAdvance -= consume;
          }
          p.progress += localAdvance;

          while (p.progress >= 1) {
            p.progress -= 1;
            if (p.phase === 0) {
              p.phase = 1;
            } else {
              p.phase = 0;
              p.xPrev = p.xNext;
              p.x = p.xNext;
              p.xNext = f(p.x);
            }
          }
        }

        var eased = smoothstep(p.progress);

        var ax, ay, bx, by;
        if (p.phase === 0) {
          ax = p.x; ay = p.x;
          bx = p.x; by = p.xNext;
        } else {
          ax = p.x; ay = p.xNext;
          bx = p.xNext; by = p.xNext;
        }

        var curX = ax + (bx - ax) * eased;
        var curY = ay + (by - ay) * eased;

        // While returning, lerp from snapshot position to home; otherwise show current iteration position.
        var dispX = curX, dispY = curY;
        if (phase === 'returning') {
          dispX = p.snapX + (p.x0 - p.snapX) * rEase;
          dispY = p.snapY + (p.x0 - p.snapY) * rEase;
        }

        var curPx = toPx(dispX, dispY, w, h, pad);
        var wiggleScale = p.persistent ? 0.18 : 1.0;
        var wiggleAmp = Math.min(w, h) * 0.028 * wiggleScale;
        var wx = Math.sin(elapsed * p.wSpeedX + p.wPhaseX) * wiggleAmp;
        var wy = Math.cos(elapsed * p.wSpeedY + p.wPhaseY) * wiggleAmp;
        var hx = curPx[0] + wx;
        var hy = curPx[1] + wy;

        // Trail: only extend while iterating; fade out (but keep) during return; preserved in idle.
        if (phase === 'iterating') {
          var prevHx = p._lastHx != null ? p._lastHx : hx;
          var prevHy = p._lastHy != null ? p._lastHy : hy;
          p.trail.push({ x1: prevHx, y1: prevHy, x2: hx, y2: hy });
          var maxLen = p.persistent ? PERSISTENT_TRAIL_SEGMENTS : TRAIL_SEGMENTS;
          if (p.trail.length > maxLen) p.trail.shift();
        } else if (phase === 'returning' && rEase >= 0.99) {
          p.trail.length = 0;
        }
        p._lastHx = hx;
        p._lastHy = hy;

        // Color: blue at home, blends toward rose at attractors.
        var distColor = Math.min(1, Math.abs(p.x));
        if (phase === 'returning') distColor *= (1 - rEase);
        var rC = Math.round(90 + (200 - 90) * distColor);
        var gC = Math.round(148 + (104 - 148) * distColor);
        var bC = Math.round(196 + (136 - 196) * distColor);
        var rgb = rC + ',' + gC + ',' + bC;

        var trailAlpha = phase === 'returning' ? (1 - rEase) : 1;
        var n = p.trail.length;
        var trailMaxA = p.persistent ? 0.55 : 0.5;
        var lineW = p.persistent ? 1.4 : 1.1;
        for (var t = 0; t < n; t++) {
          var seg = p.trail[t];
          var frac = (t + 1) / n;
          var a = (p.persistent
            ? (0.18 + 0.82 * frac) * trailMaxA
            : frac * trailMaxA) * trailAlpha;
          ctx.strokeStyle = 'rgba(' + rgb + ',' + a + ')';
          ctx.lineWidth = lineW;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
        }

        // Head dot — always visible (full alpha) so canvas never blanks
        var dotR = Math.min(w, h) * 0.008;
        var glowR = dotR * 2.4;
        var grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, glowR);
        grad.addColorStop(0, 'rgba(' + rgb + ',0.32)');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        ctx.beginPath();
        ctx.arc(hx, hy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      drawKDE(w, h, pad, 1);

      ctx.restore();

      // Stop loop when frozen idle (not hovered). Wiggle pauses too — frame is preserved.
      if (!hovered && phase === 'idle') {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var pad = Math.min(w, h) * 0.08;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      drawAxes(w, h, pad, 1);

      // Idle: show Gaussian cluster around origin (2D spread via per-particle wiggle phase).
      // Use the SAME wiggle math as the animated frame at elapsed=0 so hover->animate doesn't jump.
      var dotR = Math.min(w, h) * 0.008;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var pt = toPx(p.xPrev, p.xPrev, w, h, pad);
        var wScale = p.persistent ? 0.18 : 1.0;
        var wAmp = Math.min(w, h) * 0.028 * wScale;
        var wx = Math.sin(p.wPhaseX) * wAmp;
        var wy = Math.cos(p.wPhaseY) * wAmp;
        pt[0] += wx;
        pt[1] += wy;
        var rgb = BLUE;
        var glowR = dotR * 2.4;
        var grad = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], glowR);
        grad.addColorStop(0, 'rgba(' + rgb + ',0.3)');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      drawKDE(w, h, pad, 1);

      ctx.restore();
    }

    drawStatic();
    reg['project-drift'].active = true;
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

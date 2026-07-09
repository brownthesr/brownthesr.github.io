(function() {
  'use strict';

  var BLUE = '#5a94c4';
  var BLUE_GLOW = 'rgba(90, 148, 196,';
  var ROSE = '#c86888';
  var ROSE_GLOW = 'rgba(200, 104, 136,';

  var NUM_PARTICLES = 110;
  // Fraction of cloud (lower-left) that gets steered on hover
  var STEERED_FRAC = 0.32;

  function gaussian() {
    // Box-Muller
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-steering']) return;

    var canvas = reg['project-steering'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var card = canvas.closest('.project-card');
    var hovered = false;
    var rafId = null;
    if (card) {
      card.addEventListener('mouseenter', function() {
        hovered = true;
        if (rafId == null) rafId = requestAnimationFrame(draw);
      });
      card.addEventListener('mouseleave', function() { hovered = false; });
    }
    canvas.addEventListener('canvas-resize', function() {
      if (rafId == null) drawStatic();
    });

    // Particles in normalized space; cloud center at (0.28, 0.5)
    var cloudCx = 0.28;
    var cloudCy = 0.5;
    var cloudSigma = 0.085;

    var particles = [];
    for (var i = 0; i < NUM_PARTICLES; i++) {
      var ox = gaussian() * cloudSigma;
      var oy = gaussian() * cloudSigma;
      particles.push({
        baseRx: cloudCx + ox,
        baseRy: cloudCy + oy,
        rx: cloudCx + ox,
        ry: cloudCy + oy,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.4 + Math.random() * 0.4,
        offsetDx: ox,
        offsetDy: oy,
        steered: false,
        triRx: 0,
        triRy: 0,
      });
    }

    // Mark lower-left portion as steered (bottom-left quadrant of cloud, weighted)
    // Score by (-dx + dy): more negative dx (left) and more positive dy (down) = higher
    var scored = particles.map(function(p, idx) {
      return { idx: idx, score: -p.offsetDx + p.offsetDy };
    });
    scored.sort(function(a, b) { return b.score - a.score; });
    var nSteer = Math.floor(NUM_PARTICLES * STEERED_FRAC);

    // Hollow circle on the right
    var ringCx = 0.74;
    var ringCy = 0.5;
    var ringR = 0.16;

    for (var k = 0; k < nSteer; k++) {
      var p = particles[scored[k].idx];
      p.steered = true;
      var ang = (k / nSteer) * Math.PI * 2 + Math.random() * 0.05;
      var jitter = (Math.random() - 0.5) * 0.008;
      p.triRx = ringCx + Math.cos(ang) * (ringR + jitter);
      p.triRy = ringCy + Math.sin(ang) * (ringR + jitter);
    }

    var hoverT = 0;
    var startTime = performance.now();

    function draw(now) {
      var elapsed = (now - startTime) * 0.001;
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var scale = Math.min(w, h);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      if (hovered) hoverT = Math.min(1, hoverT + 0.008);
      else hoverT = Math.max(0, hoverT - 0.008);
      var smoothT = hoverT * hoverT * (3 - 2 * hoverT);
      // Color saturates in the first 35% of the hover timeline; movement starts after
      var colorT = Math.min(1, smoothT / 0.35);
      var moveT = Math.max(0, (smoothT - 0.35) / 0.65);
      moveT = moveT * moveT * (3 - 2 * moveT);

      var wobbleAmt = 0.006;
      var dotR = scale * 0.012;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var wx = Math.sin(elapsed * p.wobbleSpeed + p.wobblePhase) * wobbleAmt;
        var wy = Math.cos(elapsed * p.wobbleSpeed * 0.9 + p.wobblePhase) * wobbleAmt;

        var targetRx, targetRy;
        if (p.steered) {
          targetRx = p.baseRx + (p.triRx - p.baseRx) * moveT;
          targetRy = p.baseRy + (p.triRy - p.baseRy) * moveT;
        } else {
          targetRx = p.baseRx;
          targetRy = p.baseRy;
        }

        p.rx += (targetRx - p.rx) * 0.04;
        p.ry += (targetRy - p.ry) * 0.04;

        var x = (p.rx + wx) * w;
        var y = (p.ry + wy) * h;

        var colorMix = p.steered ? colorT : 0;

        // For steered particles, fade rose in as they move
        var blendR, blendG, blendB;
        if (p.steered) {
          // blue 90,148,196 -> rose 200,104,136
          blendR = 90 + (200 - 90) * colorMix;
          blendG = 148 + (104 - 148) * colorMix;
          blendB = 196 + (136 - 196) * colorMix;
        } else {
          blendR = 90; blendG = 148; blendB = 196;
        }
        var rgb = Math.round(blendR) + ',' + Math.round(blendG) + ',' + Math.round(blendB);

        // glow
        var glowR = dotR * 2.2;
        var grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        grad.addColorStop(0, 'rgba(' + rgb + ',0.3)');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (!hovered && hoverT <= 0.001) {
        // Snap back to idle and stop
        for (var q = 0; q < particles.length; q++) {
          particles[q].rx = particles[q].baseRx;
          particles[q].ry = particles[q].baseRy;
        }
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var scale = Math.min(w, h);
      var dotR = scale * 0.012;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.rx = p.baseRx; p.ry = p.baseRy;
        var x = p.baseRx * w;
        var y = p.baseRy * h;
        var rgb = '90,148,196';
        var glowR = dotR * 2.2;
        var grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        grad.addColorStop(0, 'rgba(' + rgb + ',0.3)');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStatic();
    reg['project-steering'].active = true;
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

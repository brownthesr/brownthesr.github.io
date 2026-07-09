(function() {
  'use strict';

  var NUM_PARTICLES = 180;
  var CYCLE_DURATION = 28000;
  var WOBBLE_AMOUNT = 0.008;
  var PARTICLE_BASE_RADIUS = 3;
  var PARTICLE_GLOW_RADIUS = 18;

  var COLORS = [
    { r: 212, g: 160, b: 36 },
    { r: 232, g: 184, b: 74 },
    { r: 196, g: 136, b: 32 },
    { r: 180, g: 140, b: 50 },
  ];

  function gaussianRandom() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function generateGaussian(n, cx, cy, spread) {
    var points = [];
    for (var i = 0; i < n; i++) {
      points.push({
        x: cx + gaussianRandom() * spread,
        y: cy + gaussianRandom() * spread
      });
    }
    return points;
  }

  function generateSquare(n, cx, cy, size) {
    var points = [];
    var perimeter = size * 4;
    for (var i = 0; i < n; i++) {
      var d = (i / n) * perimeter;
      var x, y;
      if (d < size) {
        x = cx - size / 2 + d;
        y = cy - size / 2;
      } else if (d < size * 2) {
        x = cx + size / 2;
        y = cy - size / 2 + (d - size);
      } else if (d < size * 3) {
        x = cx + size / 2 - (d - size * 2);
        y = cy + size / 2;
      } else {
        x = cx - size / 2;
        y = cy + size / 2 - (d - size * 3);
      }
      points.push({ x: x, y: y });
    }
    return points;
  }

  function smoothPingPong(t) {
    var cycle = t % 1.0;
    return 0.5 - 0.5 * Math.cos(cycle * 2 * Math.PI);
  }

  function initHeroParticles() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['hero-particles']) return;

    var canvas = reg['hero-particles'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = canvas.width;
    var height = canvas.height;
    var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));

    // Pre-render one sprite per color (glow + core baked together).
    // Each particle uses drawImage instead of allocating two radial gradients per frame.
    var SPRITE_RADIUS = 32; // half-width of the sprite, in CSS pixels
    var spriteCache = COLORS.map(function(c) {
      var s = document.createElement('canvas');
      s.width = SPRITE_RADIUS * 2;
      s.height = SPRITE_RADIUS * 2;
      var sctx = s.getContext('2d');
      var cx = SPRITE_RADIUS, cy = SPRITE_RADIUS;
      var glowR = SPRITE_RADIUS;
      var coreR = SPRITE_RADIUS * 0.18; // ~ PARTICLE_BASE_RADIUS / PARTICLE_GLOW_RADIUS
      var glow = sctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.4)');
      glow.addColorStop(0.4, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.15)');
      glow.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
      sctx.fillStyle = glow;
      sctx.beginPath();
      sctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      sctx.fill();
      var core = sctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',1)');
      core.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.3)');
      sctx.fillStyle = core;
      sctx.beginPath();
      sctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      sctx.fill();
      return s;
    });

    var spreadFactor = Math.min(width, height) * 0.1;
    var squareSize = Math.min(width, height) * 0.35;

    var startPositions = generateGaussian(NUM_PARTICLES, width * 0.25 / dpr, height * 0.5 / dpr, spreadFactor / dpr);
    var endPositions = generateSquare(NUM_PARTICLES, width * 0.5 / dpr, height * 0.5 / dpr, squareSize / dpr);

    var particles = [];
    for (var i = 0; i < NUM_PARTICLES; i++) {
      var ci = Math.floor(Math.random() * COLORS.length);
      var color = COLORS[ci];
      particles.push({
        sx: startPositions[i].x,
        sy: startPositions[i].y,
        ex: endPositions[i].x,
        ey: endPositions[i].y,
        phaseOffset: Math.random() * 0.08,
        wobbleX: Math.random() * Math.PI * 2,
        wobbleY: Math.random() * Math.PI * 2,
        wobbleSpeedX: 0.15 + Math.random() * 0.25,
        wobbleSpeedY: 0.15 + Math.random() * 0.25,
        radius: PARTICLE_BASE_RADIUS + Math.random() * 2,
        glowRadius: PARTICLE_GLOW_RADIUS + Math.random() * 10,
        opacity: 0.25 + Math.random() * 0.35,
        colorIndex: ci,
        r: color.r,
        g: color.g,
        b: color.b,
      });
    }

    function handleResize() {
      width = canvas.width;
      height = canvas.height;
      dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));

      var newSpread = Math.min(width, height) * 0.1;
      var newSquare = Math.min(width, height) * 0.35;

      var newStarts = generateGaussian(NUM_PARTICLES, width * 0.25 / dpr, height * 0.5 / dpr, newSpread / dpr);
      var newEnds = generateSquare(NUM_PARTICLES, width * 0.4 / dpr, height * 0.5 / dpr, newSquare / dpr);

      for (var i = 0; i < NUM_PARTICLES; i++) {
        particles[i].sx = newStarts[i].x;
        particles[i].sy = newStarts[i].y;
        particles[i].ex = newEnds[i].x;
        particles[i].ey = newEnds[i].y;
      }
    }

    canvas.addEventListener('canvas-resize', handleResize);

    var startTime = performance.now();
    var pausedElapsed = 0;
    var visible = true;
    var rafId = null;

    function draw(now) {
      var elapsed = now - startTime;
      var globalT = elapsed / CYCLE_DURATION;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var t = smoothPingPong(globalT + p.phaseOffset);

        var wobbleX = Math.sin(elapsed * 0.001 * p.wobbleSpeedX + p.wobbleX) * WOBBLE_AMOUNT * (width / dpr);
        var wobbleY = Math.cos(elapsed * 0.001 * p.wobbleSpeedY + p.wobbleY) * WOBBLE_AMOUNT * (height / dpr);

        var x = p.sx + (p.ex - p.sx) * t + wobbleX;
        var y = p.sy + (p.ey - p.sy) * t + wobbleY;

        var sprite = spriteCache[p.colorIndex];
        var size = p.glowRadius * 2;
        ctx.globalAlpha = p.opacity;
        ctx.drawImage(sprite, x - p.glowRadius, y - p.glowRadius, size, size);
      }

      ctx.restore();
      if (visible) {
        rafId = requestAnimationFrame(draw);
      } else {
        rafId = null;
      }
    }

    function start() {
      if (rafId != null) return;
      // Resume the animation timeline so the cycle continues from where it stopped.
      startTime = performance.now() - pausedElapsed;
      rafId = requestAnimationFrame(draw);
    }
    function stop() {
      if (rafId == null) return;
      pausedElapsed = performance.now() - startTime;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    var io = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
      }
    }, { rootMargin: '200px 0px' });
    io.observe(canvas);

    // Also pause when the tab is hidden.
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        stop();
      } else if (visible) {
        start();
      }
    });

    if (visible) start();
    reg['hero-particles'].active = true;
    canvas.closest('.canvas-placeholder').classList.add('canvas-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initHeroParticles, 100);
    });
  } else {
    setTimeout(initHeroParticles, 100);
  }
})();

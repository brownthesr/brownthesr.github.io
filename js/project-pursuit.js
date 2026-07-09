(function() {
  'use strict';

  var PURSUER = '#c86888';
  var TARGET = '#5a94c4';

  var NUM_TARGETS = 8;
  var NUM_PURSUERS = 4;

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-pursuit']) return;

    var canvas = reg['project-pursuit'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var card = canvas.closest('.project-card');
    var hovered = false;
    var hoverStart = 0;
    var hoverT = 0;
    var rafId = null;

    if (card) {
      card.addEventListener('mouseenter', function() {
        hovered = true;
        hoverStart = performance.now();
        if (rafId == null) rafId = requestAnimationFrame(draw);
      });
      card.addEventListener('mouseleave', function() {
        hovered = false;
      });
    }
    canvas.addEventListener('canvas-resize', function() {
      if (rafId == null) drawStatic();
    });

    // Targets: clustered near center
    var targets = [];
    for (var i = 0; i < NUM_TARGETS; i++) {
      var angle = (i / NUM_TARGETS) * Math.PI * 2 + Math.random() * 0.4;
      var dist = 0.08 + Math.random() * 0.08;
      targets.push({
        rx: 0.5 + Math.cos(angle) * dist,
        ry: 0.5 + Math.sin(angle) * dist,
        baseRx: 0.5 + Math.cos(angle) * dist,
        baseRy: 0.5 + Math.sin(angle) * dist,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.4 + Math.random() * 0.3
      });
    }

    // Pursuers: start drifting outward at scattered positions
    var pursuers = [];
    for (var j = 0; j < NUM_PURSUERS; j++) {
      var pa = (j / NUM_PURSUERS) * Math.PI * 2 + Math.random() * 0.3;
      pursuers.push({
        angle: pa,
        x: 0.5 + Math.cos(pa) * 0.38,
        y: 0.5 + Math.sin(pa) * 0.38,
        driftAngle: pa + Math.PI * 0.5 + (Math.random() - 0.5) * 0.8,
        driftSpeed: 0.02 + Math.random() * 0.015,
        orbitSpeed: 0.5 + Math.random() * 0.2,
        orbitAngle: pa
      });
    }

    var startTime = performance.now();
    var ORBIT_RADIUS = 0.24;
    var SWARM_RADIUS = 0.12;

    function draw(now) {
      var elapsed = (now - startTime) * 0.001;
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var cx = w * 0.5;
      var cy = h * 0.5;
      var scale = Math.min(w, h);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Smooth hover transition
      if (hovered) {
        hoverT = Math.min(1, hoverT + 0.02);
      } else {
        hoverT = Math.max(0, hoverT - 0.015);
      }
      var smoothT = hoverT * hoverT * (3 - 2 * hoverT);

      // Update pursuer positions
      for (var p = 0; p < pursuers.length; p++) {
        var pr = pursuers[p];

        if (smoothT < 0.01) {
          // Idle: drift outward slowly
          pr.x += Math.cos(pr.driftAngle) * pr.driftSpeed * 0.016;
          pr.y += Math.sin(pr.driftAngle) * pr.driftSpeed * 0.016;

          // Wrap around if too far
          if (pr.x < 0.05 || pr.x > 0.95 || pr.y < 0.05 || pr.y > 0.95) {
            var resetAngle = Math.random() * Math.PI * 2;
            pr.x = 0.5 + Math.cos(resetAngle) * 0.35;
            pr.y = 0.5 + Math.sin(resetAngle) * 0.35;
            pr.driftAngle = resetAngle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
          }
        } else {
          // Active: orbit around swarm, staying outside swarm radius
          pr.orbitAngle += pr.orbitSpeed * 0.016;
          var targetX = 0.5 + Math.cos(pr.orbitAngle) * ORBIT_RADIUS;
          var targetY = 0.5 + Math.sin(pr.orbitAngle) * ORBIT_RADIUS;

          pr.x += (targetX - pr.x) * 0.06 * smoothT;
          pr.y += (targetY - pr.y) * 0.06 * smoothT;

          // Also drift slightly when not fully transitioned
          pr.x += Math.cos(pr.driftAngle) * pr.driftSpeed * 0.016 * (1 - smoothT);
          pr.y += Math.sin(pr.driftAngle) * pr.driftSpeed * 0.016 * (1 - smoothT);
        }
      }

      // Update target positions (contract on hover)
      var targetPositions = targets.map(function(t) {
        var wobble = Math.sin(elapsed * t.wobbleSpeed + t.wobblePhase) * 0.008;
        var contractFactor = 1.0 - smoothT * 0.6;
        var trx = 0.5 + (t.baseRx - 0.5) * contractFactor + wobble;
        var try_ = 0.5 + (t.baseRy - 0.5) * contractFactor;
        t.rx += (trx - t.rx) * 0.04;
        t.ry += (try_ - t.ry) * 0.04;
        return { x: t.rx * w, y: t.ry * h };
      });

      var pursuerPositions = pursuers.map(function(pr) {
        return { x: pr.x * w, y: pr.y * h };
      });

      // Draw target glow
      for (var ti = 0; ti < targetPositions.length; ti++) {
        var tp = targetPositions[ti];
        var glowR = scale * 0.035;
        var grad = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, glowR);
        grad.addColorStop(0, 'rgba(90, 148, 196, 0.2)');
        grad.addColorStop(1, 'rgba(90, 148, 196, 0)');
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw pursuer glow
      for (var pi = 0; pi < pursuerPositions.length; pi++) {
        var pp = pursuerPositions[pi];
        var glowR2 = scale * 0.045;
        var grad2 = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, glowR2);
        grad2.addColorStop(0, 'rgba(200, 104, 136, 0.25)');
        grad2.addColorStop(1, 'rgba(200, 104, 136, 0)');
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, glowR2, 0, Math.PI * 2);
        ctx.fillStyle = grad2;
        ctx.fill();
      }

      // Draw pursuers
      for (var pi2 = 0; pi2 < pursuerPositions.length; pi2++) {
        var pp2 = pursuerPositions[pi2];
        ctx.beginPath();
        ctx.arc(pp2.x, pp2.y, scale * 0.022, 0, Math.PI * 2);
        ctx.fillStyle = PURSUER;
        ctx.fill();
      }

      // Draw targets
      for (var ti2 = 0; ti2 < targetPositions.length; ti2++) {
        var tp2 = targetPositions[ti2];
        ctx.beginPath();
        ctx.arc(tp2.x, tp2.y, scale * 0.016, 0, Math.PI * 2);
        ctx.fillStyle = TARGET;
        ctx.fill();
      }

      // Origin marker
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.025, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(122, 112, 96, ' + (0.15 + smoothT * 0.2) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      if (!hovered && hoverT <= 0.001) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var cx = w * 0.5;
      var cy = h * 0.5;
      var scale = Math.min(w, h);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Targets at base positions
      for (var ti = 0; ti < targets.length; ti++) {
        var tp = { x: targets[ti].baseRx * w, y: targets[ti].baseRy * h };
        var glowR = scale * 0.035;
        var grad = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, glowR);
        grad.addColorStop(0, 'rgba(90, 148, 196, 0.2)');
        grad.addColorStop(1, 'rgba(90, 148, 196, 0)');
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      // Pursuers at current positions
      for (var pi = 0; pi < pursuers.length; pi++) {
        var pp = { x: pursuers[pi].x * w, y: pursuers[pi].y * h };
        var glowR2 = scale * 0.045;
        var grad2 = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, glowR2);
        grad2.addColorStop(0, 'rgba(200, 104, 136, 0.25)');
        grad2.addColorStop(1, 'rgba(200, 104, 136, 0)');
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, glowR2, 0, Math.PI * 2);
        ctx.fillStyle = grad2;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, scale * 0.022, 0, Math.PI * 2);
        ctx.fillStyle = PURSUER;
        ctx.fill();
      }
      for (var ti2 = 0; ti2 < targets.length; ti2++) {
        var tp2 = { x: targets[ti2].baseRx * w, y: targets[ti2].baseRy * h };
        ctx.beginPath();
        ctx.arc(tp2.x, tp2.y, scale * 0.016, 0, Math.PI * 2);
        ctx.fillStyle = TARGET;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.025, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(122, 112, 96, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    drawStatic();
    reg['project-pursuit'].active = true;
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

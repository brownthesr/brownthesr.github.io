(function() {
  'use strict';

  var BODIES = [
    { color: '#5a94c4', glow: 'rgba(90, 148, 196,' },
    { color: '#c86888', glow: 'rgba(200, 104, 136,' },
    { color: '#c8a868', glow: 'rgba(200, 168, 104,' },
  ];

  var TRAIL_LEN = 140;

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-neural-odes']) return;

    var canvas = reg['project-neural-odes'].canvas;
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

    var bodies = BODIES.map(function(b, i) {
      return {
        color: b.color,
        glow: b.glow,
        phase: (i / BODIES.length) * Math.PI * 2,
        trail: [],
      };
    });

    var startTime = performance.now();
    var hoverT = 0;
    var t = 0;

    function draw(now) {
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

      if (hovered) hoverT = Math.min(1, hoverT + 0.02);
      else hoverT = Math.max(0, hoverT - 0.015);
      var smoothT = hoverT * hoverT * (3 - 2 * hoverT);

      var speed = 0.003 + smoothT * 0.027;
      t += speed;

      var rx = scale * 0.34;
      var ry = scale * 0.18;

      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var theta = t + b.phase;
        // Lemniscate of Gerono: figure-8
        var x = cx + Math.sin(theta) * rx;
        var y = cy + Math.sin(theta) * Math.cos(theta) * ry * 2;

        b.trail.push({ x: x, y: y });
        if (b.trail.length > TRAIL_LEN) b.trail.shift();
      }

      // Draw trails
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var trail = b.trail;
        for (var k = 1; k < trail.length; k++) {
          var alpha = (k / trail.length) * (0.35 + smoothT * 0.35);
          ctx.beginPath();
          ctx.moveTo(trail[k - 1].x, trail[k - 1].y);
          ctx.lineTo(trail[k].x, trail[k].y);
          ctx.strokeStyle = b.glow + alpha + ')';
          ctx.lineWidth = 1.2 + smoothT * 0.6;
          ctx.stroke();
        }
      }

      // Draw bodies with glow
      var bodyR = scale * 0.022;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var pos = b.trail[b.trail.length - 1];
        if (!pos) continue;

        var glowR = bodyR * (2.2 + smoothT * 0.8);
        var grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        grad.addColorStop(0, b.glow + (0.35 + smoothT * 0.2) + ')');
        grad.addColorStop(1, b.glow + '0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = b.color;
        ctx.arc(pos.x, pos.y, bodyR, 0, Math.PI * 2);
        ctx.fill();
      }

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
      var rx = scale * 0.34;
      var ry = scale * 0.18;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Faint full lemniscate as a guide
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(122, 112, 96, 0.18)';
      ctx.lineWidth = 1;
      var steps = 120;
      for (var s = 0; s <= steps; s++) {
        var th = (s / steps) * Math.PI * 2;
        var lx = cx + Math.sin(th) * rx;
        var ly = cy + Math.sin(th) * Math.cos(th) * ry * 2;
        if (s === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.stroke();

      var bodyR = scale * 0.022;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var theta = b.phase;
        var x = cx + Math.sin(theta) * rx;
        var y = cy + Math.sin(theta) * Math.cos(theta) * ry * 2;
        var glowR = bodyR * 2.2;
        var grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        grad.addColorStop(0, b.glow + '0.35)');
        grad.addColorStop(1, b.glow + '0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = b.color;
        ctx.arc(x, y, bodyR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStatic();
    reg['project-neural-odes'].active = true;
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

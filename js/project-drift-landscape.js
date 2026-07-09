(function() {
  'use strict';

  var ROSE = '200,104,136';
  var GOLD = '230,180,90';
  var AXIS = '160,170,185';

  var RANGE = 5.5;
  var STEPS = 40;
  var VIEW_ANGLE = 0.65; // fixed rotation around vertical axis (radians)

  // Quadratic bowl + INVERTED sinusoidal ripples: many local minima, one global min at origin.
  // The negative cos*cos makes the origin a deep well rather than a saddle/peak.
  function f(x, y) {
    var quad = 0.085 * (x * x + y * y);
    var ripple = -Math.cos(1.4 * x) * Math.cos(1.4 * y);
    return quad + ripple;
  }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['drift-landscape']) {
      setTimeout(init, 100);
      return;
    }
    var canvas = reg['drift-landscape'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Precompute grid samples
    var grid = [];
    var zMin = Infinity, zMax = -Infinity;
    for (var i = 0; i <= STEPS; i++) {
      var row = [];
      for (var j = 0; j <= STEPS; j++) {
        var x = -RANGE + (2 * RANGE) * (i / STEPS);
        var y = -RANGE + (2 * RANGE) * (j / STEPS);
        var z = f(x, y);
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
        row.push({ x: x, y: y, z: z });
      }
      grid.push(row);
    }

    var gMin = { x: 0, y: 0, z: f(0, 0) };

    // Trajectory: damped spiral from a far starting point into the global min.
    // Snakes through ripple cells to evoke navigating past local minima.
    var traj = [];
    var TRAJ_N = 220;
    for (var s = 0; s <= TRAJ_N; s++) {
      var u = s / TRAJ_N;            // 0 -> 1
      var radius = 4.8 * (1 - u);    // shrinks to 0
      // Add a small ripple-frequency wobble so it visibly weaves through cells
      var theta = u * Math.PI * 3.2 + 0.6;
      var wobble = 0.35 * (1 - u) * Math.sin(u * 18);
      var tx = (radius + wobble) * Math.cos(theta);
      var ty = (radius + wobble) * Math.sin(theta);
      // Lift the trajectory slightly above the surface so it reads cleanly on top
      var tz = f(tx, ty) + 0.18;
      traj.push({ x: tx, y: ty, z: tz });
    }

    function project(x, y, z, w, h) {
      var ca = Math.cos(VIEW_ANGLE), sa = Math.sin(VIEW_ANGLE);
      var rx = x * ca - y * sa;
      var ry = x * sa + y * ca;
      var scale = Math.min(w, h) * 0.075;
      var tilt = 0.5;
      var px = w / 2 + rx * scale;
      var zNorm = (z - zMin) / (zMax - zMin || 1);
      var py = h / 2 + ry * scale * tilt - (zNorm - 0.5) * scale * 2.6;
      return { x: px, y: py, depth: ry, zNorm: zNorm };
    }

    function render() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Project grid
      var pts = [];
      for (var i = 0; i <= STEPS; i++) {
        var row = [];
        for (var j = 0; j <= STEPS; j++) {
          var p = grid[i][j];
          row.push(project(p.x, p.y, p.z, w, h));
        }
        pts.push(row);
      }

      // Build quads with depth + zAvg
      var quads = [];
      for (var i2 = 0; i2 < STEPS; i2++) {
        for (var j2 = 0; j2 < STEPS; j2++) {
          var a = pts[i2][j2];
          var b = pts[i2 + 1][j2];
          var c = pts[i2 + 1][j2 + 1];
          var d = pts[i2][j2 + 1];
          var depth = (a.depth + b.depth + c.depth + d.depth) * 0.25;
          var zAvg = (a.zNorm + b.zNorm + c.zNorm + d.zNorm) * 0.25;
          quads.push({ a: a, b: b, c: c, d: d, depth: depth, zAvg: zAvg });
        }
      }
      quads.sort(function(p, q) { return p.depth - q.depth; });

      // Draw surface
      for (var k = 0; k < quads.length; k++) {
        var q = quads[k];
        var zN = q.zAvg;
        // Valleys (low zN) -> warm rose, peaks (high zN) -> cool blue
        var lowR = 200, lowG = 104, lowB = 136;
        var hiR = 70, hiG = 110, hiB = 170;
        var rr = Math.round(lowR + (hiR - lowR) * zN);
        var gg = Math.round(lowG + (hiG - lowG) * zN);
        var bb = Math.round(lowB + (hiB - lowB) * zN);
        var fillA = 0.20 + 0.25 * (1 - zN);
        ctx.fillStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + fillA + ')';
        ctx.beginPath();
        ctx.moveTo(q.a.x, q.a.y);
        ctx.lineTo(q.b.x, q.b.y);
        ctx.lineTo(q.c.x, q.c.y);
        ctx.lineTo(q.d.x, q.d.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(' + AXIS + ',0.24)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Trajectory: project all points, draw as a glowing polyline.
      var tpts = traj.map(function(p) { return project(p.x, p.y, p.z, w, h); });

      // Outer glow
      ctx.strokeStyle = 'rgba(' + GOLD + ',0.25)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (var t = 0; t < tpts.length; t++) {
        if (t === 0) ctx.moveTo(tpts[t].x, tpts[t].y);
        else ctx.lineTo(tpts[t].x, tpts[t].y);
      }
      ctx.stroke();

      // Core line
      ctx.strokeStyle = 'rgba(' + GOLD + ',0.95)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (var t2 = 0; t2 < tpts.length; t2++) {
        if (t2 === 0) ctx.moveTo(tpts[t2].x, tpts[t2].y);
        else ctx.lineTo(tpts[t2].x, tpts[t2].y);
      }
      ctx.stroke();

      // Start marker
      var sp = tpts[0];
      ctx.fillStyle = 'rgba(' + GOLD + ',0.95)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(' + GOLD + ',0.9)';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('start', sp.x + 8, sp.y - 4);

      // Global min marker
      var gp = project(gMin.x, gMin.y, gMin.z, w, h);
      var grad = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, 16);
      grad.addColorStop(0, 'rgba(' + ROSE + ',0.85)');
      grad.addColorStop(1, 'rgba(' + ROSE + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(' + ROSE + ',1)';
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(' + ROSE + ',0.95)';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('global min', gp.x + 10, gp.y - 6);

      ctx.restore();
    }

    canvas.addEventListener('canvas-resize', render);
    render();

    reg['drift-landscape'].active = true;
    var ph = canvas.closest('.canvas-placeholder');
    if (ph) ph.classList.add('canvas-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 200);
    });
  } else {
    setTimeout(init, 200);
  }
})();

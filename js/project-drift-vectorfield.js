(function() {
  'use strict';

  var ROSE  = '200,104,136';   // V_+  (positive / similarity)
  var BLUE  = '110,150,210';   // V_-  (negative / dissimilarity)
  var GOLD  = '230,180,90';    // V = V_+ - V_-
  var AXIS  = '160,170,185';
  var POINT = '210,215,225';

  // Two "blobs" in the background contour:
  //   POS  (rose) — bottom-left   — pull direction V_+
  //   NEG  (blue) — right          — push direction V_-
  var POS = { x: -1.7, y: -1.3, sigma: 1.05 };
  var NEG = { x:  1.9, y: -0.9, sigma: 1.20 };

  var RANGE = 3.4;

  // Density-like scalar fields (Gaussian bumps) used for the contour background.
  function rho(c, x, y) {
    var dx = x - c.x, dy = y - c.y;
    return Math.exp(-(dx*dx + dy*dy) / (2 * c.sigma * c.sigma));
  }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['drift-vectorfield']) {
      setTimeout(init, 100);
      return;
    }
    var canvas = reg['drift-vectorfield'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cluster of representations near the center (between the two blobs).
    var POINTS = [];
    var N_POINTS = 70;
    // Deterministic-ish seed via index-based hashing so layout is stable.
    function hash(i, k) {
      var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
      return s - Math.floor(s);
    }
    for (var i = 0; i < N_POINTS; i++) {
      // Concentrated around origin, slight elongation toward POS so it reads as drifting.
      var r = 0.25 + 1.15 * Math.sqrt(hash(i, 1));
      var th = hash(i, 2) * Math.PI * 2;
      var x = r * Math.cos(th) - 0.15;
      var y = r * Math.sin(th) - 0.1;
      POINTS.push({ x: x, y: y });
    }

    // The "central point x" we draw vectors from — pick one near the middle of the cluster.
    var X = { x: 0.05, y: -0.05 };

    function project(x, y, w, h) {
      var scale = Math.min(w, h) / (RANGE * 2.0);
      return { x: w / 2 + x * scale, y: h / 2 - y * scale, scale: scale };
    }

    function drawArrow(p0, p1, color, alpha, width, dashed) {
      ctx.save();
      ctx.strokeStyle = 'rgba(' + color + ',' + alpha + ')';
      ctx.fillStyle   = 'rgba(' + color + ',' + alpha + ')';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // arrowhead
      var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      var ah = 8;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x - ah * Math.cos(ang - 0.45), p1.y - ah * Math.sin(ang - 0.45));
      ctx.lineTo(p1.x - ah * Math.cos(ang + 0.45), p1.y - ah * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Build filled contour bands for one Gaussian blob.
    // We approximate filled level sets with concentric circles of decreasing alpha.
    function drawContourBlob(c, color) {
      // Fewer, broader bands -> readable contour-plot look.
      var bands = [
        { level: 0.85, alpha: 0.28 },
        { level: 0.55, alpha: 0.18 },
        { level: 0.30, alpha: 0.11 },
        { level: 0.12, alpha: 0.06 }
      ];
      // For Gaussian: rho = exp(-r^2 / 2 sigma^2) = level => r = sigma * sqrt(-2 ln level)
      for (var b = 0; b < bands.length; b++) {
        var L = bands[b];
        var rWorld = c.sigma * Math.sqrt(-2 * Math.log(L.level));
        var cp = project(c.x, c.y, lastW, lastH);
        var rPx = rWorld * cp.scale;
        ctx.fillStyle = 'rgba(' + color + ',' + L.alpha + ')';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, rPx, 0, Math.PI * 2);
        ctx.fill();
      }
      // contour outlines
      var outlines = [0.85, 0.55, 0.30, 0.12];
      ctx.strokeStyle = 'rgba(' + color + ',0.45)';
      ctx.lineWidth = 0.8;
      for (var k = 0; k < outlines.length; k++) {
        var rW = c.sigma * Math.sqrt(-2 * Math.log(outlines[k]));
        var cp2 = project(c.x, c.y, lastW, lastH);
        var rP = rW * cp2.scale;
        ctx.beginPath();
        ctx.arc(cp2.x, cp2.y, rP, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Mix two RGB triplet strings by t in [0,1]; t=0 -> a, t=1 -> b.
    function mix(a, b, t) {
      var aa = a.split(',').map(Number);
      var bb = b.split(',').map(Number);
      return [
        Math.round(aa[0] + (bb[0] - aa[0]) * t),
        Math.round(aa[1] + (bb[1] - aa[1]) * t),
        Math.round(aa[2] + (bb[2] - aa[2]) * t)
      ].join(',');
    }

    var lastW = 0, lastH = 0;

    function render() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;
      lastW = w; lastH = h;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Background contours (drawn first, behind everything).
      drawContourBlob(POS, ROSE);
      drawContourBlob(NEG, BLUE);

      // Light frame
      ctx.strokeStyle = 'rgba(' + AXIS + ',0.18)';
      ctx.lineWidth = 0.8;
      var bl = project(-RANGE, -RANGE, w, h);
      var tr = project( RANGE,  RANGE, w, h);
      ctx.strokeRect(bl.x, tr.y, tr.x - bl.x, bl.y - tr.y);

      // Points: color by relative proximity to the two blobs.
      // t = rho_pos / (rho_pos + rho_neg)  -> 1 means near POS (rose), 0 means near NEG (blue).
      for (var i = 0; i < POINTS.length; i++) {
        var P = POINTS[i];
        var rp = rho(POS, P.x, P.y);
        var rn = rho(NEG, P.x, P.y);
        var t = rp / (rp + rn + 1e-9);
        // Map t in [0,1] to a color blend NEG (blue) -> neutral -> POS (rose)
        var col = mix(BLUE, ROSE, t);
        var pp = project(P.x, P.y, w, h);
        // subtle halo
        ctx.fillStyle = 'rgba(' + col + ',0.18)';
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.fillStyle = 'rgba(' + col + ',0.95)';
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vectors from the central point X.
      var Xp = project(X.x, X.y, w, h);

      // Direction unit vectors in world coords
      function unit(ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        var m = Math.sqrt(dx*dx + dy*dy) + 1e-9;
        return { x: dx / m, y: dy / m, mag: m };
      }
      var uPos = unit(X.x, X.y, POS.x, POS.y);
      var uNeg = unit(X.x, X.y, NEG.x, NEG.y);

      // Choose visible arrow lengths in world coordinates.
      var LEN_PM = 1.55 * 0.7;    // length of V_+ and V_-  (scaled to 0.7x)
      var Vplus_world  = { x: X.x + uPos.x * LEN_PM, y: X.y + uPos.y * LEN_PM };
      var Vminus_world = { x: X.x + uNeg.x * LEN_PM, y: X.y + uNeg.y * LEN_PM };

      // V = V_+ - V_-  (parallelogram rule from X)
      var Vx = (Vplus_world.x - X.x) - (Vminus_world.x - X.x);
      var Vy = (Vplus_world.y - X.y) - (Vminus_world.y - X.y);
      // Scale V down a bit so the arrow stays readable
      var Vscale = 0.85;
      var V_world = { x: X.x + Vx * Vscale, y: X.y + Vy * Vscale };

      var Vp_p  = project(Vplus_world.x,  Vplus_world.y,  w, h);
      var Vm_p  = project(Vminus_world.x, Vminus_world.y, w, h);
      var V_p   = project(V_world.x,      V_world.y,      w, h);

      // Dashed V_+ (rose) and V_- (blue)
      drawArrow(Xp, Vp_p, ROSE, 0.95, 2.0, true);
      drawArrow(Xp, Vm_p, BLUE, 0.95, 2.0, true);

      // Solid V (gold)
      drawArrow(Xp, V_p, GOLD, 1.0, 2.6, false);

      // Central point x — drawn on top, with a ring so it stands out from the cluster
      ctx.fillStyle = 'rgba(20,22,28,0.9)';
      ctx.beginPath();
      ctx.arc(Xp.x, Xp.y, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(245,245,250,1)';
      ctx.beginPath();
      ctx.arc(Xp.x, Xp.y, 4.0, 0, Math.PI * 2);
      ctx.fill();

      // Labels
      ctx.font = '600 12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';

      // x label
      ctx.fillStyle = 'rgba(245,245,250,0.95)';
      ctx.fillText('x', Xp.x + 9, Xp.y - 8);

      // V_+ label, near tip, offset along normal so it doesn't overlap the arrow
      function labelAtTip(tip, origin, color, text, offset) {
        var dx = tip.x - origin.x, dy = tip.y - origin.y;
        var m = Math.sqrt(dx*dx + dy*dy) + 1e-9;
        // perpendicular offset
        var nx = -dy / m, ny = dx / m;
        ctx.fillStyle = 'rgba(' + color + ',1)';
        ctx.fillText(text, tip.x + nx * offset + 4, tip.y + ny * offset + 4);
      }
      labelAtTip(Vp_p, Xp, ROSE, 'V₊', 6);
      labelAtTip(Vm_p, Xp, BLUE, 'V₋', -6);
      labelAtTip(V_p,  Xp, GOLD, 'V',  10);

      // Blob labels
      ctx.font = '500 11px Inter, sans-serif';
      var posLabel = project(POS.x - 0.1, POS.y - POS.sigma * 1.55, w, h);
      ctx.fillStyle = 'rgba(' + ROSE + ',0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('positive density  p₊', posLabel.x, posLabel.y);

      var negLabel = project(NEG.x, NEG.y - NEG.sigma * 1.55, w, h);
      ctx.fillStyle = 'rgba(' + BLUE + ',0.9)';
      ctx.fillText('negative density  p₋', negLabel.x, negLabel.y);

      // Legend in corner
      ctx.textAlign = 'left';
      ctx.font = '500 11px JetBrains Mono, monospace';
      var lx = 14, ly = 18;
      ctx.fillStyle = 'rgba(' + ROSE + ',0.95)';
      ctx.fillText('V₊  pull toward p₊', lx, ly);
      ctx.fillStyle = 'rgba(' + BLUE + ',0.95)';
      ctx.fillText('V₋  push from p₋',   lx, ly + 16);
      ctx.fillStyle = 'rgba(' + GOLD + ',1)';
      ctx.fillText('V = V₊ − V₋',         lx, ly + 32);

      ctx.restore();
    }

    canvas.addEventListener('canvas-resize', render);
    render();

    reg['drift-vectorfield'].active = true;
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

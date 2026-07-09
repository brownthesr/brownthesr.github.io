(function() {
  'use strict';

  // Cluster colors — three "corpora"
  var CLUSTERS = [
    { color: '200,104,136' }, // rose
    { color: '110,150,210' }, // blue
    { color: '230,180,90' }   // gold
  ];
  var QUERY_COLOR = '230,230,235';
  var EDGE_COLOR  = '230,180,90';

  // Stable pseudo-random so the same scatter renders every time.
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-ancient-texts']) return;
    var canvas = reg['project-ancient-texts'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var rand = mulberry32(13);

    // Generate three Gaussian-ish clusters in normalized [-1, 1] space.
    var centers = [
      { x: -0.55, y: -0.25 },
      { x:  0.45, y: -0.45 },
      { x:  0.05, y:  0.55 }
    ];
    var POINTS_PER_CLUSTER = 26;
    var points = [];
    for (var c = 0; c < centers.length; c++) {
      for (var i = 0; i < POINTS_PER_CLUSTER; i++) {
        // Box-Muller for a soft Gaussian shape
        var u1 = Math.max(1e-6, rand());
        var u2 = rand();
        var rad = Math.sqrt(-2 * Math.log(u1)) * 0.18;
        var ang = 2 * Math.PI * u2;
        points.push({
          cluster: c,
          x: centers[c].x + rad * Math.cos(ang),
          y: centers[c].y + rad * Math.sin(ang)
        });
      }
    }

    // Query point: sits between clusters 0 and 2, slightly toward cluster 0.
    var query = { x: -0.22, y: 0.18 };

    // Compute distances from the query, find top-K nearest.
    var K = 5;
    var withDist = points.map(function(p, idx) {
      var dx = p.x - query.x, dy = p.y - query.y;
      return { idx: idx, d: Math.sqrt(dx * dx + dy * dy) };
    });
    withDist.sort(function(a, b) { return a.d - b.d; });
    var nearest = withDist.slice(0, K).map(function(o) { return o.idx; });
    var nearestSet = {};
    for (var n = 0; n < nearest.length; n++) nearestSet[nearest[n]] = withDist[n].d;
    var maxNearD = withDist[K - 1].d;

    function project(px, py, w, h) {
      var pad = 18;
      return {
        x: pad + (px + 1) * 0.5 * (w - 2 * pad),
        y: pad + (1 - (py + 1) * 0.5) * (h - 2 * pad)
      };
    }

    // Animation state
    // progress: 0..1 controlling query-dot appearance and edge growth.
    // hovered: target direction.
    var hovered = false;
    var progress = 0;
    var rafId = null;
    var lastTime = 0;
    // Query "appear" occupies the first PHASE_QUERY of progress; edges draw
    // staggered in the remaining (1 - PHASE_QUERY).
    var PHASE_QUERY = 0.35;
    var ANIM_DURATION = 0.9; // seconds for full forward animation

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function render() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Soft cluster halos
      for (var c = 0; c < centers.length; c++) {
        var cp = project(centers[c].x, centers[c].y, w, h);
        var rr = Math.min(w, h) * 0.22;
        var grad = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, rr);
        grad.addColorStop(0, 'rgba(' + CLUSTERS[c].color + ',0.18)');
        grad.addColorStop(1, 'rgba(' + CLUSTERS[c].color + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      var qp = project(query.x, query.y, w, h);

      // Phase fractions
      var queryAppear = Math.min(1, progress / PHASE_QUERY); // 0..1
      var edgePhase = Math.max(0, (progress - PHASE_QUERY) / (1 - PHASE_QUERY)); // 0..1

      // Edges: each one gets a staggered window inside edgePhase.
      var edgeProgress = [];
      for (var k = 0; k < nearest.length; k++) {
        var start = (k / nearest.length) * 0.5; // last edge starts at 0.5
        var span = 0.55;
        var local = (edgePhase - start) / span;
        edgeProgress.push(Math.max(0, Math.min(1, local)));
      }

      // Draw edges (only after the query has fully appeared)
      for (var k2 = 0; k2 < nearest.length; k2++) {
        var t = easeOut(edgeProgress[k2]);
        if (t <= 0) continue;
        var idx = nearest[k2];
        var pt = points[idx];
        var pp = project(pt.x, pt.y, w, h);
        var d = nearestSet[idx];
        var alpha = 0.85 * (1 - d / (maxNearD * 1.05));
        ctx.strokeStyle = 'rgba(' + EDGE_COLOR + ',' + (0.25 + 0.6 * alpha) + ')';
        ctx.lineWidth = 1 + 1.2 * alpha;
        ctx.beginPath();
        ctx.moveTo(qp.x, qp.y);
        ctx.lineTo(qp.x + (pp.x - qp.x) * t, qp.y + (pp.y - qp.y) * t);
        ctx.stroke();
      }

      // Scatter points
      for (var p2 = 0; p2 < points.length; p2++) {
        var pt2 = points[p2];
        var proj = project(pt2.x, pt2.y, w, h);
        var col = CLUSTERS[pt2.cluster].color;
        var isNear = nearestSet.hasOwnProperty(p2);
        // Find ring strength: how close is its edge to fully drawn?
        var ringT = 0;
        if (isNear) {
          for (var ni = 0; ni < nearest.length; ni++) {
            if (nearest[ni] === p2) { ringT = easeOut(edgeProgress[ni]); break; }
          }
        }

        if (isNear && ringT > 0.05) {
          ctx.strokeStyle = 'rgba(' + EDGE_COLOR + ',' + (0.95 * ringT) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 5.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(' + col + ',0.92)';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, isNear && ringT > 0.5 ? 3.2 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Query point on top, scaled by queryAppear
      if (queryAppear > 0.01) {
        var qa = easeOut(queryAppear);
        var qGlow = ctx.createRadialGradient(qp.x, qp.y, 0, qp.x, qp.y, 14 * qa);
        qGlow.addColorStop(0, 'rgba(' + QUERY_COLOR + ',' + (0.55 * qa) + ')');
        qGlow.addColorStop(1, 'rgba(' + QUERY_COLOR + ',0)');
        ctx.fillStyle = qGlow;
        ctx.beginPath();
        ctx.arc(qp.x, qp.y, 14 * qa, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(' + QUERY_COLOR + ',1)';
        ctx.beginPath();
        ctx.arc(qp.x, qp.y, 4.2 * qa, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,22,28,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }

    function tick(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;

      var dir = hovered ? 1 : -1;
      progress += (dir * dt) / ANIM_DURATION;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      render();

      var atRest = (hovered && progress >= 1) || (!hovered && progress <= 0);
      if (atRest) {
        rafId = null;
        lastTime = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    function startAnim() {
      if (rafId == null) {
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
      }
    }

    var card = canvas.closest('.project-card');
    if (card) {
      card.addEventListener('mouseenter', function() { hovered = true; startAnim(); });
      card.addEventListener('mouseleave', function() { hovered = false; startAnim(); });
    }

    canvas.addEventListener('canvas-resize', render);
    render();

    reg['project-ancient-texts'].active = true;
    var ph = canvas.closest('.canvas-placeholder');
    if (ph) ph.classList.add('canvas-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 150);
    });
  } else {
    setTimeout(init, 150);
  }
})();

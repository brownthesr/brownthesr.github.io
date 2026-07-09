(function() {
  'use strict';

  // Knowledge graph for the Current Research section.
  // Four large hub nodes (research interests) with smaller satellite nodes
  // illustrating overlapping themes. Light force-directed jitter for ambience.

  // Palette consistent with the rest of the site
  var GOLD = '212,160,36';
  var SAT_GRAY = '122,112,96';   // muted, picks up bg-secondary tone

  var COLORS = {
    agentic:    GOLD,
    generative: GOLD,
    dynamical:  GOLD,
    gnn:        GOLD,
    sat:        SAT_GRAY,
  };

  // Hubs: target relative positions in [0,1]^2 (top = small y).
  // Agentic Systems and Generative Modeling clustered toward the top.
  var HUBS = [
    { id: 'agentic',    label: 'Agentic Systems / RL', tx: 0.28, ty: 0.18, color: COLORS.agentic,    r: 18 },
    { id: 'generative', label: 'Generative Modeling',  tx: 0.72, ty: 0.18, color: COLORS.generative, r: 18 },
    { id: 'dynamical',  label: 'Dynamical Systems',    tx: 0.25, ty: 0.78, color: COLORS.dynamical,  r: 17 },
    { id: 'gnn',        label: 'GNNs',                 tx: 0.78, ty: 0.78, color: COLORS.gnn,        r: 16 },
  ];

  // Satellite nodes. Each lists which hubs it connects to.
  // `links` (optional) lists other satellite labels this node also connects to.
  var SATS = [
    // Generative
    { label: 'ODEs',                hubs: ['generative', 'dynamical'], links: ['Neural ODEs'] },
    { label: 'PDEs',                hubs: ['generative', 'dynamical'], links: ['Neural Operators'] },
    { label: 'SDEs',                hubs: ['generative', 'dynamical'], links: ['Drifting', 'Diffusion'] },
    { label: 'Diffusion',           hubs: ['generative'],              links: ['Score Matching', 'Flow Maps'] },
    { label: 'Flow Maps',           hubs: ['generative'],              links: ['Optimal Transport'] },
    { label: 'MCMC Sampling',       hubs: ['generative'],              links: ['Score Matching'] },
    { label: 'Drifting',            hubs: ['generative'],              links: ['Optimal Control'] },
    { label: 'Optimal Transport',   hubs: ['generative'],              links: ['Wasserstein'] },
    { label: 'Score Matching',      hubs: ['generative'] },
    { label: 'Variational Infer.',  hubs: ['generative'],              links: ['MCMC Sampling'] },
    { label: 'Wasserstein',         hubs: ['generative'] },
    { label: 'Latent Dynamics',     hubs: ['generative', 'dynamical'] },

    // Agentic
    { label: 'Multi-agent Opt.',    hubs: ['agentic'],                 links: ['Game Theory'] },
    { label: 'Adversarial Robust.', hubs: ['agentic', 'gnn'] },
    { label: 'Long Horizon',        hubs: ['agentic'],                 links: ['Credit Assignment', 'Hierarchical RL'] },
    { label: 'Policy Gradients',    hubs: ['agentic'] },
    { label: 'Exploration',         hubs: ['agentic'] },
    { label: 'Game Theory',         hubs: ['agentic'] },
    { label: 'Credit Assignment',   hubs: ['agentic'] },
    { label: 'Hierarchical RL',     hubs: ['agentic'] },
    { label: 'Inverse RL',          hubs: ['agentic'],                 links: ['Optimal Control'] },
    { label: 'World Models',        hubs: ['agentic', 'generative'],   links: ['Latent Dynamics'] },

    // Dynamical
    { label: 'Optimal Control',     hubs: ['dynamical', 'agentic'],    links: ['Hamiltonian'] },
    { label: 'Neural ODEs',         hubs: ['dynamical', 'generative'] },
    { label: 'Equation Free',       hubs: ['dynamical'] },
    { label: 'Equivariance',        hubs: ['dynamical', 'gnn'],        links: ['Symmetry', 'Lie Groups'] },
    { label: 'Symmetry',            hubs: ['dynamical', 'gnn'],        links: ['Lie Groups'] },
    { label: 'Fixed Point',         hubs: ['dynamical'],               links: ['Stability'] },
    { label: 'Bifurcation',         hubs: ['dynamical'],               links: ['Stability'] },
    { label: 'Koopman',             hubs: ['dynamical'],               links: ['Spectral Theory'] },
    { label: 'Hamiltonian',         hubs: ['dynamical'] },
    { label: 'Stability',           hubs: ['dynamical'] },
    { label: 'Lie Groups',          hubs: ['dynamical', 'gnn'] },
    { label: 'Manifolds',           hubs: ['dynamical', 'gnn'],        links: ['Geometric DL'] },

    // GNNs
    { label: 'Message Passing',     hubs: ['gnn'] },
    { label: 'Graphs',              hubs: ['gnn'] },
    { label: 'Spectral Theory',     hubs: ['gnn'] },
    { label: 'Geometric DL',        hubs: ['gnn'],                     links: ['Equivariance'] },
    { label: 'Attention',           hubs: ['gnn'],                     links: ['Message Passing'] },
    { label: 'Over-smoothing',      hubs: ['gnn'] },
    { label: 'Heterophily',         hubs: ['gnn'] },
    { label: 'Neural Operators',    hubs: ['gnn', 'generative'] },
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['research-manifold']) return;

    var canvas = reg['research-manifold'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build node objects with simulation state
    var nodes = [];
    var hubById = {};
    HUBS.forEach(function(h) {
      var n = {
        type: 'hub',
        id: h.id,
        label: h.label,
        color: h.color,
        r: h.r,
        tx: h.tx, ty: h.ty,
        x: h.tx, y: h.ty,
        vx: 0, vy: 0,
      };
      hubById[h.id] = n;
      nodes.push(n);
    });

    SATS.forEach(function(s, i) {
      // Average hub target position + small offset to spread satellites out
      var ax = 0, ay = 0;
      s.hubs.forEach(function(hid) {
        ax += hubById[hid].tx;
        ay += hubById[hid].ty;
      });
      ax /= s.hubs.length; ay /= s.hubs.length;
      var theta = (i * 2.39996) % (Math.PI * 2); // golden angle for nice spread
      var rad = 0.20 + ((i * 7) % 6) * 0.035;
      var tx = clamp(ax + Math.cos(theta) * rad, 0.04, 0.96);
      var ty = clamp(ay + Math.sin(theta) * rad, 0.06, 0.94);
      var n = {
        type: 'sat',
        label: s.label,
        color: COLORS.sat,
        r: 3,
        hubs: s.hubs,
        links: s.links || [],
        tx: tx,
        ty: ty,
        x: tx,
        y: ty,
        vx: 0, vy: 0,
        phase: Math.random() * Math.PI * 2,
      };
      nodes.push(n);
    });

    // Build edges: hub <-> satellite for each listed hub, plus satellite-to-satellite links
    var satByLabel = {};
    nodes.forEach(function(n) { if (n.type === 'sat') satByLabel[n.label] = n; });

    var edges = [];
    var seen = {};
    nodes.forEach(function(n) {
      if (n.type !== 'sat') return;
      n.hubs.forEach(function(hid) {
        edges.push({ a: n, b: hubById[hid], kind: 'hub' });
      });
      n.links.forEach(function(otherLabel) {
        var other = satByLabel[otherLabel];
        if (!other) return;
        var key = n.label < otherLabel ? n.label + '|' + otherLabel : otherLabel + '|' + n.label;
        if (seen[key]) return;
        seen[key] = true;
        edges.push({ a: n, b: other, kind: 'sat' });
      });
    });

    var startTime = performance.now();
    var pausedElapsed = 0;
    var visible = true;
    var rafId = null;
    var dragging = null;     // node currently being dragged
    var hover = null;        // node currently hovered (for cursor + label reveal)
    var lastLayout = { padX: 80, padY: 30, iw: 1, ih: 1 };

    function activeHubIds() {
      var ids = {};
      if (hover && hover.type === 'hub') ids[hover.id] = true;
      return ids;
    }

    function eventToRel(evt) {
      var rect = canvas.getBoundingClientRect();
      var cx = evt.clientX - rect.left;
      var cy = evt.clientY - rect.top;
      return {
        x: (cx - lastLayout.padX) / lastLayout.iw,
        y: (cy - lastLayout.padY) / lastLayout.ih,
        cx: cx,
        cy: cy,
      };
    }

    function hitTest(cx, cy) {
      // Check satellites first (small), then hubs — but hubs are bigger and visually on top.
      // Iterate in reverse paint order: hubs first (top), then sats.
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i];
        var nx = lastLayout.padX + n.x * lastLayout.iw;
        var ny = lastLayout.padY + n.y * lastLayout.ih;
        var rr = (n.type === 'hub' ? n.r : Math.max(n.r + 4, 10));
        var dx = cx - nx, dy = cy - ny;
        if (dx * dx + dy * dy <= rr * rr) return n;
      }
      return null;
    }

    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', function(evt) {
      var p = eventToRel(evt);
      var hit = hitTest(p.cx, p.cy);
      if (hit) {
        dragging = hit;
        dragging._dragOffsetX = hit.x - p.x;
        dragging._dragOffsetY = hit.y - p.y;
        canvas.setPointerCapture(evt.pointerId);
        canvas.style.cursor = 'grabbing';
        evt.preventDefault();
      }
    });

    canvas.addEventListener('pointermove', function(evt) {
      var p = eventToRel(evt);
      if (dragging) {
        dragging.x = p.x + dragging._dragOffsetX;
        dragging.y = p.y + dragging._dragOffsetY;
      } else {
        hover = hitTest(p.cx, p.cy);
        canvas.style.cursor = hover ? 'grab' : '';
      }
    });

    function endDrag(evt) {
      if (dragging) {
        try { canvas.releasePointerCapture(evt.pointerId); } catch (e) {}
        dragging = null;
        canvas.style.cursor = hover ? 'grab' : '';
      }
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', function() {
      if (!dragging) {
        hover = null;
        canvas.style.cursor = '';
      }
    });

    function draw(now) {
      var elapsed = (now - startTime) * 0.001;
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;

      // Gentle drift toward target with small periodic perturbation
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n === dragging) continue; // user controls position
        var amp = n.type === 'hub' ? 0.006 : 0.018;
        var freq = n.type === 'hub' ? 0.25 : 0.6;
        var ph = n.phase || (i * 0.7);
        var ox = Math.cos(elapsed * freq + ph) * amp;
        var oy = Math.sin(elapsed * freq * 1.13 + ph) * amp;
        // Pull toward target
        n.x += (n.tx + ox - n.x) * 0.04;
        n.y += (n.ty + oy - n.y) * 0.04;
        if (n.type === 'sat') {
          n.x = clamp(n.x, 0.04, 0.96);
          n.y = clamp(n.y, 0.06, 0.94);
        }
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Padding so labels don't clip
      var padX = 80, padY = 30;
      var iw = Math.max(40, w - padX * 2);
      var ih = Math.max(40, h - padY * 2);
      lastLayout.padX = padX; lastLayout.padY = padY;
      lastLayout.iw = iw;     lastLayout.ih = ih;
      function px(rx) { return padX + rx * iw; }
      function py(ry) { return padY + ry * ih; }

      // Edges
      ctx.lineCap = 'round';
      for (var e = 0; e < edges.length; e++) {
        var ed = edges[e];
        var ax = px(ed.a.x), ay = py(ed.a.y);
        var bx = px(ed.b.x), by = py(ed.b.y);
        ctx.beginPath();
        if (ed.kind === 'sat') {
          ctx.strokeStyle = 'rgba(' + SAT_GRAY + ',0.28)';
          ctx.lineWidth = 0.7;
          if (ctx.setLineDash) ctx.setLineDash([3, 3]);
        } else {
          ctx.strokeStyle = 'rgba(' + ed.b.color + ',0.22)';
          ctx.lineWidth = 1;
          if (ctx.setLineDash) ctx.setLineDash([]);
        }
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      if (ctx.setLineDash) ctx.setLineDash([]);

      // Nodes
      ctx.font = '500 10.5px "Inter", system-ui, sans-serif';
      ctx.textBaseline = 'middle';

      var active = activeHubIds();
      var hasActive = false;
      for (var k in active) { hasActive = true; break; }

      // Smooth fade for label reveal
      for (var fi = 0; fi < nodes.length; fi++) {
        var fn = nodes[fi];
        if (fn.type !== 'sat') continue;
        var target = 0;
        for (var hi = 0; hi < fn.hubs.length; hi++) {
          if (active[fn.hubs[hi]]) { target = 1; break; }
        }
        if (fn === hover) target = 1;
        if (fn.labelOpacity == null) fn.labelOpacity = 0;
        fn.labelOpacity += (target - fn.labelOpacity) * 0.18;
      }

      // Satellites first (under hubs)
      for (var s = 0; s < nodes.length; s++) {
        var sn = nodes[s];
        if (sn.type !== 'sat') continue;
        var x = px(sn.x), y = py(sn.y);
        // Dim satellites that aren't connected to the active hub(s)
        var isConnected = !hasActive;
        if (hasActive) {
          for (var ci = 0; ci < sn.hubs.length; ci++) {
            if (active[sn.hubs[ci]]) { isConnected = true; break; }
          }
        }
        var dotAlpha = isConnected ? 0.85 : 0.35;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + sn.color + ',' + dotAlpha + ')';
        ctx.arc(x, y, sn.r, 0, Math.PI * 2);
        ctx.fill();

        if (sn.labelOpacity > 0.02) {
          var labelGap = sn.r + 6;
          var textW = ctx.measureText(sn.label).width;
          var rightSide = (sn.x - 0.5) >= 0;
          var rightX = x + labelGap + textW;
          var leftX  = x - labelGap - textW;
          if (rightSide && rightX > w - 4) rightSide = false;
          else if (!rightSide && leftX < 4) rightSide = true;
          ctx.textAlign = rightSide ? 'left' : 'right';
          ctx.fillStyle = 'rgba(240,237,232,' + (0.92 * sn.labelOpacity) + ')';
          ctx.fillText(sn.label, x + (rightSide ? labelGap : -labelGap), y);
        }
      }

      // Hubs on top
      ctx.font = '600 14px "Inter", system-ui, sans-serif';
      for (var hI = 0; hI < nodes.length; hI++) {
        var hn = nodes[hI];
        if (hn.type !== 'hub') continue;
        var hx = px(hn.x), hy = py(hn.y);

        // Soft glow
        var grad = ctx.createRadialGradient(hx, hy, hn.r * 0.4, hx, hy, hn.r * 2.2);
        grad.addColorStop(0, 'rgba(' + hn.color + ',0.35)');
        grad.addColorStop(1, 'rgba(' + hn.color + ',0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(hx, hy, hn.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + hn.color + ',0.95)';
        ctx.arc(hx, hy, hn.r, 0, Math.PI * 2);
        ctx.fill();

        // Label centered below the hub
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(' + GOLD + ',1)';
        ctx.fillText(hn.label, hx, hy + hn.r + 14);
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
      startTime = performance.now() - pausedElapsed;
      rafId = requestAnimationFrame(draw);
    }
    function stop() {
      if (rafId == null) return;
      pausedElapsed = performance.now() - startTime;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (typeof IntersectionObserver !== 'undefined') {
      var io = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          visible = entries[i].isIntersecting;
          if (visible) start(); else stop();
        }
      }, { rootMargin: '200px 0px' });
      io.observe(canvas);
    }

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) stop();
      else if (visible) start();
    });

    if (visible) start();
    reg['research-manifold'].active = true;
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

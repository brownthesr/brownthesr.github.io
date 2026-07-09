(function() {
  'use strict';

  var ROSE = '200,104,136';
  var BLUE = '90,148,196';
  var GOLD = '230,180,90';
  var AXIS = '160,170,185';

  var NUM_REPLICAS = 4;
  // Inverse temperatures: cold (high beta) -> hot (low beta)
  var BETAS = [1.0, 0.55, 0.28, 0.12];

  // Rugged reward over a 1D source coordinate u in [-1, 1]:
  // a quadratic well with a few sharp peaks (one global, others local).
  function reward(u) {
    var bowl = -1.6 * u * u;
    var ripples =
      1.0 * Math.exp(-40 * (u - 0.55) * (u - 0.55)) +     // global mode
      0.7 * Math.exp(-50 * (u + 0.35) * (u + 0.35)) +     // local mode
      0.55 * Math.exp(-60 * (u + 0.78) * (u + 0.78)) +    // local
      0.45 * Math.exp(-70 * (u - 0.05) * (u - 0.05));     // local
    return bowl + 1.4 * ripples;
  }

  function dReward(u) {
    var h = 1e-3;
    return (reward(u + h) - reward(u - h)) / (2 * h);
  }

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['steering-tempering']) {
      setTimeout(init, 100);
      return;
    }
    var canvas = reg['steering-tempering'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build replicas. Each replica has its own current u value.
    var replicas = [];
    for (var k = 0; k < NUM_REPLICAS; k++) {
      replicas.push({
        u: -0.85 + (1.7 * k / (NUM_REPLICAS - 1)),
        beta: BETAS[k],
        trail: [],
      });
    }

    var lastTime = performance.now();
    var swapAnims = []; // { fromTrack, toTrack, t, life }
    var swapCooldown = 0;
    var rafId = null;

    function step(dt) {
      // Langevin-like proposal at each replica's temperature.
      // High temp (low beta) => bigger steps, broader exploration.
      for (var k = 0; k < replicas.length; k++) {
        var r = replicas[k];
        var stepScale = 0.9 / (r.beta + 0.05);
        // Proposal: drift up gradient + temp-scaled noise
        var drift = r.beta * dReward(r.u) * 0.04;
        var noise = (Math.random() - 0.5) * 2 * stepScale * 0.06;
        var prop = r.u + drift + noise;
        if (prop < -1) prop = -1 + Math.random() * 0.05;
        if (prop > 1) prop = 1 - Math.random() * 0.05;
        // Metropolis accept
        var dE = r.beta * (reward(prop) - reward(r.u));
        if (dE >= 0 || Math.random() < Math.exp(dE)) {
          r.u = prop;
        }
        r.trail.push(r.u);
        if (r.trail.length > 80) r.trail.shift();
      }

      // Periodic swap proposals between adjacent replicas
      swapCooldown -= dt;
      if (swapCooldown <= 0) {
        swapCooldown = 0.6 + Math.random() * 0.6;
        var k2 = Math.floor(Math.random() * (replicas.length - 1));
        var a = replicas[k2], b = replicas[k2 + 1];
        var logA = (a.beta - b.beta) * (reward(b.u) - reward(a.u));
        if (logA >= 0 || Math.random() < Math.exp(logA)) {
          var tmp = a.u; a.u = b.u; b.u = tmp;
          swapAnims.push({ fromTrack: k2, toTrack: k2 + 1, t: 0, life: 0.55 });
        }
      }

      for (var s = swapAnims.length - 1; s >= 0; s--) {
        swapAnims[s].t += dt;
        if (swapAnims[s].t >= swapAnims[s].life) swapAnims.splice(s, 1);
      }
    }

    function uToPx(u, left, right) {
      return left + ((u + 1) * 0.5) * (right - left);
    }

    function draw(now) {
      var dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;
      step(dt);

      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      if (w <= 0 || h <= 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      var padX = w * 0.08;
      var padTop = h * 0.08;
      var padBot = h * 0.06;
      var left = padX, right = w - padX;
      var trackH = (h - padTop - padBot) / NUM_REPLICAS;

      // Draw reward landscape behind tracks (faint, shared baseline at top of each track)
      // We'll draw a single landscape strip across the top, then horizontal tracks below.
      var landH = trackH * 0.9;
      var landTop = padTop;
      // Sample landscape
      var SAMPLES = 140;
      var rs = new Array(SAMPLES);
      var rMax = -Infinity, rMin = Infinity;
      for (var i = 0; i < SAMPLES; i++) {
        var u = -1 + 2 * (i / (SAMPLES - 1));
        var r = reward(u);
        rs[i] = r;
        if (r > rMax) rMax = r;
        if (r < rMin) rMin = r;
      }

      // Per-track render: each track shows the same landscape (faded) and the replica's particle + trail.
      for (var k = 0; k < NUM_REPLICAS; k++) {
        var top = padTop + k * trackH;
        var base = top + trackH * 0.95;
        var landBaseAlpha = 0.18 + 0.18 * (replicas[k].beta);

        // Landscape outline (filled)
        ctx.beginPath();
        ctx.moveTo(left, base);
        for (var i2 = 0; i2 < SAMPLES; i2++) {
          var x = left + (right - left) * (i2 / (SAMPLES - 1));
          var y = base - ((rs[i2] - rMin) / (rMax - rMin)) * (trackH * 0.7);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(right, base);
        ctx.closePath();
        // Cold = rose-tinted, hot = blue-tinted
        var coldness = replicas[k].beta;
        var lr = Math.round(BLUE.split(',')[0] * (1 - coldness) + ROSE.split(',')[0] * coldness);
        var lg = Math.round(BLUE.split(',')[1] * (1 - coldness) + ROSE.split(',')[1] * coldness);
        var lb = Math.round(BLUE.split(',')[2] * (1 - coldness) + ROSE.split(',')[2] * coldness);
        ctx.fillStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + (0.10 + 0.12 * coldness) + ')';
        ctx.fill();

        // Outline
        ctx.beginPath();
        for (var i3 = 0; i3 < SAMPLES; i3++) {
          var x3 = left + (right - left) * (i3 / (SAMPLES - 1));
          var y3 = base - ((rs[i3] - rMin) / (rMax - rMin)) * (trackH * 0.7);
          if (i3 === 0) ctx.moveTo(x3, y3);
          else ctx.lineTo(x3, y3);
        }
        ctx.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + (0.45 + 0.25 * coldness) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Baseline
        ctx.strokeStyle = 'rgba(' + AXIS + ',0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, base);
        ctx.lineTo(right, base);
        ctx.stroke();

        // Trail
        var trail = replicas[k].trail;
        ctx.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',0.55)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (var t = 0; t < trail.length; t++) {
          var px = uToPx(trail[t], left, right);
          var py = base - ((reward(trail[t]) - rMin) / (rMax - rMin)) * (trackH * 0.7);
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Particle
        var pu = replicas[k].u;
        var ppx = uToPx(pu, left, right);
        var ppy = base - ((reward(pu) - rMin) / (rMax - rMin)) * (trackH * 0.7);
        var glow = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, 10);
        glow.addColorStop(0, 'rgba(' + lr + ',' + lg + ',' + lb + ',0.55)');
        glow.addColorStop(1, 'rgba(' + lr + ',' + lg + ',' + lb + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ppx, ppy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',0.95)';
        ctx.beginPath();
        ctx.arc(ppx, ppy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Temperature label
        ctx.fillStyle = 'rgba(' + AXIS + ',0.7)';
        ctx.font = '500 10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('β = ' + replicas[k].beta.toFixed(2), left + 4, top + 12);
      }

      // Swap arrows: vertical between adjacent tracks at the swap-source's particle x.
      for (var s2 = 0; s2 < swapAnims.length; s2++) {
        var sa = swapAnims[s2];
        var prog = sa.t / sa.life;
        var alpha = (1 - prog) * 0.85;
        var topA = padTop + sa.fromTrack * trackH + trackH * 0.5;
        var topB = padTop + sa.toTrack * trackH + trackH * 0.5;
        var pa = replicas[sa.fromTrack];
        var pb = replicas[sa.toTrack];
        // After swap, the new positions are already updated; arrows just signal the event near both particles.
        var xA = uToPx(pa.u, left, right);
        var xB = uToPx(pb.u, left, right);
        ctx.strokeStyle = 'rgba(' + GOLD + ',' + alpha + ')';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xA, topA);
        ctx.lineTo(xB, topB);
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrowheads
        ctx.fillStyle = 'rgba(' + GOLD + ',' + alpha + ')';
        ctx.beginPath();
        ctx.arc(xA, topA, 2.2, 0, Math.PI * 2);
        ctx.arc(xB, topB, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafId = requestAnimationFrame(draw);
    }

    canvas.addEventListener('canvas-resize', function() {});
    rafId = requestAnimationFrame(draw);
    reg['steering-tempering'].active = true;
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

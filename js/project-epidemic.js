(function() {
  'use strict';

  var ROSE = { r: 196, g: 104, b: 136 };
  var BLUE = { r: 90, g: 148, b: 196 };
  var EDGE_COLOR = 'rgba(122, 112, 96, 0.4)';
  var EDGE_PULSE_COLOR = 'rgba(196, 104, 136, ';

  var NODES = [
    { rx: 0.50, ry: 0.45, infected: true },
    { rx: 0.28, ry: 0.30 },
    { rx: 0.72, ry: 0.28 },
    { rx: 0.22, ry: 0.60 },
    { rx: 0.75, ry: 0.65 },
    { rx: 0.50, ry: 0.78 },
    { rx: 0.38, ry: 0.18 },
    { rx: 0.62, ry: 0.82 },
  ];

  var EDGES = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 3], [1, 6], [2, 4], [4, 7], [5, 7], [5, 3],
  ];

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-epidemic']) return;

    var canvas = reg['project-epidemic'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var card = canvas.closest('.project-card');
    var hovered = false;
    var hoverStart = 0;
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

    var nodes = NODES.map(function(n, i) {
      return {
        rx: n.rx,
        ry: n.ry,
        infected: !!n.infected,
        wobbleX: Math.random() * Math.PI * 2,
        wobbleY: Math.random() * Math.PI * 2,
        wobbleSpeedX: 0.3 + Math.random() * 0.3,
        wobbleSpeedY: 0.3 + Math.random() * 0.3,
        infectionT: 0,
      };
    });

    var startTime = performance.now();

    function draw(now) {
      var elapsed = (now - startTime) * 0.001;
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      var wobbleAmt = Math.min(w, h) * 0.02;
      var nodeRadius = Math.min(w, h) * 0.04;

      var positions = nodes.map(function(n) {
        var wx = Math.sin(elapsed * n.wobbleSpeedX + n.wobbleX) * wobbleAmt;
        var wy = Math.cos(elapsed * n.wobbleSpeedY + n.wobbleY) * wobbleAmt;
        return { x: n.rx * w + wx, y: n.ry * h + wy };
      });

      var hoverElapsed = hovered ? (now - hoverStart) * 0.001 : 0;

      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].infected) {
          nodes[i].infectionT = 1;
        } else if (hovered) {
          var dist = EDGES.reduce(function(min, e) {
            if (e[0] === i || e[1] === i) {
              var other = e[0] === i ? e[1] : e[0];
              if (nodes[other].infected) return Math.min(min, 1);
              if (nodes[other].infectionT > 0.5) return Math.min(min, 2);
            }
            return min;
          }, 999);
          var delay = dist * 0.4;
          var t = Math.max(0, Math.min(1, (hoverElapsed - delay) / 0.5));
          nodes[i].infectionT = t;
        } else {
          nodes[i].infectionT = Math.max(0, nodes[i].infectionT - 0.03);
        }
      }

      for (var e = 0; e < EDGES.length; e++) {
        var a = EDGES[e][0];
        var b = EDGES[e][1];
        var pa = positions[a];
        var pb = positions[b];

        var pulseT = Math.min(nodes[a].infectionT, nodes[b].infectionT);

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.lineWidth = 1.5;

        if (pulseT > 0) {
          ctx.strokeStyle = EDGE_PULSE_COLOR + (0.3 + pulseT * 0.4) + ')';
        } else {
          ctx.strokeStyle = EDGE_COLOR;
        }
        ctx.stroke();
      }

      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        var p = positions[j];
        var t = n.infectionT;

        var r = BLUE.r + (ROSE.r - BLUE.r) * t;
        var g = BLUE.g + (ROSE.g - BLUE.g) * t;
        var bv = BLUE.b + (ROSE.b - BLUE.b) * t;

        var glowSize = nodeRadius * (1.8 + t * 1.2);
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        grad.addColorStop(0, 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bv) + ',0.3)');
        grad.addColorStop(1, 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bv) + ',0)');

        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bv) + ',' + (0.7 + t * 0.3) + ')';
        ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Stop once not hovered and all non-source infections have decayed
      if (!hovered) {
        var stillFading = false;
        for (var q = 0; q < nodes.length; q++) {
          if (!nodes[q].infected && nodes[q].infectionT > 0.001) { stillFading = true; break; }
        }
        if (!stillFading) {
          rafId = null;
          drawStatic();
          return;
        }
      }
      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      var nodeRadius = Math.min(w, h) * 0.04;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      var positions = nodes.map(function(n) {
        return { x: n.rx * w, y: n.ry * h };
      });

      for (var e = 0; e < EDGES.length; e++) {
        var pa = positions[EDGES[e][0]];
        var pb = positions[EDGES[e][1]];
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = EDGE_COLOR;
        ctx.stroke();
      }

      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        var p = positions[j];
        var t = n.infected ? 1 : 0;
        var r = BLUE.r + (ROSE.r - BLUE.r) * t;
        var g = BLUE.g + (ROSE.g - BLUE.g) * t;
        var bv = BLUE.b + (ROSE.b - BLUE.b) * t;
        var glowSize = nodeRadius * (1.8 + t * 1.2);
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        grad.addColorStop(0, 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bv) + ',0.3)');
        grad.addColorStop(1, 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bv) + ',0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bv) + ',' + (0.7 + t * 0.3) + ')';
        ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    drawStatic();
    reg['project-epidemic'].active = true;
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

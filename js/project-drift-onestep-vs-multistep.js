(function() {
  'use strict';

  var ROSE = '200,104,136';
  var GOLD = '230,180,90';
  var BLUE = '110,150,210';
  var AXIS = '160,170,185';
  var TEXT = '210,215,225';

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['drift-onestep-vs-multistep']) {
      setTimeout(init, 100);
      return;
    }
    var canvas = reg['drift-onestep-vs-multistep'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sample points to transport: noise (left) -> data (right)
    var N = 7;
    var srcPts = [];
    var dstPts = [];
    for (var i = 0; i < N; i++) {
      var t = (i + 0.5) / N;
      // noise: spread out vertically in a Gaussian-like cluster
      srcPts.push({ y: (t - 0.5) * 0.85 });
      // data: a bimodal target distribution
      var mode = i < N / 2 ? -0.32 : 0.32;
      var jitter = ((i * 1.7) % 1 - 0.5) * 0.18;
      dstPts.push({ y: mode + jitter });
    }

    function drawCloud(cx, cy, w, h, color, label) {
      // soft cluster
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
      grad.addColorStop(0, 'rgba(' + color + ',0.35)');
      grad.addColorStop(1, 'rgba(' + color + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(' + TEXT + ',0.75)';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy + h + 18);
    }

    function drawPanel(x0, y0, panelW, panelH, mode) {
      var title = mode === 'multi' ? 'Multi-step generator' : 'One-step generator';
      ctx.fillStyle = 'rgba(' + TEXT + ',0.92)';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, x0 + panelW / 2, y0 + 18);

      var leftX = x0 + panelW * 0.16;
      var rightX = x0 + panelW * 0.84;
      var midY = y0 + panelH * 0.55;
      var cloudH = panelH * 0.28;

      // background clouds
      drawCloud(leftX, midY, panelW * 0.10, cloudH, BLUE, 'noise');
      drawCloud(rightX, midY, panelW * 0.10, cloudH, ROSE, 'data');

      // points
      function pt(cx, baseY, color) {
        ctx.fillStyle = 'rgba(' + color + ',1)';
        ctx.beginPath();
        ctx.arc(cx, baseY, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // draw arrows
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (mode === 'multi') {
        // K intermediate steps with curved/perturbed paths
        var K = 8;
        for (var i = 0; i < N; i++) {
          var ys = midY + srcPts[i].y * cloudH;
          var yd = midY + dstPts[i].y * cloudH;

          // build polyline of K segments with small wobble
          var prevX = leftX, prevY = ys;
          for (var k = 1; k <= K; k++) {
            var u = k / K;
            var x = leftX + (rightX - leftX) * u;
            // interpolate y plus a wobble that decays at the endpoints
            var baseY = ys + (yd - ys) * u;
            var wobble = Math.sin(u * Math.PI * 2 + i) * 0.08 * cloudH * Math.sin(u * Math.PI);
            var y = baseY + wobble;

            // segment with arrowhead at every step
            ctx.strokeStyle = 'rgba(' + GOLD + ',0.55)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();

            // small arrowhead
            var ang = Math.atan2(y - prevY, x - prevX);
            var ah = 4;
            ctx.fillStyle = 'rgba(' + GOLD + ',0.8)';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - ah * Math.cos(ang - 0.5), y - ah * Math.sin(ang - 0.5));
            ctx.lineTo(x - ah * Math.cos(ang + 0.5), y - ah * Math.sin(ang + 0.5));
            ctx.closePath();
            ctx.fill();

            // intermediate dot
            if (k < K) {
              ctx.fillStyle = 'rgba(' + GOLD + ',0.55)';
              ctx.beginPath();
              ctx.arc(x, y, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }

            prevX = x;
            prevY = y;
          }

          pt(leftX, ys, BLUE);
          pt(rightX, yd, ROSE);
        }

        // step label
        ctx.fillStyle = 'rgba(' + TEXT + ',0.6)';
        ctx.font = '400 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('K iterative updates', x0 + panelW / 2, y0 + panelH - 10);
      } else {
        // one big arrow per point
        for (var j = 0; j < N; j++) {
          var ys2 = midY + srcPts[j].y * cloudH;
          var yd2 = midY + dstPts[j].y * cloudH;

          ctx.strokeStyle = 'rgba(' + GOLD + ',0.85)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(leftX, ys2);
          ctx.lineTo(rightX, yd2);
          ctx.stroke();

          // arrowhead
          var ang2 = Math.atan2(yd2 - ys2, rightX - leftX);
          var ah2 = 7;
          ctx.fillStyle = 'rgba(' + GOLD + ',0.95)';
          ctx.beginPath();
          ctx.moveTo(rightX, yd2);
          ctx.lineTo(rightX - ah2 * Math.cos(ang2 - 0.45), yd2 - ah2 * Math.sin(ang2 - 0.45));
          ctx.lineTo(rightX - ah2 * Math.cos(ang2 + 0.45), yd2 - ah2 * Math.sin(ang2 + 0.45));
          ctx.closePath();
          ctx.fill();

          pt(leftX, ys2, BLUE);
          pt(rightX, yd2, ROSE);
        }

        ctx.fillStyle = 'rgba(' + TEXT + ',0.6)';
        ctx.font = '400 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('single learned map', x0 + panelW / 2, y0 + panelH - 10);
      }

      // panel border
      ctx.strokeStyle = 'rgba(' + AXIS + ',0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, panelW - 1, panelH - 1);
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

      var pad = 8;
      var gap = 10;
      var panelW = (w - pad * 2 - gap) / 2;
      var panelH = h - pad * 2;

      drawPanel(pad, pad, panelW, panelH, 'multi');
      drawPanel(pad + panelW + gap, pad, panelW, panelH, 'one');

      ctx.restore();
    }

    canvas.addEventListener('canvas-resize', render);
    render();

    reg['drift-onestep-vs-multistep'].active = true;
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

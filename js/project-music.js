(function() {
  'use strict';

  var GOLD = '212,160,36';
  var STAFF = '160,170,185';
  var BLUE = '110,150,210';
  var SWEEP_DURATION = 2.4; // seconds for the playhead to cross
  var GLOW_DURATION = 0.55; // seconds a note stays lit after the playhead passes

  var NUM_LINES = 5;

  // A few decorative notes scattered along the staff. Pitch is in staff
  // half-steps from the bottom line; xFrac is horizontal placement (0..1).
  var NOTES = [
    { xFrac: 0.20, pitch: 3, beats: 1 },
    { xFrac: 0.40, pitch: 5, beats: 1 },
    { xFrac: 0.60, pitch: 4, beats: 1 },
    { xFrac: 0.80, pitch: 6, beats: 1 }
  ];

  function init() {
    var reg = window.portfolioCanvases;
    if (!reg || !reg['project-music']) return;

    var canvas = reg['project-music'].canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    function pitchToY(p, staffBottom, lineGap) {
      return staffBottom - p * (lineGap / 2);
    }

    function drawStaff(w, h) {
      var staffH = Math.min(h * 0.55, 90);
      var lineGap = staffH / (NUM_LINES - 1);
      var staffTop = (h - staffH) / 2;
      var staffBottom = staffTop + staffH;

      ctx.strokeStyle = 'rgba(' + STAFF + ',0.32)';
      ctx.lineWidth = 1;
      for (var i = 0; i < NUM_LINES; i++) {
        var y = staffTop + i * lineGap;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      return { staffTop: staffTop, staffBottom: staffBottom, lineGap: lineGap };
    }

    function drawNote(x, note, geom, glow) {
      var lineGap = geom.lineGap;
      var y = pitchToY(note.pitch, geom.staffBottom, lineGap);

      var rx = lineGap * 0.55;
      var ry = lineGap * 0.42;
      var filled = note.beats < 2;
      glow = glow || 0;

      // Glow halo behind the note when active
      if (glow > 0.01) {
        var haloR = lineGap * 1.4;
        var halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, 'rgba(' + GOLD + ',' + (0.25 * glow) + ')');
        halo.addColorStop(1, 'rgba(' + GOLD + ',0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.35);
      if (filled) {
        ctx.fillStyle = 'rgba(' + GOLD + ',0.95)';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(' + GOLD + ',0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      if (note.beats < 2) {
        var stemUp = note.pitch < (NUM_LINES - 1);
        var stemX = stemUp ? x + rx * 0.95 : x - rx * 0.95;
        var stemY1 = y;
        var stemY2 = stemUp ? y - lineGap * 2.6 : y + lineGap * 2.6;
        ctx.strokeStyle = 'rgba(' + GOLD + ',0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(stemX, stemY1);
        ctx.lineTo(stemX, stemY2);
        ctx.stroke();

        if (note.beats < 1) {
          ctx.beginPath();
          ctx.moveTo(stemX, stemY2);
          var flagDir = stemUp ? 1 : -1;
          ctx.quadraticCurveTo(
            stemX + flagDir * lineGap * 0.7, stemY2 + (stemUp ? lineGap * 0.4 : -lineGap * 0.4),
            stemX + flagDir * lineGap * 0.55, stemY2 + (stemUp ? lineGap * 1.0 : -lineGap * 1.0)
          );
          ctx.stroke();
        }
      }
    }

    var hovered = false;
    var rafId = null;
    var lastTime = 0;
    var sweepStart = 0;
    var noteHitTime = NOTES.map(function() { return -1; });

    function render(sweepX) {
      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      var geom = drawStaff(w, h);
      var nowSec = performance.now() * 0.001;

      for (var i = 0; i < NOTES.length; i++) {
        var n = NOTES[i];
        var nx = n.xFrac * w;
        var glow = 0;
        if (noteHitTime[i] >= 0) {
          var age = nowSec - noteHitTime[i];
          if (age >= 0 && age < GLOW_DURATION) {
            glow = 1 - age / GLOW_DURATION;
          }
        }
        drawNote(nx, n, geom, glow);
      }

      // Playhead vertical line
      if (sweepX != null) {
        var grad = ctx.createLinearGradient(sweepX, geom.staffTop - 16, sweepX, geom.staffBottom + 16);
        grad.addColorStop(0, 'rgba(' + BLUE + ',0)');
        grad.addColorStop(0.5, 'rgba(' + BLUE + ',0.7)');
        grad.addColorStop(1, 'rgba(' + BLUE + ',0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sweepX, geom.staffTop - 16);
        ctx.lineTo(sweepX, geom.staffBottom + 16);
        ctx.stroke();
      }

      ctx.restore();
    }

    function tick(now) {
      if (!lastTime) lastTime = now;
      lastTime = now;

      var dpr = (window.portfolioDPR?window.portfolioDPR():Math.min(window.devicePixelRatio||1,1.5));
      var w = canvas.width / dpr;
      var elapsed = (now - sweepStart) * 0.001;
      var t = elapsed / SWEEP_DURATION;

      if (t >= 1) {
        // Restart the sweep while still hovered
        if (hovered) {
          sweepStart = now;
          for (var k = 0; k < noteHitTime.length; k++) noteHitTime[k] = -1;
          t = 0;
        }
      }

      var sweepX = t * w;

      // Trigger note hits when the playhead crosses them
      for (var i = 0; i < NOTES.length; i++) {
        var nx = NOTES[i].xFrac * w;
        if (noteHitTime[i] < 0 && sweepX >= nx) {
          noteHitTime[i] = now * 0.001;
        }
      }

      render(sweepX);

      if (hovered) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        lastTime = 0;
        // Clear sweep + glows on the final frame
        for (var j = 0; j < noteHitTime.length; j++) noteHitTime[j] = -1;
        render(null);
      }
    }

    var card = canvas.closest('.project-card');
    if (card) {
      card.addEventListener('mouseenter', function() {
        if (hovered) return;
        hovered = true;
        sweepStart = performance.now();
        for (var k = 0; k < noteHitTime.length; k++) noteHitTime[k] = -1;
        if (rafId == null) rafId = requestAnimationFrame(tick);
      });
      card.addEventListener('mouseleave', function() {
        hovered = false;
      });
    }

    canvas.addEventListener('canvas-resize', function() { render(null); });
    render(null);

    reg['project-music'].active = true;
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

(function() {
  'use strict';

  // ==========================================
  // Navigation
  // ==========================================
  function initNavigation() {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (!nav) return;

    window.addEventListener('scroll', function() {
      nav.classList.toggle('is-scrolled', window.scrollY > 80);
    }, { passive: true });

    if (toggle && links) {
      toggle.addEventListener('click', function() {
        toggle.classList.toggle('is-open');
        links.classList.toggle('is-open');
        document.body.style.overflow = links.classList.contains('is-open') ? 'hidden' : '';
      });

      links.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function() {
          toggle.classList.remove('is-open');
          links.classList.remove('is-open');
          document.body.style.overflow = '';
        });
      });
    }
  }

  // ==========================================
  // Scroll Spy
  // ==========================================
  function initScrollSpy() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link');

    if (!sections.length || !navLinks.length) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.forEach(function(link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, {
      rootMargin: '-20% 0px -60% 0px'
    });

    sections.forEach(function(section) {
      observer.observe(section);
    });
  }

  // ==========================================
  // Section Reveal
  // ==========================================
  function initReveal() {
    var elements = document.querySelectorAll('.reveal, .reveal-children');

    if (!elements.length) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(function(el) {
      observer.observe(el);
    });
  }

  // ==========================================
  // Canvas Placeholder System
  // ==========================================
  function initCanvasPlaceholders() {
    var canvases = document.querySelectorAll('.canvas-placeholder canvas');
    var registry = {};

    if (!canvases.length) return;

    // Cap DPR so high-DPI displays don't pay 4-9x the pixel cost on canvas work.
    // Animations should read window.portfolioDPR() instead of window.devicePixelRatio
    // when computing CSS-pixel sizes from canvas.width/height.
    window.portfolioDPR = function() {
      return Math.min(window.devicePixelRatio || 1, 1.5);
    };

    var resizeObserver = new ResizeObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var canvas = entry.target;
        var dpr = window.portfolioDPR();
        var rect = entry.contentRect;

        if (rect.width > 0 && rect.height > 0) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          canvas.dispatchEvent(new CustomEvent('canvas-resize', {
            detail: { width: rect.width, height: rect.height, dpr: dpr }
          }));
        }
      }
    });

    canvases.forEach(function(canvas) {
      resizeObserver.observe(canvas);
      var id = canvas.dataset.canvasId;
      if (id) {
        registry[id] = { canvas: canvas, active: false };
      }
    });

    window.portfolioCanvases = registry;
  }

  // ==========================================
  // Project Card Hover
  // ==========================================
  function initCardHover() {
    var cards = document.querySelectorAll('.project-card');

    cards.forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        var placeholder = card.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.classList.add('is-hovered');
      });

      card.addEventListener('mouseleave', function() {
        var placeholder = card.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.classList.remove('is-hovered');
      });
    });
  }

  // ==========================================
  // Smooth Scroll for Anchor Links
  // ==========================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (href === '#') return;

        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ==========================================
  // Init
  // ==========================================
  function init() {
    initNavigation();
    initScrollSpy();
    initReveal();
    initCanvasPlaceholders();
    initCardHover();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * Site-wide interaction motion — click feedback (ripple, press), scroll
 * feedback (progress bar, header state, back-to-top) and hover micro
 * interactions (card tilt + cursor spotlight).
 *
 * Degradation contract:
 *  - No JS / JS error  -> everything stays visible (hidden states only
 *    exist under `html.motion-ok`, added here).
 *  - prefers-reduced-motion -> `motion-ok` is never added, so no reveal
 *    hiding, no ripples, no tilt; functional bits (back-to-top) remain.
 */
(function () {
  'use strict';

  const reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const motionOk = !reduced;

  if (motionOk) {
    document.documentElement.classList.add('motion-ok');
  }

  /* ----------------------------------------------------------------------
     Scroll state — progress bar, header elevation, back-to-top.
     One passive listener, rAF-throttled.
     ---------------------------------------------------------------------- */
  const progress = document.getElementById('scroll-progress');
  const header = document.querySelector('.site-header');
  const backToTop = document.querySelector('.back-to-top');

  let ticking = false;
  function updateScrollState() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    if (progress && max > 0) {
      progress.style.transform = `scaleX(${(y / max).toFixed(4)})`;
    }
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (backToTop) backToTop.classList.toggle('is-visible', y > 600);
  }

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        updateScrollState();
      });
    },
    { passive: true },
  );
  updateScrollState();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: motionOk ? 'smooth' : 'auto',
      });
    });
  }

  /* ----------------------------------------------------------------------
     Click ripple — a soft accent ring at the pointer down position.
     Delegated so it works for all current and future elements.
     ---------------------------------------------------------------------- */
  if (motionOk) {
    const RIPPLE_SELECTOR =
      'button, a[href], [data-ripple], .featured-card, .project-card, .post-card, .tag, .contact-link';

    document.addEventListener('pointerdown', (event) => {
      const target = event.target as Element | null;
      if (!target || !(target instanceof Element)) return;
      // Skip when a mouse drag might start a text selection.
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!target.closest(RIPPLE_SELECTOR)) return;

      const size =
        Math.min(window.innerWidth, window.innerHeight) > 768 ? 96 : 72;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      ripple.addEventListener(
        'animationend',
        () => ripple.remove(),
        { once: true },
      );
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveal — fade + rise once an element enters the viewport.
     Stagger comes from data-reveal-delay (ms) -> --reveal-delay.
     ---------------------------------------------------------------------- */
  const revealElements: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]'),
  );

  if (revealElements.length && motionOk) {
    for (const el of revealElements) {
      const delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target as HTMLElement;
            el.classList.add('is-revealed');
            observer.unobserve(el);
            // Settle back into the element's own transition rhythm.
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              el.removeAttribute('data-reveal');
            };
            el.addEventListener('transitionend', finish, {
              once: true,
            });
            window.setTimeout(finish, 1400);
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      for (const el of revealElements) observer.observe(el);
    } else {
      for (const el of revealElements) el.classList.add('is-revealed');
    }
  }

  /* ----------------------------------------------------------------------
     Card tilt + cursor spotlight — only for precise pointers (mouse),
     and only when motion is allowed.
     ---------------------------------------------------------------------- */
  if (
    motionOk &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  ) {
    const tiltElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-tilt]'),
    );
    if (tiltElements.length) {
      const MAX_TILT = 3.5; // degrees

      let rafId = 0;
      let pending: HTMLElement | null = null;

      function applyTilt(el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        // Normalized pointer position relative to element center.
        const nx = (pendingX - rect.left) / rect.width - 0.5;
        const ny = (pendingY - rect.top) / rect.height - 0.5;
        el.style.setProperty('--rx', `${(-ny * MAX_TILT * 2).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(nx * MAX_TILT * 2).toFixed(2)}deg`);
        el.style.setProperty(
          '--mx',
          `${(((pendingX - rect.left) / rect.width) * 100).toFixed(1)}%`,
        );
        el.style.setProperty(
          '--my',
          `${(((pendingY - rect.top) / rect.height) * 100).toFixed(1)}%`,
        );
      }

      let pendingX = 0;
      let pendingY = 0;

      for (const el of tiltElements) {
        el.addEventListener(
          'mousemove',
          (event) => {
            pending = el;
            pendingX = event.clientX;
            pendingY = event.clientY;
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
              rafId = 0;
              if (pending) {
                pending.classList.add('is-tilting');
                applyTilt(pending);
              }
            });
          },
          { passive: true },
        );
        el.addEventListener(
          'mouseleave',
          () => {
            if (rafId) {
              window.cancelAnimationFrame(rafId);
              rafId = 0;
            }
            el.classList.remove('is-tilting');
            el.style.removeProperty('--rx');
            el.style.removeProperty('--ry');
            el.style.removeProperty('--mx');
            el.style.removeProperty('--my');
          },
          { passive: true },
        );
      }
    }
  }
})();
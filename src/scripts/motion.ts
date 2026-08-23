/**
 * Site-wide interaction motion — click feedback (ripple, press), scroll
 * feedback (progress bar, header state, back-to-top) and scroll-triggered
 * reveal.
 *
 * Degradation contract:
 *  - No JS / JS error  -> everything stays visible (hidden states only
 *    exist under `html.motion-ok`, added here).
 *  - prefers-reduced-motion -> `motion-ok` is never added, so no reveal
 *    hiding, no ripples; functional bits (back-to-top) remain.
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
})();
/**
 * Site-wide interaction motion — click feedback (ripple), scroll feedback
 * (header state, back-to-top), scroll-triggered reveal and hover feedback
 * (card cursor spotlight, terminal selection frame).
 *
 * Degradation contract:
 *  - No JS / JS error  -> everything stays visible (hidden states only
 *    exist under `html.motion-ok`, added here).
 *  - prefers-reduced-motion -> `motion-ok` is never added, so no reveal
 *    hiding, no ripples, no spotlight or selection frame; functional
 *    bits (back-to-top) remain.
 *  - Touch / coarse pointers -> spotlight and selection frame never
 *    attach.
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
     Scroll state — header elevation, back-to-top.
     One passive listener, rAF-throttled.
     ---------------------------------------------------------------------- */
  const header = document.querySelector('.site-header');
  const backToTop = document.querySelector('.back-to-top');

  let ticking = false;
  function updateScrollState() {
    const y = window.scrollY;
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
      'button, a[href], [data-ripple], .featured-card, .project-card, .post-card, .matrix-card, .tag, .contact-link';

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
     Hover feedback — only for precise pointers (mouse), and only when
     motion is allowed.
     ---------------------------------------------------------------------- */
  if (
    motionOk &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  ) {
    /* Card cursor spotlight — feed `--mx`/`--my` while the pointer moves
       over a card; `is-spotlighting` fades the layer in, removal fades it
       out at the last position so re-entry never jumps to the center. */
    const spotTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.featured-card, .project-card, .post-card, .matrix-card, .contact-link',
      ),
    );

    let spotRafId = 0;
    let spotEl: HTMLElement | null = null;
    let spotX = 0;
    let spotY = 0;

    function applySpotlight(el: HTMLElement, x: number, y: number) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      el.style.setProperty(
        '--mx',
        `${(((x - rect.left) / rect.width) * 100).toFixed(1)}%`,
      );
      el.style.setProperty(
        '--my',
        `${(((y - rect.top) / rect.height) * 100).toFixed(1)}%`,
      );
    }

    for (const el of spotTargets) {
      el.addEventListener(
        'mousemove',
        (event) => {
          spotEl = el;
          spotX = event.clientX;
          spotY = event.clientY;
          if (spotRafId) return;
          spotRafId = window.requestAnimationFrame(() => {
            spotRafId = 0;
            if (!spotEl) return;
            spotEl.classList.add('is-spotlighting');
            applySpotlight(spotEl, spotX, spotY);
          });
        },
        { passive: true },
      );
      el.addEventListener(
        'mouseleave',
        () => {
          if (spotRafId) {
            window.cancelAnimationFrame(spotRafId);
            spotRafId = 0;
          }
          spotEl = null;
          el.classList.remove('is-spotlighting');
        },
        { passive: true },
      );
    }

    /* Terminal selection frame — glides onto the hovered link or button
       and wraps it; hides over plain content. Glow elements (cards,
       contact buttons) are excluded: they already carry the orange glow
       and a green frame on top reads as noise. The rAF loop runs only
       while the frame is catching up with its target. */
    const FRAME_INTERACTIVE = 'a, button';
    const FRAME_EXCLUDE =
      '.featured-card, .project-card, .post-card, .matrix-card, .contact-link';
    const FRAME_PAD = 4;

    const selFrame = document.createElement('span');
    selFrame.className = 'ghost-frame';
    selFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(selFrame);

    let frameShown = false;
    let frameRafId = 0;
    let fx = 0;
    let fy = 0;
    let fw = 0;
    let fh = 0;
    let tx = 0;
    let ty = 0;
    let tw = 0;
    let th = 0;

    function frameStep() {
      frameRafId = 0;
      fx += (tx - fx) * 0.25;
      fy += (ty - fy) * 0.25;
      fw += (tw - fw) * 0.25;
      fh += (th - fh) * 0.25;
      selFrame.style.setProperty('--frame-x', `${fx.toFixed(1)}px`);
      selFrame.style.setProperty('--frame-y', `${fy.toFixed(1)}px`);
      selFrame.style.setProperty('--frame-w', `${fw.toFixed(1)}px`);
      selFrame.style.setProperty('--frame-h', `${fh.toFixed(1)}px`);
      const settled =
        Math.abs(tx - fx) < 0.5 &&
        Math.abs(ty - fy) < 0.5 &&
        Math.abs(tw - fw) < 0.5 &&
        Math.abs(th - fh) < 0.5;
      if (!settled) frameRafId = window.requestAnimationFrame(frameStep);
    }

    function hideFrame() {
      frameShown = false;
      selFrame.classList.remove('is-visible');
      if (frameRafId) {
        window.cancelAnimationFrame(frameRafId);
        frameRafId = 0;
      }
    }

    document.addEventListener(
      'mousemove',
      (event) => {
        const hit =
          event.target instanceof Element
            ? event.target.closest(FRAME_INTERACTIVE)
            : null;
        // Glow elements already have their own hover feedback; a frame
        // on top would stack two competing effects.
        const target =
          hit && !hit.closest(FRAME_EXCLUDE) ? hit : null;
        if (!target) {
          if (frameShown) hideFrame();
          return;
        }
        const rect = target.getBoundingClientRect();
        tx = rect.left - FRAME_PAD;
        ty = rect.top - FRAME_PAD;
        tw = rect.width + FRAME_PAD * 2;
        th = rect.height + FRAME_PAD * 2;
        if (!frameShown) {
          frameShown = true;
          selFrame.classList.add('is-visible');
          // First lock-on lands directly on the target instead of
          // gliding in from a stale position.
          fx = tx;
          fy = ty;
          fw = tw;
          fh = th;
        }
        if (!frameRafId) {
          frameRafId = window.requestAnimationFrame(frameStep);
        }
      },
      { passive: true },
    );

    document.documentElement.addEventListener('mouseleave', hideFrame);
  }
})();
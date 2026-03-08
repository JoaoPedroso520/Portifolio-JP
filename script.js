
(() => {
  'use strict';

  const STORAGE_THEME_KEY = 'jp-theme';
  const PRELOAD_HIDE_DELAY_MS = 780;
  const MENU_DESKTOP_BREAKPOINT = 860;
  const COUNTER_DURATION_MS = 1200;
  const TICKER_RESIZE_DEBOUNCE_MS = 180;
  const FORM_REQUEST_TIMEOUT_MS = 12000;

  const body = document.body;
  const root = document.documentElement;

  const preload = document.getElementById('preload');
  const progressBar = document.getElementById('progressBar');
  const menuBtn = document.getElementById('menuBtn');
  const navbar = document.getElementById('navbar');
  const navLinks = Array.from(document.querySelectorAll('#navList a'));
  const themeBtn = document.getElementById('themeBtn');
  const yearNode = document.getElementById('year');
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');

  const revealItems = Array.from(document.querySelectorAll('.reveal'));
  const counterNodes = Array.from(document.querySelectorAll('[data-counter]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  function safeGetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* ignore localStorage failures */
    }
  }

  function supportsIntersectionObserver() {
    return typeof window.IntersectionObserver !== 'undefined';
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function initInlineIconAccessibility() {
    const icons = Array.from(document.querySelectorAll('a svg, button svg'));
    icons.forEach((icon) => {
      if (!icon.hasAttribute('aria-hidden')) {
        icon.setAttribute('aria-hidden', 'true');
      }

      if (!icon.hasAttribute('focusable')) {
        icon.setAttribute('focusable', 'false');
      }
    });
  }

  function initExternalLinksSecurity() {
    const links = Array.from(document.querySelectorAll('a[target="_blank"]'));

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch (error) {
        return;
      }

      if (url.origin === window.location.origin) return;

      const relTokens = new Set(
        (link.getAttribute('rel') || '')
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean)
      );
      relTokens.add('noopener');
      relTokens.add('noreferrer');
      link.setAttribute('rel', Array.from(relTokens).join(' '));
    });
  }

  function initPreload() {
    if (!preload) return;

    const hidePreload = () => {
      preload.classList.add('hide');
      preload.setAttribute('aria-hidden', 'true');
    };

    if (document.readyState === 'complete') {
      window.setTimeout(hidePreload, PRELOAD_HIDE_DELAY_MS);
      return;
    }

    window.addEventListener(
      'load',
      () => {
        window.setTimeout(hidePreload, PRELOAD_HIDE_DELAY_MS);
      },
      { once: true }
    );
  }

  function initDynamicYear() {
    if (!yearNode) return;
    yearNode.textContent = String(new Date().getFullYear());
  }

  function initImageDecodingHints() {
    const images = Array.from(document.images);

    images.forEach((image) => {
      if (!image.getAttribute('decoding')) {
        image.decoding = 'async';
      }
    });
  }

  function initScrollProgressBar() {
    if (!progressBar) return;

    let rafId = 0;

    const updateProgress = () => {
      const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = totalScrollable > 0 ? (window.scrollY / totalScrollable) * 100 : 0;
      progressBar.style.width = `${percent}%`;
      rafId = 0;
    };

    const requestUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestUpdate();
  }

  function setMenuState(isOpen) {
    if (!menuBtn || !navbar) return;

    navbar.classList.toggle('open', isOpen);
    menuBtn.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  }

  function initMobileMenu() {
    if (!menuBtn || !navbar) return;

    const isMenuOpen = () => navbar.classList.contains('open');

    menuBtn.addEventListener('click', () => {
      setMenuState(!isMenuOpen());
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        setMenuState(false);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !isMenuOpen()) return;
      setMenuState(false);
      menuBtn.focus();
    });

    document.addEventListener('click', (event) => {
      if (!isMenuOpen()) return;
      if (!(event.target instanceof Node)) return;
      if (navbar.contains(event.target) || menuBtn.contains(event.target)) return;
      setMenuState(false);
    });

    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > MENU_DESKTOP_BREAKPOINT && isMenuOpen()) {
          setMenuState(false);
        }
      },
      { passive: true }
    );
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    body.classList.toggle('dark', isDark);
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }

  function resolveInitialTheme() {
    const savedTheme = safeGetLocalStorage(STORAGE_THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    if (root.classList.contains('dark')) {
      return 'dark';
    }

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }

  function initThemeToggle() {
    const mediaQuery = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    const savedTheme = safeGetLocalStorage(STORAGE_THEME_KEY);
    let hasManualTheme = savedTheme === 'dark' || savedTheme === 'light';
    let currentTheme = resolveInitialTheme();

    applyTheme(currentTheme);

    if (themeBtn) {
      const syncThemeLabel = () => {
        themeBtn.setAttribute(
          'aria-label',
          body.classList.contains('dark')
            ? 'Ativar tema claro'
            : 'Ativar tema escuro'
        );
      };

      syncThemeLabel();

      themeBtn.addEventListener('click', () => {
        currentTheme = body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(currentTheme);
        safeSetLocalStorage(STORAGE_THEME_KEY, currentTheme);
        hasManualTheme = true;
        syncThemeLabel();
      });
    }

    if (!mediaQuery) return;

    const handleSystemThemeChange = (event) => {
      if (hasManualTheme) return;
      currentTheme = event.matches ? 'dark' : 'light';
      applyTheme(currentTheme);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  function initRevealAnimations(reducedMotion) {
    if (revealItems.length === 0) return;

    if (reducedMotion || !supportsIntersectionObserver()) {
      revealItems.forEach((item) => item.classList.add('show'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  function animateCounter(counterEl, reducedMotion) {
    const target = Number(counterEl.dataset.counter) || 0;
    const suffix = counterEl.dataset.suffix || '';

    if (reducedMotion) {
      counterEl.textContent = `${target}${suffix}`;
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / COUNTER_DURATION_MS, 1);
      const value = Math.floor(progress * target);
      counterEl.textContent = `${value}${suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  function initCounters(reducedMotion) {
    if (counterNodes.length === 0) return;

    if (!supportsIntersectionObserver()) {
      counterNodes.forEach((counterEl) => animateCounter(counterEl, reducedMotion));
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target, reducedMotion);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    counterNodes.forEach((counterEl) => counterObserver.observe(counterEl));
  }

  function initInfiniteTickers() {
    const tracks = Array.from(document.querySelectorAll('[data-track]')).filter(
      (track) => track.parentElement
    );
    if (tracks.length === 0) return;

    const configs = tracks.map((track) => ({
      track,
      parent: track.parentElement,
      templateNodes: Array.from(track.children).map((child) => child.cloneNode(true))
    }));

    const renderTrack = ({ track, parent, templateNodes }) => {
      if (!parent || templateNodes.length === 0) return;

      const initialBatch = document.createDocumentFragment();
      templateNodes.forEach((node) => initialBatch.appendChild(node.cloneNode(true)));
      track.replaceChildren(initialBatch);

      const minCycleWidth = parent.clientWidth * 1.25;
      let attempts = 0;
      while (track.scrollWidth < minCycleWidth && attempts < 24) {
        const growthBatch = document.createDocumentFragment();
        templateNodes.forEach((node) => growthBatch.appendChild(node.cloneNode(true)));
        track.appendChild(growthBatch);
        attempts += 1;
      }

      const cycleWidth = track.scrollWidth || parent.clientWidth;
      const duplicateBatch = document.createDocumentFragment();
      Array.from(track.children).forEach((node) => {
        duplicateBatch.appendChild(node.cloneNode(true));
      });
      track.appendChild(duplicateBatch);

      const speed = Number(track.dataset.speed) || 95;
      const minDuration = Number(track.dataset.minDuration) || 18;
      const duration = Math.max(cycleWidth / speed, minDuration);
      track.style.setProperty('--loop-width', `${cycleWidth}px`);
      track.style.animationDuration = `${duration.toFixed(2)}s`;
    };

    const renderAllTracks = () => {
      configs.forEach(renderTrack);
    };

    renderAllTracks();

    let resizeTimer = 0;
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(renderAllTracks, TICKER_RESIZE_DEBOUNCE_MS);
      },
      { passive: true }
    );
  }

  function setActiveNavLink(sectionId) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initNavigationObserver() {
    if (sections.length === 0 || navLinks.length === 0) return;

    const initialId = window.location.hash
      ? window.location.hash.replace('#', '')
      : sections[0].id;
    if (initialId) {
      setActiveNavLink(initialId);
    }

    if (!supportsIntersectionObserver()) return;

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActiveNavLink(entry.target.id);
        });
      },
      { threshold: 0.45 }
    );

    sections.forEach((section) => navObserver.observe(section));
  }

  function setFormMessage(type, message) {
    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.hidden = false;
    formMessage.classList.remove('is-sending', 'is-success', 'is-error');
    formMessage.classList.add(type, 'show');
    formMessage.setAttribute('role', type === 'is-error' ? 'alert' : 'status');
    formMessage.setAttribute('aria-live', type === 'is-error' ? 'assertive' : 'polite');
  }

  function initContactForm() {
    if (!contactForm || !formMessage) return;

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const defaultBtnLabel = submitBtn ? submitBtn.textContent : 'Enviar mensagem';
    const honeypot = contactForm.querySelector('input[name="_honey"]');
    contactForm.setAttribute('aria-busy', 'false');

    const setSubmittingState = (isSubmitting) => {
      if (!submitBtn) return;

      submitBtn.disabled = isSubmitting;
      submitBtn.setAttribute('aria-disabled', String(isSubmitting));
      submitBtn.textContent = isSubmitting ? 'Enviando...' : defaultBtnLabel;
      contactForm.setAttribute('aria-busy', String(isSubmitting));
    };

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (honeypot && honeypot.value.trim() !== '') {
        contactForm.reset();
        setFormMessage('is-success', 'Mensagem enviada com sucesso. Obrigado pelo contato!');
        return;
      }

      const data = new FormData(contactForm);
      const controller =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), FORM_REQUEST_TIMEOUT_MS)
        : 0;

      setFormMessage('is-sending', 'Enviando sua mensagem...');
      setSubmittingState(true);

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
          signal: controller ? controller.signal : undefined
        });

        if (!response.ok) {
          throw new Error('Form submit failed');
        }

        contactForm.reset();
        setFormMessage(
          'is-success',
          'Mensagem enviada com sucesso. Obrigado pelo contato!'
        );
      } catch (error) {
        const isTimeout =
          error instanceof DOMException && error.name === 'AbortError';
        setFormMessage(
          'is-error',
          isTimeout
            ? 'Tempo de envio excedido. Tente novamente.'
            : 'Nao foi possivel enviar agora. Tente novamente ou chame no WhatsApp.'
        );
      } finally {
        if (controller) {
          window.clearTimeout(timeoutId);
        }
        setSubmittingState(false);
      }
    });
  }


(() => {
  'use strict';

  const STORAGE_THEME_KEY = 'jp-theme';
  const PRELOAD_HIDE_DELAY_MS = 780;
  const MENU_DESKTOP_BREAKPOINT = 860;
  const COUNTER_DURATION_MS = 1200;
  const TICKER_RESIZE_DEBOUNCE_MS = 180;
  const FORM_REQUEST_TIMEOUT_MS = 12000;

  const body = document.body;
  const root = document.documentElement;

  const preload = document.getElementById('preload');
  const progressBar = document.getElementById('progressBar');
  const menuBtn = document.getElementById('menuBtn');
  const navbar = document.getElementById('navbar');
  const navLinks = Array.from(document.querySelectorAll('#navList a'));
  const themeBtn = document.getElementById('themeBtn');
  const yearNode = document.getElementById('year');
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');

  const revealItems = Array.from(document.querySelectorAll('.reveal'));
  const counterNodes = Array.from(document.querySelectorAll('[data-counter]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  function safeGetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* ignore localStorage failures */
    }
  }

  function supportsIntersectionObserver() {
    return typeof window.IntersectionObserver !== 'undefined';
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function initInlineIconAccessibility() {
    const icons = Array.from(document.querySelectorAll('a svg, button svg'));
    icons.forEach((icon) => {
      if (!icon.hasAttribute('aria-hidden')) {
        icon.setAttribute('aria-hidden', 'true');
      }

      if (!icon.hasAttribute('focusable')) {
        icon.setAttribute('focusable', 'false');
      }
    });
  }

  function initExternalLinksSecurity() {
    const links = Array.from(document.querySelectorAll('a[target="_blank"]'));

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch (error) {
        return;
      }

      if (url.origin === window.location.origin) return;

      const relTokens = new Set(
        (link.getAttribute('rel') || '')
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean)
      );
      relTokens.add('noopener');
      relTokens.add('noreferrer');
      link.setAttribute('rel', Array.from(relTokens).join(' '));
    });
  }

  function initPreload() {
    if (!preload) return;

    const hidePreload = () => {
      preload.classList.add('hide');
      preload.setAttribute('aria-hidden', 'true');
    };

    if (document.readyState === 'complete') {
      window.setTimeout(hidePreload, PRELOAD_HIDE_DELAY_MS);
      return;
    }

    window.addEventListener(
      'load',
      () => {
        window.setTimeout(hidePreload, PRELOAD_HIDE_DELAY_MS);
      },
      { once: true }
    );
  }

  function initDynamicYear() {
    if (!yearNode) return;
    yearNode.textContent = String(new Date().getFullYear());
  }

  function initImageDecodingHints() {
    const images = Array.from(document.images);

    images.forEach((image) => {
      if (!image.getAttribute('decoding')) {
        image.decoding = 'async';
      }
    });
  }

  function initScrollProgressBar() {
    if (!progressBar) return;

    let rafId = 0;

    const updateProgress = () => {
      const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = totalScrollable > 0 ? (window.scrollY / totalScrollable) * 100 : 0;
      progressBar.style.width = `${percent}%`;
      rafId = 0;
    };

    const requestUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestUpdate();
  }

  function setMenuState(isOpen) {
    if (!menuBtn || !navbar) return;

    navbar.classList.toggle('open', isOpen);
    menuBtn.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  }

  function initMobileMenu() {
    if (!menuBtn || !navbar) return;

    const isMenuOpen = () => navbar.classList.contains('open');

    menuBtn.addEventListener('click', () => {
      setMenuState(!isMenuOpen());
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        setMenuState(false);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !isMenuOpen()) return;
      setMenuState(false);
      menuBtn.focus();
    });

    document.addEventListener('click', (event) => {
      if (!isMenuOpen()) return;
      if (!(event.target instanceof Node)) return;
      if (navbar.contains(event.target) || menuBtn.contains(event.target)) return;
      setMenuState(false);
    });

    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > MENU_DESKTOP_BREAKPOINT && isMenuOpen()) {
          setMenuState(false);
        }
      },
      { passive: true }
    );
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    body.classList.toggle('dark', isDark);
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }

  function resolveInitialTheme() {
    const savedTheme = safeGetLocalStorage(STORAGE_THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    if (root.classList.contains('dark')) {
      return 'dark';
    }

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }

  function initThemeToggle() {
    const mediaQuery = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    const savedTheme = safeGetLocalStorage(STORAGE_THEME_KEY);
    let hasManualTheme = savedTheme === 'dark' || savedTheme === 'light';
    let currentTheme = resolveInitialTheme();

    applyTheme(currentTheme);

    if (themeBtn) {
      const syncThemeLabel = () => {
        themeBtn.setAttribute(
          'aria-label',
          body.classList.contains('dark')
            ? 'Ativar tema claro'
            : 'Ativar tema escuro'
        );
      };

      syncThemeLabel();

      themeBtn.addEventListener('click', () => {
        currentTheme = body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(currentTheme);
        safeSetLocalStorage(STORAGE_THEME_KEY, currentTheme);
        hasManualTheme = true;
        syncThemeLabel();
      });
    }

    if (!mediaQuery) return;

    const handleSystemThemeChange = (event) => {
      if (hasManualTheme) return;
      currentTheme = event.matches ? 'dark' : 'light';
      applyTheme(currentTheme);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  function initRevealAnimations(reducedMotion) {
    if (revealItems.length === 0) return;

    if (reducedMotion || !supportsIntersectionObserver()) {
      revealItems.forEach((item) => item.classList.add('show'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  function animateCounter(counterEl, reducedMotion) {
    const target = Number(counterEl.dataset.counter) || 0;
    const suffix = counterEl.dataset.suffix || '';

    if (reducedMotion) {
      counterEl.textContent = `${target}${suffix}`;
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / COUNTER_DURATION_MS, 1);
      const value = Math.floor(progress * target);
      counterEl.textContent = `${value}${suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  function initCounters(reducedMotion) {
    if (counterNodes.length === 0) return;

    if (!supportsIntersectionObserver()) {
      counterNodes.forEach((counterEl) => animateCounter(counterEl, reducedMotion));
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target, reducedMotion);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    counterNodes.forEach((counterEl) => counterObserver.observe(counterEl));
  }

  function initInfiniteTickers() {
    const tracks = Array.from(document.querySelectorAll('[data-track]')).filter(
      (track) => track.parentElement
    );
    if (tracks.length === 0) return;

    const configs = tracks.map((track) => ({
      track,
      parent: track.parentElement,
      templateNodes: Array.from(track.children).map((child) => child.cloneNode(true))
    }));

    const renderTrack = ({ track, parent, templateNodes }) => {
      if (!parent || templateNodes.length === 0) return;

      const initialBatch = document.createDocumentFragment();
      templateNodes.forEach((node) => initialBatch.appendChild(node.cloneNode(true)));
      track.replaceChildren(initialBatch);

      const minCycleWidth = parent.clientWidth * 1.25;
      let attempts = 0;
      while (track.scrollWidth < minCycleWidth && attempts < 24) {
        const growthBatch = document.createDocumentFragment();
        templateNodes.forEach((node) => growthBatch.appendChild(node.cloneNode(true)));
        track.appendChild(growthBatch);
        attempts += 1;
      }

      const cycleWidth = track.scrollWidth || parent.clientWidth;
      const duplicateBatch = document.createDocumentFragment();
      Array.from(track.children).forEach((node) => {
        duplicateBatch.appendChild(node.cloneNode(true));
      });
      track.appendChild(duplicateBatch);

      const speed = Number(track.dataset.speed) || 95;
      const minDuration = Number(track.dataset.minDuration) || 18;
      const duration = Math.max(cycleWidth / speed, minDuration);
      track.style.setProperty('--loop-width', `${cycleWidth}px`);
      track.style.animationDuration = `${duration.toFixed(2)}s`;
    };

    const renderAllTracks = () => {
      configs.forEach(renderTrack);
    };

    renderAllTracks();

    let resizeTimer = 0;
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(renderAllTracks, TICKER_RESIZE_DEBOUNCE_MS);
      },
      { passive: true }
    );
  }

  function normalizeSearchValue(value) {
    const safeValue = String(value || '').trim().toLowerCase();

    if (typeof safeValue.normalize !== 'function') {
      return safeValue;
    }

    return safeValue.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function initProjectFilters() {
    const searchInput = document.querySelector('[data-project-search]');
    const resultNode = document.querySelector('[data-project-results]');
    const emptyState = document.querySelector('[data-project-empty]');
    const filterButtons = Array.from(document.querySelectorAll('[data-project-filter]'));
    const projectCards = Array.from(document.querySelectorAll('[data-project-card]'));

    if (projectCards.length === 0 || filterButtons.length === 0) return;

    let activeFilter =
      filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.projectFilter ||
      'all';

    const setActiveFilter = (nextFilter) => {
      activeFilter = nextFilter;

      filterButtons.forEach((button) => {
        const isActive = button.dataset.projectFilter === nextFilter;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    };

    const updateProjects = () => {
      const query = normalizeSearchValue(searchInput ? searchInput.value : '');
      let visibleCount = 0;

      projectCards.forEach((card) => {
        const projectName = normalizeSearchValue(card.dataset.projectName || '');
        const projectCategory = card.dataset.projectCategory || '';
        const matchesFilter = activeFilter === 'all' || projectCategory === activeFilter;
        const matchesSearch = query === '' || projectName.includes(query);
        const shouldShow = matchesFilter && matchesSearch;

        card.hidden = !shouldShow;

        if (shouldShow) {
          visibleCount += 1;
        }
      });

      if (resultNode) {
        resultNode.textContent =
          visibleCount === 1
            ? '1 projeto encontrado'
            : `${visibleCount} projetos encontrados`;
      }

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextFilter = button.dataset.projectFilter || 'all';
        if (nextFilter === activeFilter) return;
        setActiveFilter(nextFilter);
        updateProjects();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', updateProjects);
    }

    setActiveFilter(activeFilter);
    updateProjects();
  }

  function setActiveNavLink(sectionId) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initNavigationObserver() {
    if (sections.length === 0 || navLinks.length === 0) return;

    const initialId = window.location.hash
      ? window.location.hash.replace('#', '')
      : sections[0].id;
    if (initialId) {
      setActiveNavLink(initialId);
    }

    if (!supportsIntersectionObserver()) return;

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActiveNavLink(entry.target.id);
        });
      },
      { threshold: 0.45 }
    );

    sections.forEach((section) => navObserver.observe(section));
  }

  function setFormMessage(type, message) {
    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.hidden = false;
    formMessage.classList.remove('is-sending', 'is-success', 'is-error');
    formMessage.classList.add(type, 'show');
    formMessage.setAttribute('role', type === 'is-error' ? 'alert' : 'status');
    formMessage.setAttribute('aria-live', type === 'is-error' ? 'assertive' : 'polite');
  }

  function initContactForm() {
    if (!contactForm || !formMessage) return;

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const defaultBtnLabel = submitBtn ? submitBtn.textContent : 'Enviar mensagem';
    const honeypot = contactForm.querySelector('input[name="_honey"]');
    contactForm.setAttribute('aria-busy', 'false');

    const setSubmittingState = (isSubmitting) => {
      if (!submitBtn) return;

      submitBtn.disabled = isSubmitting;
      submitBtn.setAttribute('aria-disabled', String(isSubmitting));
      submitBtn.textContent = isSubmitting ? 'Enviando...' : defaultBtnLabel;
      contactForm.setAttribute('aria-busy', String(isSubmitting));
    };

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (honeypot && honeypot.value.trim() !== '') {
        contactForm.reset();
        setFormMessage('is-success', 'Mensagem enviada com sucesso. Obrigado pelo contato!');
        return;
      }

      const data = new FormData(contactForm);
      const controller =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), FORM_REQUEST_TIMEOUT_MS)
        : 0;

      setFormMessage('is-sending', 'Enviando sua mensagem...');
      setSubmittingState(true);

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
          signal: controller ? controller.signal : undefined
        });

        if (!response.ok) {
          throw new Error('Form submit failed');
        }

        contactForm.reset();
        setFormMessage(
          'is-success',
          'Mensagem enviada com sucesso. Obrigado pelo contato!'
        );
      } catch (error) {
        const isTimeout =
          error instanceof DOMException && error.name === 'AbortError';
        setFormMessage(
          'is-error',
          isTimeout
            ? 'Tempo de envio excedido. Tente novamente.'
            : 'Nao foi possivel enviar agora. Tente novamente ou chame no WhatsApp.'
        );
      } finally {
        if (controller) {
          window.clearTimeout(timeoutId);
        }
        setSubmittingState(false);
      }
    });
  }


  function shouldBlockShortcut(event) {
    const key = event.key.toLowerCase();
    const hasPrimaryModifier = event.ctrlKey || event.metaKey;

    if (key === 'f12') {
      return true;
    }

    if (!hasPrimaryModifier) {
      return false;
    }

    if (key === 'u') {
      return true;
    }

    return event.shiftKey && (key === 'i' || key === 'j' || key === 'c');
  }

  function isEditableTarget(target) {
    return (
      target instanceof HTMLElement &&
      Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    );
  }

  function initInteractionRestrictions() {
    const preventDefault = (event) => {
      event.preventDefault();
    };

    document.addEventListener('contextmenu', (event) => {
      if (isEditableTarget(event.target)) return;
      preventDefault(event);
    });

    document.addEventListener('keydown', (event) => {
      if (isEditableTarget(event.target)) return;
      if (!shouldBlockShortcut(event)) return;
      event.preventDefault();
    });

    document.addEventListener('dragstart', (event) => {
      if (isEditableTarget(event.target)) return;
      preventDefault(event);
    });

    document.addEventListener('selectstart', (event) => {
      if (isEditableTarget(event.target)) return;
      preventDefault(event);
    });
  }


  function init() {
    const reducedMotion = prefersReducedMotion();

    initInlineIconAccessibility();
    initExternalLinksSecurity();
    initPreload();
    initDynamicYear();
    initImageDecodingHints();
    initScrollProgressBar();
    initMobileMenu();
    initThemeToggle();
    initRevealAnimations(reducedMotion);
    initCounters(reducedMotion);
    initInfiniteTickers();
    initProjectFilters();
    initNavigationObserver();
    initContactForm();
    initInteractionRestrictions();
  }

  init();
})();
})();



/* ==========================================================================
   Tokyo LLC — interactions
   ========================================================================== */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ---------------------------------------------------------------- Year */

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----------------------------------------------------- Mobile nav menu */

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  const closeNav = () => {
    navLinks?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Open menu');
  };

  navToggle?.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  $$('.nav-links a').forEach((link) => link.addEventListener('click', closeNav));

  document.addEventListener('click', (event) => {
    if (!navLinks?.classList.contains('open')) return;
    if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;
    closeNav();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  /* --------------------------------- Header state + scroll progress + spy */

  const header = document.getElementById('siteHeader');
  const progressBar = $('.scroll-progress span');
  const toTop = document.getElementById('toTop');
  const sections = $$('main section[id]');
  const navItems = $$('.nav-link');

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    header?.classList.toggle('scrolled', y > 12);
    toTop?.classList.toggle('show', y > 620);
    if (progressBar) progressBar.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;

    // Safety net: anything still hidden once the page bottom is reached
    if (max > 0 && max - y < 4) {
      document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => el.classList.add('in'));
    }

    const marker = y + window.innerHeight * 0.32;
    let current = '';
    sections.forEach((section) => {
      if (section.offsetTop <= marker) current = section.id;
    });
    navItems.forEach((item) => {
      item.classList.toggle('active', item.getAttribute('href') === `#${current}`);
    });
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ----------------------------------------------- Scroll reveal on enter */

  const revealItems = $$('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((el) => el.classList.add('in'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.setProperty('--reveal-delay', `${el.dataset.delay || 0}ms`);
        el.classList.add('in');
        revealObserver.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* -------------------------------------------- Hero headline word reveal */

  const splitTarget = $('[data-split]');
  if (splitTarget) {
    const words = splitTarget.textContent.trim().split(/\s+/);
    const accentFrom = Math.max(words.length - 2, 0);

    splitTarget.textContent = '';
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = index >= accentFrom ? 'word word-accent' : 'word';
      span.textContent = word;
      span.style.setProperty('--word-delay', `${index * 55}ms`);
      splitTarget.append(span, document.createTextNode(' '));
    });

    const wordEls = $$('.word', splitTarget);
    if (reduceMotion) {
      wordEls.forEach((word) => word.classList.add('in'));
    } else {
      requestAnimationFrame(() => {
        setTimeout(() => wordEls.forEach((word) => word.classList.add('in')), 120);
      });
    }
  }

  /* ---------------------------------------------------- Animated counters */

  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + (progress === 1 ? suffix : '');
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    counters.forEach((el) => { el.textContent = `${el.dataset.count}${el.dataset.suffix || ''}`; });
  } else {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach((el) => counterObserver.observe(el));
  }

  /* ------------------------------------------------- Card cursor spotlight */

  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('[data-spotlight]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });

    /* Magnetic buttons */
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (event) => {
        const rect = btn.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.18;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.26;
        btn.style.transform = `translate(${x}px, ${y - 2}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------- Hero parallax */

  const parallaxItems = $$('[data-parallax]');
  if (!reduceMotion && parallaxItems.length) {
    let parallaxTicking = false;
    window.addEventListener('scroll', () => {
      if (parallaxTicking) return;
      parallaxTicking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight * 1.4) {
          parallaxItems.forEach((el) => {
            el.style.translate = `0 ${y * Number(el.dataset.parallax)}px`;
          });
        }
        parallaxTicking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------- Marquee */

  const marqueeTrack = $('.marquee-track');
  if (marqueeTrack && !reduceMotion) {
    marqueeTrack.parentElement.append(marqueeTrack.cloneNode(true));
  }

  /* ------------------------------------------------------- Work carousel */

  const carousel = $('.carousel');
  if (carousel) {
    const viewport = $('.carousel-viewport', carousel);
    const track = $('.carousel-track', carousel);
    const prevButton = $('.carousel-prev', carousel);
    const nextButton = $('.carousel-next', carousel);
    const status = $('.carousel-status', carousel);
    const progress = $('.carousel-progress span', carousel);
    const originalSlides = [...track.children];
    const slideCount = originalSlides.length;

    let currentIndex = 0;
    let moving = false;
    let pointerStart = null;
    let autoplayId = null;

    originalSlides.forEach((slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.add('is-clone');
      track.appendChild(clone);
    });

    const slideDistance = () => {
      const slide = track.querySelector('.carousel-slide');
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return slide.getBoundingClientRect().width + gap;
    };

    const update = () => {
      const position = (currentIndex % slideCount + slideCount) % slideCount;
      if (status) status.textContent = `${position + 1} / ${slideCount}`;
      if (progress) progress.style.transform = `scaleX(${(position + 1) / slideCount * 5})`;
    };

    const moveTrack = (animate = true) => {
      track.classList.toggle('no-transition', !animate || reduceMotion);
      track.style.transform = `translate3d(${-currentIndex * slideDistance()}px, 0, 0)`;
      update();
    };

    const showNext = () => {
      if (moving) return;
      moving = true;
      currentIndex += 1;
      moveTrack(true);
      if (reduceMotion) { normalize(); moving = false; }
    };

    const showPrevious = () => {
      if (moving) return;
      if (currentIndex === 0) {
        currentIndex = slideCount;
        moveTrack(false);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          moving = true;
          currentIndex -= 1;
          moveTrack(true);
          if (reduceMotion) { moving = false; }
        }));
        return;
      }
      moving = true;
      currentIndex -= 1;
      moveTrack(true);
      if (reduceMotion) moving = false;
    };

    const normalize = () => {
      if (currentIndex >= slideCount) {
        currentIndex = 0;
        moveTrack(false);
      }
    };

    track.addEventListener('transitionend', (event) => {
      if (event.propertyName !== 'transform') return;
      normalize();
      moving = false;
    });

    nextButton.addEventListener('click', () => { stopAutoplay(); showNext(); });
    prevButton.addEventListener('click', () => { stopAutoplay(); showPrevious(); });

    viewport.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); stopAutoplay(); showNext(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); stopAutoplay(); showPrevious(); }
    });

    viewport.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
    viewport.addEventListener('pointerup', (event) => {
      if (pointerStart === null) return;
      const distance = event.clientX - pointerStart;
      pointerStart = null;
      if (Math.abs(distance) < 45) return;
      stopAutoplay();
      distance < 0 ? showNext() : showPrevious();
    });
    viewport.addEventListener('pointercancel', () => { pointerStart = null; });

    let resizeFrame;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => moveTrack(false));
    });

    /* Autoplay, paused on hover / focus / hidden tab */
    const startAutoplay = () => {
      if (reduceMotion || autoplayId) return;
      autoplayId = setInterval(() => {
        if (!document.hidden) showNext();
      }, 5200);
    };
    const stopAutoplay = () => {
      clearInterval(autoplayId);
      autoplayId = null;
    };
    carousel.addEventListener('pointerenter', stopAutoplay);
    carousel.addEventListener('pointerleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.isIntersecting ? startAutoplay() : stopAutoplay());
      }, { threshold: 0.3 }).observe(carousel);
    } else {
      startAutoplay();
    }

    moveTrack(false);

    /* ----------------------------------------------------------- Lightbox */

    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      const lightboxImg = $('img', lightbox);
      const sources = originalSlides.map((slide) => {
        const img = $('img', slide);
        return { src: img.src, alt: img.alt };
      });
      let lightboxIndex = 0;
      let lastFocused = null;

      const renderLightbox = () => {
        const item = sources[lightboxIndex];
        lightboxImg.src = item.src;
        lightboxImg.alt = item.alt;
      };

      const openLightbox = (index) => {
        lastFocused = document.activeElement;
        lightboxIndex = index;
        renderLightbox();
        lightbox.hidden = false;
        document.body.classList.add('no-scroll');
        requestAnimationFrame(() => lightbox.classList.add('show'));
        $('.lightbox-close', lightbox).focus();
        stopAutoplay();
      };

      const closeLightbox = () => {
        lightbox.classList.remove('show');
        document.body.classList.remove('no-scroll');
        setTimeout(() => { lightbox.hidden = true; }, reduceMotion ? 0 : 280);
        lastFocused?.focus();
      };

      const step = (delta) => {
        lightboxIndex = (lightboxIndex + delta + sources.length) % sources.length;
        renderLightbox();
      };

      track.addEventListener('click', (event) => {
        const slide = event.target.closest('.carousel-slide');
        if (!slide) return;
        const index = [...track.children].indexOf(slide) % slideCount;
        openLightbox(index);
      });

      $('.lightbox-close', lightbox).addEventListener('click', closeLightbox);
      $('.lightbox-next', lightbox).addEventListener('click', () => step(1));
      $('.lightbox-prev', lightbox).addEventListener('click', () => step(-1));
      lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', (event) => {
        if (lightbox.hidden) return;
        if (event.key === 'Escape') closeLightbox();
        if (event.key === 'ArrowRight') step(1);
        if (event.key === 'ArrowLeft') step(-1);
      });
    }
  }

  /* -------------------------------------------------------- Contact form */

  const contactForm = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');

  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const fields = $$('.field', contactForm);
    let valid = true;

    fields.forEach((field) => {
      const control = $('input, select, textarea', field);
      if (!control) return;
      const ok = control.checkValidity();
      field.classList.toggle('invalid', !ok);
      if (!ok && valid) {
        control.focus();
        valid = false;
      }
    });

    if (!valid) {
      if (formNote) {
        formNote.textContent = 'Please complete the highlighted fields.';
        formNote.classList.add('error');
      }
      return;
    }

    const data = new FormData(contactForm);
    const name = data.get('name');
    const phone = data.get('phone');
    const subject = encodeURIComponent(`Service request from ${name}`);
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${data.get('email')}`,
        phone ? `Phone: ${phone}` : null,
        `Service Needed: ${data.get('service')}`,
        '',
        'Message:',
        data.get('message')
      ].filter(Boolean).join('\n')
    );

    if (formNote) {
      formNote.classList.remove('error');
      formNote.textContent = 'Opening your email app with the message ready to send...';
    }

    window.location.href = `mailto:contact@tokyollc.com?subject=${subject}&body=${body}`;
  });

  $$('.field input, .field select, .field textarea').forEach((control) => {
    control.addEventListener('input', () => {
      control.closest('.field')?.classList.remove('invalid');
    });
  });


  /* -------------------------------------------------------- AI Chat Assistant */

    const chatbot = document.getElementById('chatbot');
    const chatToggles = $$('[data-chat-toggle]');
    const chatOpeners = $$('[data-chat-open]');
    const siteHeader = document.getElementById('siteHeader');
    const chatbotPanel = document.getElementById('chatbotPanel');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotNew = document.getElementById('chatbotNew');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotForm = document.getElementById('chatbotForm');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotTyping = document.getElementById('chatbotTyping');

    /*
    * Chat backend endpoint.
    *
    * Uses the local Worker (wrangler dev) when the site is opened on
    * localhost, and the production Worker on api.tokyollc.com otherwise.
    */
    const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

    const CHAT_API_URL = IS_LOCAL
        ? 'http://localhost:8787/chat'
        : 'https://api.tokyollc.com/chat';

    /*
    * Cloudflare Turnstile (bot protection for the chat).
    *
    * On localhost, Cloudflare's official test key is used; it always passes.
    */
    const TURNSTILE_SITE_KEY = IS_LOCAL
        ? '1x00000000000000000000AA'
        : '0x4AAAAAAFhF2Vy4w1vzaBXI';

    let turnstileWidgetId = null;
    let turnstilePending = null;

    // Runs the Turnstile check and resolves with a one-time token.
    const getTurnstileToken = () => new Promise((resolve, reject) => {
      if (!window.turnstile) {
        reject(new Error('Turnstile is not loaded.'));
        return;
      }

      const timeout = setTimeout(() => {
        turnstilePending = null;
        reject(new Error('Turnstile timed out.'));
      }, 120000);

      turnstilePending = {
        resolve: (token) => { clearTimeout(timeout); resolve(token); },
        reject: (error) => { clearTimeout(timeout); reject(error); }
      };

      const settle = (method, value) => {
        const pending = turnstilePending;
        turnstilePending = null;
        pending?.[method](value);
      };

      if (turnstileWidgetId === null) {
        turnstileWidgetId = window.turnstile.render('#chatbotTurnstile', {
          sitekey: TURNSTILE_SITE_KEY,
          execution: 'execute',
          appearance: 'interaction-only',
          callback: (token) => settle('resolve', token),
          'error-callback': () => settle('reject', new Error('Turnstile check failed.')),
          'expired-callback': () => settle('reject', new Error('Turnstile token expired.'))
        });
      } else {
        // Tokens are single-use, so reset before getting a new one.
        window.turnstile.reset(turnstileWidgetId);
      }

      window.turnstile.execute(turnstileWidgetId);
    });

    let chatSessionId = null;
    let chatSending = false;

    const setChatToggleState = (isOpen) => {
      chatToggles.forEach((btn) => {
        btn.setAttribute('aria-expanded', String(isOpen));
        if (btn.classList.contains('nav-chat')) {
          btn.setAttribute('aria-label', isOpen ? 'Close AI chat' : 'Open AI chat');
        }
      });
    };

    /* Keep the panel inside the visible viewport below the sticky header. */
    const fitChatbot = () => {
      if (!chatbotPanel || !siteHeader) return;

      const room = window.innerHeight - siteHeader.getBoundingClientRect().bottom - 24;
      chatbotPanel.style.setProperty('--chat-max-h', `${Math.max(280, room)}px`);
    };

    const openChatbot = () => {
      if (!chatbot) return;

      closeNav();
      fitChatbot();
      chatbot.classList.add('open');
      setChatToggleState(true);
      chatbotPanel?.setAttribute('aria-hidden', 'false');

      setTimeout(() => chatbotInput?.focus({ preventScroll: true }), 100);
    };

    const closeChatbot = (returnFocus = false) => {
      if (!chatbot) return;

      chatbot.classList.remove('open');
      setChatToggleState(false);
      chatbotPanel?.setAttribute('aria-hidden', 'true');

      if (returnFocus) {
        const visible = chatToggles.find((btn) => btn.offsetParent !== null);
        visible?.focus();
      }
    };

    const scrollChatToBottom = () => {
      if (!chatbotMessages) return;

      requestAnimationFrame(() => {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
      });
    };

    /* ---- Lightweight, safe Markdown renderer for assistant replies ----
     * Everything is HTML-escaped first, then only a small set of formatting
     * is re-introduced: **bold**, *italic*, `code`, lists, links, line breaks.
     */
    const escapeHtml = (text) =>
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const formatInline = (raw) => {
      /*
       * Links are pulled out into placeholders first, so the bare
       * phone/email/URL detection can never run inside an existing link.
       */
      const stash = [];
      const keep = (html) => {
        stash.push(html);
        return `\u0000${stash.length - 1}\u0000`;
      };

      const makeLink = (href, label) => {
        const external = /^https?:/i.test(href);
        return keep(
          `<a href="${escapeHtml(href)}"${
            external ? ' target="_blank" rel="noopener noreferrer"' : ''
          }>${escapeHtml(label)}</a>`
        );
      };

      let text = String(raw)
        // Escaped characters the model sometimes emits (tel\:, \@, \( ...)
        .replace(/\\([:@()[\]])/g, '$1')
        // Fancy hyphens/dashes between digits (978‑984‑2264) -> normal hyphen
        .replace(/(\d)[‐-―−](?=\d)/g, '$1-');

      // Contact details the AI wrapped in `backticks` or tagged with
      // "— clickable": show them as plain text (they are linked below).
      text = text
        .replace(/`([^`\n]+)`/g, (match, inner) =>
          /^\s*(?:https?:\/\/\S+|[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}|\(?\d{3}\)?[-.\s]\d{3}[-.]\d{4})\s*$/.test(inner)
            ? inner.trim()
            : match
        )
        .replace(/\s*[—–-]+\s*\(?\bclickable\b\)?/gi, '');

      // 1. Markdown links: [label](https://..) [label](mailto:..) [label](tel:..)
      text = text.replace(
        /\[([^\]]+)\]\(\s*((?:https?:\/\/|mailto:|tel:)[^\s)]+)\s*\)/gi,
        (match, label, href) => makeLink(href, label.replace(/\*\*/g, ''))
      );

      // 2. Bare URLs
      text = text.replace(
        /https?:\/\/[^\s<*]+[^\s<*.,;:!?)]/g,
        (url) => makeLink(url, url)
      );

      // 3. Bare emails
      text = text.replace(
        /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
        (email) => makeLink(`mailto:${email}`, email)
      );

      // 4. Bare US phone numbers
      text = text.replace(
        /\(?\b\d{3}\)?[-.\s]\d{3}[-.]\d{4}\b/g,
        (phone) => makeLink(`tel:+1${phone.replace(/\D/g, '')}`, phone)
      );

      // 5. Escape everything else, then apply simple formatting
      let html = escapeHtml(text)
        .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+?)__/g, '<strong>$1</strong>')
        .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
        .replace(/`([^`]+?)`/g, '<code>$1</code>');

      // 6. Put the links back
      return html.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[Number(i)]);
    };

    const renderMarkdown = (text) => {
      const lines = String(text).replace(/\r\n?/g, '\n').trim().split('\n');
      const out = [];
      let paragraph = [];
      let list = null; // { type: 'ul' | 'ol', items: [] }

      const flushParagraph = () => {
        if (!paragraph.length) return;
        out.push(`<p>${paragraph.map(formatInline).join('<br>')}</p>`);
        paragraph = [];
      };
      const flushList = () => {
        if (!list) return;
        out.push(
          `<${list.type}>${list.items.map((item) => `<li>${formatInline(item)}</li>`).join('')}</${list.type}>`
        );
        list = null;
      };

      lines.forEach((line) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
        const heading = line.match(/^\s*#{1,6}\s+(.*)$/);

        if (!line.trim()) {
          flushParagraph();
          flushList();
        } else if (bullet || numbered) {
          flushParagraph();
          const type = bullet ? 'ul' : 'ol';
          if (list && list.type !== type) flushList();
          if (!list) list = { type, items: [] };
          list.items.push((bullet || numbered)[1]);
        } else if (heading) {
          flushParagraph();
          flushList();
          out.push(`<p class="chatbot-heading">${formatInline(heading[1])}</p>`);
        } else {
          flushList();
          paragraph.push(line.trim());
        }
      });

      flushParagraph();
      flushList();

      return out.join('');
    };

    const addChatMessage = (message, role) => {
      if (!chatbotMessages) return;

      const wrapper = document.createElement('div');
      wrapper.className =
        role === 'user'
          ? 'chatbot-message chatbot-message-user'
          : 'chatbot-message chatbot-message-assistant';

      const bubble = document.createElement('div');
      bubble.className = 'chatbot-message-bubble';

      if (role === 'user') {
        bubble.textContent = message;
      } else {
        bubble.classList.add('is-rich');
        bubble.innerHTML = renderMarkdown(message);
      }

      wrapper.appendChild(bubble);
      chatbotMessages.appendChild(wrapper);

      if (role === 'user') {
        scrollChatToBottom();
      } else {
        /* Long answers: start reading at the top of the reply, not the end. */
        requestAnimationFrame(() => {
          const offset =
            wrapper.getBoundingClientRect().top -
            chatbotMessages.getBoundingClientRect().top +
            chatbotMessages.scrollTop;

          chatbotMessages.scrollTop = Math.max(0, offset - 12);
        });
      }
    };

    const setChatTyping = (visible) => {
      if (!chatbotTyping) return;

      chatbotTyping.hidden = !visible;
      if (visible) scrollChatToBottom();
    };

    const setChatSending = (sending) => {
      chatSending = sending;

      if (chatbotSend) {
        chatbotSend.disabled = sending;
      }

      if (chatbotInput) {
        chatbotInput.disabled = sending;
      }
    };

    const resetChatUI = () => {
      if (!chatbotMessages) return;

      chatbotMessages.innerHTML = '';

      const welcome = document.createElement('div');
      welcome.className =
        'chatbot-message chatbot-message-assistant';

      const bubble = document.createElement('div');
      bubble.className = 'chatbot-message-bubble';
      bubble.textContent =
        "Hi! I'm the Tokyo LLC AI Assistant. How can I help you today?";

      welcome.appendChild(bubble);
      chatbotMessages.appendChild(welcome);

      scrollChatToBottom();
    };

    const clearChatSession = async () => {
      if (!chatSessionId) {
        resetChatUI();
        return true;
      }

      try {
        const response = await fetch(CHAT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'clear',
            sessionId: chatSessionId
          })
        });

        if (!response.ok) {
          throw new Error('The chat session could not be cleared.');
        }

        chatSessionId = null;
        resetChatUI();
        chatbotInput?.focus();

        return true;
      } catch (error) {
        console.error('Could not clear remote chat session:', error);

        addChatMessage(
          'I couldn’t start a new conversation right now. Please try again.',
          'assistant'
        );

        return false;
      }
    };

    chatToggles.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (chatbot?.classList.contains('open')) {
          closeChatbot();
        } else {
          openChatbot();
        }
      });
    });

    chatOpeners.forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        closeNav();
        openChatbot();
      });
    });

    chatbotClose?.addEventListener('click', () => closeChatbot(true));

    window.addEventListener('resize', () => {
      if (chatbot?.classList.contains('open')) fitChatbot();
    });
    window.addEventListener('scroll', () => {
      if (chatbot?.classList.contains('open')) fitChatbot();
    }, { passive: true });

    /* Opening the mobile menu closes the chat so the two never stack. */
    navToggle?.addEventListener('click', () => {
      if (navLinks?.classList.contains('open')) closeChatbot();
    });

    chatbotNew?.addEventListener('click', async () => {
      if (chatSending) return;

      await clearChatSession();
    });

    chatbotForm?.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (chatSending || !chatbotInput) return;

      const message = chatbotInput.value.trim();

      if (!message) return;

      if (message.length > 4000) {
        addChatMessage(
          'Your message is too long. Please keep it under 4,000 characters.',
          'assistant'
        );
        return;
      }

      addChatMessage(message, 'user');

      chatbotInput.value = '';
      chatbotInput.style.height = 'auto';

      setChatSending(true);
      setChatTyping(true);

      try {
        const turnstileToken = await getTurnstileToken();

        const response = await fetch(CHAT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            sessionId: chatSessionId,
            turnstileToken
          })
        });

        let data = null;

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            data?.error || 'The assistant could not process your request.'
          );
        }

        if (data?.sessionId) {
          chatSessionId = data.sessionId;
        }

        addChatMessage(
          data?.response ||
            'I’m sorry, but I was unable to generate a response.',
          'assistant'
        );
      } catch (error) {
        console.error('Chat request failed:', error);

        addChatMessage(
          'I’m sorry, but I’m unable to connect to the assistant right now. Please contact Tokyo LLC at 978-984-2264 or contact@tokyollc.com.',
          'assistant'
        );
      } finally {
        setChatTyping(false);
        setChatSending(false);
        chatbotInput?.focus();
      }
    });

    chatbotInput?.addEventListener('input', () => {
      chatbotInput.style.height = 'auto';
      chatbotInput.style.height =
        `${Math.min(chatbotInput.scrollHeight, 100)}px`;
    });

    chatbotInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        chatbotForm?.requestSubmit();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && chatbot?.classList.contains('open')) {
        closeChatbot(true);
      }
    });

})();

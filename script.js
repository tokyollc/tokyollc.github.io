const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

document.getElementById('year').textContent = new Date().getFullYear();

const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = formData.get('name');
  const email = formData.get('email');
  const service = formData.get('service');
  const message = formData.get('message');

  const subject = encodeURIComponent(`Service request from ${name}`);
  const body = encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nService Needed: ${service}\n\nMessage:\n${message}`
  );

  window.location.href = `mailto:contact@tokyollc.com?subject=${subject}&body=${body}`;
});
const carousel = document.querySelector('.carousel');
if (carousel) {
  const viewport = carousel.querySelector('.carousel-viewport');
  const track = carousel.querySelector('.carousel-track');
  const previousButton = carousel.querySelector('.carousel-prev');
  const nextButton = carousel.querySelector('.carousel-next');
  const status = carousel.querySelector('.carousel-status');
  const originalSlides = [...track.children];
  const slideCount = originalSlides.length;
  let currentIndex = 0;
  let moving = false;
  let pointerStart = null;

  originalSlides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  const slideDistance = () => {
    const slide = track.querySelector('.carousel-slide');
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return slide.getBoundingClientRect().width + gap;
  };

  const updateStatus = () => {
    status.textContent = `${(currentIndex % slideCount) + 1} / ${slideCount}`;
  };

  const moveTrack = (animate = true) => {
    track.classList.toggle('no-transition', !animate);
    track.style.transform = `translate3d(${-currentIndex * slideDistance()}px, 0, 0)`;
    updateStatus();
  };

  const showNext = () => {
    if (moving) return;
    moving = true;
    currentIndex += 1;
    moveTrack(true);
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
      }));
      return;
    }
    moving = true;
    currentIndex -= 1;
    moveTrack(true);
  };

  track.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'transform') return;
    if (currentIndex >= slideCount) {
      currentIndex = 0;
      moveTrack(false);
    }
    moving = false;
  });

  nextButton.addEventListener('click', showNext);
  previousButton.addEventListener('click', showPrevious);
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); showNext(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPrevious(); }
  });
  viewport.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
  viewport.addEventListener('pointerup', (event) => {
    if (pointerStart === null) return;
    const distance = event.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(distance) < 45) return;
    distance < 0 ? showNext() : showPrevious();
  });
  viewport.addEventListener('pointercancel', () => { pointerStart = null; });

  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => moveTrack(false));
  });

  moveTrack(false);
}

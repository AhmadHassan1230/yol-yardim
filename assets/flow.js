// Flow hero: scrubs the night film with the scroll. Loaded only on the FLOW home page.
import { createFilm } from './film.js';

const { gsap, ScrollTrigger } = window;
const root = document.documentElement;
const reduced = root.classList.contains('rm');
const mobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
const portrait = innerHeight > innerWidth;
const stage = document.querySelector('.fstage');

(async () => {
  if (!stage || !gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  let manifest = { hero: null, shots: {}, kit: {} };
  try {
    const r = await fetch('assets/flow/manifest.json', { cache: 'no-cache' });
    if (r.ok) manifest = { ...manifest, ...(await r.json()) };
  } catch (e) { /* stand-ins stay */ }

  const film = createFilm(stage.querySelector('.film'), {
    manifest, mobile, reduced, portrait, heroCovers: !!manifest.hero?.video,
  });

  const video = stage.querySelector('.fvideo');
  if (manifest.hero?.video) {
    video.poster = portrait ? '' : manifest.hero.poster || '';
    video.src = portrait && manifest.hero.mobile ? manifest.hero.mobile : manifest.hero.video;
    video.hidden = false;
    if (!reduced) video.play().catch(() => {});
  }

  if (reduced) {
    film.drawOnce();
    return;
  }

  gsap.ticker.add((t, dt) => film.tick(Math.min(dt / 1000, 0.05)));

  // the timeline: the whole stage is 1 unit of scroll
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: (self) => film.setProgress(self.progress),
    },
  });
  tl.to({}, { duration: 1 }, 0);
  tl.to('.fhero', { autoAlpha: 0, y: -40, duration: 0.06 }, 0.005);
  tl.to('.fcue', { autoAlpha: 0, duration: 0.03 }, 0);

  const windows = [[0.1, 0.27], [0.32, 0.52], [0.58, 0.76]];
  stage.querySelectorAll('.fstep').forEach((el, i) => {
    const [a, b] = windows[i];
    tl.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.035, ease: 'power2.out' }, a);
    tl.to(el, { autoAlpha: 0, y: -30, duration: 0.03, ease: 'power2.in' }, b);
  });

  tl.fromTo('.floc', { autoAlpha: 0, y: 30, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.04, ease: 'power3.out' }, 0.12);
  tl.to('.floc', { autoAlpha: 0, y: -20, duration: 0.03, ease: 'power2.in' }, 0.25);
  tl.to('.fvideo', { autoAlpha: 0, duration: 0.03 }, 0.268);
  tl.fromTo('.fmeter', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.09);
  tl.fromTo('[data-meter]', { scaleX: 0 }, { scaleX: 1, duration: 0.68 }, 0.08);
  tl.to('.fmeter', { autoAlpha: 0, duration: 0.02 }, 0.76);
  tl.fromTo('.ffinale', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.88);

  addEventListener('load', () => ScrollTrigger.refresh());
})();

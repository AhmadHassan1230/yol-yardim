// Flow hero: plays the looping film, follows its timeline with the chapter cards, toggles the music.
(() => {
  const stage = document.querySelector('.fstage');
  if (!stage) return;
  const video = stage.querySelector('[data-hero-video]');
  const items = [...stage.querySelectorAll('.fchap-item')];
  const bars = [...stage.querySelectorAll('.fbars i')];
  const loc = stage.querySelector('[data-loc]');
  const sound = stage.querySelector('[data-sound]');
  const label = sound.querySelector('span');
  const reduced = document.documentElement.classList.contains('rm');
  const portrait = matchMedia('(max-aspect-ratio: 4/5)').matches;
  const starts = items.map((li) => Number(li.dataset.at));

  // portrait phones get the cropped cut that follows the subject
  video.src = portrait ? video.dataset.srcM : video.dataset.src;
  if (portrait) video.poster = video.dataset.posterM;

  let current = 0;
  function sync() {
    const t = video.currentTime || 0;
    const dur = video.duration || 30;
    let i = starts.length - 1;
    while (i > 0 && t < starts[i]) i--;
    if (i !== current) {
      items[current].classList.remove('is-on');
      items[i].classList.add('is-on');
      current = i;
    }
    bars.forEach((b, n) => {
      const a = starts[n], z = n + 1 < starts.length ? starts[n + 1] : dur;
      b.style.transform = `scaleX(${Math.min(1, Math.max(0, (t - a) / (z - a)))})`;
    });
    loc?.classList.toggle('is-on', t > 1.6 && t < 6.6);
    if (!video.paused) requestAnimationFrame(sync);
  }
  video.addEventListener('play', () => requestAnimationFrame(sync));
  video.addEventListener('seeked', sync);

  // play only while on screen (saves battery and data further down the page)
  if (!reduced) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.2 }).observe(video);
  }

  // browsers only autoplay muted: this button turns the music on (and starts the film under reduced motion)
  sound.addEventListener('click', () => {
    const on = video.muted;
    video.muted = !on;
    if (on) { video.volume = 0.8; if (video.paused) video.play().catch(() => {}); }
    sound.setAttribute('aria-pressed', String(on));
    sound.setAttribute('aria-label', on ? 'Sesi kapat' : 'Sesi aç');
    label.textContent = on ? 'Sesi kapat' : 'Sesi aç';
  });
})();

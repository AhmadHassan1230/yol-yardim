(() => {
  const WA = '905517150138';
  const HELLO = 'Merhaba, yolda kaldım. Yardım rica ediyorum.';
  const root = document.documentElement;
  const reduced = root.classList.contains('rm');
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const waUrl = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  const openWa = (t) => window.open(waUrl(t), '_blank', 'noopener') || (location.href = waUrl(t));

  /* live clock */
  const tick = () => {
    const t = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    $$('[data-clock]').forEach((el) => (el.textContent = t));
  };
  tick();
  setInterval(tick, 15000);

  /* nav shadow */
  const nav = $('[data-nav]');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mega menus: hover on mouse, click on touch and keyboard */
  const menus = $$('[data-mm]');
  const close = (except) => menus.forEach((m) => { if (m !== except) { m.classList.remove('is-open'); $('button', m).setAttribute('aria-expanded', 'false'); } });
  menus.forEach((m) => {
    const b = $('button', m);
    let t;
    const open = () => { clearTimeout(t); close(m); m.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); };
    b.addEventListener('click', () => (m.classList.contains('is-open') ? close() : open()));
    if (fine) {
      m.addEventListener('pointerenter', open);
      m.addEventListener('pointerleave', () => { t = setTimeout(() => close(), 160); });
    }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-mm]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); toggleSheet(false); } });

  /* mobile sheet */
  const burger = $('[data-burger]');
  const sheet = $('[data-sheet]');
  function toggleSheet(on) {
    if (!sheet) return;
    const show = on ?? sheet.hidden;
    sheet.hidden = !show;
    burger.setAttribute('aria-expanded', String(show));
    burger.setAttribute('aria-label', show ? 'Menüyü kapat' : 'Menüyü aç');
    $('use', burger).setAttribute('href', show ? '#i-x' : '#i-menu');
    document.body.style.overflow = show ? 'hidden' : '';
  }
  burger?.addEventListener('click', () => toggleSheet());

  /* reveals: siblings stagger a little */
  const rise = $$('[data-rise]');
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-rise'));
        el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 6) * 60}ms`);
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    rise.forEach((el) => io.observe(el));
    const steps = $('[data-steps]');
    if (steps) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { steps.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.4 }).observe(steps);
  } else {
    rise.forEach((el) => el.classList.add('is-in'));
    $('[data-steps]')?.classList.add('is-in');
  }

  /* hero: cards land, tracker ticks, photo tilts */
  const hero = $('.hero');
  if (hero) {
    requestAnimationFrame(() => hero.classList.add('is-ready'));
    const steps = $$('.ui-steps li');
    const bar = $('[data-bar]');
    const stage = (n) => {
      steps.forEach((li, i) => { li.classList.toggle('is-done', i < n); li.classList.toggle('is-now', i === n); });
      if (bar) bar.style.scale = `${Math.max(0.33, n / 3)} 1`;
    };
    if (reduced) stage(3);
    else {
      let n = 1;
      stage(1);
      setInterval(() => { n = n >= 3 ? 1 : n + 1; stage(n); }, 2400);
    }
    const photo = $('.hero-photo');
    if (fine && !reduced && photo) {
      hero.addEventListener('pointermove', (e) => {
        const r = photo.getBoundingClientRect();
        const px = (e.clientX - (r.left + r.width / 2)) / r.width;
        const py = (e.clientY - (r.top + r.height / 2)) / r.height;
        photo.style.transform = `rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
      });
      hero.addEventListener('pointerleave', () => (photo.style.transform = ''));
    }
  }

  /* problem picker */
  const picker = $('[data-picker]');
  if (picker) {
    const send = $('[data-picker-send]', picker);
    const preview = $('[data-preview]', picker);
    $$('.pchip', picker).forEach((b) => b.addEventListener('click', () => {
      $$('.pchip', picker).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const msg = `${HELLO} ${b.dataset.msg}`;
      preview.textContent = msg;
      send.href = waUrl(msg);
    }));
  }

  /* region search */
  const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').trim();
  $$('[data-rsearch]').forEach((form) => {
    const input = $('input', form);
    const out = $('[data-rs-out]', form);
    const list = input.dataset.list.split('|');
    const far = input.dataset.far.split('|');
    const chips = $$('.regions .chips li');
    input.addEventListener('input', () => {
      const q = norm(input.value);
      chips.forEach((c) => c.classList.toggle('is-hit', q.length > 1 && norm(c.textContent).startsWith(q)));
      if (q.length < 2) { out.textContent = ''; return; }
      const hit = list.find((d) => norm(d).startsWith(q));
      if (hit) {
        out.innerHTML = `<span class="ok">Evet, ${hit} hizmet bölgemizde.</span> ${far.includes(hit) ? 'Uzak ilçelerde varış süresi uzayabilir, aradığında net süreyi söyleriz.' : 'Ara ya da konumunu gönder.'}`;
      } else {
        out.innerHTML = `<b>${input.value}</b> listemizde yok. <a href="${waUrl(`${HELLO} ${input.value} bölgesine geliyor musunuz?`)}" target="_blank" rel="noopener">WhatsApp'tan sor</a>, hemen söyleyelim.`;
      }
    });
  });

  /* gallery lightbox */
  const lb = $('[data-lightbox]');
  const shots = $$('[data-lb]');
  if (lb && shots.length) {
    const img = $('img', lb), cap = $('figcaption', lb);
    let i = 0;
    const show = (n) => {
      i = (n + shots.length) % shots.length;
      const s = $('img', shots[i]);
      img.src = s.src; img.alt = s.alt; cap.textContent = `${s.alt} · ${i + 1} / ${shots.length}`;
    };
    shots.forEach((b, n) => b.addEventListener('click', () => { show(n); lb.showModal(); }));
    $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
    $('[data-lb-prev]', lb).addEventListener('click', () => show(i - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
  }

  /* geolocation helper */
  function locate(onOk, onFail) {
    if (!('geolocation' in navigator)) return onFail('Tarayıcın konum paylaşmıyor.');
    navigator.geolocation.getCurrentPosition(
      (p) => onOk(p.coords),
      (err) => onFail(err.code === 1 ? 'Konum izni kapalı.' : 'Konum bulunamadı.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  /* send-location buttons */
  $$('[data-locate]').forEach((btn) => {
    const scope = btn.closest('section, aside, .final, .locate-actions') || document;
    const status = $('[data-locate-status]', scope) || $('[data-locate-status]');
    const label = $('span', btn) || btn;
    const orig = label.textContent;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      label.textContent = 'Konum alınıyor';
      if (status) status.textContent = 'Telefonun konum izni isteyecek.';
      locate(({ latitude: la, longitude: lo, accuracy }) => {
        if (status) status.textContent = `${la.toFixed(5)}, ${lo.toFixed(5)} · ±${Math.round(accuracy)} m · WhatsApp açılıyor`;
        setTimeout(() => { openWa(`${HELLO}\nKonumum: https://maps.google.com/?q=${la},${lo}`); btn.disabled = false; label.textContent = orig; }, 700);
      }, (why) => {
        btn.disabled = false; label.textContent = orig;
        if (status) status.textContent = `${why} WhatsApp açılıyor, konumunu oradan ekle.`;
        setTimeout(() => openWa(HELLO), 1200);
      });
    });
  });

  /* contact form → WhatsApp */
  $$('[data-form]').forEach((form) => {
    const note = $('[data-form-note]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const lines = [
        `Merhaba${f.get('ad') ? `, ben ${f.get('ad')}` : ''}.`,
        `Araç: ${f.get('arac')}`,
        `Konu: ${f.get('sorun')}`,
        f.get('yer') ? `Yer: ${f.get('yer')}` : '',
        f.get('not') ? `Not: ${f.get('not')}` : '',
      ].filter(Boolean);
      if (f.get('konum')) {
        note.textContent = 'Konum alınıyor...';
        locate(({ latitude: la, longitude: lo }) => { lines.push(`Konumum: https://maps.google.com/?q=${la},${lo}`); note.textContent = 'WhatsApp açılıyor.'; openWa(lines.join('\n')); },
          (why) => { note.textContent = `${why} Mesaj konumsuz açılıyor.`; openWa(lines.join('\n')); });
      } else { note.textContent = 'WhatsApp açılıyor.'; openWa(lines.join('\n')); }
    });
  });

  /* guide table of contents */
  const toc = $$('.toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    const map = new Map(toc.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { toc.forEach((a) => a.classList.remove('is-on')); map.get(e.target.id)?.classList.add('is-on'); } });
    }, { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }
})();

/* atölye reels: play only while visible, never under reduced motion */
(() => {
  const vids = [...document.querySelectorAll('video[data-autoplay]')];
  if (!vids.length || document.documentElement.classList.contains('rm') || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) { if (v.preload === 'none') { v.preload = 'auto'; v.load(); } v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: 0.35 });
  vids.forEach((v) => io.observe(v));
})();

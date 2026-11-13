// Scroll-driven film for the stage.
// Each scroll segment shows a Flow clip as a frame sequence (assets/flow/shot-N/...).
// Until a clip exists, the segment draws a stand-in: a dark, defocused night frame
// where only the lights tell the story (hazards, the van's headlights and light bar, tail lights).

const SEGMENTS = [
  { id: 'shot-1', from: 0, to: 0.28 },
  { id: 'shot-2', from: 0.28, to: 0.56 },
  { id: 'shot-3', from: 0.56, to: 0.8 },
  { id: 'shot-4', from: 0.8, to: 1 },
];
const FADE = 0.035;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

export function createFilm(canvas, { manifest, mobile, reduced, portrait, heroCovers }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  // phones in portrait get frames cropped to follow the subject; everything else gets 1280px 16:9 frames
  const variant = portrait ? 'm' : '1280';
  let W = 1, H = 1, dpr = 1;
  const state = { p: 0, target: 0, t: 0, px: 0, py: 0, ppx: 0, ppy: 0 };

  // ---------- frame sequences ----------
  const seqs = {};
  Object.entries(manifest.shots || {}).forEach(([id, s]) => {
    const n = typeof s.frames === 'number' ? s.frames : s.frames?.[variant] || 0;
    if (!n) return;
    seqs[id] = { n, base: `${s.base}/${variant}`, imgs: new Array(n), loaded: new Array(n).fill(false), started: false };
  });
  function loadSeq(id) {
    const s = seqs[id];
    if (!s || s.started) return;
    s.started = true;
    // coarse to fine, so scrubbing works before everything is in
    const order = [];
    const seen = new Set();
    [8, 4, 2, 1].forEach((step) => {
      for (let i = 0; i < s.n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    });
    let inFlight = 0, cursor = 0;
    const pump = () => {
      while (inFlight < 6 && cursor < order.length) {
        const i = order[cursor++];
        const img = new Image();
        img.decoding = 'async';
        inFlight++;
        img.onload = () => { s.imgs[i] = img; s.loaded[i] = true; inFlight--; pump(); };
        img.onerror = () => { inFlight--; pump(); };
        img.src = `${s.base}/${String(i + 1).padStart(4, '0')}.webp`;
      }
    };
    pump();
  }
  function nearest(s, i) {
    for (let d = 0; d < s.n; d++) {
      if (s.loaded[i - d]) return s.imgs[i - d];
      if (s.loaded[i + d]) return s.imgs[i + d];
    }
    return null;
  }

  // ---------- drawing helpers ----------
  // virtual 16:9 frame mapped to the canvas with "cover"; the action lives in the middle third
  let fx = 0, fy = 0, fw = 1, fh = 1;
  function layout() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    const s = Math.max(W / 16, H / 9);
    fw = 16 * s; fh = 9 * s;
    fx = (W - fw) * (W < H ? 0.5 : 0.62); // landscape: frame nudged right so copy has room on the left
    fy = (H - fh) * 0.5;
  }
  const X = (x) => fx + x * fw;
  const Y = (y) => fy + y * fh;
  const S = (r) => r * fh;

  function glow(x, y, r, rgb, a) {
    if (a <= 0.003 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.25, `rgba(${rgb},${a * 0.45})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // a light source plus its streak on wet asphalt
  function lamp(x, y, r, rgb, a, groundY) {
    const cx = X(x), cy = Y(y), rr = S(r);
    glow(cx, cy, rr * 4, rgb, a * 0.35);
    glow(cx, cy, rr, '255,250,240', Math.min(1, a * 1.1));
    glow(cx, cy, rr * 1.6, rgb, a * 0.9);
    if (groundY != null) {
      const gy = Y(groundY);
      ctx.save();
      ctx.translate(cx, gy + (gy - cy) * 0.15);
      ctx.scale(0.35, 2.4);
      glow(0, 0, rr * 3, rgb, a * 0.28);
      ctx.restore();
    }
  }

  // far city lights, fixed set
  const bokeh = Array.from({ length: mobile ? 22 : 34 }, (_, i) => {
    const r = Math.sin(i * 91.7) * 0.5 + 0.5, q = Math.sin(i * 37.3) * 0.5 + 0.5;
    return { x: r * 1.1 - 0.05, y: 0.36 + q * 0.12, s: 0.008 + ((i * 13) % 7) * 0.003, warm: i % 3 !== 0, ph: i };
  });

  function background(t, haze = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07090b');
    g.addColorStop(0.45, '#0d1013');
    g.addColorStop(1, '#090a0c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    // sodium haze from the lamp over the shoulder
    glow(X(0.66), Y(0.06), S(0.9), '242,150,60', 0.16 * haze);
    glow(X(0.66), Y(0.78), S(0.55), '242,160,70', 0.1 * haze);
    // distant city lights, defocused
    bokeh.forEach((b) => {
      const drift = Math.sin(t * 0.15 + b.ph) * 0.004;
      glow(X(b.x + drift), Y(b.y), S(b.s * 2.2), b.warm ? '255,190,120' : '220,230,255', 0.16);
    });
    // asphalt sheen
    ctx.globalCompositeOperation = 'source-over';
    const a = ctx.createLinearGradient(0, Y(0.52), 0, H);
    a.addColorStop(0, 'rgba(255,255,255,0)');
    a.addColorStop(1, 'rgba(255,255,255,0.025)');
    ctx.fillStyle = a;
    ctx.fillRect(0, Y(0.52), W, H - Y(0.52));
    ctx.globalCompositeOperation = 'lighter';
  }

  const blink = (t, hz = 1.5) => (Math.floor(t * hz * 2) % 2 === 0 ? 1 : 0.06);

  // the stopped car seen from behind-left: tail lights + hazards
  function stoppedCar(t, x, y, scale, hazards = 1, tail = 0.35) {
    const hz = blink(t) * hazards;
    const half = 0.055 * scale;
    lamp(x - half, y, 0.012 * scale, '255,120,30', 0.95 * hz, y + 0.2 * scale);
    lamp(x + half, y, 0.012 * scale, '255,120,30', 0.95 * hz, y + 0.2 * scale);
    lamp(x - half * 0.7, y + 0.004, 0.009 * scale, '220,30,25', tail, y + 0.2 * scale);
    lamp(x + half * 0.7, y + 0.004, 0.009 * scale, '220,30,25', tail, y + 0.2 * scale);
    // warning triangle catching the light
    lamp(x - half * 2.6, y + 0.05 * scale, 0.006 * scale, '230,50,30', 0.55, null);
  }
  function van(t, x, y, scale, head = 1, bar = 1) {
    const half = 0.06 * scale;
    lamp(x - half, y, 0.016 * scale, '255,246,230', 0.9 * head, y + 0.22 * scale);
    lamp(x + half, y, 0.016 * scale, '255,246,230', 0.9 * head, y + 0.22 * scale);
    const a = Math.floor(t * 3.2) % 2;
    lamp(x - half * 0.45, y - 0.075 * scale, 0.011 * scale, '255,170,40', bar * (a ? 1 : 0.15), null);
    lamp(x + half * 0.45, y - 0.075 * scale, 0.011 * scale, '255,170,40', bar * (a ? 0.15 : 1), null);
  }

  const standIns = {
    'shot-1': (t) => {
      background(t);
      stoppedCar(t, 0.55, 0.6, 1.25);
    },
    'shot-2': (t, k) => {
      background(t);
      stoppedCar(t, 0.6, 0.57, 0.8);
      const e = easeOut(k);
      van(t, lerp(0.36, 0.5, e), lerp(0.5, 0.64, e), lerp(0.25, 1.5, e), 1, 1);
    },
    'shot-3': (t, k) => {
      background(t, 0.8);
      stoppedCar(t, 0.6, 0.6, 1.3);
      van(t, 0.4, 0.6, 1.1, 0.75, 1);
      // work light at the engine bay
      const w = 0.75 + Math.sin(t * 1.3) * 0.05;
      lamp(0.67, 0.56, 0.02, '230,240,255', w * ease(clamp(k * 3)), 0.8);
    },
    'shot-4': (t, k) => {
      background(t);
      const e = easeIn(k);
      van(t, 0.38, 0.6, 1.0, 0.7, 1 - e * 0.6);
      // hazards go off, tail lights come on and the car drives away into the distance
      stoppedCar(t, lerp(0.6, 0.53, e), lerp(0.6, 0.47, e), lerp(1.3, 0.15, e), 0, 0.95 * (1 - e * 0.4));
    },
  };

  function drawSegment(seg, k, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const s = seqs[seg.id];
    const img = s && nearest(s, Math.round(k * (s.n - 1)));
    if (img) {
      ctx.globalCompositeOperation = 'source-over';
      const sc = Math.max(W / img.width, H / img.height) * 1.04;
      const iw = img.width * sc, ih = img.height * sc;
      const ox = (W - iw) / 2 - state.ppx * W * 0.012, oy = (H - ih) / 2 - state.ppy * H * 0.012;
      ctx.drawImage(img, ox, oy, iw, ih);
    } else if (seg.id === 'shot-1' && heroCovers) {
      // the hero video sits on top of the canvas here
    } else {
      ctx.save();
      ctx.translate(-state.ppx * W * 0.012, -state.ppy * H * 0.012);
      standIns[seg.id](state.t, k);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function draw() {
    const p = state.p;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#08090b';
    ctx.fillRect(0, 0, W, H);
    SEGMENTS.forEach((seg, i) => {
      const k = clamp((p - seg.from) / (seg.to - seg.from));
      const fadeIn = i === 0 ? 1 : clamp((p - seg.from + FADE) / FADE);
      const next = SEGMENTS[i + 1];
      const visible = p >= seg.from - FADE && (!next || p < next.from + FADE);
      if (visible) drawSegment(seg, k, fadeIn);
    });
  }

  layout();
  new ResizeObserver(layout).observe(canvas);
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  if (!mobile) {
    canvas.parentElement.addEventListener('pointermove', (e) => {
      state.px = e.clientX / innerWidth - 0.5;
      state.py = e.clientY / innerHeight - 0.5;
    });
  }
  // start loading clips right away (first segment first)
  Object.keys(seqs).forEach(loadSeq);

  return {
    tick(dt) {
      if (!visible) return;
      state.t += dt;
      state.p = reduced ? state.target : lerp(state.p, state.target, 1 - Math.exp(-dt * 6));
      state.ppx = lerp(state.ppx, state.px, 1 - Math.exp(-dt * 2.5));
      state.ppy = lerp(state.ppy, state.py, 1 - Math.exp(-dt * 2.5));
      draw();
    },
    setProgress(v) { state.target = v; },
    drawOnce() { draw(); },
  };
}

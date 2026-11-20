/* Sheila's Baking Co. Plain modules, no dependencies.
   Everything on the page reads right without this file; it adds the live parts. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const money = n => '$' + n.toFixed(2);
const dollars = n => '$' + n.toLocaleString('en-US');
const icon = name => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const TZ = 'America/New_York';
const IMG = 'assets/img/';
const SHOP_MAIL = 'sheilasbakingco@gmail.com';
const hooks = {};   // small bridges between the parts below
const STACKED = '(max-width: 599px), (max-width: 899px) and (max-aspect-ratio: 4/5)';   // the first screen with the wheel under the words; the stylesheet uses the same test

/* the height of the screen with the browser's bars showing: it does not change as they slide away */
const smallHeight = (() => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  return () => probe.offsetHeight || innerHeight;
})();

/* the bakery's own clock, wherever the visitor is */
const shopNow = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(p.weekday.slice(0, 3).toLowerCase()), mins: (+p.hour % 24) * 60 + +p.minute, y: +p.year, m: +p.month, d: +p.day };
};
const toMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const clock = m => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`; };
const clockFull = m => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };

/* ---------------------------------------------------------------- the one entrance, on load */
$$('[data-enter]').forEach((el, i) => el.style.setProperty('--i', i));
setTimeout(() => root.classList.add('is-ready'), 40);
setTimeout(() => root.classList.add('is-entered'), 2000);   // never leave the first screen waiting on a stalled clock

/* ---------------------------------------------------------------- a short note at the bottom of the screen */
const toast = (() => {
  const el = $('[data-toast]');
  let t = 0, t2 = 0;
  return (msg, link) => {
    if (!el) return;
    el.textContent = msg;
    if (link) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.text; el.append(a); }
    clearTimeout(t); clearTimeout(t2);
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('is-on');
    t = setTimeout(() => { el.classList.remove('is-on'); t2 = setTimeout(() => { el.hidden = true; }, 450); }, 2800);
  };
})();

/* ---------------------------------------------------------------- links inside the page glide; the keyboard's focus never does */
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href^="#"]');
  const id = a?.getAttribute('href');
  if (!id || id.length < 2 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const target = document.getElementById(id.slice(1));
  if (!target) return;
  e.preventDefault();
  if (a.dataset.pick) hooks.pick?.(a.dataset.pick);
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  history.pushState(null, '', id);
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

/* ---------------------------------------------------------------- opening hours, in the bakery's own time zone */
const hours = (() => {
  const dl = $('[data-hours]');
  if (!dl) return null;
  const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const week = Array(7).fill(null);
  const rows = $$(':scope > div', dl);
  rows.forEach(row => row.dataset.days.split(',').forEach(d => { week[+d] = row.dataset.open ? { open: toMins(row.dataset.open), close: toMins(row.dataset.close), row } : { row }; }));
  const read = () => {
    const { day, mins } = shopNow();
    const t = week[day];
    rows.forEach(r => r.classList.toggle('is-today', !!t && t.row === r));
    if (t && t.open != null && mins >= t.open && mins < t.close) return { open: true, text: `Open now until\u00a0${clock(t.close)}`, short: `Open until ${clock(t.close)}` };
    for (let k = 0; k < 8; k++) {
      const d = (day + k) % 7, n = week[d];
      if (!n || n.open == null || (k === 0 && mins >= n.open)) continue;
      const when = k === 0 ? 'today' : k === 1 ? 'tomorrow' : NAMES[d];
      return { open: false, text: `Closed now, opens ${when} at\u00a0${clock(n.open)}`, short: `Opens ${k === 0 ? '' : k === 1 ? 'tomorrow ' : NAMES[d].slice(0, 3) + ' '}${clock(n.open)}` };
    }
    return null;
  };
  const paint = () => {
    let s = null;
    try { s = read(); } catch { /* the hours stand as written */ }
    if (!s) return;
    $$('[data-status]').forEach(el => { el.classList.toggle('is-open', s.open); $('[data-status-text]', el).textContent = el.classList.contains('status--nav') ? s.short : s.text; });
  };
  paint();
  setInterval(paint, 60000);
  return { week };
})();

/* ---------------------------------------------------------------- nav: solid once the page moves, away on the way down, a sheet on a phone */
const navTone = (() => {
  const nav = $('[data-nav]'), hero = $('[data-hero]'), sheet = $('[data-sheet]'), toggle = $('.nav__toggle'), dock = $('[data-dock]'), box = $('#box'), bar = $('.announce');
  if (!nav) return () => {};
  let last = scrollY, boxOn = false, footOn = false, roadOn = false, sameOn = false;
  const tone = () => { nav.dataset.tone = nav.classList.contains('is-solid') || nav.classList.contains('is-sheet') ? 'ink' : (hero?.dataset.tone || 'ink'); };
  const onScroll = () => {
    const y = scrollY, top = (bar ? bar.offsetHeight : 0) + 24, edge = hero ? hero.offsetTop + hero.offsetHeight - 90 : 200;
    nav.classList.toggle('is-solid', y > top);
    if (!sheet || sheet.hidden) nav.classList.toggle('is-hidden', y > edge && y > last + 2 ? true : y < last - 2 ? false : nav.classList.contains('is-hidden'));
    if (dock) dock.classList.toggle('is-on', y > edge && !boxOn && !footOn && !roadOn && !sameOn);
    last = y;
    tone();
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if ('IntersectionObserver' in window) {
    if (box) new IntersectionObserver(es => { boxOn = es[0].isIntersecting; onScroll(); }, { rootMargin: '-35% 0px -35% 0px' }).observe(box);
    const road = $('.drive__road');   // the bar would sit on the road the bus drives
    if (road) new IntersectionObserver(es => { roadOn = es[0].isIntersecting; onScroll(); }).observe(road);
    const foot = $('.footer');   // the footer has its own Order and phone links: the bar would only cover them
    if (foot) new IntersectionObserver(es => { footOn = es[0].isIntersecting; onScroll(); }, { rootMargin: '0px 0px -88px 0px' }).observe(foot);
    // wherever the page already shows its own Order online button, the bar would only say it twice
    const same = new Set(), order = dock && $('a.btn:not(.btn--line)', dock)?.getAttribute('href');
    const twins = order ? $$('main a.btn').filter(a => a.getAttribute('href') === order) : [];
    if (twins.length) { const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? same.add(e.target) : same.delete(e.target)); sameOn = same.size > 0; onScroll(); }, { rootMargin: '0px 0px -72px 0px' }); twins.forEach(a => io.observe(a)); }
  }

  const setSheet = open => {
    sheet.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    root.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-sheet', open);
    root.classList.toggle('sheet-open', open);
    if (open) nav.classList.remove('is-hidden');
    tone();
  };
  toggle?.addEventListener('click', () => setSheet(sheet.hidden));
  sheet?.addEventListener('click', e => { if (e.target.closest('a')) setSheet(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && sheet && !sheet.hidden) { setSheet(false); toggle.focus(); } });
  matchMedia('(min-width: 1141px)').addEventListener('change', e => { if (e.matches && sheet && !sheet.hidden) setSheet(false); });

  // the word for the section on screen
  const links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }
  return tone;
})();

/* ---------------------------------------------------------------- sprinkles: a handful, falling once, when the sprinkle doughnut comes to the front */
const sprinkles = (() => {
  const hero = $('[data-hero]');
  if (!hero || reduced) return () => {};
  const COLORS = ['#e4572e', '#f2c14e', '#fffdf8', '#17655c', '#6db36b', '#ef8fa3', '#3f6fc4'];
  let last = 0;
  return (x, spread, count = 80) => {
    const now = performance.now();
    if (now - last < 2500) return;
    last = now;
    const c = document.createElement('canvas');
    if (!c.getContext) return;
    c.className = 'hero__sprinkles';
    c.setAttribute('aria-hidden', 'true');
    hero.append(c);
    const ctx = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    let parts = Array.from({ length: count }, (_, i) => ({ x: x + (Math.random() - .5) * spread, y: -20 - Math.random() * 60, vx: (Math.random() - .5) * 1.6, vy: 1 + Math.random() * 3, a: Math.random() * 6.28, va: (Math.random() - .5) * .3, l: 9 + Math.random() * 8, t: 3.5 + Math.random() * 1.5, c: COLORS[i % COLORS.length], wait: Math.floor(Math.random() * 34) }));
    const tick = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      parts = parts.filter(p => p.y < h + 40);
      for (const p of parts) {
        if (p.wait > 0) { p.wait--; continue; }
        p.vy = Math.min(p.vy + .22, 11); p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-p.l / 2, -p.t / 2, p.l, p.t, p.t / 2); else ctx.rect(-p.l / 2, -p.t / 2, p.l, p.t);
        ctx.fill(); ctx.restore();
      }
      parts.length ? requestAnimationFrame(tick) : c.remove();
    };
    requestAnimationFrame(tick);
  };
})();

/* ---------------------------------------------------------------- hero: the wheel.
   Eight plates on a ring. Whichever is in front fills in the label card and colours the first screen.
   It turns when you turn it: drag, tap a neighbour, or use the arrows on the card.
   Only the front plate and its two neighbours show. The script fits them and the card into the room the words leave,
   so nothing is cut by the fold, the nav or the edge of the screen. */
(() => {
  const hero = $('[data-hero]'), el = $('[data-wheel]');
  if (!hero || !el) return;
  const plates = $$('[data-plate]', el), n = plates.length, step = (Math.PI * 2) / n;
  const card = $('.tag', el), copy = $('.hero__copy', hero);
  const nameEl = $('[data-now-name]'), priceEl = $('[data-now-price]'), descEl = $('[data-now-desc]'), nEl = $('[data-now-n]'), text = $('[data-now]');
  const prev = $('[data-wheel-prev]'), next = $('[data-wheel-next]');
  const stacked = matchMedia(STACKED), H = Math.SQRT1_2;
  let pos = reduced ? 0 : -1.2, target = 0, shown = -1, raf = 0, geo = null, entering = !reduced, swap = 0, lastW = 0, lastH = 0;

  // the tallest the card gets at a width: with that as its height, its arrows never move as the wheel turns
  const cardHeight = width => {
    const ghost = card.cloneNode(true);
    ghost.removeAttribute('data-enter');
    ghost.style.cssText = `position:absolute;left:0;top:0;bottom:auto;width:${width}px;margin:0;visibility:hidden;opacity:1;transform:none;transition:none`;
    el.append(ghost);
    const [a, b, c] = ['[data-now-name]', '[data-now-price]', '[data-now-desc]'].map(q => $(q, ghost));
    let h = 0;
    plates.forEach(p => { a.textContent = p.dataset.name; b.textContent = p.dataset.price; c.textContent = p.dataset.desc; h = Math.max(h, ghost.offsetHeight); });
    ghost.remove();
    return Math.ceil(h);
  };
  const put = vars => { for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v.toFixed(1) + 'px'); };

  const measure = () => {
    hero.style.removeProperty('--need');
    const W = hero.clientWidth, hr = hero.getBoundingClientRect(), cr = copy.getBoundingClientRect();
    const g = Math.max(16, cr.left - hr.left);   // the page gutter
    lastW = W; lastH = innerHeight;
    let north, d, fx, fy, dx, dy, tw, th, tx, tb, need = 0;
    if (stacked.matches) {
      // under the words: the plate takes what is left of the first screen, the card laps its lower edge
      const lap = 44;
      tw = Math.min(W - 2 * g, 440); th = cardHeight(tw);
      const fold = smallHeight() - hero.offsetTop;
      d = clamp(Math.min(W * .56, fold - el.offsetTop - (th - lap) - 40), 148, 360);
      north = true; fx = W / 2; fy = 8 + d / 2;
      dx = Math.min(W / 2 - d / 4 - 8, d * .78); dy = d * .1;   // the neighbours stay whole on the screen, tucked a little behind the front plate
      tx = (W - tw) / 2; tb = 0;
      put({ '--stage': d + 16, '--lap': lap });
    } else {
      const navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 80;
      const top = navH + 12, bottom = hero.clientHeight - 28;
      const left = cr.right - hr.left + 32, right = Math.min(W - 20, W - g + 96), rw = right - left, rh = bottom - top;
      let ty;
      if (rw >= 540) {
        // beside the words, with room: the card hangs off the plate's lower left, the neighbours tuck in on the right
        tw = 328; th = cardHeight(tw);
        d = clamp(Math.min((rh - th) / .72, (rw - 64) / 1.37, 520), 220, 520);
        const over = clamp(64 + (rw - (1.37 * d + 64)) * .8, 64, 150), groupH = d * .72 + th;
        if (groupH > rh) need = top + groupH + 28;
        const room = Math.max(rh, groupH), L = d * .62;
        fy = top + (room - groupH) / 2 + d / 2;
        dy = Math.max(d * .2, Math.min(d * .475, fy - top - d / 4, top + room - fy - d / 4));
        dx = Math.sqrt(L * L - dy * dy);
        fx = left + Math.max(0, (rw - (d / 2 + over + dx + d / 4)) / 2) + over + d / 2;
        north = false; tx = fx - d / 2 - over; ty = fy + d * .22;
      } else {
        // beside the words in a narrow column: the plate above, its neighbours either side, the card under it
        const lap = 40;
        tw = Math.min(rw, 340); th = cardHeight(tw);
        d = clamp(Math.min(rw * .72, rh - th + lap), 104, 360);
        const groupH = d + th - lap;
        if (groupH > rh) need = top + groupH + 28;
        fx = left + rw / 2; fy = top + (Math.max(rh, groupH) - groupH) / 2 + d / 2;
        dx = Math.max(d * .45, Math.min(rw / 2 - d / 4 - 4, d * .78)); dy = d * .08;
        north = true; tx = fx - tw / 2; ty = fy + d / 2 - lap;
      }
      if (need) hero.style.setProperty('--need', Math.ceil(need) + 'px');
      tb = Math.max(hero.clientHeight, need) - (ty + th);   // the card hangs from its bottom edge
    }
    // the ring those three points sit on. Facing north the front plate is its top; facing west, its left end.
    geo = north ? { north, d, fx, R: dx / H, Ry: dy / (1 - H), anchor: -Math.PI / 2, per: dx * .95 } : { north, d, fx, R: dx / (1 - H), Ry: dy / H, anchor: Math.PI, per: Math.hypot(dx, dy) * .9 };
    geo.cx = north ? fx : fx + geo.R; geo.cy = north ? fy + geo.Ry : fy;
    el.classList.toggle('is-north', north);
    put({ '--R': geo.R, '--Ry': geo.Ry, '--d': d, '--cx': geo.cx, '--cy': geo.cy, '--tw': tw, '--th': th, '--tx': tx, '--tb': tb });
    place();
    el.classList.add('is-set');
  };

  const signed = i => { let k = (((i - pos) % n) + n) % n; if (k > n / 2) k -= n; return k; };
  const place = () => {
    if (!geo) return;
    plates.forEach((p, i) => {
      const k = signed(i), far = Math.abs(k), a = geo.anchor + k * step, near = Math.max(0, 1 - far), s = .5 + .5 * near * near * (3 - 2 * near);
      p.style.setProperty('--x', (Math.cos(a) * geo.R).toFixed(1) + 'px');
      p.style.setProperty('--y', (Math.sin(a) * geo.Ry).toFixed(1) + 'px');
      p.style.setProperty('--s', s.toFixed(3));
      p.style.setProperty('--o', clamp((1.5 - far) / .4).toFixed(2));   // a plate fades in as it becomes a neighbour, and out as it leaves
      p.style.zIndex = String(10 - Math.round(far));
      p.classList.toggle('is-far', far >= 1.5);
    });
  };

  const show = i => {
    if (i === shown) return;
    const first = shown < 0;
    shown = i;
    const p = plates[i];
    hero.style.setProperty('--g', p.dataset.ground);
    hero.dataset.tone = p.dataset.tone;
    navTone();
    $('meta[name="theme-color"]')?.setAttribute('content', p.dataset.ground);
    plates.forEach((q, j) => { j === i ? q.setAttribute('aria-current', 'true') : q.removeAttribute('aria-current'); });
    // the next two along are fetched ahead, so a turn never shows an empty plate
    [1, -1, 2].forEach(o => { const img = $('img', plates[(i + o + n) % n]); if (img && img.loading === 'lazy') img.loading = 'eager'; });
    const write = () => { nameEl.textContent = p.dataset.name; priceEl.textContent = p.dataset.price; descEl.textContent = p.dataset.desc; nEl.textContent = i + 1; };
    clearTimeout(swap);
    if (first || reduced) write();
    else { text.classList.add('is-out'); swap = setTimeout(() => { write(); text.classList.remove('is-out'); }, 160); }
    if (!first && p.dataset.key === 'sprinkle' && geo) sprinkles(geo.fx, geo.d * 1.5);
  };

  const front = () => (((Math.round(pos) % n) + n) % n);
  const frame = () => {
    raf = 0;
    const diff = target - pos;
    pos = Math.abs(diff) < .0015 ? target : pos + diff * (drag.on ? .5 : entering ? .07 : .13);
    place();
    if (!entering) show(front());
    if (pos !== target) raf = requestAnimationFrame(frame); else entering = false;
  };
  const run = () => { if (reduced) { pos = target; place(); show(front()); } else if (!raf) raf = requestAnimationFrame(frame); };
  const go = by => { entering = false; target = Math.round(target) + by; run(); };

  text.setAttribute('aria-live', 'polite');
  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));

  // dragging. A mouse may pull up and down where the neighbours sit above and below; a finger always pulls sideways, so the page still scrolls.
  const drag = { on: false, id: null, x: 0, y: 0, start: 0, moved: 0, axis: null, t: 0, v: 0, lastPos: 0, plate: null };
  const along = e => {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.axis && Math.hypot(dx, dy) > 6) drag.axis = geo.north || e.pointerType !== 'mouse' || Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    return drag.axis === 'y' ? dy : drag.axis === 'x' ? -dx : 0;
  };
  el.addEventListener('pointerdown', e => {
    const plate = e.target.closest('[data-plate]');
    if (!plate || e.button) return;
    entering = false;
    Object.assign(drag, { on: true, id: e.pointerId, x: e.clientX, y: e.clientY, start: pos, moved: 0, axis: null, t: e.timeStamp, v: 0, lastPos: pos, plate });
    target = pos;
  });
  addEventListener('pointermove', e => {
    if (!drag.on || e.pointerId !== drag.id) return;
    const d = along(e);
    drag.moved = Math.max(drag.moved, Math.abs(d));
    if (!drag.axis) return;
    if (drag.moved > 6 && !el.classList.contains('is-dragging')) { el.classList.add('is-dragging'); try { drag.plate.setPointerCapture(drag.id); } catch { /* the pointer has gone */ } }
    target = drag.start + d / geo.per;
    const dt = Math.max(1, e.timeStamp - drag.t);
    drag.v = .7 * drag.v + .3 * ((target - drag.lastPos) / dt * 1000);
    drag.t = e.timeStamp; drag.lastPos = target;
    run();
  });
  const release = e => {
    if (!drag.on || e.pointerId !== drag.id) return;
    drag.on = false;
    el.classList.remove('is-dragging');
    if (drag.moved <= 6) target = Math.round(pos) + Math.round(signed(plates.indexOf(drag.plate)));   // a tap: bring that plate to the front
    else target = Math.round(target + clamp(drag.v * .16, -1.6, 1.6));
    run();
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  el.addEventListener('dragstart', e => e.preventDefault());

  // Under the words the plate is sized from the screen's height. A phone's bars sliding away must not resize it, so a change in height alone is ignored there unless it is large.
  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (stacked.matches && hero.clientWidth === lastW && Math.abs(innerHeight - lastH) < 160) return; measure(); }); });
  stacked.addEventListener('change', measure);
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  measure();
  show(0);
  run();   // the entrance: the ring rolls the first plate into place
})();

/* ---------------------------------------------------------------- the strip under the first screen: where the bus is next */
(() => {
  const out = $('[data-bus-next]');
  if (!out) return;
  const outings = $$('.day[data-out][data-place]').map(d => { const [a, b] = d.dataset.out.split('-').map(toMins); return { day: +d.dataset.day, a, b, place: d.dataset.place }; });
  if (!outings.length) return;
  const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  try {
    const now = shopNow();
    for (let k = 0; k < 8; k++) {
      const wd = (now.day + k) % 7, o = outings.find(x => x.day === wd);
      if (!o || (k === 0 && now.mins >= o.b)) continue;
      const span = `${clock(o.a).replace(/\s[ap]m$/, '')} to ${clock(o.b)}`;
      out.textContent = k === 0 && now.mins >= o.a ? `Out now until ${clock(o.b)}, at ${o.place}` : `${k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : NAMES[wd]}, ${span}, at ${o.place}`;
      break;
    }
  } catch { /* no clock: the line stands as written */ }
})();

/* ---------------------------------------------------------------- words that fill in as the page moves */
(() => {
  const els = $$('[data-words]');
  if (!els.length) return;
  const split = node => [...node.childNodes].forEach(c => {
    if (c.nodeType === 3) {
      const frag = document.createDocumentFragment();
      c.textContent.split(/( +|\n+)/).forEach(tok => {
        if (!tok) return;
        if (/^[ \n]+$/.test(tok)) { frag.append(' '); return; }
        const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; frag.append(s);
      });
      c.replaceWith(frag);
    } else if (c.nodeType === 1) split(c);
  });
  const sets = els.map(el => { split(el); return { el, words: $$('.w', el) }; });
  if (reduced) { sets.forEach(s => s.words.forEach(w => w.classList.add('on'))); return; }
  let ticking = false;
  const paint = () => {
    ticking = false;
    const vh = innerHeight;
    sets.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      const p = clamp((vh * .88 - r.top) / (r.height + vh * .4));
      const lit = Math.round(p * 1.08 * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  addEventListener('resize', paint);
  paint();
})();

/* ---------------------------------------------------------------- drawings: one for every drink, since the bakery has no photograph of each yet.
   A cup seen from above, in its kraft sleeve. draw('latte') returns the svg as a string. */
const draw = (() => {
  const INK = '#1f1a17', RIM = '#fffdf8', KRAFT = '#b08655', GROUND = '#cfab7d';   // the cup stands on the kraft of the page, in a sleeve a shade deeper
  const hot = (liquid, art, r = 118) => `
    <ellipse cx="208" cy="${262 + r * .12}" rx="${r * 1.2}" ry="${r * 1.16}" fill="${INK}" opacity=".13"/>
    <circle cx="200" cy="250" r="${r * 1.13}" fill="${KRAFT}"/>
    <circle cx="200" cy="250" r="${r}" fill="${RIM}"/>
    <circle cx="200" cy="250" r="${r * .87}" fill="${liquid}"/>
    ${art}
    <path d="M${200 - r * .62} ${250 - r * .5}a${r * .8} ${r * .8} 0 0 1 ${r * .5} -${r * .32}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".26"/>`;
  const lid = `<g transform="translate(306 392) rotate(-14)"><ellipse cx="6" cy="8" rx="66" ry="62" fill="${INK}" opacity=".14"/><circle r="62" fill="#1d1816"/><circle r="47" fill="none" stroke="#3a312c" stroke-width="5"/><ellipse cx="0" cy="-28" rx="13" ry="6" fill="#3a312c"/></g>`;
  const cold = (liquid, art, ice = true) => `
    <ellipse cx="208" cy="268" rx="138" ry="132" fill="${INK}" opacity=".12"/>
    <circle cx="200" cy="250" r="128" fill="${KRAFT}"/>
    <circle cx="200" cy="250" r="118" fill="#f4f7f4"/>
    <circle cx="200" cy="250" r="106" fill="${liquid}"/>
    ${ice ? `<g fill="#fff" opacity=".5"><rect x="140" y="196" width="46" height="46" rx="10" transform="rotate(-18 163 219)"/><rect x="206" y="204" width="50" height="50" rx="11" transform="rotate(14 231 229)"/><rect x="162" y="262" width="48" height="48" rx="10" transform="rotate(24 186 286)"/><rect x="224" y="270" width="40" height="40" rx="9" transform="rotate(-10 244 290)"/></g>` : ''}
    ${art}
    <path d="M238 214L318 96" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" opacity=".12" transform="translate(8 10)"/>
    <path d="M238 214L318 96" fill="none" stroke="${RIM}" stroke-width="18" stroke-linecap="round"/>
    <path d="M238 214L318 96" fill="none" stroke="#d9cdb6" stroke-width="4" stroke-linecap="round" transform="translate(5 3)"/>
    <ellipse cx="238" cy="214" rx="10" ry="8" fill="#3a2a1c" opacity=".45"/>`;
  const heart = '<path d="M200 300c-44-30-58-60-40-82 14-16 34-10 40 6 6-16 26-22 40-6 18 22 4 52-40 82z" fill="#fff8ea"/><path d="M200 292c-9-20-9-44 0-62" fill="none" stroke="#d2a878" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
  const tulip = '<g fill="#fff8ea"><ellipse cx="200" cy="218" rx="26" ry="15"/><ellipse cx="200" cy="246" rx="34" ry="17"/><ellipse cx="200" cy="278" rx="24" ry="14"/></g>';
  const stick = `<g transform="translate(78 404) rotate(-24)"><rect x="-58" y="-9" width="116" height="18" rx="9" fill="#8a5a36"/><rect x="-58" y="-3" width="116" height="5" rx="2.5" fill="#6d4426"/></g>`;
  const tag = `<path d="M276 172c26-22 52-26 66-18" fill="none" stroke="${RIM}" stroke-width="3" stroke-linecap="round"/><rect x="334" y="134" width="40" height="46" rx="5" fill="${RIM}" transform="rotate(16 354 157)"/><circle cx="350" cy="148" r="3.5" fill="#d9cdb6"/>`;
  const art = {
    coffee: () => hot('#2b1a12', '') + lid,
    americano: () => hot('#3a2218', '<circle cx="200" cy="250" r="98" fill="none" stroke="#a66a36" stroke-width="7" opacity=".85"/>') + lid,
    blackeye: () => hot('#24150e', '<circle cx="174" cy="240" r="24" fill="#b9783e"/><circle cx="232" cy="262" r="24" fill="#b9783e"/><circle cx="174" cy="240" r="11" fill="#7d4a22"/><circle cx="232" cy="262" r="11" fill="#7d4a22"/>') + lid,
    latte: () => hot('#c9976a', heart) + lid,
    cappuccino: () => hot('#a9703f', '<circle cx="200" cy="250" r="84" fill="#f6ead4"/><g fill="#8a5a36" opacity=".55"><circle cx="176" cy="228" r="3"/><circle cx="214" cy="218" r="2.5"/><circle cx="232" cy="252" r="3"/><circle cx="196" cy="268" r="2.5"/><circle cx="168" cy="262" r="2"/><circle cx="222" cy="284" r="2.5"/><circle cx="198" cy="240" r="2"/></g>') + lid,
    flatwhite: () => hot('#b98557', tulip) + lid,
    espresso: () => hot('#b9783e', '<circle cx="200" cy="250" r="44" fill="#8a4f24"/><circle cx="200" cy="250" r="22" fill="#5d3216"/>', 82) + lid,
    chai: () => hot('#d49e66', '<g fill="#8a5a36" opacity=".7"><circle cx="170" cy="226" r="3"/><circle cx="222" cy="214" r="2.5"/><circle cx="240" cy="258" r="3"/><circle cx="188" cy="276" r="2.5"/><circle cx="158" cy="268" r="2"/><circle cx="214" cy="292" r="3"/><circle cx="204" cy="244" r="2.5"/></g><circle cx="200" cy="250" r="96" fill="none" stroke="#f3dcb8" stroke-width="8" opacity=".8"/>') + stick,
    fog: () => hot('#d8c7a8', '<circle cx="200" cy="250" r="72" fill="#f4ecdc"/>') + tag + '<g transform="translate(92 404) rotate(-30)" fill="none" stroke="#6f9070" stroke-width="5" stroke-linecap="round"><path d="M-46 0h92"/><path d="M-24 0l-10-14M-4 0l-10-14M16 0l-10-14M-24 0l-10 14M-4 0l-10 14M16 0l-10 14"/></g>',
    cocoa: () => hot('#5b3422', '<path d="M200 250m-58 0a58 58 0 1 0 116 0a58 58 0 1 0-116 0M200 250m-30 0a30 30 0 1 0 60 0a30 30 0 1 0-60 0" fill="none" stroke="#8a5a40" stroke-width="7" stroke-linecap="round" opacity=".8"/>') + lid,
    tea: () => hot('#c8873a', '<circle cx="200" cy="250" r="78" fill="#d79a4b" opacity=".6"/>') + tag,
    iced: () => cold('#7a4a2a', ''),
    chocmilk: () => cold('#84533a', '', false),
    frappe: () => cold('#c9a27a', '<path d="M200 250c0-18 26-18 26 2s-48 26-52-4 44-58 78-22-14 104-66 96" fill="none" stroke="#fffdf6" stroke-width="20" stroke-linecap="round"/><path d="M160 204c22 10 52 8 76-8" fill="none" stroke="#8a5a36" stroke-width="5" stroke-linecap="round" opacity=".7"/>', false),
    water: () => `<g transform="translate(200 256) rotate(-28)"><ellipse cx="10" cy="16" rx="150" ry="52" fill="${INK}" opacity=".1"/><rect x="-150" y="-46" width="250" height="92" rx="34" fill="#eef6f5"/><rect x="-150" y="-46" width="250" height="92" rx="34" fill="none" stroke="#c2d9d7" stroke-width="3"/><rect x="-70" y="-46" width="96" height="92" fill="#fffdf6"/><path d="M-56-14h68M-56 6h46" stroke="#c2d9d7" stroke-width="5" stroke-linecap="round"/><path d="M100-28h34a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8h-34z" fill="#eef6f5" stroke="#c2d9d7" stroke-width="3"/><rect x="140" y="-22" width="26" height="44" rx="6" fill="#3f8f92"/></g>`,
  };
  return kind => `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="500" fill="${GROUND}"/>${(art[kind] || art.coffee)()}</svg>`;
})();

/* ---------------------------------------------------------------- the board: tabs, and a picture for every line.
   On a wide screen the picture shows in the frame beside the list. On a phone it opens under the line you tap. */
(() => {
  const sec = $('#menu');
  if (!sec) return;
  const tabs = $$('[role="tab"]', sec), panels = $$('[role="tabpanel"]', sec), rows = $$('.row', sec);
  const frame = $('[data-preview]', sec), tag = $('[data-preview-price]', sec), stamp = tag?.closest('.stamp');
  const wide = matchMedia('(min-width: 1000px)');

  const picture = (row, forFrame) => {
    if (row.dataset.draw) {
      const holder = document.createElement('div');
      holder.innerHTML = draw(row.dataset.draw);
      const svg = holder.firstElementChild;
      if (forFrame) svg.setAttribute('aria-hidden', 'true'); else { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `A drawing of ${$('.row__name', row).textContent.trim().toLowerCase()}, seen from above`); }
      return svg;
    }
    const img = new Image(800, 1000);
    img.decoding = 'async';
    img.alt = forFrame ? '' : row.dataset.alt || '';
    img.sizes = forFrame ? '(min-width: 1000px) 34vw, 40vw' : '38vw';
    img.srcset = `${IMG}${row.dataset.img}-400.webp 400w, ${IMG}${row.dataset.img}-800.webp 800w`;
    img.src = `${IMG}${row.dataset.img}-800.webp`;
    img.style.objectPosition = row.dataset.pos || '50% 50%';
    if (!forFrame) img.loading = 'lazy';
    return img;
  };
  const priceTag = row => { const t = $('.row__price', row).textContent.trim(); return t.includes(' to ') ? 'from ' + t.split(' to ')[0] : t; };

  // every line gets a body that opens, and, where it can go in a box, a button for that
  rows.forEach(row => {
    const more = $('.row__more', row), btn = $('.row__btn', row);
    const pad = document.createElement('div'), text = document.createElement('div');
    pad.className = 'row__pad'; text.className = 'row__text';
    text.append(...more.childNodes);
    if (row.dataset.box) {
      const acts = document.createElement('div'), add = document.createElement('button');
      acts.className = 'row__acts'; add.type = 'button'; add.className = 'add'; add.dataset.add = row.dataset.box;
      add.innerHTML = icon('plus') + 'Add to my box';
      acts.append(add); text.append(acts);
    }
    pad.append(text); more.append(pad);
    more.id = 'more-' + row.dataset.id;
    btn.setAttribute('aria-controls', more.id);
    btn.setAttribute('aria-expanded', 'false');
  });

  let token = 0, current = null;
  const show = row => {
    if (!frame || !row || !wide.matches || current === row) return;
    current = row;
    const my = ++token, layer = document.createElement('div'), pic = picture(row, true);
    layer.className = 'frame__layer';
    layer.append(pic);
    const go = () => {
      if (my !== token) return;
      frame.append(layer);
      void layer.offsetWidth;
      $$('.frame__layer', frame).forEach(l => { if (l !== layer) { l.classList.remove('is-on'); setTimeout(() => l.remove(), 700); } });
      layer.classList.add('is-on');
      if (tag) { tag.textContent = priceTag(row); stamp.classList.add('is-pop'); setTimeout(() => stamp.classList.remove('is-pop'), 200); }
    };
    pic.decode ? pic.decode().then(go, go) : go();
  };

  const activeIn = panel => $('.row.is-on', panel);
  const open = (row, on = true) => {
    const panel = row.closest('.panel');
    $$('.row', panel).forEach(r => {
      const yes = on && r === row;
      r.classList.toggle('is-on', yes);
      $('.row__btn', r).setAttribute('aria-expanded', String(yes));
    });
    if (!on) return;
    if (!$('.row__fig', row)) {        // the picture for a phone, made the first time the line opens
      const fig = document.createElement('figure');
      fig.className = 'row__fig';
      fig.append(picture(row, false));
      $('.row__pad', row).prepend(fig);
    }
    show(row);
  };

  rows.forEach(row => {
    const btn = $('.row__btn', row);
    btn.addEventListener('click', () => open(row, !row.classList.contains('is-on') || wide.matches));
    btn.addEventListener('focus', () => show(row));
    if (finePointer) {
      row.addEventListener('pointerenter', () => { row.classList.add('is-peek'); show(row); });
      row.addEventListener('pointerleave', () => row.classList.remove('is-peek'));
    }
  });
  if (finePointer) $$('.rows', sec).forEach(list => list.addEventListener('pointerleave', () => show(activeIn(list.closest('.panel')))));

  const select = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    panels.forEach(p => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    const panel = $('#' + tab.getAttribute('aria-controls'));
    if (!activeIn(panel)) open($('.row', panel));
    current = null;
    show(activeIn(panel));
    if (focus) tab.focus();
    const strip = tab.parentElement;
    if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (to == null) return;
      e.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], true);
    });
  });
  panels.forEach(p => open($('.row', p)));
  current = null;
  show(activeIn(panels.find(p => !p.hidden)));
  wide.addEventListener('change', () => { current = null; show(activeIn(panels.find(p => !p.hidden))); });

  sec.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) hooks.add?.(add.dataset.add, true);
  });

  // other parts of the page can open a line: the bar at the top does, for the new pastry
  hooks.pick = id => {
    const row = rows.find(r => r.dataset.id === id);
    if (!row) return;
    select(tabs.find(t => t.getAttribute('aria-controls') === row.closest('.panel').id));
    open(row);
  };
})();

/* ---------------------------------------------------------------- build a dozen */
(() => {
  const form = $('[data-builder]');
  if (!form) return;
  const kbox = $('[data-kbox]', form), slotsEl = $('[data-slots]', form), picker = $('[data-picker]', form), lines = $('[data-lines]', form);
  const totalEl = $('[data-total]', form), countEl = $('[data-count]', form), leftEl = $('[data-left]', form), stepPick = $('[data-step-pick]', form);
  const choice = $('[data-choice]', form), choiceImg = $('[data-choice-img]', form), choiceName = $('[data-choice-name]', form);
  const daysEl = $('[data-days]', form), timeEl = $('[data-time]', form), err = $('[data-error]', form);
  const dialog = $('[data-receipt]'), dockBox = $('[data-dock-box]'), dockCount = $('[data-dock-count]');
  const pickTitle = $('[data-pick-title]', form), choiceNote = $('[data-choice-note]', form), stage = $('.builder__stage', form), ticket = $('.ticket', form), stepExtras = $('[data-step-extras]', form);
  const SIZE = 12, COFFEE = 40;
  const catalog = $$('#menu .row[data-box]').map(r => ({ id: r.dataset.box, name: $('.row__name', r).firstChild.textContent.trim(), price: +r.dataset.price }));
  const byId = Object.fromEntries(catalog.map(c => [c.id, c]));
  const state = { mode: 'own', items: [], coffee: 0, boxes: 1 };
  let lastLen = 0;

  // the twelve places in the box
  slotsEl.innerHTML = Array.from({ length: SIZE }, () => '<li class="slot"></li>').join('');
  const slots = $$('.slot', slotsEl);

  // everything that can go in
  picker.innerHTML = catalog.map(c => `
    <div class="pick" data-id="${c.id}">
      <span class="pick__thumb"><img src="${IMG}t-${c.id}-96.webp" width="48" height="48" alt="" loading="lazy" decoding="async"><span class="pick__count" hidden>0</span></span>
      <span class="pick__name">${c.name}<span class="pick__price">${money(c.price)}</span></span>
      <button type="button" class="pick__add" aria-label="Add ${c.name}, ${money(c.price)}"></button>
      <button type="button" class="sq pick__less" aria-label="Take one ${c.name} out" hidden>${icon('minus')}</button>
    </div>`).join('');
  const picks = Object.fromEntries($$('.pick', picker).map(p => [p.dataset.id, p]));

  const modeInput = () => $('input[name="mode"]:checked', form);
  const boxPrice = () => state.mode === 'own' ? state.items.reduce((s, id) => s + byId[id].price, 0) : +modeInput().dataset.price;
  const total = () => boxPrice() * state.boxes + state.coffee * COFFEE;
  const grouped = () => { const m = new Map(); state.items.forEach(id => m.set(id, (m.get(id) || 0) + 1)); return [...m].map(([id, q]) => ({ ...byId[id], q })); };

  const paint = () => {
    const own = state.mode === 'own', count = state.items.length;
    // the box
    kbox.classList.toggle('is-choice', !own);
    choice.hidden = own;
    if (!own) { const inp = modeInput(); choiceImg.src = IMG + inp.dataset.img; choiceName.textContent = inp.dataset.label; }
    slots.forEach((slot, i) => {
      const id = state.items[i];
      if (slot.dataset.id === (id || '')) { slot.classList.remove('is-new'); return; }
      slot.dataset.id = id || '';
      slot.classList.toggle('is-full', !!id);
      slot.classList.toggle('is-new', !!id && i >= lastLen);
      slot.innerHTML = id ? `<button type="button" data-out="${i}" aria-label="Take the ${byId[id].name} out of the box"><img src="${IMG}t-${id}-220.webp" width="110" height="110" alt="">${icon('x')}</button>` : '';
    });
    lastLen = count;
    // the list: step two stays either way, as the picker or as a line saying we choose
    picker.hidden = !own; leftEl.hidden = !own; choiceNote.hidden = own;
    pickTitle.textContent = own ? 'Fill the box' : 'Your box';
    catalog.forEach(c => {
      const q = state.items.filter(id => id === c.id).length, p = picks[c.id];
      p.classList.toggle('has', q > 0);
      $('.pick__count', p).hidden = !q; $('.pick__count', p).textContent = q;
      $('.pick__less', p).hidden = !q;
    });
    leftEl.textContent = count === SIZE ? 'Box full' : `${SIZE - count} to go`;
    countEl.textContent = own ? `${count} of ${SIZE}` : `${SIZE} of ${SIZE}`;
    // the ticket: one line for the box, one each for the extras. The box itself shows what is in it, and the paper at the end lists it.
    const rowsOut = own ? (count ? [`<li><span>${count === SIZE ? 'Your twelve' : `${count} so far`}</span><span>${money(boxPrice())}</span></li>`] : []) : [`<li><span>Baker's choice</span><span>${money(boxPrice())}</span></li>`];
    if (state.boxes > 1 && (count || !own)) rowsOut.push(`<li><span>× ${state.boxes} boxes</span><span>${money(boxPrice() * state.boxes)}</span></li>`);
    if (state.coffee) rowsOut.push(`<li><span>${state.coffee} × Coffee to go</span><span>${money(state.coffee * COFFEE)}</span></li>`);
    lines.innerHTML = rowsOut.length ? rowsOut.join('') : '<li class="ticket__empty">Nothing in the box yet</li>';
    totalEl.textContent = money(total());
    $('[data-out="coffee"]', form).textContent = state.coffee;
    $('[data-out="boxes"]', form).textContent = state.boxes;
    if (dockBox) { dockBox.hidden = !(own && count); dockCount.textContent = count; }
  };

  const add = (id, fromMenu) => {
    if (!byId[id]) return;
    if (state.mode !== 'own') { state.mode = 'own'; $('input[name="mode"][value="own"]', form).checked = true; }
    if (state.items.length >= SIZE) {
      kbox.classList.remove('is-shake'); void kbox.offsetWidth; kbox.classList.add('is-shake');
      toast('The box is full, take one out to swap', fromMenu ? { href: '#box', text: 'See the box' } : null);
      return;
    }
    state.items.push(id);
    paint();
    if (fromMenu) toast(`In the box: ${state.items.length} of ${SIZE}`, { href: '#box', text: state.items.length === SIZE ? 'Finish it' : 'See the box' });
  };
  hooks.add = add;

  // On a phone the box sits inside step two and rides at the top of the screen while its list scrolls under it; it leaves with that step.
  // The ticket comes after the extras, so the total is read just before the date and the name.
  const small = matchMedia('(max-width: 699px)');
  const seat = () => {
    if (small.matches) { $('legend', stepPick).after(kbox); stepExtras.after(ticket); }
    else stage.append(kbox, ticket);
  };
  small.addEventListener('change', seat);
  seat();

  picker.addEventListener('click', e => {
    const p = e.target.closest('.pick');
    if (!p) return;
    if (e.target.closest('.pick__less')) { const i = state.items.lastIndexOf(p.dataset.id); if (i > -1) state.items.splice(i, 1); paint(); if (!state.items.includes(p.dataset.id)) $('.pick__add', p).focus(); }
    else if (e.target.closest('.pick__add')) add(p.dataset.id);
  });
  slotsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-out]');
    if (!b) return;
    state.items.splice(+b.dataset.out, 1);
    paint();
  });
  form.addEventListener('change', e => { if (e.target.name === 'mode') { state.mode = e.target.value; paint(); } });
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const key = b.dataset.for, lim = key === 'coffee' ? [0, 6] : [1, 9];
    state[key] = clamp(state[key] + +b.dataset.step, lim[0], lim[1]);
    paint();
  });

  // pickup: the next six mornings the shop is open, and the half hours of that morning
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mornings = (() => {
    const out = [];
    try {
      const now = shopNow(), base = Date.UTC(now.y, now.m - 1, now.d);
      for (let k = 1; out.length < 6 && k < 16; k++) {
        const d = new Date(base + k * 864e5), wd = d.getUTCDay(), h = hours?.week[wd];
        if (!h || h.open == null) continue;
        out.push({ open: h.open, close: h.close, short: SHORT[wd], date: `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`, long: `${LONG[wd]}, ${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}` });
      }
    } catch { /* no dates: the note below still gives the phone number */ }
    return out;
  })();
  daysEl.innerHTML = mornings.map((m, i) => `<label class="chipbox chipbox--day"><input type="radio" name="day" value="${m.long}" data-i="${i}"${i ? '' : ' checked'}><span><b>${m.short}</b><i>${m.date}</i></span></label>`).join('');
  const fillTimes = () => {
    const m = mornings[+($('input[name="day"]:checked', form)?.dataset.i || 0)];
    if (!m) return;
    const keep = timeEl.value;
    let html = '';
    for (let t = m.open; t <= m.close - 30; t += 30) html += `<option>${clockFull(t)}</option>`;
    timeEl.innerHTML = html;
    if ([...timeEl.options].some(o => o.value === keep)) timeEl.value = keep; else timeEl.selectedIndex = Math.min(4, timeEl.options.length - 1);
  };
  daysEl.addEventListener('change', fillTimes);
  fillTimes();

  // sending: check it, show it on paper, then hand it to the visitor's email
  const fail = (msg, el) => { err.textContent = msg; err.hidden = false; el?.focus(); };
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.hidden = true;
    $$('[aria-invalid]', form).forEach(f => f.removeAttribute('aria-invalid'));
    if (state.mode === 'own' && state.items.length < SIZE) return fail(state.items.length ? `The box holds twelve. Add ${SIZE - state.items.length} more, or let us pick.` : 'The box is empty. Add twelve, or let us pick.', $('.pick__add', picker));
    const name = form.elements.name, phone = form.elements.phone, email = form.elements.email;
    const bad = [];
    if (!name.value.trim()) bad.push([name, 'your name']);
    if (phone.value.replace(/\D/g, '').length < 7) bad.push([phone, 'a phone number']);
    if (email.value.trim() && !/^\S+@\S+\.\S+$/.test(email.value.trim())) bad.push([email, 'an email address that works']);
    if (bad.length) { bad.forEach(([f]) => f.setAttribute('aria-invalid', 'true')); return fail('Please add ' + bad.map(b => b[1]).join(' and ') + '.', bad[0][0]); }

    const day = $('input[name="day"]:checked', form)?.value || 'a morning to agree', when = `${day} at ${timeEl.value || 'a time to agree'}`;
    const what = state.mode === 'own' ? grouped().map(g => `${g.q} × ${g.name}`) : [modeInput().dataset.label];
    const rowsOut = [['Pickup', when], ['The box', what.join(', ')]];
    if (state.boxes > 1) rowsOut.push(['Boxes', `${state.boxes}, all the same`]);
    if (state.coffee) rowsOut.push(['Coffee', `${state.coffee} × Coffee to go, serves 12`]);
    rowsOut.push(['For', `${name.value.trim()}, ${phone.value.trim()}`]);
    if (form.elements.notes.value.trim()) rowsOut.push(['Notes', form.elements.notes.value.trim()]);
    $('[data-receipt-rows]', dialog).innerHTML = rowsOut.map(([k]) => `<div><dt>${k}</dt><dd></dd></div>`).join('');
    $$('[data-receipt-rows] dd', dialog).forEach((dd, i) => { dd.textContent = rowsOut[i][1]; });
    $('[data-receipt-total]', dialog).textContent = money(total());
    const body = ['Box request from the website', '', `Pickup: ${when}`, `Name: ${name.value.trim()}`, `Phone: ${phone.value.trim()}`, email.value.trim() ? `Email: ${email.value.trim()}` : null, '', state.boxes > 1 ? `${state.boxes} boxes, each with:` : 'One box:', ...what.map(w => '  ' + w), state.coffee ? `Coffee to go (serves 12): ${state.coffee}` : null, '', `Total before tax: ${money(total())}`, form.elements.notes.value.trim() ? `Notes: ${form.elements.notes.value.trim()}` : null].filter(l => l !== null).join('\n');
    $('[data-receipt-mail]', dialog).href = `mailto:${SHOP_MAIL}?subject=${encodeURIComponent(`Box request: ${when}, ${name.value.trim()}`)}&body=${encodeURIComponent(body)}`;
    dialog.showModal ? dialog.showModal() : dialog.setAttribute('open', '');
  });
  $('[data-receipt-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  paint();
})();

/* ---------------------------------------------------------------- layer cakes: five doors in one frame, one open at a time.
   Each door is the whole frame, clipped to its strip. Opening one moves the clips and slides each picture to stay centred, so nothing is ever resized. */
(() => {
  const box = $('[data-doors]');
  if (!box) return;
  const doors = $$('[data-door]', box), n = doors.length, GAP = 8;
  const stacked = matchMedia('(max-width: 759px)');
  let open = Math.max(0, doors.findIndex(d => d.classList.contains('is-open')));

  doors.forEach((d, i) => {
    const over = document.createElement('div'), card = document.createElement('div'), tab = $('.door__tab', d), body = $('.door__body', d);
    over.className = 'door__over'; card.className = 'door__card';
    card.append(tab, body);
    over.append(card);
    d.append(over);
    body.id = 'door-' + i;
    tab.setAttribute('aria-controls', body.id);
    tab.addEventListener('click', () => set(i));
  });

  const layout = () => {
    const W = box.clientWidth, col = stacked.matches;
    // how tall the open door's label is: on a phone the door leaves the picture room above it
    box.style.setProperty('--ow', (col ? W : W - (n - 1) * (Math.round(clamp(W * .095, 72, 132)) + GAP)) + 'px');
    const words = $('.door__card', doors[open]).offsetHeight + 40;
    const H = col ? 0 : Math.round(clamp(innerHeight * .7, 480, 680));
    const shut = col ? 64 : Math.round(clamp(W * .095, 72, 132));
    const wide = col ? Math.round(clamp(words + 230, 420, 680)) : W - (n - 1) * (shut + GAP);
    const total = col ? wide + (n - 1) * (shut + GAP) : H;
    box.style.setProperty('--doors-h', total + 'px');
    box.style.setProperty('--ow', (col ? W : wide) + 'px');
    let at = 0;
    doors.forEach((d, i) => {
      const size = i === open ? wide : shut, put = (k, v) => d.style.setProperty(k, Math.round(v) + 'px');
      if (col) { put('--ct', at); put('--cb', total - at - size); put('--cl', 0); put('--cr', 0); put('--iw', W); put('--ih', wide); put('--ix', 0); put('--iy', at + size / 2 - wide / 2); put('--sx', 0); put('--sy', at); put('--sw', W); put('--sh', size); }
      else { put('--cl', at); put('--cr', W - at - size); put('--ct', 0); put('--cb', 0); put('--iw', wide); put('--ih', H); put('--ix', at + size / 2 - wide / 2); put('--iy', 0); put('--sx', at); put('--sy', 0); put('--sw', size); put('--sh', H); }
      at += size + GAP;
    });
    box.classList.add('is-laid');
  };
  function set(i) {
    open = i;
    doors.forEach((d, j) => {
      const on = j === i;
      d.classList.toggle('is-open', on);
      $('.door__tab', d).setAttribute('aria-expanded', String(on));
    });
    layout();
  }
  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  stacked.addEventListener('change', layout);
  set(open);
})();

/* ---------------------------------------------------------------- the bus: pick a day, and it drives there on the map */
(() => {
  const week = $('[data-week]'), map = $('[data-map]');
  if (!week) return;
  const btns = $$('.daybtn', week), days = $$('.day', week);
  const busG = map && $('[data-map-bus]', map), flip = map && $('[data-map-bus-flip]', map);
  const roads = map ? { martinez: $('[data-road="martinez"]', map), aiken: $('[data-road="aiken"]', map) } : {};
  let now = { day: -1, mins: 0 };
  try { now = shopNow(); } catch { /* no clock: no "today" */ }

  btns.forEach(b => { if (+b.dataset.day === now.day) { b.classList.add('is-today'); b.setAttribute('aria-label', b.textContent + ', today'); } });
  // a quiet note on today's card, and whether the bus is out right now
  days.forEach(d => {
    if (+d.dataset.day !== now.day) return;
    let text = 'Today';
    if (d.dataset.out) {
      const [a, b] = d.dataset.out.split('-').map(toMins);
      if (now.mins < a) text = `Today, the bus is out from ${clock(a)}`; else if (now.mins < b) text = `Today, the bus is out until ${clock(b)}`;
    }
    const note = document.createElement('p');
    note.className = 'day__live';
    note.textContent = text;
    $('h3', d).after(note);
  });

  let at = 'shop', run = 0, seen = false;
  const pose = (path, t, sign) => {
    const L = path.getTotalLength(), p = path.getPointAtLength(t * L), q = path.getPointAtLength(clamp(t + sign * .02) * L);
    const dx = q.x - p.x, dy = q.y - p.y, still = Math.abs(dx) + Math.abs(dy) < .01, face = still || Math.abs(dx) < .01 ? 1 : Math.sign(dx);
    const tilt = still ? 0 : clamp(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI, -16, 16) * face;
    busG.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
    flip.setAttribute('transform', `scale(${face} 1)`);
  };
  const park = () => { busG.setAttribute('transform', 'translate(430 262)'); flip.setAttribute('transform', 'scale(1 1)'); };
  const drive = stop => {
    if (!busG) return;
    $$('.map__stop', map).forEach(s => s.classList.toggle('is-on', s.dataset.stop === stop || s.dataset.stop === 'shop'));
    Object.entries(roads).forEach(([k, r]) => r.classList.toggle('is-on', k === stop));
    const legs = at === stop ? [] : at === 'shop' ? [[roads[stop], 0, 1]] : stop === 'shop' ? [[roads[at], 1, 0]] : [[roads[at], 1, 0], [roads[stop], 0, 1]];
    at = stop;
    const my = ++run;
    if (reduced || !seen) { stop === 'shop' ? park() : pose(roads[stop], 1, -1); return; }
    const leg = i => {
      if (my !== run) return;
      if (i >= legs.length) { if (stop === 'shop') park(); return; }
      const [path, from, to] = legs[i], t0 = performance.now(), dur = 1100;
      const tick = t => {
        if (my !== run) return;
        const k = clamp((t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        pose(path, from + (to - from) * e, to > from ? 1 : -1);
        k < 1 ? requestAnimationFrame(tick) : leg(i + 1);
      };
      requestAnimationFrame(tick);
    };
    leg(0);
  };

  const select = day => {
    btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.day === day)));
    let stop = 'shop';
    days.forEach(d => { const on = +d.dataset.day === day; d.hidden = !on; if (on) stop = d.dataset.stop; });
    drive(stop);
  };
  btns.forEach(b => b.addEventListener('click', () => select(+b.dataset.day)));
  select(now.day >= 2 && now.day <= 6 ? now.day : 2);
  // the first time the map comes on screen, the bus leaves the shop for wherever it is that day
  if (map && 'IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      seen = true;
      const stop = at;
      if (stop !== 'shop') { at = 'shop'; park(); setTimeout(() => drive(stop), 400); }
    }, { threshold: .45 });
    io.observe(map);
  } else seen = true;
})();

/* ---------------------------------------------------------------- book the bus: the sum, then the request */
(() => {
  const wrap = $('[data-charter-wrap]');
  if (!wrap) return;
  const radios = $$('input[name="when"]', wrap), range = $('[data-hours-in]', wrap), out = $('[data-hours-out]', wrap);
  const totalEl = $('[data-charter-total]', wrap), math = $('[data-charter-math]', wrap), form = $('[data-charter]', wrap), err = $('[data-error]', form), sent = $('[data-sent]', form);
  const calc = () => {
    const r = radios.find(x => x.checked), min = +r.dataset.min, extra = +r.dataset.extra, h = +range.value, sum = min + (h - 1) * extra;
    out.textContent = h === 1 ? '1 hour' : `${h} hours`;
    totalEl.textContent = dollars(sum);
    math.textContent = h === 1 ? `${dollars(min)} minimum, with the first hour of service included` : `${dollars(min)} minimum with the first hour, plus ${h - 1} more ${h === 2 ? 'hour' : 'hours'} at $${extra}${h === 2 ? '' : ' each'}`;
    range.style.setProperty('--fill', ((h - 1) / (+range.max - 1) * 100) + '%');
    return { label: r.value === 'day' ? 'In the morning (Tuesday or Wednesday)' : 'After 1 pm (Tuesday to Saturday)', h, sum };
  };
  radios.forEach(r => r.addEventListener('change', calc));
  range.addEventListener('input', calc);
  calc();

  form.addEventListener('submit', e => {
    e.preventDefault();
    err.hidden = true;
    sent.hidden = true;
    $$('[aria-invalid]', form).forEach(f => f.removeAttribute('aria-invalid'));
    const f = form.elements, bad = [];
    if (!f.date.value) bad.push([f.date, 'a date']);
    if (!f.start.value) bad.push([f.start, 'a start time']);
    if (!f.where.value.trim()) bad.push([f.where, 'where it is']);
    if (!(+f.guests.value > 0)) bad.push([f.guests, 'how many people']);
    if (!f.name.value.trim()) bad.push([f.name, 'your name']);
    if (f.phone.value.replace(/\D/g, '').length < 7) bad.push([f.phone, 'a phone number']);
    if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) bad.push([f.email, 'an email address']);
    if (bad.length) {
      bad.forEach(([el]) => el.setAttribute('aria-invalid', 'true'));
      const names = bad.map(b => b[1]);
      err.textContent = 'Please add ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names.at(-1) : names[0]) + '.';
      err.hidden = false;
      bad[0][0].focus();
      return;
    }
    const c = calc();
    const body = ['Bus request from the website', '', `Date: ${f.date.value}`, `Start: ${f.start.value}`, `When: ${c.label}`, `Length: ${c.h} ${c.h === 1 ? 'hour' : 'hours'} (estimate from ${dollars(c.sum)})`, `Where: ${f.where.value.trim()}`, `People: ${f.guests.value}`, `Serve: ${f.serve.value}`, `Coffee: ${f.coffee.value}`, '', `Name: ${f.name.value.trim()}`, `Phone: ${f.phone.value.trim()}`, `Email: ${f.email.value.trim()}`].join('\n');
    location.href = `mailto:${SHOP_MAIL}?subject=${encodeURIComponent(`Bus request: ${f.date.value}, ${f.name.value.trim()}`)}&body=${encodeURIComponent(body)}`;
    sent.textContent = 'Your request is ready in your email app. Press send there, and we reply with a quote.';
    sent.hidden = false;
  });
})();

/* ---------------------------------------------------------------- the story.
   On a wide window where every stop fits whole, it pins: the page keeps scrolling, the road moves sideways and the bus drives it.
   Anywhere else it is a plain list, and the bus crosses the road under it as the page goes by. */
(() => {
  const drive = $('[data-drive]');
  if (!drive) return;
  const pin = $('.drive__pin', drive), view = $('[data-view]', drive), track = $('[data-track]', drive), road = $('[data-drive-road]', drive), busBox = $('[data-drive-bus]', drive), stops = $$('.stop', drive);
  const sym = $('#bus-art');
  if (sym && busBox) busBox.innerHTML = `<svg viewBox="${sym.getAttribute('viewBox')}">${sym.innerHTML}</svg>`;   // inline, so its wheels can turn
  let travel = 0, pinned = false, ticking = false;

  const paint = () => {
    ticking = false;
    let p, x;
    if (pinned) {
      const r = drive.getBoundingClientRect(), span = r.height - pin.offsetHeight;
      p = span > 0 ? clamp(-r.top / span) : 0;
      x = p * travel;
      track.style.transform = `translate3d(${(-x).toFixed(1)}px,0,0)`;
      drive.style.setProperty('--hint', clamp(1 - p * 10).toFixed(2));   // the note is only for the first few steps
    } else {
      const r = road.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      p = reduced ? 0 : clamp((innerHeight - r.top) / (innerHeight * .85));
      x = p * road.offsetWidth * .6;
    }
    drive.style.setProperty('--lane', (-x).toFixed(1) + 'px');
    // the bus keeps a margin from both ends of the road, so it is never cut by the edge of the screen
    drive.style.setProperty('--bx', clamp((.05 + p * .6) * road.offsetWidth, 16, Math.max(16, road.offsetWidth - busBox.offsetWidth - 16)).toFixed(1) + 'px');
    drive.style.setProperty('--spin', (x * 1.5).toFixed(0) + 'deg');
  };
  // a photograph pushed down onto its title, or rows taller than the window, means it does not fit
  const spills = () => track.scrollHeight > track.clientHeight + 1 || stops.some(s => { const ph = $('.stop__photo', s), t = $('.stop__when', s); return (ph && ph.offsetParent && ph.getBoundingClientRect().bottom > t.getBoundingClientRect().top - 8) || s.scrollHeight > s.clientHeight + 1; });
  const layout = () => {
    drive.classList.remove('is-tight');
    track.style.transform = '';
    let pinIt = !reduced && innerWidth >= 700 && innerHeight >= 540 && innerWidth >= innerHeight * .9 && CSS.supports('position', 'sticky');   // not on an upright tablet: a tall, narrow window would leave the road half empty
    drive.classList.toggle('is-pinned', pinIt);
    // pinned only if every stop fits whole in the window: first without the photographs, and if that is not enough, not at all
    if (pinIt && spills()) { drive.classList.add('is-tight'); if (spills()) { pinIt = false; drive.classList.remove('is-pinned', 'is-tight'); } }
    pinned = pinIt;
    if (pinned) {
      travel = Math.max(0, track.scrollWidth - view.clientWidth);
      drive.style.height = `calc(100svh + ${Math.round(travel * .9)}px)`;
    } else { drive.style.height = ''; drive.style.removeProperty('--hint'); }
    paint();
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  addEventListener('load', layout);
  if (document.fonts?.ready) document.fonts.ready.then(layout);
  layout();
})();

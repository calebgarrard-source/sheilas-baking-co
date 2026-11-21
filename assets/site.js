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

/* ---------------------------------------------------------------- the first screen's board: four rows of sixteen tiles.
   The first two change with the day picked under them: the shop's hours and the bus's stop, read from the hours list
   in Visit and the day cards in Find the bus. The third is this month's new pastry, read from the line on the menu
   that carries a note; the fourth is the rating, read from the reviews heading. So each fact is written in one place.
   A tile turns only when its letter changes; with reduced motion the letters are simply set. */
(() => {
  const el = $('[data-flap]');
  if (!el || !hours) return;
  const shopRow = $('[data-flap-shop]', el), busRow = $('[data-flap-bus]', el);
  const where = $('[data-flap-where]', el), say = $('[data-flap-say]', el), btns = $$('[data-flap-day]', el);
  if (!shopRow || !busRow || !where || !btns.length) return;
  const N = 16, NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const noHalf = s => s.replace(/\s[ap]m$/, '');
  const cards = Object.fromEntries($$('.day[data-day]').map(d => {
    const link = $('a.textlink', d), parked = ($$('.day__line', d)[1]?.lastChild?.textContent || '').trim().split(/[:,]/)[0];
    return [+d.dataset.day, { out: d.dataset.out ? d.dataset.out.split('-').map(toMins) : null, place: d.dataset.place || '', town: (d.dataset.stop || '').toUpperCase(), href: link?.getAttribute('href') || '#bus', parked }];
  }));

  const tiles = new Map();
  const dress = host => {
    host.textContent = '';
    host.classList.add('is-live');
    host.setAttribute('role', 'img');
    tiles.set(host, Array.from({ length: N }, () => { const t = document.createElement('i'); t.setAttribute('aria-hidden', 'true'); host.append(t); return t; }));
  };
  const write = (host, text, quick) => {
    const chars = text.toUpperCase().slice(0, N).padEnd(N).split('');
    tiles.get(host).forEach((t, i) => {
      const c = chars[i] === ' ' ? '' : chars[i];
      clearTimeout(t._swap);
      if (t.textContent === c) { t.classList.remove('is-flip'); return; }
      if (quick || reduced) { t.classList.remove('is-flip'); t.textContent = c; return; }
      const wait = i * 24;
      t.classList.remove('is-flip');
      t.style.animationDelay = wait + 'ms';
      void t.offsetWidth;
      t.classList.add('is-flip');
      t._swap = setTimeout(() => { t.textContent = c; }, wait + 130);
    });
  };

  // the two rows that do not change with the day
  const fixed = [];
  const fresh = $('[data-flap-new]', el), rating = $('[data-flap-rating]', el);
  const drop = (host, key) => { host.hidden = true; const k = $(key, el); if (k) k.hidden = true; };
  if (fresh) {
    const row = $('#menu .row__note')?.closest('.row');
    const name = row ? $('.row__name', row).firstChild.textContent.trim() : '', price = row ? $('.row__price', row).textContent.trim() : '';
    if (name && price) {
      const nameEl = $('[data-flap-new-name]', el), go = $('[data-flap-new-k] a', el);
      if (nameEl) nameEl.textContent = 'the ' + name.charAt(0).toUpperCase() + name.slice(1);
      if (go) go.dataset.pick = row.dataset.id;
      fixed.push([fresh, `${name.split(' ').pop()} ${price}`, `${name}, ${price}`]);
    } else drop(fresh, '[data-flap-new-k]');
  }
  if (rating) {
    const m = ($('#reviews-h')?.textContent || '').match(/([\d.]+)\s+on\s+Google,\s+from\s+([\d,]+)/);
    if (m) {
      const count = $('[data-flap-count]', el);
      if (count) count.textContent = m[2];
      fixed.push([rating, `${m[1]} on Google`, `${m[1]} out of 5 on Google`]);
    } else drop(rating, '[data-flap-rating-k]');
  }

  // what the first two rows say for a day: short words for the tiles, whole words for the line above and for a screen reader
  const read = day => {
    const now = shopNow(), today = day === now.day, w = hours.week[day], c = cards[day] || {};
    let shop = 'Closed', shopSay = 'closed';
    if (w && w.open != null) {
      if (!today) { shop = `${clock(w.open)} to ${clock(w.close)}`; shopSay = `open ${clock(w.open)} to ${clock(w.close)}`; }
      else if (now.mins < w.open) { shop = `Opens at ${clock(w.open)}`; shopSay = `opens at ${clock(w.open)}`; }
      else if (now.mins < w.close) { shop = `Open until ${clock(w.close)}`; shopSay = `open until ${clock(w.close)}`; }
      else { shop = 'Closed for today'; shopSay = `closed for today, since ${clock(w.close)}`; }
    }
    let bus = 'At the shop', line = c.parked ? c.parked.charAt(0).toLowerCase() + c.parked.slice(1) : 'parked at the shop', link = { href: '#book', text: 'Book it' };
    if (c.out) {
      const [a, b] = c.out;
      line = `${noHalf(clock(a))} to ${clock(b)} at ${c.place}`;
      link = { href: c.href, text: 'Directions' };
      if (today && now.mins >= a && now.mins < b) { bus = `Now in ${c.town}`; line = `until ${clock(b)} at ${c.place}`; }
      else if (today && now.mins >= b) bus = 'Done for today';
      else bus = `${noHalf(clockFull(a))} ${c.town}`;
    }
    return { shop, shopSay, bus, line, link };
  };

  let sel = -1;
  const caption = s => {
    shopRow.setAttribute('aria-label', `${NAMES[sel]}: ${s.shopSay}`);
    busRow.setAttribute('aria-label', `${NAMES[sel]}: ${s.line}`);
    const a = document.createElement('a');
    a.href = s.link.href;
    a.textContent = s.link.text;
    where.textContent = s.line + '. ';
    where.append(a);
  };
  const paint = quick => { const s = read(sel); caption(s); write(shopRow, s.shop, quick); write(busRow, s.bus, quick); return s; };
  const pick = day => {
    sel = day;
    btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.flapDay === day)));
    const s = paint();
    if (say) say.textContent = `${NAMES[day]}. The shop: ${s.shopSay}. The bus: ${s.line}.`;
  };
  btns.forEach(b => b.addEventListener('click', () => pick(+b.dataset.flapDay)));

  // it opens on today while the shop still has hours left in the day, or else on its next open day
  try {
    const now = shopNow();
    sel = btns.map(b => +b.dataset.flapDay)[0];
    for (let k = 0; k < 8; k++) {
      const d = (now.day + k) % 7, w = hours.week[d];
      if (w && w.open != null && !(k === 0 && now.mins >= w.close)) { sel = d; break; }
    }
    [shopRow, busRow, ...fixed.map(f => f[0])].forEach(dress);
    fixed.forEach(([host, , label]) => host.setAttribute('aria-label', label));
    btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.flapDay === sel)));
    caption(read(sel));
    // the board arrives blank and turns to its words once, a row after a row
    setTimeout(() => { paint(); fixed.forEach(([host, text], i) => setTimeout(() => write(host, text), reduced ? 0 : 160 * (i + 1))); }, reduced ? 0 : 520);
    setInterval(() => { if (sel === shopNow().day) paint(); }, 60000);
  } catch { /* no clock: the lines stand as written */ }
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

  /* -------- the wall: every photographed plate out at once, the coffee bar as chalk rings under them.
     It is built from the lines of the list above, so the menu is still written once; the list stays one click away
     ("Read it as a list") and is what shows without the script.
     With a mouse on a wide window the picked plate lifts and its card stands beside it. On a narrow or a touch
     screen the card opens in the page under the plate's row, with the photograph in it.
     The plates are one stop for the Tab key; the arrow keys walk them. */
  const grid = $('.board__grid', sec), lede = $('.head p', sec);
  if (!grid || !rows.length) return;
  const ORDER = $('.board__foot a.btn', sec)?.getAttribute('href') || '#';
  const LEDE = { wall: 'Every plate is out at once. Pick one to see it, or put it in a box of twelve.', list: lede ? lede.textContent : '' };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = rows.map(row => ({ row, id: row.dataset.id, cat: row.closest('.panel').id, photo: !!row.dataset.img, name: $('.row__name', row).firstChild.textContent.trim(), price: $('.row__price', row).textContent.trim(), desc: ($('.row__desc', row)?.textContent || '').trim() }));
  const wall = document.createElement('div');
  wall.className = 'wall';
  wall.innerHTML = `
    <div class="wall__bar">
      <div class="wall__filters" role="group" aria-label="Show one part of the menu">
        <button class="tab" type="button" aria-pressed="true" data-cat="">Everything<i>${items.length}</i></button>
        ${tabs.map(t => { const id = t.getAttribute('aria-controls'); return `<button class="tab" type="button" aria-pressed="false" data-cat="${id}">${esc(t.textContent.trim())}<i>${items.filter(i => i.cat === id).length}</i></button>`; }).join('')}
      </div>
      <button class="textlink wall__swap" type="button">Read it as a list</button>
    </div>
    <div class="wall__plates"></div>
    <div class="wall__drinks"><p class="wall__note">The coffee bar, drawn in chalk</p></div>`;
  const platesEl = $('.wall__plates', wall), drinksEl = $('.wall__drinks', wall), swap = $('.wall__swap', wall), filters = $$('.wall__filters .tab', wall);
  const btns = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = it.photo ? 'pl' : 'pl pl--ring';
    b.dataset.id = it.id;
    b.tabIndex = i ? -1 : 0;
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', `${it.name}, ${it.price}`);
    if (it.photo) {
      const img = new Image(400, 500);
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.src = `${IMG}${it.row.dataset.img}-400.webp`;
      img.style.objectPosition = it.row.dataset.pos || '50% 50%';
      b.append(img);
    } else b.textContent = it.name;
    it.btn = b;
    return b;
  });
  const photos = items.filter(i => i.photo), rings = items.filter(i => !i.photo);
  rings.forEach(i => drinksEl.append(i.btn));
  if (!rings.length) drinksEl.hidden = true;

  // offset rows: how many plates fit one, and how wide they are, come from the room there is
  const pop = matchMedia('(min-width: 760px) and (hover: hover) and (pointer: fine)');
  let perRow = 0, size = 0;
  const layout = () => {
    const W = platesEl.clientWidth;
    if (!W) return;
    const n = W >= 1000 ? 9 : W >= 720 ? 7 : W >= 500 ? 5 : 4, g = W >= 720 ? 12 : 10;
    const d = Math.floor(Math.min(132, (W - (n - 1) * g - g / 2) / (n + 0.5)));
    if (n === perRow && d === size) return;
    closeCard();
    perRow = n; size = d;
    wall.style.setProperty('--d', d + 'px');
    wall.style.setProperty('--g', g + 'px');
    const frag = document.createDocumentFragment();
    for (let k = 0, r = 0; k < photos.length; k += n, r++) {
      const line = document.createElement('div');
      line.className = 'wall__row' + (r % 2 ? ' is-odd' : '');
      photos.slice(k, k + n).forEach(i => line.append(i.btn));
      frag.append(line);
    }
    platesEl.replaceChildren(frag);
  };

  const card = document.createElement('div');
  let openIt = null;
  const place = () => {
    if (!openIt || !wall.classList.contains('is-pop')) return;
    const b = openIt.btn, w = wall.clientWidth, h = wall.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    const wr = wall.getBoundingClientRect(), rest = b.offsetParent === wall ? { x: b.offsetLeft, y: b.offsetTop } : (() => { const p = b.offsetParent.getBoundingClientRect(); return { x: p.left - wr.left + b.offsetLeft, y: p.top - wr.top + b.offsetTop }; })();
    const half = b.offsetWidth / 2, reach = half * (openIt.photo ? 1.5 : 1.12), cx = rest.x + half, cy = rest.y + half;
    let left = cx + reach + 18;
    if (left + cw > w) left = cx - reach - 18 - cw;
    if (left < 0) left = clamp(cx - cw / 2, 0, w - cw);
    card.style.setProperty('--cx', Math.round(left) + 'px');
    card.style.setProperty('--cy', Math.round(clamp(cy - ch / 2, 0, Math.max(0, h - ch))) + 'px');
  };
  function closeCard(refocus) {
    if (!openIt) return;
    const b = openIt.btn;
    b.setAttribute('aria-expanded', 'false');
    openIt = null;
    card.remove();
    if (refocus) b.focus();
  }
  const openPlate = it => {
    if (!it) return;
    if (openIt === it) { closeCard(); return; }
    closeCard();
    openIt = it;
    it.btn.setAttribute('aria-expanded', 'true');
    card.className = 'wall__card' + (it.photo ? '' : ' is-drawn');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', it.name);
    const box = it.row.dataset.box;
    card.innerHTML = `<figure class="wall__pic"></figure><div class="wall__text"><h3>${esc(it.name)}<span>${esc(it.price)}</span></h3><p>${esc(it.desc)}</p><div class="wall__acts">${box ? `<button type="button" class="add" data-add="${box}">${icon('plus')}Add to my box</button>` : `<a class="textlink" href="${ORDER}">Order online</a>`}<button type="button" class="wall__close">Close</button></div></div>`;
    $('.wall__pic', card).append(picture(it.row, false));
    if (wall.classList.contains('is-pop')) { wall.append(card); place(); }
    else {
      (it.btn.closest('.wall__row') || drinksEl).after(card);
      // keep the whole card in view, clear of the order bar a phone carries at the bottom
      const r = card.getBoundingClientRect(), room = innerHeight - (innerWidth < 600 ? 92 : 12);
      if (r.bottom > room) scrollBy({ top: Math.min(r.bottom - room, it.btn.getBoundingClientRect().top - 96), behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  wall.addEventListener('click', e => {
    const b = e.target.closest('.pl');
    if (b) { const i = btns.indexOf(b); roam(i, false); openPlate(items[i]); return; }
    if (e.target.closest('.wall__close')) { closeCard(true); return; }
    const f = e.target.closest('.wall__filters .tab');
    if (f) {
      filters.forEach(x => x.setAttribute('aria-pressed', String(x === f)));
      items.forEach(it => it.btn.classList.toggle('is-dim', !!f.dataset.cat && it.cat !== f.dataset.cat));
      if (openIt && openIt.btn.classList.contains('is-dim')) closeCard();
    }
  });
  // a press anywhere else puts the plate back (on the press, so a link that opens a plate is not undone by its own click)
  document.addEventListener('pointerdown', e => { if (openIt && wall.classList.contains('is-pop') && !e.target.closest('.wall__card, .pl')) closeCard(); });

  let at = 0;
  function roam(i, focus = true) {
    btns[at].tabIndex = -1;
    at = (i + btns.length) % btns.length;
    btns[at].tabIndex = 0;
    if (focus) btns[at].focus();
  }
  // Escape puts the plate back from anywhere; the focus goes back to it only if it was on the wall
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openIt) { e.preventDefault(); closeCard(wall.contains(document.activeElement)); } });
  wall.addEventListener('keydown', e => {
    if (!e.target.closest('.pl')) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow, ArrowUp: -perRow }[e.key];
    if (step) { e.preventDefault(); roam(clamp(at + step, 0, btns.length - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); roam(0); }
    else if (e.key === 'End') { e.preventDefault(); roam(btns.length - 1); }
  });

  const setView = v => {
    closeCard();
    sec.dataset.view = v;
    swap.textContent = v === 'wall' ? 'Read it as a list' : 'See every plate';
    if (lede) lede.textContent = LEDE[v];
    if (v === 'list') { current = null; show(activeIn(panels.find(p => !p.hidden))); } else requestAnimationFrame(layout);
  };
  swap.addEventListener('click', () => setView(sec.dataset.view === 'wall' ? 'list' : 'wall'));
  const mode = () => { closeCard(); wall.classList.toggle('is-pop', pop.matches); wall.classList.toggle('is-flow', !pop.matches); };
  pop.addEventListener('change', mode);
  mode();
  grid.before(wall);
  setView('wall');
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(() => { layout(); place(); }).observe(platesEl);
  else addEventListener('resize', () => { layout(); place(); });

  // the bar at the top opens the new pastry: on the wall that is its plate, in the list its line
  const pickLine = hooks.pick;
  hooks.pick = id => { if (sec.dataset.view === 'wall') { const it = items.find(i => i.id === id); if (it && openIt !== it) openPlate(it); } else pickLine(id); };
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

/* Quyk landing — motion and the live demo. Content is fully visible without JS. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th');
  const pad3 = (n) => String(n).padStart(3, '0');
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === '#top' ? 0 : -20, duration: 1.4 });
    }));
  }

  /* ---------- rolling digits ---------- */
  function buildRoll(el) {
    const col = document.createElement('span');
    col.className = 'roll__col';
    for (let i = 0; i < 20; i++) { const d = document.createElement('span'); d.textContent = i % 10; col.appendChild(d); }
    el.appendChild(col);
    el._col = col; el._val = 0;
    return el;
  }
  function setRoll(el, digit, instant) {
    // Always roll forward: move into the second set of digits when wrapping.
    let idx = digit;
    if (digit < el._val % 10) idx = digit + 10;
    el._col.style.transition = instant ? 'none' : '';
    el._col.style.transform = `translateY(-${idx}em)`;
    el._val = idx;
    if (idx >= 10) setTimeout(() => { el._col.style.transition = 'none'; el._col.style.transform = `translateY(-${digit}em)`; el._val = digit; }, 1150);
  }
  const rolls = $$('.roll').map(buildRoll);
  let heroNum = 47;
  const showHero = (n, instant) => pad3(n).split('').forEach((d, i) => setRoll(rolls[i], Number(d), instant));
  showHero(reduce ? heroNum : 0, true);

  /* ---------- place in line pill ---------- */
  const place = $('#place'), placeText = $('#placeText'), fill = $('.place__fill');
  let currentPlace = 8;
  function setPlace(n) {
    if (n === currentPlace) return;
    currentPlace = n;
    placeText.textContent = n === 0 ? 'It’s your turn' : `${ordinal(n)} in line`;
    fill.style.strokeDashoffset = String(97.4 * (n / 8));
    place.classList.toggle('is-turn', n === 0);
    place.classList.remove('bump'); void place.offsetWidth; place.classList.add('bump');
  }
  fill.style.strokeDashoffset = '97.4';

  /* ---------- guest story ---------- */
  const phone = $('#storyPhone');
  const screens = $$('.screen', phone);
  let typed = false;
  function typeAll() {
    if (typed) return; typed = true;
    $$('.type', phone).forEach((el, k) => {
      const text = el.dataset.text; el.textContent = '';
      if (reduce) { el.textContent = text; return; }
      [...text].forEach((ch, i) => setTimeout(() => { el.textContent += ch; }, 300 + k * 700 + i * 70));
    });
  }
  let posTimer = null;
  function runWait() {
    clearInterval(posTimer);
    const posEl = $('#storyPos'), minEl = $('#storyMin'), barEl = $('#storyBar');
    let pos = 5;
    const tick = () => {
      posEl.textContent = ordinal(pos); minEl.textContent = String(pos * 2 + 2);
      barEl.style.width = `${(6 - pos) * 18}%`;
      if (pos > 2) pos--; else clearInterval(posTimer);
    };
    tick();
    if (!reduce) posTimer = setInterval(tick, 1100);
  }
  function showStep(i) {
    $$('.step').forEach((s) => s.classList.toggle('is-on', Number(s.dataset.step) === i));
    screens.forEach((s, k) => s.classList.toggle('is-on', k === i));
    if (i === 1) typeAll();
    if (i === 2) runWait();
  }
  $$('.type', phone).forEach((el) => { el.textContent = el.dataset.text; });

  /* ---------- live demo ---------- */
  const SARA = 'A-051';
  const initial = () => ({
    serving: 47,
    next: 53,
    rows: [
      { t: 'A-048', n: 'Omar', p: 2, w: 14 },
      { t: 'A-049', n: 'Lina', p: 3, w: 11 },
      { t: 'A-050', n: 'Hassan', p: 2, w: 9, walk: true },
      { t: SARA, n: 'Sara', p: 4, w: 6 },
      { t: 'A-052', n: 'Ali', p: 5, w: 3 },
    ],
    saraCalled: false,
  });
  let st = initial();
  const walkNames = ['Noor', 'Zain', 'Maya', 'Bilal', 'Hira', 'Adam'];
  const queueEl = $('#queue'), tvNow = $('#tvNow'), tvNext = $('#tvNext');
  const dPhone = $('#demoPhone'), dpPos = $('#dpPos'), dpBar = $('#dpBar'), resetBtn = $('#demoReset');
  let interacted = false, autoTimer = null, busy = false;

  function rowHtml(r, i) {
    return `<li class="qrow${i === 0 ? ' is-first' : ''}" data-t="${r.t}">
      <span class="qrow__tix">${r.t}</span>
      <span class="qrow__who"><b>${r.n}${r.walk ? ' (walk-in)' : ''}</b><span>Party of ${r.p}, waiting ${r.w} min${r.held ? ', on hold' : ''}</span></span>
      <span class="qrow__act"><button type="button" data-act="hold" aria-label="Hold ${r.t}">Hold</button><button type="button" data-act="skip" aria-label="Skip ${r.t}">Skip</button></span>
    </li>`;
  }
  function render(newT) {
    queueEl.innerHTML = st.rows.map(rowHtml).join('') || '<li class="qrow"><span class="qrow__who"><b>The line is empty</b><span>Add a walk-in to keep going.</span></span></li>';
    if (newT) { const el = $(`[data-t="${newT}"]`, queueEl); if (el) el.classList.add('is-in'); }
    tvNext.innerHTML = st.rows.slice(0, 3).map((r) => `<span>${r.t}</span>`).join('');
    const idx = st.rows.findIndex((r) => r.t === SARA);
    if (!st.saraCalled && idx >= 0) {
      dpPos.innerHTML = `<b>${ordinal(idx + 1)}</b> in line`;
      dpBar.style.width = `${Math.max(8, 100 - idx * 22)}%`;
    } else if (!st.saraCalled) {
      dpPos.innerHTML = 'Skipped. Ask at the host stand.';
    }
    dPhone.classList.toggle('is-turn', st.saraCalled);
    resetBtn.hidden = !st.saraCalled && st.rows.length > 0;
  }
  function flip(el, text) {
    el.textContent = text;
    el.classList.remove('flipping'); void el.offsetWidth; el.classList.add('flipping');
  }
  function callNext() {
    if (busy || !st.rows.length) return;
    busy = true;
    const first = $('.qrow', queueEl);
    if (first) first.classList.add('is-out');
    setTimeout(() => {
      const r = st.rows.shift();
      st.serving = Number(r.t.slice(2));
      flip(tvNow, r.t);
      if (r.t === SARA) st.saraCalled = true;
      st.rows.forEach((x) => { x.w += 2; });
      render();
      busy = false;
      if (st.saraCalled) stopAuto();
    }, reduce ? 0 : 420);
  }
  function addWalkin() {
    if (st.rows.length >= 6) return;
    const t = `A-${pad3(st.next++)}`;
    st.rows.push({ t, n: walkNames[(st.next - 54) % walkNames.length], p: 1 + ((st.next * 7) % 5), w: 0, walk: true });
    render(t);
  }
  queueEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    userAct();
    const t = b.closest('.qrow').dataset.t;
    const i = st.rows.findIndex((r) => r.t === t); if (i < 0) return;
    const [r] = st.rows.splice(i, 1);
    if (b.dataset.act === 'hold') { r.held = true; st.rows.push(r); }
    render();
  });
  function userAct() { interacted = true; stopAuto(); }
  $('#callNext').addEventListener('click', () => { userAct(); callNext(); });
  $('#addWalkin').addEventListener('click', () => { userAct(); addWalkin(); });
  resetBtn.addEventListener('click', () => { st = initial(); flip(tvNow, 'A-047'); render(); });
  function startAuto() { if (reduce || interacted || autoTimer || st.saraCalled) return; autoTimer = setInterval(callNext, 2600); }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; }
  render();

  /* ---------- owners ---------- */
  $$('.tog').forEach((t) => t.addEventListener('click', () => {
    const on = !t.classList.contains('on');
    t.classList.toggle('on', on); t.setAttribute('aria-pressed', String(on));
    const li = t.closest('li'), em = $('em', li), name = $('span', li).textContent;
    em.textContent = on ? `${li.dataset.n || 4} waiting` : 'Paused';
    t.setAttribute('aria-label', `${name} ${on ? 'open' : 'paused'}`);
  }));
  $$('.lines li').forEach((li) => { const m = /(\d+)/.exec($('em', li).textContent); if (m) li.dataset.n = m[1]; });
  let counted = false;
  function countUp() {
    if (counted) return; counted = true;
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count), dec = Number(el.dataset.dec || 0);
      if (reduce || !hasGsap) { el.textContent = end.toFixed(dec); return; }
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } });
    });
  }

  /* ---------- TV flipboard ---------- */
  const board = $('#flipboard');
  const cells = [];
  function makeCell(ch) {
    const c = document.createElement('div');
    c.className = 'fl';
    c.innerHTML = `<div class="fl__h fl__t"><span>${ch}</span></div><div class="fl__h fl__b"><span>${ch}</span></div>`;
    c._ch = ch; board.appendChild(c); cells.push(c);
  }
  'A-052'.split('').forEach(makeCell);
  function flipCell(c, ch) {
    if (c._ch === ch) return;
    const old = c._ch; c._ch = ch;
    const top = $('.fl__t span', c), bot = $('.fl__b span', c);
    if (reduce || !c.animate) { top.textContent = ch; bot.textContent = ch; return; }
    const f1 = document.createElement('div'); f1.className = 'fl__h fl__t flap'; f1.innerHTML = `<span>${old}</span>`;
    const f2 = document.createElement('div'); f2.className = 'fl__h fl__b flap'; f2.innerHTML = `<span>${ch}</span>`;
    f2.style.transform = 'rotateX(90deg)';
    c.append(f1, f2);
    top.textContent = ch;
    f1.animate([{ transform: 'rotateX(0)' }, { transform: 'rotateX(-90deg)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' })
      .onfinish = () => {
        f2.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0)' }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
          .onfinish = () => { bot.textContent = ch; f1.remove(); f2.remove(); };
      };
  }
  let tvNum = 52, tvTimer = null;
  const tvList = $('#tvBigNext');
  function tvAdvance() {
    tvNum = tvNum >= 99 ? 48 : tvNum + 1;
    const s = `A-${pad3(tvNum)}`;
    s.split('').forEach((ch, i) => setTimeout(() => flipCell(cells[i], ch), i * 70));
    board.setAttribute('aria-label', `Now serving ${s}`);
    const items = $$('li', tvList);
    items.forEach((li, i) => { li.textContent = `A-${pad3(tvNum + i + 1)}`; });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- nav hide on scroll down ---------- */
  const nav = $('#nav');
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }, { passive: true });

  /* ---------- without GSAP: simple observers so everything still works ---------- */
  if (!hasGsap) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      const t = en.target;
      if (t.dataset.place) setPlace(Number(t.dataset.place));
      if (t.classList.contains('step')) showStep(Number(t.dataset.step));
      if (t.id === 'dash') countUp();
      if (t.id === 'demo') startAuto();
    }), { threshold: 0.5 });
    $$('[data-place], .step, #dash, #demo').forEach((el) => io.observe(el));
    $$('.chart span').forEach((b) => { b.style.transform = 'none'; });
    showHero(heroNum, true);
    return;
  }

  /* ---------- GSAP choreography ---------- */
  gsap.registerPlugin(ScrollTrigger);

  // Page-load: the one orchestrated moment.
  if (!reduce) {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__title .ln > span', { yPercent: 110, duration: 1.3, stagger: 0.09 })
      .from('.hero__lede, .hero__cta', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, '-=0.9')
      .from('.ticket', { y: 80, rotateX: -35, rotateY: 12, opacity: 0, duration: 1.6 }, '-=1.1')
      .from('.nav', { y: -30, opacity: 0, duration: 0.9 }, '-=1.3')
      .add(() => showHero(heroNum), '-=1.0');
    // The ticket keeps moving: the line is live.
    let ahead = 2;
    setInterval(() => {
      if (document.hidden || window.scrollY > window.innerHeight) return;
      heroNum = heroNum >= 999 ? 1 : heroNum + 1;
      showHero(heroNum);
      ahead = ahead <= 0 ? 4 : ahead - 1;
      $('#heroAhead').textContent = String(ahead);
      $('#heroWait').textContent = String(Math.max(1, ahead * 2 + 1));
    }, 4200);

    gsap.to('.ticket', {
      yPercent: -18, rotateZ: -6, rotateX: 10, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.hero__copy', {
      yPercent: -12, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });

    // Marquee drifts, and speeds up with scroll velocity.
    const band = gsap.to('#band', { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
    if (lenis) lenis.on('scroll', ({ velocity }) => {
      const v = Math.min(6, 1 + Math.abs(velocity) / 6);
      gsap.to(band, { timeScale: velocity < 0 ? -v : v, duration: 0.4, overwrite: true });
    });

    // TV: the board grows from a card into the room.
    gsap.fromTo('#tvFrame', { scale: 0.82, borderRadius: 48 }, {
      scale: 1, borderRadius: 32, ease: 'none',
      scrollTrigger: { trigger: '.tv', start: 'top 85%', end: 'top 15%', scrub: true },
    });

    // Setup: the line between the steps draws itself.
    gsap.to('.setup__steps', {
      '--p': 1, ease: 'none',
      scrollTrigger: { trigger: '.setup', start: 'top 70%', end: 'center 50%', scrub: true },
    });

    // Final: the big words settle in as you arrive.
    gsap.from('.final__big', {
      yPercent: 30, scale: 0.9, ease: 'none',
      scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'top 20%', scrub: true },
    });

    // Plans and owner dashboard lift into place once.
    gsap.from('.plan', { y: 60, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.plans', start: 'top 80%' } });
    gsap.from('.dash', { y: 80, rotateX: 12, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.dash', start: 'top 85%' } });
  } else {
    showHero(heroNum, true);
  }

  // Place in line, section by section.
  setPlace(8);
  $$('[data-place]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onEnter: () => setPlace(Number(sec.dataset.place)),
      onEnterBack: () => setPlace(Number(sec.dataset.place)),
      onLeaveBack: () => { const prev = sec.previousElementSibling; setPlace(prev && prev.dataset.place ? Number(prev.dataset.place) : 8); },
    });
  });

  // Active nav link.
  $$('.nav__links a').forEach((a) => {
    const sec = $(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-on', s.isActive) });
  });

  // Guest story steps drive the phone.
  $$('.step').forEach((step) => {
    ScrollTrigger.create({
      trigger: step, start: 'top 60%', end: 'bottom 60%',
      onToggle: (s) => { if (s.isActive) showStep(Number(step.dataset.step)); },
    });
  });

  // Demo autoplay while visible, until someone touches it.
  ScrollTrigger.create({ trigger: '#demo', start: 'top 70%', end: 'bottom 20%', onToggle: (s) => (s.isActive ? startAuto() : stopAuto()) });

  // Owner dashboard: numbers and bars.
  ScrollTrigger.create({ trigger: '#dash', start: 'top 75%', once: true, onEnter: countUp });
  if (!reduce) {
    gsap.to('.chart span', { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.chart', start: 'top 85%' } });
  }

  // TV board keeps calling while visible.
  ScrollTrigger.create({
    trigger: '.tv', start: 'top 70%', end: 'bottom 30%',
    onToggle: (s) => {
      clearInterval(tvTimer); tvTimer = null;
      if (s.isActive && !reduce) { tvAdvance(); tvTimer = setInterval(tvAdvance, 3200); }
    },
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

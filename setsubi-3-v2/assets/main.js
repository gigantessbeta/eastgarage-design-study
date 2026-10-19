/* 幸設備工業 三案の三（二回目）
   スクロールした量だけ、管の中を水が進む。水の先頭は画面の上から 62% の高さに来る。
   立ち寄る所（バルブ）に水が着くと看板が起き上がる。バルブを開けると詳しい話が出て、右下の水道メーターが一つ進む。
   家の断面は画面に留め、留まっている間のスクロールで、水を蛇口まで上げる。 */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const HEAD_AT = 0.62;
  const STEP = 4;

  function roundedPath(pts, radius) {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1);
      if (d1 < 0.5 || d2 < 0.5) continue;
      const r = Math.min(radius, d1 / 2, d2 / 2);
      const ax = x1 - (x1 - x0) / d1 * r, ay = y1 - (y1 - y0) / d1 * r;
      const bx = x1 + (x2 - x1) / d2 * r, by = y1 + (y2 - y1) / d2 * r;
      d += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${x1.toFixed(1)} ${y1.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  }

  function sample(path) {
    const len = path.getTotalLength();
    const ls = [], xs = [], ys = [], ymax = [];
    let m = -Infinity;
    for (let l = 0; l < len; l += STEP) {
      const p = path.getPointAtLength(l);
      ls.push(l); xs.push(p.x); ys.push(p.y); m = Math.max(m, p.y); ymax.push(m);
    }
    const p = path.getPointAtLength(len);
    ls.push(len); xs.push(p.x); ys.push(p.y); ymax.push(Math.max(m, p.y));
    return { len, ls, xs, ys, ymax };
  }

  function lengthAtY(s, y) {
    if (y < s.ymax[0]) return 0;
    let lo = 0, hi = s.ymax.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s.ymax[mid] <= y) lo = mid; else hi = mid - 1;
    }
    return s.ls[lo];
  }

  function pointAt(s, l) {
    const i = Math.max(0, Math.min(s.ls.length - 1, Math.round(l / STEP)));
    return [s.xs[i], s.ys[i]];
  }

  /* 地上から地面の下まで */
  const wrap = $('#routeWrap');
  const routeSvg = $('#routeSvg');
  const rWall = $('#routeWall'), rEmpty = $('#routeEmpty'), rWater = $('#routeWater'), rHead = $('#routeHead');
  const stations = $$('.station');
  const lid = $('#lid'), manhole = $('#manhole');
  let R = null;

  function relTo(el, box) {
    const a = el.getBoundingClientRect();
    return [a.left - box.left, a.top - box.top];
  }

  function buildRoute() {
    const box = wrap.getBoundingClientRect();
    const W = wrap.clientWidth, H = wrap.scrollHeight;
    routeSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const anchors = [relTo($('#pipeStart'), box)]
      .concat(stations.map((s) => relTo($('.valve-anchor', s), box)))
      .concat([relTo($('#routeEnd'), box)]);
    const pts = [anchors[0]];
    for (let i = 0; i < anchors.length - 1; i++) {
      const [xa, ya] = anchors[i], [xb, yb] = anchors[i + 1];
      const dx = xb - xa, dy = yb - ya;
      if (Math.abs(dx) < 2) { pts.push([xb, yb]); continue; }
      const dv = Math.max(60, Math.min(Math.abs(dx) * 0.5, dy - 150));
      const y1 = i === 0 ? ya + 34 : ya + (dy - dv) / 2;
      pts.push([xa, y1], [xb, y1 + dv], [xb, yb]);
    }
    const d = roundedPath(pts, 40);
    [rWall, rEmpty, rWater].forEach((p) => p.setAttribute('d', d));
    R = sample(rWater);
    R.stationL = anchors.slice(1, -1).map(([, y]) => lengthAtY(R, y));
    rWater.style.strokeDasharray = `${R.len} ${R.len}`;
  }

  /* 家の断面 */
  const stage = $('#stage'), stageIn = $('#stageIn');
  const hSvg = $('#houseSvg');
  const hWall = $('#houseWall'), hEmpty = $('#houseEmpty'), hWater = $('#houseWater'), hHot = $('#houseHot'), hHead = $('#houseHead');
  let HS = null;

  function buildStage() {
    const box = stageIn.getBoundingClientRect();
    hSvg.setAttribute('viewBox', `0 0 ${stageIn.clientWidth} ${stageIn.clientHeight}`);
    const pts = $$('.h-pt', stageIn)
      .sort((a, b) => Number(a.dataset.h) - Number(b.dataset.h))
      .map((el) => relTo(el, box));
    const d = roundedPath(pts, 30);
    [hWall, hEmpty, hWater].forEach((p) => p.setAttribute('d', d));
    const heater = $('.heater', stageIn).getBoundingClientRect();
    const f = pts[pts.length - 1];
    const hx = heater.left - box.left + heater.width / 2;
    const hy = heater.top - box.top + heater.height * 0.82;
    hHot.setAttribute('d', roundedPath([[hx, hy], [hx, f[1] + 30], [f[0] + 18, f[1] + 30], [f[0] + 18, f[1]]], 18));
    HS = sample(hWater);
    hWater.style.strokeDasharray = `${HS.len} ${HS.len}`;
  }

  /* バルブと水道メーター */
  const meter = $('#meter'), meterCount = $('#meterCount'), arriveDone = $('#arriveDone');
  const pilot = $('#pilot');
  let opened = new Set();
  try { opened = new Set(JSON.parse(sessionStorage.getItem('yuki-valves') || '[]')); } catch (e) { opened = new Set(); }

  function renderMeter() {
    meterCount.textContent = String(opened.size);
    const full = opened.size >= stations.length;
    meter.classList.toggle('full', full);
    arriveDone.hidden = !full;
    stage.classList.toggle('complete', full);
  }

  $$('.valve-btn').forEach((btn) => {
    const station = btn.closest('.station');
    const id = station.dataset.station;
    const more = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      more.hidden = !open;
      btn.querySelector('span').textContent = open ? 'バルブを閉める' : 'バルブを開ける';
      if (open && !opened.has(id)) {
        opened.add(id);
        try { sessionStorage.setItem('yuki-valves', JSON.stringify(Array.from(opened))); } catch (e) { /* 保存できなくても数は表示する */ }
        renderMeter();
      }
      schedule(true);
    });
  });

  /* 分かれ道 */
  const branch = $('#branch');
  if ('IntersectionObserver' in window && !reduce) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) branch.classList.add('in'); });
    }, { threshold: 0.3 }).observe(branch);
  } else {
    branch.classList.add('in');
  }

  /* スクロールごとの更新 */
  let lastL = 0, pilotDeg = 0;

  function update() {
    const vh = window.innerHeight;
    const y = window.scrollY;

    const p = Math.min(1, Math.max(0, y / (vh * 0.45)));
    if (!reduce) lid.style.transform = `translate(${(p * 46).toFixed(2)}%, ${(p * 8).toFixed(2)}%) rotate(${(p * 30).toFixed(2)}deg)`;
    manhole.classList.toggle('is-open', p > 0.15 || reduce);

    let total = 0;
    if (R) {
      const wrapTop = wrap.getBoundingClientRect().top + y;
      const l = reduce ? R.len : lengthAtY(R, y + vh * HEAD_AT - wrapTop);
      rWater.style.strokeDashoffset = String(R.len - l);
      const [hx, hy] = pointAt(R, l);
      rHead.setAttribute('cx', hx.toFixed(1)); rHead.setAttribute('cy', hy.toFixed(1));
      wrap.classList.toggle('is-flowing', l > 2 && l < R.len - 2);
      stations.forEach((s, i) => s.classList.toggle('arrived', reduce || l >= R.stationL[i] - 6));
      total += l;
    }

    if (HS) {
      const top = stage.getBoundingClientRect().top + y;
      const start = top - vh * HEAD_AT;
      const span = stage.offsetHeight - vh * (1 - HEAD_AT) - vh * 0.7;
      let s = (y - start) / span;
      s = reduce ? 1 : Math.min(1, Math.max(0, s));
      const l = s * HS.len;
      hWater.style.strokeDashoffset = String(HS.len - l);
      const [hx, hy] = pointAt(HS, l);
      hHead.setAttribute('cx', hx.toFixed(1)); hHead.setAttribute('cy', hy.toFixed(1));
      hHead.style.opacity = s > 0.002 && s < 0.995 ? '1' : '0';
      stage.classList.toggle('done', s >= 0.995);
      total += l;
    }

    if (!reduce) {
      pilotDeg += (total - lastL) * 1.4;
      pilot.style.transform = `rotate(${pilotDeg.toFixed(1)}deg)`;
    }
    lastL = total;
  }

  let ticking = false, needBuild = false;
  function schedule(rebuild) {
    if (rebuild) needBuild = true;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (needBuild) { needBuild = false; buildRoute(); buildStage(); }
      update();
    });
  }

  window.addEventListener('scroll', () => schedule(false), { passive: true });
  window.addEventListener('resize', () => schedule(true));
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => schedule(true));
    ro.observe(wrap); ro.observe(stageIn);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => schedule(true));
  window.addEventListener('load', () => schedule(true));

  rHead.classList.add('pulse');
  renderMeter();
  buildRoute();
  buildStage();
  update();
})();

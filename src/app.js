// =====================================================================
// APPLICATION: state, UI, 3D scene, diagrams, analysis, comparison, export
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ------------------------------------------------------------ constants
const PRESETS = {
  taipei: { name: 'Taipei, Taiwan', lat: 25.0330, lon: 121.5654, tz: 8, dst: 'none' },
  singapore: { name: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 8, dst: 'none' },
  hanoi: { name: 'Hanoi, Vietnam', lat: 21.0278, lon: 105.8342, tz: 7, dst: 'none' },
  hcmc: { name: 'Ho Chi Minh City, Vietnam', lat: 10.8231, lon: 106.6297, tz: 7, dst: 'none' },
  london: { name: 'London, UK (EU DST)', lat: 51.5074, lon: -0.1278, tz: 0, dst: 'EU' },
  newyork: { name: 'New York, USA (US DST)', lat: 40.7128, lon: -74.0060, tz: -5, dst: 'US' },
  sydney: { name: 'Sydney, Australia (AU DST)', lat: -33.8688, lon: 151.2093, tz: 10, dst: 'AU' },
  custom: { name: 'Custom location' },
};
const MATERIALS = {
  alu: { name: 'Anodised aluminium', refl: 0.60, color: '#b9bfc7' },
  bronze: { name: 'Dark bronze aluminium', refl: 0.25, color: '#5c4b3b' },
  concrete: { name: 'Fair-faced concrete', refl: 0.35, color: '#a8a49c' },
  timber: { name: 'Timber (cedar)', refl: 0.30, color: '#9a6b43' },
  white: { name: 'White powder-coat', refl: 0.80, color: '#ecebe7' },
  custom: { name: 'Custom' },
};
const SIDES = { N: 0, E: 90, S: 180, W: 270 };
const PARAMS = {   // [key, label, unit, min, max, step]
  geom: [['facW', 'Façade width', 'm', 1, 20, 0.05], ['facH', 'Façade height (floor-to-floor)', 'm', 2, 8, 0.05],
    ['winW', 'Window width', 'm', 0.2, 20, 0.01], ['sill', 'Window sill height', 'm', 0, 6, 0.01], ['head', 'Window head height', 'm', 0.3, 8, 0.01],
    ['reveal', 'Reveal depth (glazing set-back)', 'm', 0, 0.6, 0.01], ['roomD', 'Room depth', 'm', 2, 15, 0.1], ['wp', 'Work-plane height', 'm', 0, 1.2, 0.05]],
  overhang: [['depth', 'Overhang depth', 'm', 0, 3, 0.01], ['offset', 'Vertical position above head', 'm', 0, 1.5, 0.01], ['thick', 'Overhang thickness', 'm', 0.01, 0.5, 0.01],
    ['ext', 'Side extension (each side)', 'm', 0, 3, 0.01], ['proj', 'Projection distance from wall', 'm', 0, 1, 0.01]],
  hlouver: [['depth', 'Louver depth', 'm', 0.02, 1.5, 0.01], ['spacing', 'Vertical spacing', 'm', 0.05, 1.5, 0.01], ['count', 'Number of louvers', '', 1, 40, 1],
    ['thick', 'Blade thickness', 'm', 0.002, 0.2, 0.001], ['tilt', 'Blade tilt (+ outer edge down)', '°', -80, 80, 1], ['proj', 'Projection distance from façade', 'm', 0, 1, 0.01],
    ['ext', 'Side extension (each side)', 'm', 0, 2, 0.01], ['start', 'Top blade offset above head', 'm', -0.5, 1, 0.01]],
  vfin: [['depth', 'Fin projection depth', 'm', 0.02, 2, 0.01], ['spacing', 'Horizontal spacing', 'm', 0.1, 3, 0.01], ['count', 'Number of fins', '', 1, 30, 1],
    ['thick', 'Fin thickness', 'm', 0.005, 0.3, 0.005], ['rot', 'Fin rotation (+ outer edge to right)', '°', -80, 80, 1], ['proj', 'Projection distance from façade', 'm', 0, 1, 0.01],
    ['ext', 'Vertical extension (top & bottom)', 'm', 0, 2, 0.01]],
  eggcrate: [['depth', 'Cell depth', 'm', 0.05, 1.5, 0.01], ['hsp', 'Vertical-member spacing', 'm', 0.1, 3, 0.01], ['vsp', 'Horizontal-member spacing', 'm', 0.1, 3, 0.01],
    ['thick', 'Member thickness', 'm', 0.01, 0.3, 0.005], ['proj', 'Projection distance from façade', 'm', 0, 1, 0.01]],
  blinds: [['slatW', 'Slat width', 'm', 0.02, 0.3, 0.005], ['spacing', 'Slat pitch (spacing)', 'm', 0.02, 0.3, 0.005], ['thick', 'Slat thickness', 'm', 0.0005, 0.02, 0.0005],
    ['angle', 'Slat angle (fixed mode, + outer edge down)', '°', -80, 85, 1], ['deploy', 'Deployment (fraction of window height)', '', 0, 1, 0.01], ['proj', 'Projection distance from façade', 'm', 0, 0.5, 0.01]],
  material: [['refl', 'Shading reflectance (diffuse)', '', 0, 0.95, 0.01], ['opacity', 'Display opacity (3D only)', '', 0.1, 1, 0.01]],
  glazing: [['shgc', 'SHGC (normal incidence)', '', 0.05, 0.9, 0.01], ['vt', 'Visible transmittance VT', '', 0.05, 0.92, 0.01],
    ['tsol', 'Solar transmittance τsol', '', 0.05, 0.9, 0.01], ['b0', 'Angular modifier b₀ (ASHRAE IAM)', '', 0, 0.5, 0.01]],
  room: [['floor', 'Floor reflectance', '', 0.05, 0.9, 0.01], ['wall', 'Wall reflectance', '', 0.05, 0.9, 0.01], ['ceil', 'Ceiling reflectance', '', 0.05, 0.9, 0.01]],
};
const TYPE_GROUPS = { none: [], overhang: ['overhang'], hlouver: ['hlouver'], vfin: ['vfin'], combined: ['hlouver', 'vfin'], eggcrate: ['eggcrate'], blinds: ['blinds'], custom: ['custom'] };
const CUSTOM_EXAMPLE = JSON.stringify([
  { t: 0, w: 2.62, n: 0.45, dt: 3.0, dw: 0.08, dn: 0.9, rotT: 0, rotW: 0 },
  { t: -1.35, w: 1.7, n: 0.3, dt: 0.06, dw: 1.9, dn: 0.6, rotT: 0, rotW: 15 },
  { t: 1.35, w: 1.7, n: 0.3, dt: 0.06, dw: 1.9, dn: 0.6, rotT: 0, rotW: 15 }], null, 1);
const COLORS = ['#2f5d8a', '#c8781c', '#3f8f6b', '#9b4f8e', '#b4442f', '#5f6b78'];

let uid = 1;
function defaultConfig(name = 'Option', type = 'hlouver') {
  return {
    id: 'c' + Date.now().toString(36) + (uid++), name, type, include: true,
    geom: { facW: 4.0, facH: 3.4, winW: 2.4, sill: 0.9, head: 2.5, reveal: 0.15, roomD: 6.0, wp: 0.75 },
    overhang: { depth: 0.8, offset: 0.1, thick: 0.1, ext: 0.3, proj: 0 },
    hlouver: { depth: 0.30, spacing: 0.30, count: 6, thick: 0.02, tilt: 0, proj: 0.10, ext: 0.10, start: 0.10 },
    vfin: { depth: 0.40, spacing: 0.60, count: 5, thick: 0.03, rot: 0, proj: 0.05, ext: 0.10 },
    eggcrate: { depth: 0.35, hsp: 0.6, vsp: 0.4, thick: 0.03, proj: 0.02 },
    blinds: { slatW: 0.08, spacing: 0.07, thick: 0.001, angle: 30, mode: 'fixed', deploy: 1, proj: 0.08 },
    custom: { json: CUSTOM_EXAMPLE },
    material: { preset: 'alu', refl: 0.6, color: '#b9bfc7', opacity: 1 },
    glazing: { shgc: 0.40, vt: 0.60, tsol: 0.35, b0: 0.10 },
    room: { floor: 0.2, wall: 0.5, ceil: 0.7 },
  };
}
function defaultSite() {
  return { preset: 'taipei', ...PRESETS.taipei, year: 2026, month: 10, day: 29, time: 14, step: 30,
    side: 'S', facadeAz: 180, tilt: 0, radSource: 'none', DNI: 0, DHI: 0, GHI: 0, rhoG: 0.2, taub: '', taud: '' };
}
function defaultConfigs() {
  const a = defaultConfig('A · No shading', 'none'), b = defaultConfig('B · Horizontal louvers', 'hlouver'),
    c = defaultConfig('C · Vertical fins', 'vfin'), d = defaultConfig('D · Combined', 'combined');
  return [a, b, c, d];
}

// ---------------------------------------------------------------- state
const STORE = 'solarShadingSim.v1';
const state = { site: defaultSite(), configs: defaultConfigs(), activeId: null, epw: null,
  ui: { rays: true, shadows: true, dims: true, axes: false, glazing: true, floor: 'sun', tab: 'results', autoPeriod: true },
  heavy: {}, ev: null, lastSeries: null, lastCompare: null, periodSet: 'design', compareSet: 'design', annualStep: 1 };
state.activeId = state.configs[1].id;
try {
  const s = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (s && s.configs && s.configs.length) {
    state.site = { ...defaultSite(), ...s.site };
    state.configs = s.configs.map(c => mergeDeep(defaultConfig(c.name, c.type), c));
    state.activeId = state.configs.some(c => c.id === s.activeId) ? s.activeId : state.configs[0].id;
  }
} catch (e) { /* storage unavailable */ }
function mergeDeep(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') mergeDeep(a[k], b[k]); else a[k] = b[k]; } return a; }
const cfgA = () => state.configs.find(c => c.id === state.activeId) || state.configs[0];
let saveT = 0;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify({ site: state.site, configs: state.configs, activeId: state.activeId })); } catch (e) { } }, 400); }

// ----------------------------------------------------------- utilities
const $ = (s, r = document) => r.querySelector(s);
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const f = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d));
const decimals = step => (step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step) - 1e-9)));
function hhmm(h) { if (h == null || !Number.isFinite(h)) return '—'; let m = Math.round(h * 60); m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
const dateObj = () => ({ y: state.site.year, m: state.site.month, d: state.site.day });
const ymd = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const winArea = g => Math.max(0, g.winW * (g.head - g.sill));
function download(name, text, type = 'text/csv') { const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCSV = rows => rows.map(r => r.map(csvCell).join(',')).join('\n');
function sanitize(c) {
  const g = c.geom;
  g.winW = Math.min(g.winW, g.facW - 0.02); g.head = Math.min(g.head, g.facH - 0.02);
  g.sill = Math.min(g.sill, g.head - 0.05); g.sill = Math.max(0, g.sill); g.winW = Math.max(0.1, g.winW);
  c.hlouver.count = Math.round(c.hlouver.count); c.vfin.count = Math.round(c.vfin.count);
}

// ------------------------------------------------------- change pipeline
let dirty = { instant: true, heavy: true, sunpath: true }, heavyT = 0, periodT = 0;
function changed(kind) {
  sanitize(cfgA());
  dirty.instant = true;
  if (kind === 'geom' || kind === 'orient') { clearTimeout(heavyT); heavyT = setTimeout(() => { dirty.heavy = true; }, 160); }
  if (kind === 'site' || kind === 'orient') dirty.sunpath = true;
  if (kind !== 'view') { persist(); schedulePeriod(); }
  refreshHeader();
}
function schedulePeriod() {
  if (!state.ui.autoPeriod || state.periodSet === 'annual') return;
  clearTimeout(periodT); periodT = setTimeout(() => { if (state.ui.tab === 'period') runPeriod(); }, 450);
}
function loop() {
  if (dirty.heavy) { dirty.heavy = false; computeHeavy(); dirty.instant = true; }
  if (dirty.instant) { dirty.instant = false; computeInstant(); renderInstant(); }
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------ computing
function siteF() { return facadeFrame(state.site.facadeAz, state.site.tilt); }
function computeHeavy() {
  const c = cfgA(), F = siteF(), gi = buildGeometry(c, null);
  const vf = diffuseViewFactors(F, gi);
  const dl = daylightFactor(c, F, gi, { vf });
  const mask = shadingMask(c, F, 3, 50);
  state.heavy = { vf, dl, mask, F, cfgId: c.id };
  renderDaylight();
  dirty.sunpath = true;
}
function irradianceAt(date, clockH, sp) {
  const s = state.site;
  if (s.radSource === 'manual') return { DNI: +s.DNI || 0, DHI: +s.DHI || 0, GHI: +s.GHI || 0, src: 'Manual input' };
  if (s.radSource === 'epw') { if (!state.epw) return null; const r = epwLookup(state.epw, date.m, date.d, clockH - sp.dst); return r ? { ...r, src: 'EPW hourly record' } : null; }
  if (s.radSource === 'ashrae') { if (!(+s.taub > 0 && +s.taud > 0)) return null; return { ...ashraeClearSky(sp.alt, dayOfYear(date.y, date.m, date.d), +s.taub, +s.taud), src: 'ASHRAE 2009 clear-sky model' }; }
  return null;
}
function computeInstant() {
  const c = cfgA(), s = state.site, date = dateObj();
  if (!state.heavy.vf) computeHeavy();
  const ev = evaluate(c, s, date, s.time, { rows: 240, keepRows: true, floorCell: 0.1 });
  ev.times = sunTimes(s, date.y, date.m, date.d);
  ev.irr = irradianceAt(date, s.time, ev.sp);
  ev.rad = ev.irr ? radiation(ev.irr, ev.up, ev.sL, ev.sunlit, state.heavy.vf, c.glazing, s.rhoG, winArea(c.geom), s.tilt) : null;
  state.ev = ev;
}

// =========================================================== LEFT PANEL
const controls = [];
function refreshControls(except) { for (const c of controls) if (c !== except) c.refresh(); }
function section(title, open = false, parent = $('#left')) { const d = el('details', { class: 'sec' }); d.open = open; const b = el('div', { class: 'secbody' }); d.append(el('summary', {}, title), b); parent.append(d); return b; }
function num(parent, label, unit, obj, key, min, max, step, kind, opt = {}) {
  const r = el('input', { type: 'range', min, max, step }), n = el('input', { type: 'number', min, max, step });
  const row = el('div', { class: 'row' }, el('label', {}, el('span', {}, label), el('span', { class: 'u' }, unit || '')), el('div', { class: 'ctl' }, r, n));
  const apply = (v, full) => {
    v = +v; if (!Number.isFinite(v)) return;
    if (full || (v >= min && v <= max)) { v = Math.min(max, Math.max(min, v)); obj()[key] = v; opt.after && opt.after(v); changed(kind); refreshControls(full ? null : c); if (!full) r.value = obj()[key]; }
  };
  r.addEventListener('input', () => { apply(r.value, false); n.value = (+r.value).toFixed(decimals(step)); });
  n.addEventListener('input', () => apply(n.value, false));
  n.addEventListener('change', () => apply(n.value, true));
  const c = { row, refresh() { const v = obj()[key]; r.value = v; if (document.activeElement !== n) n.value = (+v).toFixed(decimals(step)); }, show(b) { row.style.display = b ? '' : 'none'; } };
  controls.push(c); c.refresh(); parent.append(row); return c;
}
function sel(parent, label, options, obj, key, kind, after) {
  const s = el('select', {}, Object.entries(options).map(([v, t]) => el('option', { value: v }, t)));
  s.addEventListener('change', () => { obj()[key] = s.value; after && after(s.value); changed(kind); refreshControls(); });
  const row = el('div', { class: 'row' }, el('label', {}, label), s);
  const c = { row, refresh() { s.value = obj()[key]; }, show(b) { row.style.display = b ? '' : 'none'; } };
  controls.push(c); c.refresh(); parent.append(row); return c;
}
function info(parent, fn) { const d = el('div', { class: 'hint' }); parent.append(d); const c = { refresh() { d.innerHTML = fn(); }, show() { } }; controls.push(c); c.refresh(); return c; }

function buildLeft() {
  const S = () => state.site, C = () => cfgA();
  // --- Location & time
  let b = section('Location, date & time', true);
  sel(b, 'Location preset', Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.name])), S, 'preset', 'site', v => { if (v !== 'custom') Object.assign(state.site, { lat: PRESETS[v].lat, lon: PRESETS[v].lon, tz: PRESETS[v].tz, dst: PRESETS[v].dst }); });
  const toCustom = () => { state.site.preset = 'custom'; };
  num(b, 'Latitude (+N)', '°', S, 'lat', -89.9, 89.9, 0.0001, 'site', { after: toCustom });
  num(b, 'Longitude (+E)', '°', S, 'lon', -180, 180, 0.0001, 'site', { after: toCustom });
  num(b, 'Time zone, standard (UTC offset)', 'h', S, 'tz', -12, 14, 0.25, 'site', { after: toCustom });
  sel(b, 'Daylight-saving rule', { none: 'None', EU: 'EU (last Sun Mar – last Sun Oct)', US: 'US (2nd Sun Mar – 1st Sun Nov)', AU: 'AU south (1st Sun Oct – 1st Sun Apr)' }, S, 'dst', 'site', toCustom);
  const dIn = el('input', { type: 'date' });
  dIn.addEventListener('change', () => { const [y, m, d] = dIn.value.split('-').map(Number); if (y && m && d) { Object.assign(state.site, { year: y, month: m, day: d }); changed('site'); refreshControls(); } });
  b.append(el('div', { class: 'row' }, el('label', {}, 'Date'), dIn));
  controls.push({ refresh() { dIn.value = ymd(dateObj()); }, show() { } });
  const doyObj = { get doy() { return dayOfYear(state.site.year, state.site.month, state.site.day); }, set doy(v) { const d = dateFromDoy(state.site.year, Math.round(v)); state.site.month = d.m; state.site.day = d.d; } };
  num(b, 'Day of year', 'n', () => doyObj, 'doy', 1, 365, 1, 'site');
  const quick = el('div', { class: 'btnrow' }, ...[['Mar 20', 3, 20], ['Jun 21', 6, 21], ['Sep 23', 9, 23], ['Dec 21', 12, 21]].map(([t, m, d]) =>
    el('button', { class: 'btn', onclick: () => { state.site.month = m; state.site.day = d; changed('site'); refreshControls(); } }, t)));
  b.append(quick);
  // time slider sunrise → sunset
  const tr = el('input', { type: 'range', step: 1 / 60 }), tt = el('input', { type: 'time', step: 60 });
  const playB = el('button', { class: 'btn', title: 'Animate the day' }, '▶');
  b.append(el('div', { class: 'row' }, el('label', {}, el('span', {}, 'Local clock time (sunrise → sunset)'), el('span', { class: 'u', id: 'tlab' }, '')), el('div', { class: 'ctl' }, tr, tt, playB)));
  tr.addEventListener('input', () => { state.site.time = +tr.value; changed('time'); tt.value = hhmm(state.site.time); });
  tt.addEventListener('change', () => { const [h, m] = tt.value.split(':').map(Number); if (Number.isFinite(h)) { state.site.time = h + (m || 0) / 60; changed('time'); refreshControls(); } });
  let playing = 0;
  playB.addEventListener('click', () => {
    if (playing) { clearInterval(playing); playing = 0; playB.textContent = '▶'; return; }
    playB.textContent = '❚❚';
    playing = setInterval(() => { const st = sunTimes(state.site, state.site.year, state.site.month, state.site.day); const a = st.sunrise ?? 0, z = st.sunset ?? 24;
      let t = state.site.time + state.site.step / 60 / 3; if (t > z || t < a) t = a; state.site.time = t; changed('time'); refreshControls(); }, 90);
  });
  controls.push({ refresh() { const st = sunTimes(state.site, state.site.year, state.site.month, state.site.day);
    const a = st.sunrise ?? 0, z = st.sunset ?? 24; tr.min = Math.floor(a * 60) / 60; tr.max = Math.ceil(z * 60) / 60; tr.value = state.site.time;
    if (document.activeElement !== tt) tt.value = hhmm(state.site.time);
    $('#tlab').textContent = st.polar ? (st.polar === 'day' ? 'polar day' : 'polar night') : `${hhmm(st.sunrise)}–${hhmm(st.sunset)}`; }, show() { } });
  sel(b, 'Time step for period analysis', { 5: '5 min', 10: '10 min', 15: '15 min', 30: '30 min', 60: '60 min' }, () => ({ get step() { return String(state.site.step); }, set step(v) { state.site.step = +v; } }), 'step', 'site');

  // --- Orientation
  b = section('Orientation', true);
  const rotObj = { get rot() { return ((state.site.facadeAz - SIDES[state.site.side]) % 360 + 540) % 360 - 180; }, set rot(v) { state.site.facadeAz = ((v + SIDES[state.site.side]) % 360 + 360) % 360; } };
  num(b, 'Building orientation (rotation from N, cw)', '°', () => rotObj, 'rot', -180, 180, 1, 'orient');
  sel(b, 'Façade analysed (building side)', { N: 'North side', E: 'East side', S: 'South side', W: 'West side' }, () => ({ get side() { return state.site.side; }, set side(v) { const r = rotObj.rot; state.site.side = v; rotObj.rot = r; } }), 'side', 'orient');
  num(b, 'Façade azimuth (outward normal, cw from N)', '°', S, 'facadeAz', 0, 359, 1, 'orient');
  num(b, 'Façade tilt from vertical (+ leaning back)', '°', S, 'tilt', -30, 60, 1, 'orient');
  b.append(el('div', { class: 'hint', html: 'Solar azimuth and façade azimuth both use 0° = North, clockwise (E = 90°, S = 180°). The façade azimuth is the direction its outward normal faces.' }));

  // --- Geometry
  b = section('Façade & window geometry', true);
  for (const p of PARAMS.geom) num(b, p[1], p[2], () => C().geom, p[0], p[3], p[4], p[5], 'geom');
  const derived = { get winH() { return C().geom.head - C().geom.sill; }, set winH(v) { C().geom.head = C().geom.sill + v; },
    get wwr() { const g = C().geom; return winArea(g) / (g.facW * g.facH) * 100; }, set wwr(v) { const g = C().geom; g.winW = Math.max(0.1, v / 100 * g.facW * g.facH / Math.max(0.05, g.head - g.sill)); } };
  num(b, 'Window height (head − sill)', 'm', () => derived, 'winH', 0.1, 8, 0.01, 'geom');
  num(b, 'Window-to-wall ratio (sets window width)', '%', () => derived, 'wwr', 1, 99, 0.1, 'geom');
  info(b, () => { const g = C().geom; return `Window area <b>${f(winArea(g), 2)} m²</b> · façade ${f(g.facW * g.facH, 2)} m² · WWR <b>${f(winArea(g) / (g.facW * g.facH) * 100, 1)} %</b>`; });

  // --- Shading system
  b = section('Shading system', true);
  sel(b, 'System', SHADING_TYPES, C, 'type', 'geom', () => showTypeGroups());
  const groupBoxes = {};
  for (const grp of ['overhang', 'hlouver', 'vfin', 'eggcrate', 'blinds']) {
    const box = el('div', {}); b.append(box); groupBoxes[grp] = box;
    box.append(el('div', { class: 'hint', style: 'font-weight:600;color:#38414b;margin-top:8px' }, { overhang: 'Horizontal overhang', hlouver: 'Horizontal louvers', vfin: 'Vertical fins', eggcrate: 'Egg-crate', blinds: 'External blinds' }[grp]));
    if (grp === 'blinds') sel(box, 'Control mode', { fixed: 'Fixed slat angle', cutoff: 'Cut-off tracking (blocks beam with max. opening)' }, () => C().blinds, 'mode', 'geom');
    for (const p of PARAMS[grp]) num(box, p[1], p[2], () => C()[grp], p[0], p[3], p[4], p[5], 'geom');
  }
  groupBoxes.eggcrate.append(el('div', { class: 'hint' }, 'Members are distributed evenly across the window; actual spacing = window size / round(window size / spacing).'));
  const cbox = el('div', {}); b.append(cbox); groupBoxes.custom = cbox;
  const ta = el('textarea', { spellcheck: 'false' }), terr = el('div', { class: 'warn' });
  cbox.append(el('div', { class: 'hint', html: 'Array of boxes in façade-local metres: <code>t</code> along façade (0 = centre, + right seen from outside), <code>w</code> height above façade base, <code>n</code> outward from wall face; <code>dt, dw, dn</code> sizes; <code>rotT</code> tilt about t (+ outer edge down), <code>rotW</code> rotation about w (°). Updates live.' }), ta, terr,
    el('div', { class: 'btnrow' }, el('button', { class: 'btn', onclick: () => { C().custom.json = CUSTOM_EXAMPLE; changed('geom'); refreshControls(); } }, 'Load example'),
      el('button', { class: 'btn', onclick: () => { const gi = buildGeometry(C(), state.ev?.sL); C().custom.json = JSON.stringify(gi.dev.map(boxToJSON), null, 1); C().type = 'custom'; changed('geom'); refreshControls(); showTypeGroups(); } }, 'Convert current system → custom')));
  ta.addEventListener('input', () => { C().custom.json = ta.value; changed('geom'); });
  controls.push({ refresh() { if (document.activeElement !== ta) ta.value = C().custom.json; const gi = buildGeometry(C(), null); terr.textContent = gi.notes.join(' '); }, show() { } });
  function showTypeGroups() { const g = TYPE_GROUPS[C().type]; for (const [k, box] of Object.entries(groupBoxes)) box.style.display = g.includes(k) ? '' : 'none'; }
  controls.push({ refresh: showTypeGroups, show() { } });
  showTypeGroups();

  // --- Material
  b = section('Shading material');
  sel(b, 'Material preset', Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, v.name])), () => C().material, 'preset', 'geom', v => { if (v !== 'custom') Object.assign(C().material, { refl: MATERIALS[v].refl, color: MATERIALS[v].color }); });
  for (const p of PARAMS.material) num(b, p[1], p[2], () => C().material, p[0], p[3], p[4], p[5], p[0] === 'opacity' ? 'view' : 'geom', { after: () => { if (p[0] === 'refl') C().material.preset = 'custom'; } });
  const col = el('input', { type: 'color' }); col.addEventListener('input', () => { C().material.color = col.value; C().material.preset = 'custom'; changed('view'); });
  b.append(el('div', { class: 'row' }, el('label', {}, 'Surface colour (3D display)'), col));
  controls.push({ refresh() { col.value = C().material.color; }, show() { } });
  b.append(el('div', { class: 'hint' }, 'Reflectance is used only in the daylight-factor estimate (luminance of obstructing devices). Colour and opacity affect display only.'));

  // --- Glazing
  b = section('Glazing');
  for (const p of PARAMS.glazing) num(b, p[1], p[2], () => C().glazing, p[0], p[3], p[4], p[5], 'geom');
  b.append(el('div', { class: 'hint', html: 'Angular dependence: k(θ) = 1 − b₀(1/cosθ − 1). Diffuse uses Brandemuehl–Beckman equivalent angles. Values are per glazing unit; frame not modelled.' }));

  // --- Radiation
  b = section('Solar radiation inputs');
  sel(b, 'Radiation source', { none: 'None (geometry only)', manual: 'Manual DNI / DHI / GHI (instantaneous)', epw: 'EPW weather file (hourly)', ashrae: 'ASHRAE 2009 clear-sky (enter τb, τd)' }, S, 'radSource', 'site');
  const man = el('div', {}); b.append(man);
  num(man, 'Direct normal irradiance DNI', 'W/m²', S, 'DNI', 0, 1200, 1, 'site');
  num(man, 'Diffuse horizontal irradiance DHI', 'W/m²', S, 'DHI', 0, 800, 1, 'site');
  num(man, 'Global horizontal irradiance GHI', 'W/m²', S, 'GHI', 0, 1400, 1, 'site');
  info(man, () => { const ev = state.ev; if (!ev) return ''; const s = state.site, calc = s.DNI * Math.max(0, Math.sin(ev.sp.alt * D2R)) + +s.DHI;
    return `Closure check: DNI·sin(alt) + DHI = <b>${f(calc, 0)}</b> W/m² vs GHI ${f(+s.GHI, 0)} W/m² (residual ${f(+s.GHI - calc, 0)}). Values are not derived from solar position.`; });
  const epwBox = el('div', {}); b.append(epwBox);
  const fileIn = el('input', { type: 'file', accept: '.epw' }), epwInfo = el('div', { class: 'hint' });
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0]; if (!file) return;
    try { state.epw = parseEPW(await file.text()); state.epw.file = file.name; epwInfo.innerHTML = epwSummary(); state.site.radSource = 'epw'; changed('site'); refreshControls(); }
    catch (e) { epwInfo.innerHTML = '<span class="warn">' + e.message + '</span>'; }
  });
  const useLoc = el('button', { class: 'btn', onclick: () => { if (!state.epw) return; Object.assign(state.site, { preset: 'custom', lat: state.epw.lat, lon: state.epw.lon, tz: state.epw.tz, dst: 'none' }); changed('site'); refreshControls(); } }, 'Use EPW location & time zone');
  epwBox.append(el('div', { class: 'row' }, el('label', {}, 'EPW file (EnergyPlus weather)'), fileIn), epwInfo, useLoc);
  const epwSummary = () => state.epw ? `Loaded <b>${state.epw.file}</b>: ${state.epw.city}, ${state.epw.country} · ${state.epw.lat}°, ${state.epw.lon}°, UTC${state.epw.tz >= 0 ? '+' : ''}${state.epw.tz} · ${state.epw.n} records. EPW hours are local standard time; hour h covers (h−1, h].` : 'No weather file loaded. Period radiation totals need an EPW file or the clear-sky model.';
  controls.push({ refresh() { epwInfo.innerHTML = epwSummary(); }, show() { } });
  const ash = el('div', {}); b.append(ash);
  const tauObj = () => state.site;
  for (const [k, lab] of [['taub', 'Beam optical depth τb'], ['taud', 'Diffuse optical depth τd']]) {
    const inp = el('input', { type: 'number', step: 0.001, min: 0, placeholder: 'from ASHRAE climatic data' });
    inp.addEventListener('input', () => { tauObj()[k] = inp.value; changed('site'); });
    ash.append(el('div', { class: 'row' }, el('label', {}, lab), inp));
    controls.push({ refresh() { if (document.activeElement !== inp) inp.value = tauObj()[k]; }, show() { } });
  }
  ash.append(el('div', { class: 'hint' }, 'Monthly τb, τd are site-specific (ASHRAE Handbook — Fundamentals, Ch. 14 climatic design data). No defaults are assumed.'));
  num(b, 'Ground reflectance ρg', '', S, 'rhoG', 0, 0.9, 0.01, 'site');
  controls.push({ refresh() { const r = state.site.radSource; man.style.display = r === 'manual' ? '' : 'none'; epwBox.style.display = r === 'epw' ? '' : 'none'; ash.style.display = r === 'ashrae' ? '' : 'none'; }, show() { } });

  // --- Room
  b = section('Room surfaces (daylight model)');
  for (const p of PARAMS.room) num(b, p[1], p[2], () => C().room, p[0], p[3], p[4], p[5], 'geom');
  refreshControls();
}
const boxToJSON = bx => {   // recover rotT / rotW from axes (rotations applied T then W)
  const ax = bx.ax, rotW = Math.atan2(ax[0][2] * -1, ax[0][0]) * R2D, rotT = Math.atan2(-ax[2][1], ax[1][1]) * R2D;
  const r = v => Math.round(v * 1000) / 1000;
  return { t: r(bx.c[0]), w: r(bx.c[1]), n: r(bx.c[2]), dt: r(2 * bx.h[0]), dw: r(2 * bx.h[1]), dn: r(2 * bx.h[2]), rotT: r(rotT), rotW: r(rotW) };
};

// ============================================================ 3D SCENE
let renderer, scene, camera, orbit, sunLight, hemi, dyn, staticGrp;
const e2t = v => new THREE.Vector3(v[0], v[2], -v[1]);           // ENU → three (y up)
function initThree() {
  const host = $('#view3d');
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.prepend(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9ecef);
  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 600);
  orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = true; orbit.dampingFactor = 0.12;
  hemi = new THREE.HemisphereLight(0xffffff, 0xbdb6aa, 1.1); scene.add(hemi);
  sunLight = new THREE.DirectionalLight(0xfff1d0, 2.6); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048); Object.assign(sunLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight, sunLight.target);
  staticGrp = new THREE.Group(); scene.add(staticGrp);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 1 }));
  ground.position.y = -0.002; ground.receiveShadow = true; staticGrp.add(ground);
  const grid = new THREE.GridHelper(40, 40, 0xbab4a8, 0xcbc6bb); grid.position.y = 0; grid.material.transparent = true; grid.material.opacity = 0.5; staticGrp.add(grid);
  const nArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-7, 0.02, 4), 2, 0x1d232a, 0.45, 0.25); staticGrp.add(nArrow);
  staticGrp.add(label('N', new THREE.Vector3(-7, 0.3, 1.6), 0.45, '#1d232a', true));
  dyn = new THREE.Group(); scene.add(dyn);
  const ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); });
  ro.observe(host);
  setView('exterior');
  (function anim() { orbit.update(); renderer.render(scene, camera); requestAnimationFrame(anim); })();
}
function label(text, pos, size = 0.2, color = '#1d232a', depthTest = false) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = '600 44px system-ui,Segoe UI,Arial';
  const w = Math.ceil(x.measureText(text).width) + 24; c.width = w; c.height = 64;
  x.font = '600 44px system-ui,Segoe UI,Arial'; x.fillStyle = 'rgba(255,255,255,0.88)'; x.fillRect(0, 0, w, 64); x.fillStyle = color; x.textBaseline = 'middle'; x.fillText(text, 12, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest, transparent: true }));
  sp.scale.set(size * w / 64, size, 1); sp.position.copy(pos); sp.renderOrder = 20; return sp;
}
function clearGroup(g) { g.traverse(o => { o.geometry && o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); }); g.clear(); }
function basis(F, horizontal) { return new THREE.Matrix4().makeBasis(e2t(F.t), horizontal ? new THREE.Vector3(0, 1, 0) : e2t(F.w), e2t(horizontal ? F.nh : F.n)); }
function boxMesh(b, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2 * b.h[0], 2 * b.h[1], 2 * b.h[2]), mat);
  m.matrixAutoUpdate = false;
  m.matrix.makeBasis(new THREE.Vector3(...b.ax[0]), new THREE.Vector3(...b.ax[1]), new THREE.Vector3(...b.ax[2])).setPosition(b.c[0], b.c[1], b.c[2]);
  m.castShadow = cast; m.receiveShadow = true; return m;
}
const rb = (t0, t1, w0, w1, n0, n1) => makeBox([(t0 + t1) / 2, (w0 + w1) / 2, (n0 + n1) / 2], [t1 - t0, w1 - w0, n1 - n0]);
function canvasTex(w, h, draw, nearest) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; } return t;
}
const dfColor = v => { const P = ['#f6f3ea', '#e4ecd0', '#c3ddb3', '#94c8a3', '#64ae9d', '#43929b', '#327394', '#2a5687', '#233b6d']; const k = Math.max(0, Math.min(P.length - 1, Math.floor(v / 6 * (P.length - 1) + 1e-9))); return v <= 0 ? P[0] : P[Math.min(P.length - 1, k + (v > 0 ? 0 : 0))]; };

function update3D() {
  const ev = state.ev, c = cfgA(), g = c.geom, F = ev.F, gi = ev.gi, W = gi.W, d = Math.max(0, g.reveal), u = state.ui;
  clearGroup(dyn);
  const fac = new THREE.Group(); fac.matrixAutoUpdate = false; fac.matrix.copy(basis(F, false)); dyn.add(fac);
  const room = new THREE.Group(); room.matrixAutoUpdate = false; room.matrix.copy(basis(F, true)); dyn.add(room);
  // wall around the opening
  const wt = Math.max(d, 0.03), wallMat = new THREE.MeshStandardMaterial({ color: 0xebe7df, roughness: 0.9 });
  for (const b of [rb(-g.facW / 2, W.x0, 0, g.facH, -wt, 0), rb(W.x1, g.facW / 2, 0, g.facH, -wt, 0), rb(W.x0, W.x1, 0, W.y0, -wt, 0), rb(W.x0, W.x1, W.y1, g.facH, -wt, 0)])
    if (b.h[0] > 1e-4 && b.h[1] > 1e-4) fac.add(boxMesh(b, wallMat));
  // glazing with computed sunlit / shaded pattern
  const wW = W.x1 - W.x0, wH = W.y1 - W.y0;
  let gmat;
  if (u.glazing) {
    const th = Math.max(16, Math.min(512, Math.round(256 * wH / wW)));
    const tex = canvasTex(256, th, (x, w, h) => {
      x.fillStyle = ev.front ? 'rgba(244,190,40,0.80)' : 'rgba(80,98,122,0.55)'; x.fillRect(0, 0, w, h);
      if (ev.front && ev.rows) { x.fillStyle = 'rgba(70,90,116,0.78)';
        for (const r of ev.rows) { const y = h - (r.y - W.y0 + r.dy / 2) / wH * h, hh = r.dy / wH * h + 0.6; for (const s of r.shaded) x.fillRect((s[0] - W.x0) / wW * w, y, (s[1] - s[0]) / wW * w, hh); } }
    });
    gmat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  } else gmat = new THREE.MeshPhysicalMaterial({ color: 0x9cc6df, transparent: true, opacity: 0.28, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wW, wH), gmat); glass.position.set((W.x0 + W.x1) / 2, (W.y0 + W.y1) / 2, gi.ng + 0.001); fac.add(glass);
  // shading devices
  const dm = c.material, devMat = new THREE.MeshStandardMaterial({ color: dm.color, roughness: 0.55, metalness: 0.1, transparent: dm.opacity < 1, opacity: dm.opacity });
  for (const b of gi.dev) fac.add(boxMesh(b, devMat));
  // interior floor with computed sun patch or DF heat-map
  const fp = ev.floor, dl = state.heavy.dl;
  const ftex = canvasTex(fp.nx * 4, fp.ny * 4, (x, w, h) => {
    x.fillStyle = '#d8d1c2'; x.fillRect(0, 0, w, h);
    if (u.floor === 'df' && dl) { const cw = w / dl.nx, ch = h / dl.ny; for (let j = 0; j < dl.ny; j++) for (let i = 0; i < dl.nx; i++) { x.fillStyle = dfColor(dl.df[j * dl.nx + i]); x.fillRect(i * cw, h - (j + 1) * ch, cw + 0.5, ch + 0.5); } }
    if (u.floor !== 'none') { const cw = w / fp.nx, ch = h / fp.ny; x.fillStyle = u.floor === 'df' ? 'rgba(244,180,30,0.55)' : '#f2bc2f';
      for (let j = 0; j < fp.ny; j++) for (let i = 0; i < fp.nx; i++) if (fp.grid[j * fp.nx + i]) x.fillRect(i * cw, h - (j + 1) * ch, cw + 0.3, ch + 0.3); }
  }, u.floor === 'sun');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(g.facW, g.roomD).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ftex }));
  floor.position.set(0, 0.004, -(d + g.roomD / 2)); room.add(floor);
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(g.facW, g.facH, g.roomD)), new THREE.LineBasicMaterial({ color: 0x8b929b, transparent: true, opacity: 0.6 }));
  ghost.position.set(0, g.facH / 2, -(d + g.roomD / 2)); room.add(ghost);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(g.facW, g.facH), new THREE.MeshStandardMaterial({ color: 0xf1eee8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  back.position.set(0, g.facH / 2, -(d + g.roomD)); room.add(back);
  // sun, light, rays
  const winC = toWorld([(W.x0 + W.x1) / 2, (W.y0 + W.y1) / 2, gi.ng], F), wc3 = e2t(winC);
  if (ev.up) {
    const s3 = e2t(ev.s).normalize();
    sunLight.intensity = 2.6 * Math.min(1, Math.sin(ev.sp.alt * D2R) * 3 + 0.15); sunLight.position.copy(wc3.clone().addScaledVector(s3, 30)); sunLight.target.position.copy(wc3);
    sunLight.castShadow = u.shadows; hemi.intensity = 1.1;
    const sunPos = wc3.clone().addScaledVector(s3, 13);
    const sph = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf5b624 })); sph.position.copy(sunPos); dyn.add(sph);
    dyn.add(new THREE.ArrowHelper(s3.clone().negate(), sunPos, 11.2, 0xd38f0c, 0.5, 0.25));
    if (u.dims) dyn.add(label(`sun  alt ${f(ev.sp.alt)}°  az ${f(ev.sp.az)}°`, sunPos.clone().add(new THREE.Vector3(0, 0.75, 0)), 0.32));
  } else { sunLight.intensity = 0; hemi.intensity = 0.6; }
  if (u.rays && ev.front) dyn.add(buildRays(ev, c));
  if (u.dims) addDims(fac, room, ev, c);
  if (u.axes) {
    const o = new THREE.Vector3(0, 0.01, 0);
    for (const [dir, col, t] of [[[1, 0, 0], 0xb4442f, 'E (x)'], [[0, 1, 0], 0x2f5d8a, 'N (y)'], [[0, 0, 1], 0x3f8f6b, 'Up (z)']]) {
      const v = e2t(dir); dyn.add(new THREE.ArrowHelper(v, o, 1.6, col, 0.2, 0.1)); dyn.add(label(t, v.clone().multiplyScalar(1.85), 0.22));
    }
    for (const [v, col, t] of [[F.n, 0x9b4f8e, 'n'], [F.t, 0x9b4f8e, 't'], [F.w, 0x9b4f8e, 'w']]) {
      const o2 = e2t(toWorld([W.x1 + 0.3, W.y0, 0.02], F)); dyn.add(new THREE.ArrowHelper(e2t(v), o2, 0.8, col, 0.14, 0.07)); dyn.add(label(t, o2.clone().addScaledVector(e2t(v), 0.95), 0.18));
    }
  }
  $('#legend3d').innerHTML = `<div><i style="background:#f2b51d"></i>direct beam (incident)</div><div><i style="background:#ff7a1a"></i>transmitted beam → floor</div><div><i style="background:#7d8796"></i>beam blocked (shaded path)</div>
  <div><i style="background:#f2bc2f;height:8px"></i>computed sunlit glass / floor</div><div><i style="background:#50627a;height:8px"></i>computed shaded glass</div><div style="color:#69707a">Reflected light: not drawn (see Method)</div>`;
}
function buildRays(ev, c) {
  const W = ev.gi.W, F = ev.F, sL = ev.sL, g = c.geom, grp = new THREE.Group(), nx = 7, ny = 5;
  const inc = [], blk = [], tra = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const o = [W.x0 + (i + 0.5) * (W.x1 - W.x0) / nx, W.y0 + (j + 0.5) * (W.y1 - W.y0) / ny, ev.gi.ng];
    const far = vadd(o, vmul(sL, 7)), hit = rayFirstHit(o, sL, ev.gi.all);
    const pw = p => e2t(toWorld(p, F));
    if (hit) { const hp = vadd(o, vmul(sL, hit.t)); inc.push(pw(far), pw(hp)); blk.push(pw(hp), pw(o)); }
    else {
      inc.push(pw(far), pw(o));
      const ow = toWorld(o, F), s = ev.s; let lam = ow[2] / s[2];
      const depthAt = l => -vdot([ow[0] - l * s[0], ow[1] - l * s[1], 0], F.nh) - Math.max(0, g.reveal);
      if (depthAt(lam) > g.roomD) { const d0 = depthAt(0), d1 = depthAt(1); lam = (g.roomD - d0) / (d1 - d0); }
      tra.push(e2t(ow), e2t([ow[0] - lam * s[0], ow[1] - lam * s[1], ow[2] - lam * s[2]]));
    }
  }
  const add = (pts, mat, dashed) => { if (!pts.length) return; const ls = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat); if (dashed) ls.computeLineDistances(); grp.add(ls); };
  add(inc, new THREE.LineBasicMaterial({ color: 0xf2b51d }));
  add(blk, new THREE.LineDashedMaterial({ color: 0x7d8796, dashSize: 0.06, gapSize: 0.05 }), true);
  add(tra, new THREE.LineBasicMaterial({ color: 0xff7a1a }));
  return grp;
}
function addDims(fac, room, ev, c) {
  const g = c.geom, W = ev.gi.W, z = 0.03;
  fac.add(label(`window ${f(g.winW, 2)} × ${f(g.head - g.sill, 2)} m`, new THREE.Vector3(0, W.y1 + 0.16, z + 0.02), 0.16));
  fac.add(label(`sill ${f(g.sill, 2)} m`, new THREE.Vector3(W.x0 - 0.45, W.y0 / 2, z), 0.14));
  fac.add(label(`head ${f(g.head, 2)} m`, new THREE.Vector3(W.x1 + 0.5, W.y1, z), 0.14));
  fac.add(label(`façade ${f(g.facW, 2)} × ${f(g.facH, 2)} m · az ${f(state.site.facadeAz, 0)}°`, new THREE.Vector3(0, g.facH + 0.2, z), 0.16));
  const line = (a, b) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0x1d232a })); fac.add(l); };
  line(new THREE.Vector3(W.x0, W.y1 + 0.06, z), new THREE.Vector3(W.x1, W.y1 + 0.06, z));
  line(new THREE.Vector3(W.x0 - 0.1, 0, z), new THREE.Vector3(W.x0 - 0.1, W.y0, z));
  const dev = ev.gi.dev; if (dev.length) {
    const b = dev[0], vs = boxVerts(b), nmax = Math.max(...vs.map(v => v[2])), wmax = Math.max(...vs.map(v => v[1]));
    const wtop = Math.max(...dev.flatMap(bb => boxVerts(bb).map(v => v[1]))); fac.add(label(`${dev.length} element(s) · outer edge ${f(nmax, 2)} m from wall`, new THREE.Vector3(W.x1 + 0.9, Math.max(wtop, W.y1) + 0.35, nmax), 0.14));
  }
  room.add(label(`room depth ${f(g.roomD, 1)} m`, new THREE.Vector3(g.facW / 2 + 0.3, 0.1, -(g.reveal + g.roomD / 2)), 0.15));
  if (ev.floor && ev.floor.maxDepth > 0) room.add(label(`sun reach ${f(ev.floor.maxDepth, 2)} m`, new THREE.Vector3(0, 0.12, -(g.reveal + ev.floor.maxDepth)), 0.15, '#9a5a00'));
}
function setView(v) {
  const c = cfgA(), g = c.geom, F = siteF(), W = windowRect(g), mid = e2t(toWorld([0, (W.y0 + W.y1) / 2, 0], F));
  const at = (p, t) => { camera.position.copy(p); orbit.target.copy(t); orbit.update(); };
  const out = e2t(F.nh), side = e2t(F.t);
  if (v === 'exterior') at(mid.clone().addScaledVector(out, 11).addScaledVector(side, 6).add(new THREE.Vector3(0, 3.2, 0)), mid.clone().addScaledVector(out, -0.8));
  if (v === 'interior') at(mid.clone().addScaledVector(out, -(g.roomD * 0.9)).addScaledVector(side, -0.6).add(new THREE.Vector3(0, 0.3, 0)), mid.clone().addScaledVector(out, -g.roomD * 0.35).add(new THREE.Vector3(0, -1, 0)));
  if (v === 'plan') at(mid.clone().addScaledVector(out, -g.roomD / 2 + 1).add(new THREE.Vector3(0, 13, 0.01)), mid.clone().addScaledVector(out, -g.roomD / 2 + 1).setY(0));
  if (v === 'sun' && state.ev?.up) at(mid.clone().addScaledVector(e2t(state.ev.s).normalize(), 9), mid);
  if (v === 'side') at(mid.clone().addScaledVector(side, 9).addScaledVector(out, 1.5).add(new THREE.Vector3(0, 0.5, 0)), mid.clone().addScaledVector(out, 0.5));
}
function buildToolbar() {
  const tb = $('#toolbar'), u = state.ui;
  const chk = (k, t) => { const i = el('input', { type: 'checkbox' }); i.checked = u[k]; i.addEventListener('change', () => { u[k] = i.checked; changed('view'); }); return el('label', {}, i, t); };
  const fl = el('select', {}, el('option', { value: 'sun' }, 'Floor: direct sun'), el('option', { value: 'df' }, 'Floor: daylight factor'), el('option', { value: 'none' }, 'Floor: plain'));
  fl.value = u.floor; fl.addEventListener('change', () => { u.floor = fl.value; changed('view'); });
  const vw = el('select', {}, ...['exterior', 'interior', 'side', 'plan', 'sun'].map(v => el('option', { value: v }, 'View: ' + (v === 'sun' ? 'from sun' : v))));
  vw.addEventListener('change', () => setView(vw.value));
  tb.append(chk('rays', 'Solar rays'), chk('shadows', 'Shadows (render)'), chk('glazing', 'Computed glass pattern'), chk('dims', 'Dimensions'), chk('axes', 'Axes'), fl, vw,
    el('button', { class: 'btn', onclick: () => setView(vw.value) }, 'Reset view'));
}

// ============================================================ 2D DRAWING
function prepCanvas(cv, hCss) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 420; cv.style.height = hCss + 'px';
  cv.width = Math.round(w * dpr); cv.height = Math.round(hCss * dpr); const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, hCss); return { x, w, h: hCss };
}
function niceTicks(a, b, n = 5) { if (!(b > a)) b = a + 1; const st = Math.pow(10, Math.floor(Math.log10((b - a) / n))), m = (b - a) / n / st, s = st * (m > 5 ? 10 : m > 2 ? 5 : m > 1 ? 2 : 1); const out = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) out.push(+v.toFixed(10)); return out; }
function lineChart(cv, o) {
  const { x, w, h } = prepCanvas(cv, o.height || 200), L = 46, R = o.right ? 46 : 12, T = (o.series.filter(s => s.name).length > 1 || o.legend) ? 36 : 22, B = 30, pw = w - L - R, ph = h - T - B;
  let ymin = o.ymin, ymax = o.ymax;
  if (ymin == null || ymax == null) { const all = o.series.flatMap(s => s.data.map(p => p[1])).filter(Number.isFinite); ymin ??= Math.min(0, ...all); ymax ??= Math.max(1e-6, ...all) * 1.05; }
  const X = v => L + (v - o.xmin) / (o.xmax - o.xmin) * pw, Y = v => T + ph - (v - ymin) / (ymax - ymin) * ph;
  x.font = '10.5px system-ui'; x.strokeStyle = '#ece9e3'; x.fillStyle = '#69707a'; x.lineWidth = 1;
  for (const v of niceTicks(ymin, ymax)) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(o.yfmt ? o.yfmt(v) : v, L - 5, Y(v) + 3.5); }
  for (const v of (o.xticks || niceTicks(o.xmin, o.xmax, 8))) { x.textAlign = 'center'; x.fillText(o.xfmt ? o.xfmt(v) : v, X(v), T + ph + 14); x.beginPath(); x.moveTo(X(v), T + ph); x.lineTo(X(v), T + ph + 3); x.stroke(); }
  if (o.right) { const r = o.right; const Y2 = v => T + ph - (v - r.min) / (r.max - r.min) * ph; for (const v of niceTicks(r.min, r.max)) { x.textAlign = 'left'; x.fillText(v, L + pw + 5, Y2(v) + 3.5); } o.series.filter(s => s.right).forEach(s => s.Y = Y2); }
  x.strokeStyle = '#9aa1a9'; x.strokeRect(L, T, pw, ph);
  x.save(); x.beginPath(); x.rect(L, T, pw, ph); x.clip();
  for (const s of o.series) {
    const Yf = s.Y || Y; x.strokeStyle = s.color; x.lineWidth = s.width || 1.8; x.setLineDash(s.dash || []); x.beginPath(); let pen = false;
    for (const p of s.data) { if (!Number.isFinite(p[1])) { pen = false; continue; } const px = X(p[0]), py = Yf(p[1]); pen ? x.lineTo(px, py) : x.moveTo(px, py); pen = true; }
    x.stroke(); x.setLineDash([]);
  }
  if (o.marker != null) { x.strokeStyle = '#b4442f'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(X(o.marker), T); x.lineTo(X(o.marker), T + ph); x.stroke(); x.setLineDash([]); }
  x.restore();
  x.fillStyle = '#1d232a'; x.textAlign = 'left'; x.font = '600 11px system-ui'; x.fillText(o.title || '', L, 12);
  let lx = L; x.font = '10.5px system-ui'; const ly = 28;
  if (o.series.length > 1 || o.legend) for (const s of o.series) { if (!s.name) continue; x.fillStyle = s.color; x.fillRect(lx, ly - 6, 12, 3); x.fillStyle = '#39424c'; x.fillText(s.name, lx + 15, ly - 2); lx += x.measureText(s.name).width + 30; }
  x.fillStyle = '#69707a'; x.textAlign = 'center'; if (o.xlabel) x.fillText(o.xlabel, L + pw / 2, h - 3);
  if (o.ylabel) { x.save(); x.translate(10, T + ph / 2); x.rotate(-Math.PI / 2); x.fillText(o.ylabel, 0, 0); x.restore(); }
}
function barChart(cv, o) {
  const { x, w, h } = prepCanvas(cv, o.height || 180), L = 46, R = 10, T = o.series.length > 1 ? 38 : 24, B = 34, pw = w - L - R, ph = h - T - B;
  const all = o.series.flatMap(s => s.values).filter(Number.isFinite), ymax = o.ymax ?? Math.max(1e-6, ...all) * 1.12, Y = v => T + ph - v / ymax * ph;
  x.font = '10.5px system-ui'; x.strokeStyle = '#ece9e3'; x.fillStyle = '#69707a';
  for (const v of niceTicks(0, ymax)) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(v, L - 5, Y(v) + 3.5); }
  const gw = pw / o.cats.length, bw = Math.min(34, gw * 0.8 / o.series.length);
  o.cats.forEach((cat, i) => {
    const x0 = L + i * gw + (gw - bw * o.series.length) / 2;
    o.series.forEach((s, k) => { const v = s.values[i]; if (!Number.isFinite(v)) return; x.fillStyle = s.colors ? s.colors[i] : s.color; x.globalAlpha = s.alpha ?? 1; x.fillRect(x0 + k * bw, Y(v), bw - 2, T + ph - Y(v)); x.globalAlpha = 1;
      x.fillStyle = '#1d232a'; x.textAlign = 'center'; x.fillText(o.fmt ? o.fmt(v) : f(v, 1), x0 + k * bw + bw / 2 - 1, Y(v) - 3); });
    x.fillStyle = '#39424c'; x.textAlign = 'center'; x.fillText(cat.length > 22 ? cat.slice(0, 21) + '…' : cat, L + i * gw + gw / 2, T + ph + 14);
  });
  x.strokeStyle = '#9aa1a9'; x.beginPath(); x.moveTo(L, T); x.lineTo(L, T + ph); x.lineTo(L + pw, T + ph); x.stroke();
  x.fillStyle = '#1d232a'; x.textAlign = 'left'; x.font = '600 11px system-ui'; x.fillText(o.title, L, 12);
  if (o.series.length > 1) { let lx = L; x.font = '10.5px system-ui'; for (const s of o.series) { x.fillStyle = s.color; x.globalAlpha = s.alpha ?? 1; x.fillRect(lx, 19, 10, 8); x.globalAlpha = 1; x.fillStyle = '#39424c'; x.fillText(s.name, lx + 13, 27); lx += x.measureText(s.name).width + 26; } }
  if (o.ylabel) { x.fillStyle = '#69707a'; x.save(); x.translate(10, T + ph / 2); x.rotate(-Math.PI / 2); x.textAlign = 'center'; x.fillText(o.ylabel, 0, 0); x.restore(); }
}
function drawSunPath(cv) {
  const { x, w, h } = prepCanvas(cv, Math.min(420, cv.clientWidth || 420)), cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 24, s = state.site, ev = state.ev;
  const P = (alt, az) => { const r = R * (90 - alt) / 90; return [cx + r * Math.sin(az * D2R), cy - r * Math.cos(az * D2R)]; };
  const m = state.heavy.mask;
  if (m) for (let e = 0; e < m.nE; e++) for (let a = 0; a < m.nA; a++) {
    const v = m.vals[e * m.nA + a]; if (v === 0) continue;
    x.fillStyle = v < 0 ? 'rgba(30,35,42,0.07)' : `rgba(64,84,112,${0.08 + 0.6 * v})`;
    const a0 = a * m.step, a1 = a0 + m.step, e0 = e * m.step, e1 = e0 + m.step, q = [P(e0, a0), P(e0, a1), P(e1, a1), P(e1, a0)];
    x.beginPath(); x.moveTo(...q[0]); for (const p of q.slice(1)) x.lineTo(...p); x.closePath(); x.fill();
  }
  x.strokeStyle = '#c9c4ba'; x.lineWidth = 0.8; x.fillStyle = '#69707a'; x.font = '10px system-ui'; x.textAlign = 'center';
  for (const a of [0, 15, 30, 45, 60, 75]) { x.beginPath(); x.arc(cx, cy, R * (90 - a) / 90, 0, 2 * Math.PI); x.stroke(); if (a) x.fillText(a + '°', cx + 2, cy - R * (90 - a) / 90 + 10); }
  for (let az = 0; az < 360; az += 30) { const p = P(0, az); x.beginPath(); x.moveTo(cx, cy); x.lineTo(...p); x.stroke(); const q = P(-9, az); x.fillStyle = '#39424c'; x.font = (az % 90 ? '' : '600 ') + '10.5px system-ui'; x.fillText(({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' })[az] || az, q[0], q[1] + 3.5); }
  const daypath = (mo, dd, style, lw) => { x.strokeStyle = style; x.lineWidth = lw; x.beginPath(); let pen = false;
    for (let t = 0; t <= 24.001; t += 1 / 12) { const sp = solarPosition(s, s.year, mo, dd, t); if (sp.alt < 0) { pen = false; continue; } const p = P(sp.alt, sp.az); pen ? x.lineTo(...p) : x.moveTo(...p); pen = true; } x.stroke(); };
  for (let mo = 1; mo <= 12; mo++) daypath(mo, 21, mo === 6 || mo === 12 ? '#c8781c' : mo === 3 || mo === 9 ? '#d7a14d' : 'rgba(200,120,28,0.35)', mo === 6 || mo === 12 ? 1.6 : 1);
  daypath(s.month, s.day, '#2f5d8a', 2);
  x.fillStyle = 'rgba(29,35,42,0.75)'; x.font = '9.5px system-ui';
  for (let hr = 5; hr <= 19; hr++) { x.strokeStyle = 'rgba(29,35,42,0.25)'; x.lineWidth = 0.7; x.beginPath(); let pen = false;
    for (let mo = 1; mo <= 12; mo++) for (const dd of [1, 15]) { const sp = solarPosition(s, s.year, mo, dd, hr); if (sp.alt < 0) { pen = false; continue; } const p = P(sp.alt, sp.az); pen ? x.lineTo(...p) : x.moveTo(...p); pen = true; } x.stroke();
    const sp = solarPosition(s, s.year, 6, 21, hr); if (sp.alt > 2) { const p = P(sp.alt, sp.az); x.fillText(hr, p[0], p[1] - 4); } }
  // façade
  const fa = s.facadeAz, t0 = P(0, fa - 90), t1 = P(0, fa + 90), nE = P(0, fa);
  x.strokeStyle = '#1d232a'; x.lineWidth = 2; x.beginPath(); x.moveTo(...t0); x.lineTo(...t1); x.stroke();
  x.lineWidth = 1.2; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(cx, cy); x.lineTo(...nE); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#1d232a'; x.font = '600 10px system-ui'; const nl = P(6, fa); x.fillText('façade normal ' + fa + '°', nl[0], nl[1]);
  if (ev && ev.up) { const p = P(ev.sp.alt, ev.sp.az); x.fillStyle = '#f5b624'; x.strokeStyle = '#8a5d00'; x.lineWidth = 1.5; x.beginPath(); x.arc(p[0], p[1], 6.5, 0, 2 * Math.PI); x.fill(); x.stroke(); }
}
function drawWindowElev(cv) {
  const ev = state.ev, W = ev.gi.W, { x, w, h } = prepCanvas(cv, 170), g = cfgA().geom;
  const sc = Math.min((w - 20) / g.facW, (h - 20) / g.facH), ox = w / 2, oy = h - 10, X = t => ox + t * sc, Y = v => oy - v * sc;
  x.fillStyle = '#ebe7df'; x.fillRect(X(-g.facW / 2), Y(g.facH), g.facW * sc, g.facH * sc);
  x.fillStyle = ev.front ? '#f4c13a' : '#8492a6'; x.fillRect(X(W.x0), Y(W.y1), (W.x1 - W.x0) * sc, (W.y1 - W.y0) * sc);
  if (ev.front && ev.rows) { x.fillStyle = '#50627a'; for (const r of ev.rows) for (const s of r.shaded) x.fillRect(X(s[0]), Y(r.y + r.dy / 2), (s[1] - s[0]) * sc, r.dy * sc + 0.5); }
  if (ev.polys) { x.save(); x.beginPath(); x.rect(X(-g.facW / 2), Y(g.facH), g.facW * sc, g.facH * sc); x.clip(); x.strokeStyle = 'rgba(29,35,42,0.45)'; x.lineWidth = 0.7;
    for (const p of ev.polys) { x.beginPath(); p.hull.forEach((q, i) => i ? x.lineTo(X(q[0]), Y(q[1])) : x.moveTo(X(q[0]), Y(q[1]))); x.closePath(); x.stroke(); } x.restore(); }
  x.strokeStyle = '#1d232a'; x.lineWidth = 1; x.strokeRect(X(W.x0), Y(W.y1), (W.x1 - W.x0) * sc, (W.y1 - W.y0) * sc);
  x.fillStyle = '#39424c'; x.font = '10px system-ui'; x.fillText('Elevation from outside · outlines = device shadow polygons on glazing plane', 6, 11);
}
function drawHeat(cv, dl, fp) {
  const g = cfgA().geom, { x, w, h } = prepCanvas(cv, 300), L = 34, T = 18, pw = w - L - 70, ph = h - T - 30, sc = Math.min(pw / g.facW, ph / g.roomD);
  const X0 = L + (pw - g.facW * sc) / 2, Y0 = T;
  const cw = g.facW * sc / dl.nx, ch = g.roomD * sc / dl.ny;
  for (let j = 0; j < dl.ny; j++) for (let i = 0; i < dl.nx; i++) { x.fillStyle = dfColor(dl.df[j * dl.nx + i]); x.fillRect(X0 + i * cw, Y0 + j * ch, cw + 0.5, ch + 0.5); }
  if (fp) { x.fillStyle = 'rgba(242,170,20,0.55)'; const fw = g.facW * sc / fp.nx, fh = g.roomD * sc / fp.ny; for (let j = 0; j < fp.ny; j++) for (let i = 0; i < fp.nx; i++) if (fp.grid[j * fp.nx + i]) x.fillRect(X0 + i * fw, Y0 + j * fh, fw + 0.3, fh + 0.3); }
  x.font = '9.5px ui-monospace,Consolas,monospace'; x.textAlign = 'center';
  if (cw > 24) for (let j = 0; j < dl.ny; j += 2) for (let i = 0; i < dl.nx; i += 2) { const v = dl.df[j * dl.nx + i]; x.fillStyle = v > 3.5 ? '#fff' : '#1d232a'; x.fillText(v.toFixed(1), X0 + (i + 0.5) * cw, Y0 + (j + 0.5) * ch + 3); }
  const W = windowRect(g); x.strokeStyle = '#1d232a'; x.lineWidth = 3; x.beginPath(); x.moveTo(X0 + (W.x0 + g.facW / 2) * sc, Y0 - 2); x.lineTo(X0 + (W.x1 + g.facW / 2) * sc, Y0 - 2); x.stroke();
  x.lineWidth = 1; x.strokeRect(X0, Y0, g.facW * sc, g.roomD * sc);
  x.fillStyle = '#39424c'; x.textAlign = 'left'; x.font = '10px system-ui'; x.fillText('window wall (top) → room depth (down) · amber = direct sun now', L, 11);
  const lx = X0 + g.facW * sc + 14; for (let k = 0; k <= 6; k++) { x.fillStyle = dfColor(k + 0.01); x.fillRect(lx, Y0 + (6 - k) * 18, 14, 18); x.fillStyle = '#39424c'; x.fillText((k === 6 ? '≥' : '') + k + ' %', lx + 18, Y0 + (6 - k) * 18 + 13); }
  x.fillText('DF', lx, Y0 + 7 * 18 + 12);
}

// ============================================================ RIGHT PANEL
const TABS = [['results', 'Results'], ['daylight', 'Daylight'], ['period', 'Period'], ['compare', 'Compare'], ['validation', 'Validation'], ['method', 'Method']];
function buildRight() {
  const tabs = $('#tabs'), panes = $('#panes');
  for (const [k, t] of TABS) {
    tabs.append(el('button', { 'data-tab': k, onclick: () => showTab(k) }, t));
    panes.append(el('div', { class: 'pane', id: 'tab-' + k }));
  }
  $('#tab-results').append(el('h3', {}, 'Solar position'), el('div', { class: 'kpis', id: 'kSolar' }), el('div', { class: 'hint', id: 'kSolarTxt' }),
    el('h3', {}, 'Sun-path diagram & façade shading mask'), el('canvas', { class: 'chart', id: 'cvSun' }), el('div', { class: 'hint', html: 'Equidistant polar projection (centre = zenith). Orange: 21st-of-month day paths (solstices bold); blue: selected date; thin lines: clock-hour lines. <span class="swatch" style="background:rgba(64,84,112,.6)"></span>window shaded fraction for a sun in that sky position (darker = more shaded) <span class="swatch" style="background:rgba(30,35,42,.15)"></span>sun behind façade.' }),
    el('h3', {}, 'Façade-relative angles'), el('div', { class: 'kpis', id: 'kFac' }),
    el('h3', {}, 'Window shading (direct beam, geometric)'), el('div', { class: 'kpis', id: 'kWin' }), el('canvas', { class: 'chart', id: 'cvWin' }), el('div', { id: 'kNotes' }),
    el('h3', {}, 'Interior direct-sun patch (floor)'), el('div', { class: 'kpis', id: 'kFloor' }),
    el('h3', {}, 'Solar radiation & heat gain (estimated)'), el('div', { id: 'kRad' }));
  $('#tab-daylight').append(el('div', { class: 'note', html: '<b>Separate from direct sun.</b> This module estimates the <i>daylight factor</i> under a CIE standard overcast sky (sun-independent). It is a simplified analytical model, <b>not</b> a validated illuminance simulation; for lux, sDA and ASE use the Radiance export.' }),
    el('h3', {}, 'Daylight-factor map (work-plane)'), el('canvas', { class: 'chart', id: 'cvHeat' }), el('div', { class: 'kpis', id: 'kDl' }), el('div', { id: 'kDlTxt' }),
    el('h3', {}, 'Estimated interior illuminance (optional)'), el('div', { id: 'kLux' }));
  buildPeriodPane(); buildComparePane(); buildValidationPane(); buildMethodPane();
  showTab(state.ui.tab);
}
function showTab(k) { state.ui.tab = k; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === k)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + k));
  if (k === 'results') { dirty.sunpath = true; dirty.instant = true; } if (k === 'daylight') renderDaylight(); if (k === 'period' && !state.lastSeries) runPeriod(); if (k === 'compare') renderConfigList(); }
const kpi = (k, v, u = '') => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}${u ? ' <small>' + u + '</small>' : ''}</div></div>`;
function refreshHeader() { const s = state.site; $('#hdrLoc').textContent = `${PRESETS[s.preset]?.name || 'Custom'} · ${f(s.lat, 4)}°, ${f(s.lon, 4)}° · UTC${s.tz >= 0 ? '+' : ''}${s.tz}${s.dst !== 'none' ? ' (DST ' + s.dst + ')' : ''} · ${ymd(dateObj())} ${hhmm(s.time)} · façade ${s.facadeAz}° · ${cfgA().name}`; }
function renderInstant() {
  const ev = state.ev, c = cfgA(), g = c.geom, sp = ev.sp, st = ev.times;
  update3D();
  $('#statusBar').innerHTML = `${ymd(dateObj())} ${hhmm(state.site.time)} (UTC${state.site.tz + sp.dst >= 0 ? '+' : ''}${state.site.tz + sp.dst}) · alt ${f(sp.alt, 2)}° · az ${f(sp.az, 2)}° · <b>${ev.status}</b> · window sunlit <b>${f(ev.sunlit * 100, 1)} %</b> · floor sunlit ${f(ev.floor.frac * 100, 1)} %`;
  if (state.ui.tab !== 'results') return;
  $('#kSolar').innerHTML = kpi('Solar altitude (apparent)', f(sp.alt, 2), '°') + kpi('Solar azimuth (cw from N)', f(sp.az, 2), '°') + kpi('Declination', f(sp.decl, 2), '°')
    + kpi('Sunrise', st.polar ? (st.polar === 'day' ? 'polar day' : 'none') : hhmm(st.sunrise)) + kpi('Sunset', st.polar ? '—' : hhmm(st.sunset)) + kpi('Solar noon', hhmm(st.noon))
    + kpi('Equation of time', f(sp.eot, 2), 'min') + kpi('Hour angle', f(sp.ha, 2), '°') + kpi('Day length', f(st.dayLength, 2), 'h');
  $('#kSolarTxt').innerHTML = `Sun vector (ENU: x East, y North, z Up) = (${ev.s.map(v => v.toFixed(4)).join(', ')}) · true solar time ${hhmm(sp.tst)} · UTC ${hhmm(sp.ut)} · ${sp.dst ? 'DST +1 h in effect' : 'standard time'} · ${ev.status}. Geometric altitude (no refraction) ${f(sp.altGeom, 3)}°.`;
  if (dirty.sunpath) { dirty.sunpath = false; drawSunPath($('#cvSun')); } else drawSunPath($('#cvSun'));
  const a = ev.ang;
  $('#kFac').innerHTML = kpi('Façade azimuth', f(state.site.facadeAz, 0), '°') + kpi('Incidence angle θ', ev.up ? f(a.incidence, 2) : '—', '°') + kpi('Sun relative to façade', !ev.up ? 'below horizon' : a.front ? 'in front' : 'behind')
    + kpi('Horizontal shadow angle', ev.front ? f(a.hsa, 2) : '—', '°') + kpi('Vertical shadow (profile) angle', ev.front ? f(a.vsa, 2) : '—', '°') + kpi('Façade tilt', f(state.site.tilt, 0), '°');
  const Aw = winArea(g);
  $('#kWin').innerHTML = kpi('Window area', f(Aw, 2), 'm²') + kpi('WWR', f(Aw / (g.facW * g.facH) * 100, 1), '%') + kpi('Exposed to direct sun', f(ev.sunlit * 100, 1), '%')
    + kpi('Shaded from direct sun', ev.front ? f((1 - ev.sunlit) * 100, 1) : '100', '%') + kpi('Sunlit glass area', f(ev.sunlit * Aw, 2), 'm²') + kpi('Shading system', SHADING_TYPES[c.type].replace('Adjustable ', '').replace(' (JSON)', ''))
    + (ev.gi.blindAngle != null ? kpi('Blind slat angle', f(ev.gi.blindAngle, 1), '°') : '');
  drawWindowElev($('#cvWin'));
  $('#kNotes').innerHTML = ev.gi.notes.map(n => `<div class="warn">${n}</div>`).join('') + (ev.front ? '' : `<div class="hint">${ev.status}: no direct beam reaches the glazing; window counted 100 % shaded from direct sun.</div>`);
  $('#kFloor').innerHTML = kpi('Sunlit floor area', f(ev.floor.area, 2), 'm²') + kpi('Of room floor area', f(ev.floor.frac * 100, 1), '%') + kpi('Direct-sun penetration depth', ev.floor.maxDepth > 0 ? f(ev.floor.maxDepth, 2) : '0', 'm')
    + `<div class="hint" style="grid-column:1/-1">Room ${f(g.facW, 2)} × ${f(g.roomD, 2)} m (floor ${f(g.facW * g.roomD, 1)} m²). Depth measured horizontally from the glazing plane, grid 0.10 m (±0.05 m). Sun patch clipped to the modelled room.</div>`;
  const r = ev.rad;
  if (!r) $('#kRad').innerHTML = `<div class="note">No radiation input. Select a source in <b>Solar radiation inputs</b> (manual DNI/DHI/GHI, EPW weather file, or ASHRAE clear-sky with site τ values). Irradiance is never inferred from solar position alone.</div>`;
  else {
    const vf = state.heavy.vf;
    $('#kRad').innerHTML = `<div class="note est">Estimated with a simplified isotropic-sky model (${ev.irr.src}): DNI ${f(ev.irr.DNI, 0)}, DHI ${f(ev.irr.DHI, 0)}, GHI ${f(ev.irr.GHI, 0)} W/m².</div>
    <table class="t"><tr><th>Quantity</th><th class="n">W/m² (façade plane)</th><th class="n">W (window ${f(Aw, 2)} m²)</th></tr>
    <tr><td>Direct beam on façade, unshaded (DNI·cosθ)</td><td class="n">${f(r.Idir, 1)}</td><td class="n">${f(r.Idir * Aw, 0)}</td></tr>
    <tr><td>Direct beam reaching glazing (× sunlit fraction)</td><td class="n">${f(r.IdirW, 1)}</td><td class="n">${f(r.IdirW * Aw, 0)}</td></tr>
    <tr><td>Sky diffuse on glazing (unshaded → shaded)</td><td class="n">${f(r.Isky0, 1)} → ${f(r.Isky, 1)}</td><td class="n">${f(r.Isky * Aw, 0)}</td></tr>
    <tr><td>Ground-reflected on glazing (unshaded → shaded)</td><td class="n">${f(r.Ignd0, 1)} → ${f(r.Ignd, 1)}</td><td class="n">${f(r.Ignd * Aw, 0)}</td></tr>
    <tr><td><b>Blocked by shading</b> — direct / diffuse</td><td class="n"></td><td class="n">${f(r.blockedDir, 0)} / ${f(r.blockedDif, 0)}</td></tr>
    <tr><td>Solar radiation transmitted (τsol·k(θ))</td><td class="n">${f(r.trans / Aw, 1)}</td><td class="n">${f(r.trans, 0)}</td></tr>
    <tr><td><b>Solar heat gain</b> (SHGC·k(θ)) — shaded</td><td class="n">${f(r.shg / Aw, 1)}</td><td class="n"><b>${f(r.shg, 0)}</b></td></tr>
    <tr><td>Solar heat gain without shading (reference)</td><td class="n">${f(r.shg0 / Aw, 1)}</td><td class="n">${f(r.shg0, 0)}</td></tr></table>
    <div class="hint">Sky view factor of glazing: ${f(vf.Fsky0, 3)} unshaded → ${f(vf.Fsky, 3)} shaded; ground ${f(vf.Fgnd0, 3)} → ${f(vf.Fgnd, 3)}. k(θ)=${f(iam(r.theta, c.glazing.b0), 3)} at θ=${f(r.theta, 1)}°. Reflection from devices into the window is not included.</div>`;
  }
}
function renderDaylight() {
  const dl = state.heavy.dl; if (!dl || state.ui.tab !== 'daylight') return;
  const c = cfgA(), g = c.geom;
  drawHeat($('#cvHeat'), dl, state.ev?.floor);
  $('#kDl').innerHTML = kpi('Mean DF (est.)', f(dl.mean, 2), '%') + kpi('Minimum DF', f(dl.min, 2), '%') + kpi('Uniformity min/mean', f(dl.uniformity, 2))
    + kpi('Area with DF ≥ 2 %', f(dl.area2 * 100, 0), '%') + kpi('Depth DF ≥ 2 % (centre line)', f(dl.depth2, 2), 'm') + kpi('Internally reflected comp.', f(dl.IRC, 2), '%')
    + kpi('BRE limiting depth', f(dl.limitDepth, 2), 'm') + kpi('Rule of thumb 2.5 × (head − work-plane)', f(dl.ruleDepth, 2), 'm') + kpi('Window sky view (shaded/unshaded)', f(dl.vf.Fsky / dl.vf.Fsky0 * 100, 0), '%');
  $('#kDlTxt').innerHTML = `<div class="hint">Window ${f(winArea(g), 2)} m², WWR ${f(winArea(g) / (g.facW * g.facH) * 100, 1)} %, VT ${c.glazing.vt}. Room ${g.facW}×${g.roomD}×${g.facH} m, mean reflectance R = ${f(dl.R, 2)}. Room depth ${g.roomD > dl.limitDepth ? '<b>exceeds</b>' : 'is within'} the BRE limiting depth (L/W + L/H ≤ 2/(1−R<sub>b</sub>)).</div>
  <div class="note est"><b>Assumptions.</b> Sky component + externally reflected component by numerical integration over the window aperture (16×12 samples, 0.25 m grid) for a CIE overcast sky L(γ)=L<sub>z</sub>(1+2 sinγ)/3; obstructing devices are diffuse surfaces with luminance ρ·0.4·E<sub>h</sub>/π (vertical illuminance ≈ 0.4 E<sub>h</sub> under overcast sky). Internally reflected component: BRE split-flux (Hopkinson) with 0.85 replaced by VT and C scaled by the window's shaded/unshaded sky-view ratio. Glazing VT applied at normal incidence; frames, dirt, interior reveals and furniture ignored. Accuracy typically ±20–30 % vs. ray-tracing for simple rooms; not suitable for compliance.</div>`;
  const lux = el('div', {});
  const inp = el('input', { type: 'number', min: 0, step: 100, placeholder: 'e.g. measured diffuse horizontal illuminance' }); inp.value = state.site.Eout || '';
  const out = el('div', { class: 'hint' });
  const upd = () => { const E = +inp.value; state.site.Eout = inp.value; out.innerHTML = E > 0 ? `Mean ≈ <b>${f(dl.mean / 100 * E, 0)} lux</b>, minimum ≈ ${f(dl.min / 100 * E, 0)} lux (E<sub>in</sub> = DF × E<sub>out</sub>; overcast-sky only — no direct sun, no clear-sky luminance distribution).` : 'Enter an outdoor unobstructed horizontal diffuse illuminance (lux) to scale DF to an overcast-sky illuminance estimate. No default is assumed.'; };
  inp.addEventListener('input', upd); upd();
  lux.append(el('div', { class: 'row' }, el('label', {}, 'Outdoor horizontal diffuse illuminance E', el('span', { class: 'u' }, 'lux')), inp), out,
    el('div', { class: 'note' }, 'For illuminance in lux under real skies, sDA (300 lux / 50 %) and ASE (1000 lux / 250 h), use “Export Radiance” in the header and the documented Radiance / Honeybee workflow (Method tab).'));
  $('#kLux').replaceChildren(lux);
}

// ======================================================= PERIOD ANALYSIS
function dateSet(kind, year, step = 1) {
  if (kind === 'current') return [{ ...dateObj(), label: ymd(dateObj()) }];
  if (kind === 'design') return [{ y: year, m: 6, d: 21, label: 'June solstice (21 Jun)' }, { y: year, m: 3, d: 20, label: 'Equinox (20 Mar)' }, { y: year, m: 12, d: 21, label: 'December solstice (21 Dec)' }];
  const out = [], N = daysInYear(year); for (let k = 1; k <= N; k += step) { const d = dateFromDoy(year, k); out.push({ ...d, label: ymd(d), w: Math.min(step, N - k + 1) }); } return out;
}
const yieldUI = () => new Promise(r => setTimeout(r, 0));
async function runSeries(cfg, dates, stepMin, opt = {}) {
  const s = state.site, F = siteF(), gi = buildGeometry(cfg, null), vf = diffuseViewFactors(F, gi, 6, 16), Aw = winArea(cfg.geom);
  const dt = stepMin / 60, n = Math.round(24 / dt), out = []; let tick = performance.now();
  const ase = opt.ase ? { counts: null, nx: 0, ny: 0 } : null;
  for (let di = 0; di < dates.length; di++) {
    const D = dates[di], wgt = D.w || 1, rows = [];
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) * dt, ev = evaluate(cfg, s, D, t, { F, gi, rows: opt.rows || 120, floorCell: opt.floorCell || 0.2 });
      const irr = s.radSource === 'manual' ? null : irradianceAt(D, t, ev.sp);
      const r = irr ? radiation(irr, ev.up, ev.sL, ev.sunlit, vf, cfg.glazing, s.rhoG, Aw, s.tilt) : null;
      rows.push({ t, alt: ev.sp.alt, az: ev.sp.az, inc: ev.up ? ev.ang.incidence : NaN, hsa: ev.front ? ev.ang.hsa : NaN, vsa: ev.front ? ev.ang.vsa : NaN, up: ev.up, front: ev.front,
        sunlit: ev.sunlit, floorPct: ev.floor.frac * 100, depth: ev.floor.maxDepth, blind: ev.gi.blindAngle, r });
      if (ase && ev.front) { const fp = ev.floor, std = t - ev.sp.dst; if (!ase.counts) { ase.counts = new Float32Array(fp.nx * fp.ny); ase.nx = fp.nx; ase.ny = fp.ny; }
        if (std >= 8 && std < 18) for (let q = 0; q < fp.grid.length; q++) if (fp.grid[q]) ase.counts[q] += dt * wgt; }
    }
    out.push({ date: D, rows, w: wgt });
    if (performance.now() - tick > 40) { opt.progress && opt.progress((di + 1) / dates.length); await yieldUI(); tick = performance.now(); }
  }
  return { cfg, series: out, dt, Aw, ase, hasRad: out.some(o => o.rows.some(r => r.r)) };
}
function summarize(res) {
  const S = { front: 0, sunHrs: 0, eq: 0, floorWt: 0, inc: 0, bDir: 0, bDif: 0, shg: 0, shg0: 0, trans: 0, days: 0 }, dt = res.dt;
  for (const d of res.series) { S.days += d.w; for (const r of d.rows) { const k = dt * d.w;
    if (r.front) { S.front += k; S.eq += r.sunlit * k; S.floorWt += r.floorPct * k; }
    if (r.sunlit > 0.01) S.sunHrs += k;
    if (r.r) { S.inc += res.Aw * r.r.Idir * k / 1000; S.bDir += r.r.blockedDir * k / 1000; S.bDif += r.r.blockedDif * k / 1000; S.shg += r.r.shg * k / 1000; S.shg0 += r.r.shg0 * k / 1000; S.trans += r.r.trans * k / 1000; } } }
  S.exposure = S.front ? S.eq / S.front * 100 : 0; S.shaded = S.front ? 100 - S.exposure : NaN; S.floorMean = S.front ? S.floorWt / S.front : 0;
  return S;
}
function buildPeriodPane() {
  const p = $('#tab-period');
  const ds = el('select', {}, el('option', { value: 'current' }, 'Selected date'), el('option', { value: 'design' }, 'Design days: June solstice, equinox, December solstice'), el('option', { value: 'annual' }, 'Annual (every day)'));
  ds.value = state.periodSet; ds.addEventListener('change', () => { state.periodSet = ds.value; if (ds.value !== 'annual') runPeriod(); });
  const astep = el('select', {}, ...[1, 3, 7, 14].map(v => el('option', { value: v }, v === 1 ? 'every day' : 'every ' + v + ' days')));
  astep.value = state.annualStep; astep.addEventListener('change', () => { state.annualStep = +astep.value; });
  const auto = el('input', { type: 'checkbox' }); auto.checked = state.ui.autoPeriod; auto.addEventListener('change', () => { state.ui.autoPeriod = auto.checked; });
  p.append(el('div', { class: 'row' }, el('label', {}, 'Dates'), ds), el('div', { class: 'flex' }, el('span', { class: 'hint' }, 'Annual sampling'), astep, el('label', { class: 'hint' }, auto, ' auto-update (non-annual)'),
    el('button', { class: 'btn primary', onclick: () => runPeriod() }, 'Run analysis')), el('div', { class: 'prog' }, el('div', { id: 'pProg' })),
    el('div', { class: 'hint', id: 'pInfo' }), el('div', { id: 'pOut' }));
}
let periodRun = 0;
async function runPeriod() {
  const my = ++periodRun, c = cfgA(), s = state.site, dates = dateSet(state.periodSet, s.year, state.annualStep), annual = state.periodSet === 'annual';
  const bar = $('#pProg'); bar.style.width = '0';
  const res = await runSeries(c, dates, annual ? Math.max(s.step, 30) : s.step, { rows: annual ? 80 : 160, floorCell: annual ? 0.25 : 0.15, ase: annual, progress: p => { if (my === periodRun) bar.style.width = (p * 100) + '%'; } });
  if (my !== periodRun) return; bar.style.width = '100%';
  state.lastSeries = [res];
  $('#pInfo').innerHTML = `<b>${c.name}</b> · ${SHADING_TYPES[c.type]} · ${dates.length} day(s) · step ${f(res.dt * 60, 0)} min (values at step mid-points) · façade ${s.facadeAz}° · radiation: ${res.hasRad ? (s.radSource === 'epw' ? 'EPW hourly' : 'ASHRAE clear-sky (user τ)') : 'none'}${s.radSource === 'manual' ? ' (manual values are instantaneous only)' : ''}.`;
  const out = $('#pOut'); out.replaceChildren();
  const S = summarize(res);
  out.append(el('div', { class: 'kpis', html: kpi('Sun-in-front hours', f(S.front / S.days, 2), 'h/day') + kpi('Hours with sun on window (>1 %)', f(S.sunHrs / S.days, 2), 'h/day') + kpi('Equivalent full-sun hours', f(S.eq / S.days, 2), 'h/day')
    + kpi('Direct-sun exposure (sun in front)', f(S.exposure, 1), '%') + kpi('Shaded window (sun in front)', f(S.shaded, 1), '%') + kpi('Mean sunlit floor (sun in front)', f(S.floorMean, 1), '%')
    + (res.hasRad ? kpi('Direct radiation blocked (period total)', f(S.bDir, 2), 'kWh') + kpi('Solar heat gain, est. (period total)', f(S.shg, 2), 'kWh') + kpi('SHG reduction vs unshaded', f((1 - S.shg / S.shg0) * 100, 1), '%') : '') }));
  if (!annual) {
    const xs = { xmin: 0, xmax: 24, xticks: [0, 3, 6, 9, 12, 15, 18, 21, 24], xfmt: v => v + 'h', xlabel: 'local clock time (h)', marker: state.periodSet === 'current' ? s.time : null };
    const sty = ['#c8781c', '#3f8f6b', '#2f5d8a'];
    const ser = (fn, extra = {}) => res.series.map((d, i) => ({ name: d.date.label, color: sty[i % 3], data: d.rows.map(r => [r.t, fn(r)]), ...extra }));
    const mk = (title, o) => { const cv = el('canvas', { class: 'chart' }); out.append(cv); requestAnimationFrame(() => lineChart(cv, { title, ...xs, ...o })); };
    mk('Solar altitude (°) — solid · azimuth (°, right axis) — dashed', { series: [...ser(r => r.up ? r.alt : NaN), ...ser(r => r.up ? r.az : NaN, { dash: [4, 3], width: 1.2, right: true })].map((x, i) => i >= res.series.length ? { ...x, name: '' } : x), ymin: 0, ymax: 90, right: { min: 0, max: 360 } });
    mk('Window shaded from direct sun (% of window, sun in front)', { series: ser(r => r.front ? (1 - r.sunlit) * 100 : NaN), ymin: 0, ymax: 100, ylabel: '%' });
    mk('Direct solar exposure of window (% sunlit)', { series: ser(r => r.sunlit * 100), ymin: 0, ymax: 100, ylabel: '%' });
    mk('Sunlit floor area (% of room floor)', { series: ser(r => r.floorPct), ymin: 0, ylabel: '%' });
    if (res.hasRad) { mk('Estimated solar heat gain through window (W) — shaded solid, unshaded dashed', { series: [...ser(r => r.r ? r.r.shg : NaN), ...ser(r => r.r ? r.r.shg0 : NaN, { dash: [4, 3], width: 1.2 })].map((x, i) => i >= res.series.length ? { ...x, name: '' } : x), ylabel: 'W' });
      mk('Direct beam on façade, unshaded (W/m²)', { series: ser(r => r.r ? r.r.Idir : NaN), ylabel: 'W/m²' }); }
    else out.append(el('div', { class: 'note' }, 'Heat-gain charts need hourly radiation: load an EPW file or enter site τb/τd for the ASHRAE clear-sky model.'));
  } else renderAnnual(res, out);
}
function renderAnnual(res, out) {
  const cv = el('canvas', { class: 'chart' }); out.append(el('h3', {}, 'Annual window sunlit fraction (day × time)'), cv);
  requestAnimationFrame(() => {
    const { x, w, h } = prepCanvas(cv, 230), L = 36, T = 10, B = 26, pw = w - L - 10, ph = h - T - B, nd = res.series.length, nk = res.series[0].rows.length;
    for (let i = 0; i < nd; i++) for (let k = 0; k < nk; k++) { const r = res.series[i].rows[k]; x.fillStyle = !r.up ? '#2a3038' : !r.front ? '#6b7480' : `rgb(${Math.round(80 + 165 * r.sunlit)},${Math.round(98 + 92 * r.sunlit)},${Math.round(122 - 82 * r.sunlit)})`;
      x.fillRect(L + i / nd * pw, T + k / nk * ph, pw / nd + 0.6, ph / nk + 0.6); }
    x.fillStyle = '#39424c'; x.font = '10px system-ui'; x.textAlign = 'right'; for (const hr of [0, 6, 12, 18, 24]) x.fillText(hr + 'h', L - 4, T + hr / 24 * ph + 3);
    x.textAlign = 'center'; 'JFMAMJJASOND'.split('').forEach((m, i) => x.fillText(m, L + (dayOfYear(2026, i + 1, 15) / 365) * pw, T + ph + 13));
    x.textAlign = 'left'; x.fillText('dark = night · grey = sun behind façade · blue→amber = shaded→sunlit', L, h - 2);
  });
  if (res.ase && res.ase.counts) {
    const a = res.ase, n = a.counts.length; let over = 0, mx = 0; for (const v of a.counts) { if (v > 250) over++; mx = Math.max(mx, v); }
    const cv2 = el('canvas', { class: 'chart' });
    out.append(el('h3', {}, 'Annual direct-sun hours on floor (08–18 h standard time)'), cv2,
      el('div', { class: 'kpis', html: kpi('Floor area > 250 h direct sun', f(over / n * 100, 1), '%') + kpi('Max. hours at a floor point', f(mx, 0), 'h') }),
      el('div', { class: 'note est' }, 'Geometric, clear-sky potential: every hour with the sun in front of the façade counts, weather ignored, floor-level grid 0.25 m. It indicates where LM-83 ASE (1000 lux direct, 250 h) could be exceeded but is not ASE. Use EPW-driven Radiance for ASE.'));
    requestAnimationFrame(() => {
      const g = res.cfg.geom, { x, w, h } = prepCanvas(cv2, 210), sc = Math.min((w - 90) / g.facW, (h - 24) / g.roomD), X0 = 20, Y0 = 14, cw = g.facW * sc / a.nx, ch = g.roomD * sc / a.ny;
      for (let j = 0; j < a.ny; j++) for (let i = 0; i < a.nx; i++) { const v = a.counts[j * a.nx + i]; x.fillStyle = v <= 0 ? '#f3f0e9' : v > 250 ? `rgba(180,68,47,${0.35 + 0.65 * Math.min(1, v / Math.max(mx, 251))})` : `rgba(233,169,27,${0.15 + 0.7 * v / 250})`; x.fillRect(X0 + i * cw, Y0 + j * ch, cw + 0.4, ch + 0.4); }
      x.strokeStyle = '#1d232a'; x.strokeRect(X0, Y0, g.facW * sc, g.roomD * sc); x.lineWidth = 3; const W = windowRect(g); x.beginPath(); x.moveTo(X0 + (W.x0 + g.facW / 2) * sc, Y0 - 2); x.lineTo(X0 + (W.x1 + g.facW / 2) * sc, Y0 - 2); x.stroke();
      x.fillStyle = '#39424c'; x.font = '10px system-ui'; const lx = X0 + g.facW * sc + 10; x.fillStyle = 'rgba(233,169,27,0.6)'; x.fillRect(lx, 20, 12, 12); x.fillStyle = '#39424c'; x.fillText('≤ 250 h', lx + 16, 30);
      x.fillStyle = 'rgba(180,68,47,0.9)'; x.fillRect(lx, 40, 12, 12); x.fillStyle = '#39424c'; x.fillText('> 250 h', lx + 16, 50); x.fillText('window wall', X0, 10);
    });
  }
}

// ============================================================ COMPARISON
function buildComparePane() {
  const p = $('#tab-compare');
  const ds = el('select', {}, el('option', { value: 'current' }, 'Selected date'), el('option', { value: 'design' }, 'Design days (solstices + equinox)'), el('option', { value: 'annual' }, 'Annual (every 7th day, scaled)'));
  ds.value = state.compareSet; ds.addEventListener('change', () => { state.compareSet = ds.value; });
  p.append(el('div', { class: 'note' }, 'Configurations share site, date, time, orientation and radiation inputs; each stores its own geometry, shading system, material and glazing. Editing in the left panel always edits the active (highlighted) configuration.'),
    el('div', { class: 'btnrow' }, el('button', { class: 'btn', onclick: () => newConfig(false) }, 'New (defaults)'), el('button', { class: 'btn', onclick: () => newConfig(true) }, 'Duplicate active'),
      el('button', { class: 'btn', onclick: resetActive }, 'Reset active'), el('button', { class: 'btn', onclick: deleteActive }, 'Delete active'), el('button', { class: 'btn', onclick: resetAll }, 'Restore A–D examples')),
    el('div', { class: 'cfglist', id: 'cfgList' }),
    el('div', { class: 'row' }, el('label', {}, 'Comparison period'), ds),
    el('div', { class: 'btnrow' }, el('button', { class: 'btn primary', onclick: runCompare }, 'Run comparison'), el('button', { class: 'btn', onclick: exportParams }, 'Parameter table CSV'), el('button', { class: 'btn', onclick: exportSeries }, 'Time-series CSV')),
    el('div', { class: 'prog' }, el('div', { id: 'cProg' })), el('div', { id: 'cOut' }), el('h3', {}, 'Parameter table'), el('div', { id: 'cTable', style: 'overflow-x:auto' }));
  renderConfigList();
}
function renderConfigList() {
  const L = $('#cfgList'); if (!L) return; L.replaceChildren();
  state.configs.forEach((c, i) => {
    const cb = el('input', { type: 'checkbox', title: 'Include in comparison' }); cb.checked = c.include !== false; cb.addEventListener('change', () => { c.include = cb.checked; persist(); });
    const nm = el('input', { type: 'text', value: c.name }); nm.addEventListener('input', () => { c.name = nm.value; persist(); refreshHeader(); });
    const item = el('div', { class: 'item' + (c.id === state.activeId ? ' active' : '') }, cb, el('div', {}, nm, el('div', { class: 'ty' }, el('span', { class: 'swatch', style: 'background:' + COLORS[i % COLORS.length] }), SHADING_TYPES[c.type])),
      el('button', { class: 'btn', onclick: () => { state.activeId = c.id; refreshControls(); changed('geom'); dirty.heavy = true; renderConfigList(); renderParamTable(); } }, c.id === state.activeId ? 'Active' : 'Edit'));
    L.append(item);
  });
  renderParamTable();
}
function newConfig(dup) { const c = dup ? mergeDeep(defaultConfig(), JSON.parse(JSON.stringify(cfgA()))) : defaultConfig('New option', 'none'); c.id = 'c' + Date.now().toString(36) + (uid++); c.name = dup ? cfgA().name + ' (copy)' : 'Option ' + String.fromCharCode(65 + state.configs.length); c.include = true; state.configs.push(c); state.activeId = c.id; afterCfgChange(); }
function resetActive() { const c = cfgA(), fresh = defaultConfig(c.name, c.type); fresh.id = c.id; Object.assign(c, fresh); afterCfgChange(); }
function deleteActive() { if (state.configs.length <= 1) return; state.configs = state.configs.filter(c => c.id !== state.activeId); state.activeId = state.configs[0].id; afterCfgChange(); }
function resetAll() { state.configs = defaultConfigs(); state.activeId = state.configs[1].id; afterCfgChange(); }
function afterCfgChange() { refreshControls(); changed('geom'); dirty.heavy = true; renderConfigList(); }
function paramRows(cfgs) {
  const rows = [['General', 'Shading system', '', cfgs.map(c => SHADING_TYPES[c.type])]];
  const grp = { geom: 'Geometry', overhang: 'Overhang', hlouver: 'Horizontal louvers', vfin: 'Vertical fins', eggcrate: 'Egg-crate', blinds: 'Blinds', material: 'Material', glazing: 'Glazing', room: 'Room' };
  for (const [g, list] of Object.entries(PARAMS)) for (const p of list) {
    const vals = cfgs.map(c => (['geom', 'material', 'glazing', 'room'].includes(g) || TYPE_GROUPS[c.type].includes(g)) ? +(+c[g][p[0]]).toFixed(4) : '—');
    if (vals.every(v => v === '—')) continue; rows.push([grp[g], p[1], p[2], vals]);
    if (g === 'blinds' && p[0] === 'slatW') rows.push(['Blinds', 'Control mode', '', cfgs.map(c => TYPE_GROUPS[c.type].includes('blinds') ? c.blinds.mode : '—')]);
  }
  rows.push(['Derived', 'Window area', 'm²', cfgs.map(c => +winArea(c.geom).toFixed(3))], ['Derived', 'WWR', '%', cfgs.map(c => +(winArea(c.geom) / (c.geom.facW * c.geom.facH) * 100).toFixed(2))]);
  if (cfgs.some(c => c.type === 'custom')) rows.push(['Custom', 'Geometry JSON', '', cfgs.map(c => c.type === 'custom' ? c.custom.json.replace(/\s+/g, '') : '—')]);
  return rows;
}
function renderParamTable() {
  const T = $('#cTable'); if (!T) return; const cfgs = state.configs, rows = paramRows(cfgs);
  T.innerHTML = `<table class="t"><tr><th>Group</th><th>Parameter</th>${cfgs.map((c, i) => `<th class="n"><span class="swatch" style="background:${COLORS[i % COLORS.length]}"></span>${c.name}</th>`).join('')}</tr>` +
    rows.map(r => { const uniq = new Set(r[3].map(String)); return `<tr class="${uniq.size > 1 ? 'diff' : ''}"><td>${r[0]}</td><td>${r[1]}${r[2] ? ' (' + r[2] + ')' : ''}</td>${r[3].map(v => `<td class="n">${String(v).length > 40 ? String(v).slice(0, 38) + '…' : v}</td>`).join('')}</tr>`; }).join('') + '</table><div class="hint">Highlighted rows differ between configurations.</div>';
}
async function runCompare() {
  const cfgs = state.configs.filter(c => c.include !== false); if (!cfgs.length) return;
  const s = state.site, annual = state.compareSet === 'annual', dates = dateSet(state.compareSet, s.year, 7), bar = $('#cProg'), out = $('#cOut');
  out.innerHTML = '<div class="hint">Running…</div>'; bar.style.width = '0';
  const results = [];
  for (let i = 0; i < cfgs.length; i++) {
    const r = await runSeries(cfgs[i], dates, annual ? Math.max(30, s.step) : s.step, { rows: annual ? 80 : 140, floorCell: 0.25, progress: p => bar.style.width = ((i + p) / cfgs.length * 100) + '%' });
    const F = siteF(), gi = buildGeometry(cfgs[i], null); r.dl = daylightFactor(cfgs[i], F, gi, { cell: 0.3, ns: 12, nw: 9 }); r.S = summarize(r); results.push(r);
    bar.style.width = ((i + 1) / cfgs.length * 100) + '%'; await yieldUI();
  }
  state.lastSeries = results; state.lastCompare = results;
  out.replaceChildren();
  const cats = results.map(r => r.cfg.name), cols = results.map(r => COLORS[state.configs.indexOf(r.cfg) % COLORS.length]), perDay = v => v / results[0].S.days;
  out.append(el('div', { class: 'hint' }, `${dates.length} day(s)${annual ? ' (weekly sample, scaled to 365 days)' : ''}, step ${f(results[0].dt * 60, 0)} min, façade ${s.facadeAz}°. Hours and energy are ${annual ? 'annual totals' : 'per day (average over selected days)'}.`));
  const mk = (title, series, o = {}) => { const cv = el('canvas', { class: 'chart' }); out.append(cv); requestAnimationFrame(() => barChart(cv, { title, cats, series, ...o })); };
  const sc = v => annual ? v : perDay(v);
  mk('Window direct-sun exposure (% of window, while sun in front)', [{ name: 'exposure', colors: cols, values: results.map(r => r.S.exposure) }], { ymax: 100, ylabel: '%' });
  mk('Shaded window area (% of window, while sun in front)', [{ name: 'shaded', colors: cols, values: results.map(r => r.S.shaded) }], { ymax: 100, ylabel: '%' });
  mk('Direct sunlight hours on window' + (annual ? ' (h/yr)' : ' (h/day)'), [{ name: 'any sun (>1 %)', color: '#c8781c', values: results.map(r => sc(r.S.sunHrs)) }, { name: 'equivalent full-sun', color: '#2f5d8a', values: results.map(r => sc(r.S.eq)) }], { ylabel: 'h' });
  if (results[0].hasRad) {
    mk('Estimated solar radiation blocked by shading (kWh' + (annual ? '/yr)' : '/day)'), [{ name: 'direct', color: '#c8781c', values: results.map(r => sc(r.S.bDir)) }, { name: 'diffuse', color: '#7b8aa0', values: results.map(r => sc(r.S.bDif)) }], { ylabel: 'kWh', fmt: v => f(v, 2) });
    mk('Estimated solar heat gain through window (kWh' + (annual ? '/yr)' : '/day)'), [{ name: 'with shading', color: '#47505a', colors: cols, values: results.map(r => sc(r.S.shg)) }, { name: 'unshaded reference', color: '#9aa1a9', alpha: 0.55, values: results.map(r => sc(r.S.shg0)) }], { ylabel: 'kWh', fmt: v => f(v, 2) });
  } else out.append(el('div', { class: 'note' }, 'Radiation-blocked and heat-gain comparisons need an EPW file or the ASHRAE clear-sky model with site τ values (Solar radiation inputs).'));
  mk('Daylight: mean daylight factor (CIE overcast, estimated)', [{ name: 'mean DF', colors: cols, values: results.map(r => r.dl.mean) }], { ylabel: '%', fmt: v => f(v, 2) });
  mk('Daylight: floor area with DF ≥ 2 % (estimated)', [{ name: 'area', colors: cols, values: results.map(r => r.dl.area2 * 100) }], { ymax: 100, ylabel: '%', fmt: v => f(v, 0) });
  if (!annual) { const cv = el('canvas', { class: 'chart' }); out.append(cv);
    requestAnimationFrame(() => lineChart(cv, { title: `Window sunlit fraction — ${results[0].series[0].date.label}`, xmin: 0, xmax: 24, xticks: [0, 3, 6, 9, 12, 15, 18, 21, 24], xfmt: v => v + 'h', ymin: 0, ymax: 100, ylabel: '%', legend: true,
      series: results.map((r, i) => ({ name: r.cfg.name, color: cols[i], data: r.series[0].rows.map(q => [q.t, q.sunlit * 100]) })) })); }
  const tbl = `<h3>Summary</h3><table class="t"><tr><th>Configuration</th><th class="n">Exposure %</th><th class="n">Shaded %</th><th class="n">Sun h</th><th class="n">Eq. h</th><th class="n">Floor %</th>${results[0].hasRad ? '<th class="n">Blocked kWh</th><th class="n">SHG kWh</th>' : ''}<th class="n">Mean DF %</th></tr>` +
    results.map((r, i) => `<tr><td><span class="swatch" style="background:${cols[i]}"></span>${r.cfg.name}</td><td class="n">${f(r.S.exposure, 1)}</td><td class="n">${f(r.S.shaded, 1)}</td><td class="n">${f(sc(r.S.sunHrs), 2)}</td><td class="n">${f(sc(r.S.eq), 2)}</td><td class="n">${f(r.S.floorMean, 1)}</td>${r.hasRad ? `<td class="n">${f(sc(r.S.bDir + r.S.bDif), 2)}</td><td class="n">${f(sc(r.S.shg), 2)}</td>` : ''}<td class="n">${f(r.dl.mean, 2)}</td></tr>`).join('') + '</table>';
  out.insertAdjacentHTML('beforeend', tbl);
  if (annual) for (const r of results) for (const d of r.series) d.w = 7;
  renderParamTable();
}

// ================================================================ EXPORT
function exportParams() {
  const rows = paramRows(state.configs);
  download('shading_parameters.csv', toCSV([['group', 'parameter', 'unit', ...state.configs.map(c => c.name)], ...rows.map(r => [r[0], r[1], r[2], ...r[3]]),
    [], ['site', 'latitude', '°', state.site.lat], ['site', 'longitude', '°', state.site.lon], ['site', 'UTC offset', 'h', state.site.tz], ['site', 'DST rule', '', state.site.dst],
    ['site', 'façade azimuth', '°', state.site.facadeAz], ['site', 'façade tilt', '°', state.site.tilt], ['site', 'radiation source', '', state.site.radSource]]));
}
function exportSeries() {
  const res = state.lastSeries; if (!res) { $('#statusBar').innerHTML = '<b>Run a period analysis or comparison first, then export the time-series.</b>'; return; }
  const H = ['configuration', 'shading_system', 'date', 'clock_time_h', 'solar_altitude_deg', 'solar_azimuth_deg', 'incidence_deg', 'HSA_deg', 'VSA_deg', 'sun_in_front', 'window_sunlit_frac', 'window_shaded_frac',
    'floor_sunlit_pct', 'penetration_depth_m', 'blind_angle_deg', 'DNI_Wm2', 'DHI_Wm2', 'GHI_Wm2', 'direct_on_facade_Wm2', 'direct_on_glazing_Wm2', 'blocked_direct_W', 'blocked_diffuse_W', 'transmitted_W', 'SHG_W', 'SHG_unshaded_W'];
  const rows = [H];
  for (const r of res) for (const d of r.series) for (const q of d.rows) {
    const R = q.r;
    rows.push([r.cfg.name, r.cfg.type, ymd(d.date), q.t.toFixed(4), q.alt.toFixed(4), q.az.toFixed(4), f(q.inc, 4), f(q.hsa, 4), f(q.vsa, 4), q.front ? 1 : 0, q.sunlit.toFixed(5), (q.front ? 1 - q.sunlit : 1).toFixed(5),
      q.floorPct.toFixed(3), q.depth.toFixed(3), q.blind == null ? '' : q.blind.toFixed(2), ...(R ? [] : ['', '', '', '', '', '', '', '', '', '']),
      ...(R ? [null, null, null, R.Idir.toFixed(2), R.IdirW.toFixed(2), R.blockedDir.toFixed(2), R.blockedDif.toFixed(2), R.trans.toFixed(2), R.shg.toFixed(2), R.shg0.toFixed(2)] : [])]);
  }
  // fill DNI/DHI/GHI columns from source for transparency
  let i = 1; for (const r of res) for (const d of r.series) for (const q of d.rows) { if (q.r) { const sp = solarPosition(state.site, d.date.y, d.date.m, d.date.d, q.t), irr = irradianceAt(d.date, q.t, sp); rows[i][15] = f(irr?.DNI, 1); rows[i][16] = f(irr?.DHI, 1); rows[i][17] = f(irr?.GHI, 1); } i++; }
  download('shading_timeseries.csv', toCSV(rows).replace(/,—/g, ','));
}
function exportRadiance() {
  const c = cfgA(), g = c.geom, s = state.site, F = siteF(), gi = buildGeometry(c, state.ev?.sL), W = gi.W, d = Math.max(0, g.reveal);
  const vt = c.glazing.vt, tn = (Math.sqrt(0.8402528435 + 0.0072522239 * vt * vt) - 0.9166530661) / 0.0036261119 / vt;
  const P = p => toWorld(p, F).map(v => v.toFixed(4)).join(' ');
  let n = 0; const lines = [];
  const poly = (mat, pts) => { lines.push(`${mat} polygon p${++n}\n0\n0\n${pts.length * 3}\n${pts.map(p => '  ' + p).join('\n')}\n`); };
  const box = (mat, b) => { const v = (i, j, k) => [0, 1, 2].map(q => b.c[q] + i * b.h[0] * b.ax[0][q] + j * b.h[1] * b.ax[1][q] + k * b.h[2] * b.ax[2][q]);
    const faces = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]];
    for (const fc of faces) poly(mat, fc.map(q => P(v(...q)))); };
  const floorPt = (a, b, z) => { const w = [a * F.t[0] - (d + b) * F.nh[0], a * F.t[1] - (d + b) * F.nh[1], z]; return w.map(v => v.toFixed(4)).join(' '); };
  const hw = g.facW / 2, D = g.roomD, H = g.facH;
  lines.push(`# Radiance scene exported by Solar Shading & Daylight Simulator\n# Coordinates: x = East, y = North, z = Up (metres). Façade azimuth ${s.facadeAz}°, tilt ${s.tilt}°. Config: ${c.name} (${SHADING_TYPES[c.type]})\n`,
    `void plastic wall_ext 0 0 5 0.5 0.5 0.5 0 0\nvoid plastic floor_mat 0 0 5 ${c.room.floor} ${c.room.floor} ${c.room.floor} 0 0\nvoid plastic wall_int 0 0 5 ${c.room.wall} ${c.room.wall} ${c.room.wall} 0 0\nvoid plastic ceil_mat 0 0 5 ${c.room.ceil} ${c.room.ceil} ${c.room.ceil} 0 0\nvoid glass glazing 0 0 3 ${tn.toFixed(4)} ${tn.toFixed(4)} ${tn.toFixed(4)}\nvoid plastic shade_mat 0 0 5 ${c.material.refl} ${c.material.refl} ${c.material.refl} 0 0\nvoid plastic ground_mat 0 0 5 ${s.rhoG} ${s.rhoG} ${s.rhoG} 0 0\n`);
  const wt = Math.max(d, 0.05);
  for (const b of [rb(-hw, W.x0, 0, H, -wt, 0), rb(W.x1, hw, 0, H, -wt, 0), rb(W.x0, W.x1, 0, W.y0, -wt, 0), rb(W.x0, W.x1, W.y1, H, -wt, 0)]) if (b.h[0] > 1e-4 && b.h[1] > 1e-4) box('wall_ext', b);
  poly('glazing', [P([W.x0, W.y0, gi.ng]), P([W.x1, W.y0, gi.ng]), P([W.x1, W.y1, gi.ng]), P([W.x0, W.y1, gi.ng])]);
  for (const b of gi.dev) box('shade_mat', b);
  poly('floor_mat', [floorPt(-hw, 0, 0), floorPt(-hw, D, 0), floorPt(hw, D, 0), floorPt(hw, 0, 0)].reverse());
  poly('ceil_mat', [floorPt(-hw, 0, H), floorPt(-hw, D, H), floorPt(hw, D, H), floorPt(hw, 0, H)]);
  poly('wall_int', [floorPt(-hw, D, 0), floorPt(-hw, D, H), floorPt(hw, D, H), floorPt(hw, D, 0)].reverse());
  poly('wall_int', [floorPt(-hw, 0, 0), floorPt(-hw, 0, H), floorPt(-hw, D, H), floorPt(-hw, D, 0)].reverse());
  poly('wall_int', [floorPt(hw, 0, 0), floorPt(hw, 0, H), floorPt(hw, D, H), floorPt(hw, D, 0)]);
  lines.push(`ground_mat ring groundplane\n0\n0\n8\n  0 0 -0.01\n  0 0 1\n  0 60\n`);
  const pts = []; const cell = 0.5;
  for (let j = 0; j < Math.round(D / cell); j++) for (let i = 0; i < Math.round(g.facW / cell); i++) pts.push(`${floorPt(-hw + (i + 0.5) * cell, (j + 0.5) * cell, g.wp)} 0 0 1`);
  const lonW = (-s.lon).toFixed(4), merW = (-s.tz * 15).toFixed(2);
  const sh = `#!/bin/sh
# Radiance workflow for the exported scene (requires Radiance 5.x: https://www.radiance-online.org)
# Note Radiance sign convention: longitude and meridian are POSITIVE WEST.
# 1) Daylight factor under CIE overcast sky (10 000 lux unobstructed horizontal)
gensky ${s.month} ${s.day} 12 -c -a ${s.lat} -o ${lonW} -m ${merW} -B 55.866 > sky_overcast.rad
cat >> sky_overcast.rad << 'EOF'
skyfunc glow sky_glow 0 0 4 1 1 1 0
sky_glow source sky 0 0 4 0 0 1 180
skyfunc glow ground_glow 0 0 4 1 1 1 0
ground_glow source ground 0 0 4 0 0 -1 180
EOF
oconv sky_overcast.rad scene.rad > scene_oc.oct
rtrace -I+ -h -ab 5 -aa 0.1 -ar 256 -ad 2048 -as 512 scene_oc.oct < grid.pts | rcalc -e '$1=179*(0.265*$1+0.670*$2+0.065*$3)/10000*100' > df_percent.txt
# 2) Point-in-time illuminance, CIE clear sky with sun for the selected date/time (local standard time ${hhmm(s.time - (state.ev?.sp.dst || 0))})
gensky ${s.month} ${s.day} ${(s.time - (state.ev?.sp.dst || 0)).toFixed(3)} +s -a ${s.lat} -o ${lonW} -m ${merW} > sky_clear.rad
cat >> sky_clear.rad << 'EOF'
skyfunc glow sky_glow 0 0 4 1 1 1 0
sky_glow source sky 0 0 4 0 0 1 180
skyfunc glow ground_glow 0 0 4 1 1 1 0
ground_glow source ground 0 0 4 0 0 -1 180
EOF
oconv sky_clear.rad scene.rad > scene_cl.oct
rtrace -I+ -h -ab 5 -aa 0.1 -ar 256 -ad 2048 -as 512 scene_cl.oct < grid.pts | rcalc -e '$1=179*(0.265*$1+0.670*$2+0.065*$3)' > lux_clear.txt
# 3) Annual sDA / ASE (IES LM-83): use the same scene + grid with an EPW in Honeybee-Radiance, e.g.
#    honeybee-radiance (Ladybug Tools) annual-daylight recipe, or Radiance rfluxmtx/dctimestep (2-phase) with gendaymtx on the EPW.
`;
  download('scene.rad', lines.join('\n'), 'text/plain'); setTimeout(() => download('grid.pts', pts.join('\n') + '\n', 'text/plain'), 300); setTimeout(() => download('run_radiance.sh', sh, 'text/plain'), 600);
}

// ============================================================ VALIDATION
function buildValidationPane() {
  const p = $('#tab-validation');
  p.append(el('div', { class: 'note' }, 'Automated checks of the solar-position algorithm against published reference values and of the shading engine against closed-form analytical cases. The same suite runs in Node for regression testing.'),
    el('button', { class: 'btn primary', onclick: () => { const R = runValidation(); const ok = R.filter(r => r.pass).length;
      $('#vOut').innerHTML = `<p><b class="${ok === R.length ? 'pass' : 'fail'}">${ok} / ${R.length} passed</b></p><table class="t"><tr><th>Group</th><th>Case</th><th class="n">Expected</th><th class="n">Computed</th><th class="n">Tol.</th><th></th></tr>` +
        R.map(r => `<tr><td>${r.group}</td><td>${r.name}</td><td class="n">${f(r.expected, 4)}</td><td class="n">${f(r.got, 4)}</td><td class="n">±${r.tol}</td><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</td></tr>`).join('') + '</table>'; } }, 'Run validation suite'),
    el('div', { id: 'vOut' }));
}
function buildMethodPane() {
  $('#tab-method').append(el('div', { class: 'method', html: `
<h3>Coordinate system & conventions</h3>
<ul><li>World frame ENU: x = East, y = North, z = Up (metres). The 3D view maps this to three.js as (x, z, −y).</li>
<li><b>Solar azimuth</b>: 0° = North, clockwise (E 90°, S 180°, W 270°). <b>Façade azimuth</b>: direction of the façade's outward normal, same convention (a south-facing façade = 180°). Building orientation + façade side set the façade azimuth.</li>
<li>Façade frame (t, w, n): t horizontal along the façade (to the right seen from outside), w up the façade plane, n outward normal. Origin at the façade base centre on the outer wall face; glazing at n = −reveal.</li>
<li>Incidence angle θ = acos(ŝ·n̂). Horizontal shadow angle HSA = −atan2(ŝ·t̂, ŝ·n̂) (= solar az − façade az for vertical façades). Vertical shadow (profile) angle VSA = atan2(ŝ·ŵ, ŝ·n̂), so tan VSA = tan(alt)/cos(HSA).</li>
<li>Time: clock time = standard time + DST. UTC = clock − UTC offset − DST. DST rules (EU / US / AU) are applied at day resolution; the transition hour itself is not modelled.</li></ul>
<h3>Solar position</h3>
<p>NOAA Solar Calculator algorithm (Meeus, <i>Astronomical Algorithms</i>): Julian century, geometric mean longitude and anomaly, equation of centre, apparent longitude with nutation correction, obliquity, declination and equation of time; hour angle from true solar time; standard NOAA refraction correction. Sunrise/sunset use a zenith of 90.833° (refraction + solar radius), iterated three times. Stated accuracy ≈ ±0.01° for 1800–2100; validated here against NREL SPA (Reda &amp; Andreas 2004) to &lt; 0.005°.</p>
<h3>Direct-beam shading</h3>
<ol><li>Every shading element (and the window reveal, modelled as wall thickness around the opening) is an oriented box: centre, three orthonormal axes (including blade tilt / fin rotation) and half-sizes.</li>
<li>The 8 vertices of each box are projected along the sun vector onto the glazing plane: P = V − ((V<sub>n</sub> − n<sub>g</sub>)/s<sub>n</sub>)·s. The convex hull of the projections is the exact shadow polygon of that box.</li>
<li>The union of all shadow polygons is clipped to the window rectangle with a scan-line method: exact in the horizontal direction, 200–240 rows vertically (error ≤ 0.5 % of window area). Sunlit fraction = 1 − union area / window area.</li>
<li>Sun below the horizon or behind the façade (s<sub>n</sub> ≤ 0) ⇒ window 100 % shaded from direct beam.</li>
<li>Interior sun patch: for each floor cell (0.10 m) a ray towards the sun is intersected with the glazing plane; the cell is sunlit if the hit lies inside the window and outside all shadow polygons. Penetration depth = furthest sunlit cell from the glazing.</li>
<li>Shading mask: the same engine evaluated over the sky dome (3° × 3°), drawn on the sun-path diagram as window-average shaded fraction.</li></ol>
<p>Blind cut-off tracking uses the analytical condition b·sin(β + φ) ≥ s·cos φ (slat width b, pitch s, profile angle φ), i.e. β = asin(s·cos φ / b) − φ; thickness is then included geometrically.</p>
<h3>Daylight (simplified)</h3>
<p>Daylight factor = sky + externally reflected component (numerical integration through the aperture, CIE overcast sky, obstruction luminance ρ·0.4·E<sub>h</sub>/π) + internally reflected component (BRE split-flux). Distinct from direct sun. Not a validated illuminance simulation.</p>
<h3>Radiation & solar heat gain (estimated)</h3>
<p>Irradiance is never derived from solar position alone. Inputs: manual DNI/DHI/GHI, EPW hourly records, or ASHRAE 2009 clear-sky with user τ<sub>b</sub>, τ<sub>d</sub>. On the glazing: direct = DNI·cosθ·sunlit fraction; sky diffuse = DHI·F<sub>sky</sub>; ground = GHI·ρ<sub>g</sub>·F<sub>gnd</sub> (isotropic Liu–Jordan), with view factors computed by cosine-weighted ray sampling including the shading devices. SHG = A·SHGC·[k(θ)·I<sub>dir</sub> + k(θ<sub>sky</sub>)·I<sub>sky</sub> + k(θ<sub>gnd</sub>)·I<sub>gnd</sub>], k(θ) = 1 − b₀(1/cosθ − 1).</p>
<h3>Limitations</h3>
<ul><li>Single façade bay, one rectangular window; no neighbouring buildings, terrain or self-shading from other building parts.</li>
<li>Shading elements are opaque boxes; perforated / translucent materials, fabric and curved geometry are not modelled. Inter-reflections from devices into the window are excluded from the radiation estimate.</li>
<li>Isotropic diffuse sky for radiation (underestimates circumsolar diffuse; Perez not implemented). Daylight uses CIE overcast only.</li>
<li>Glazing: single angular modifier, no frame, no spectral or layer-by-layer optics; SHG is instantaneous (no thermal mass / time lag) and not a cooling-load calculation.</li>
<li>Interior: horizontal floor behind the façade, no interior reveal or furniture; for tilted façades the room footprint is approximate.</li>
<li>DST at day resolution; EPW hourly values used for every sub-step in that hour; leap day uses 28 Feb records.</li>
<li>Annual floor-hours are a clear-sky geometric potential, not LM-83 ASE; sDA/ASE require Radiance with weather data.</li></ul>
<h3>References</h3>
<ul><li>NOAA Global Monitoring Laboratory, Solar Calculation Details; J. Meeus (1998) Astronomical Algorithms.</li><li>Reda &amp; Andreas (2004) Solar Position Algorithm, NREL/TP-560-34302.</li>
<li>Duffie &amp; Beckman, Solar Engineering of Thermal Processes (isotropic sky, equivalent incidence angles).</li><li>ASHRAE Handbook — Fundamentals (2009–2021), Ch. 14–15.</li>
<li>BRE Digest 309/310; Littlefair, Site Layout Planning for Daylight (split-flux, limiting depth). IES LM-83 (sDA, ASE).</li></ul>` }));
}

// ================================================================ START
function start() {
  buildLeft(); buildToolbar(); buildRight(); initThree(); refreshHeader();
  $('#btnExportParams').addEventListener('click', exportParams); $('#btnExportTS').addEventListener('click', exportSeries); $('#btnExportRad').addEventListener('click', exportRadiance);
  window.addEventListener('resize', () => { dirty.instant = true; });
  requestAnimationFrame(loop);
  window.__sim = { state, runValidation, evaluate };
}
start();

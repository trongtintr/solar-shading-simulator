// =====================================================================
// CORE: solar geometry, shading geometry, daylight & radiation models
// Pure functions, no DOM. Units: metres, degrees, W/m², hours.
// World frame: ENU  (x = East, y = North, z = Up)
// Façade local frame: (t, w, n)  t = horizontal along façade (to the right
// when viewed from outside), w = up in façade plane, n = outward normal.
// Origin: façade base, horizontal centre, on the OUTER wall surface.
// Glazing plane: n = -reveal.  Devices live at n >= 0.
// =====================================================================
export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const vlen = a => Math.hypot(a[0], a[1], a[2]);

// ---------------------------------------------------------------- time
export function dayOfYear(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1; }
export function dateFromDoy(y, doy) { const t = new Date(Date.UTC(y, 0, doy)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
export function daysInYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; }
function nthSunday(y, m, n) {            // n >= 1, or -1 for last Sunday
  if (n > 0) { const wd = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((7 - wd) % 7) + 7 * (n - 1); }
  const last = new Date(Date.UTC(y, m, 0)); return last.getUTCDate() - last.getUTCDay();
}
// Daylight-saving offset (h). Resolution: whole days (transition hour not modelled).
export function dstOffset(rule, y, m, d) {
  const md = m * 100 + d;
  if (rule === 'EU') return md >= 300 + nthSunday(y, 3, -1) && md < 1000 + nthSunday(y, 10, -1) ? 1 : 0;
  if (rule === 'US') return md >= 300 + nthSunday(y, 3, 2) && md < 1100 + nthSunday(y, 11, 1) ? 1 : 0;
  if (rule === 'AU') return md >= 1000 + nthSunday(y, 10, 1) || md < 400 + nthSunday(y, 4, 1) ? 1 : 0;
  return 0;
}

// --------------------------------------------- NOAA solar position (Meeus)
export function julianDay(y, m, d, hUT = 0) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + hUT / 24;
}
function solarCore(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * D2R;
  const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega * D2R)) * D2R;
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos(omega * D2R)) * D2R;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lam)) * R2D;
  const yv = Math.tan(eps / 2) ** 2, L0r = L0 * D2R;
  const eot = 4 * R2D * (yv * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * yv * Math.sin(Mr) * Math.cos(2 * L0r)
    - 0.5 * yv * yv * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
  return { decl, eot, T };
}
function refraction(alt) {            // NOAA atmospheric refraction, degrees
  if (alt > 85) return 0;
  const te = Math.tan(alt * D2R);
  let r;
  if (alt > 5) r = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (alt > -0.575) r = 1735 + alt * (-518.2 + alt * (103.4 + alt * (-12.79 + alt * 0.711)));
  else r = -20.772 / te;
  return r / 3600;
}
// site: {lat, lon, tz (h, standard time), dst rule}; clockH = local clock time (h)
export function solarPosition(site, y, m, d, clockH, dstOverride) {
  const dst = dstOverride ?? dstOffset(site.dst, y, m, d);
  const ut = clockH - site.tz - dst;
  const jd = julianDay(y, m, d, 0) + ut / 24;
  const { decl, eot } = solarCore(jd);
  const tst = ((ut * 60 + eot + 4 * site.lon) % 1440 + 1440) % 1440;     // true solar time, min
  let ha = tst / 4 - 180; if (ha < -180) ha += 360;
  const la = site.lat * D2R, de = decl * D2R, h = ha * D2R;
  const cz = clamp(Math.sin(la) * Math.sin(de) + Math.cos(la) * Math.cos(de) * Math.cos(h), -1, 1);
  const altG = 90 - Math.acos(cz) * R2D;
  const alt = altG + refraction(altG);
  let az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(la) - Math.tan(de) * Math.cos(la)) * R2D + 180;
  az = (az % 360 + 360) % 360;
  return { alt, altGeom: altG, az, decl, eot, ha, tst: tst / 60, dst, ut, jd };
}
// Sunrise / sunset / solar noon (local clock hours). Iterated NOAA method (zenith 90.833°).
export function sunTimes(site, y, m, d) {
  const dst = dstOffset(site.dst, y, m, d), jd0 = julianDay(y, m, d, 0);
  let noon = 720 - 4 * site.lon;                                     // UTC minutes
  for (let i = 0; i < 2; i++) noon = 720 - 4 * site.lon - solarCore(jd0 + noon / 1440).eot;
  const event = sign => {
    let tUTC = noon, polar = null;
    for (let i = 0; i < 3; i++) {
      const { decl } = solarCore(jd0 + tUTC / 1440);
      const la = site.lat * D2R, de = decl * D2R;
      const arg = Math.cos(90.833 * D2R) / (Math.cos(la) * Math.cos(de)) - Math.tan(la) * Math.tan(de);
      if (arg > 1) { polar = 'night'; break; } if (arg < -1) { polar = 'day'; break; }
      const HA = Math.acos(arg) * R2D;
      tUTC = 720 - 4 * (site.lon + sign * HA) - solarCore(jd0 + tUTC / 1440).eot;
    }
    return { t: tUTC / 60 + site.tz + dst, polar };
  };
  const r = event(1), s = event(-1);
  const polar = r.polar || s.polar;
  return { sunrise: polar ? null : r.t, sunset: polar ? null : s.t, noon: noon / 60 + site.tz + dst, polar, dst,
    dayLength: polar ? (polar === 'day' ? 24 : 0) : s.t - r.t };
}
export function sunVectorENU(alt, az) {
  const a = alt * D2R, z = az * D2R;
  return [Math.sin(z) * Math.cos(a), Math.cos(z) * Math.cos(a), Math.sin(a)];
}

// --------------------------------------------------------- façade frame
// azDeg: façade outward-normal azimuth, clockwise from North (S-facing = 180)
// tiltDeg: tilt from vertical, + = top leaning back (normal points upward)
export function facadeFrame(azDeg, tiltDeg = 0) {
  const g = azDeg * D2R, a = tiltDeg * D2R, sg = Math.sin(g), cg = Math.cos(g), sa = Math.sin(a), ca = Math.cos(a);
  return { n: [sg * ca, cg * ca, sa], w: [-sg * sa, -cg * sa, ca], t: [-cg, sg, 0], nh: [sg, cg, 0], az: azDeg, tilt: tiltDeg };
}
export const toLocal = (v, F) => [vdot(v, F.t), vdot(v, F.w), vdot(v, F.n)];
export const toWorld = (p, F) => [p[0] * F.t[0] + p[1] * F.w[0] + p[2] * F.n[0], p[0] * F.t[1] + p[1] * F.w[1] + p[2] * F.n[1], p[0] * F.t[2] + p[1] * F.w[2] + p[2] * F.n[2]];
// Façade-relative angles from a local sun vector
export function facadeAngles(sL) {
  return {
    incidence: Math.acos(clamp(sL[2], -1, 1)) * R2D,       // angle between sun and façade normal
    hsa: -Math.atan2(sL[0], sL[2]) * R2D,                     // horizontal shadow angle (+ = sun clockwise of normal in plan)
    vsa: Math.atan2(sL[1], sL[2]) * R2D,                      // vertical shadow (profile) angle
    front: sL[2] > 1e-6,
  };
}

// --------------------------------------------------------- oriented boxes
function rotAxes(rotT = 0, rotW = 0) {
  const a = rotT * D2R, ca = Math.cos(a), sa = Math.sin(a), b = rotW * D2R, cb = Math.cos(b), sb = Math.sin(b);
  const ax = [[1, 0, 0], [0, ca, sa], [0, -sa, ca]];                 // about t: + tilt lowers the outer (+n) edge
  return ax.map(v => [v[0] * cb + v[2] * sb, v[1], -v[0] * sb + v[2] * cb]);  // about w: + swings outer edge to +t
}
export function makeBox(c, size, rotT = 0, rotW = 0, kind = 'device', tag = '') {
  return { c: c.slice(), h: [Math.abs(size[0]) / 2, Math.abs(size[1]) / 2, Math.abs(size[2]) / 2], ax: rotAxes(rotT, rotW), kind, tag };
}
const boxRange = (t0, t1, w0, w1, n0, n1, kind, tag) => makeBox([(t0 + t1) / 2, (w0 + w1) / 2, (n0 + n1) / 2], [t1 - t0, w1 - w0, n1 - n0], 0, 0, kind, tag);
export function boxVerts(b) {
  const out = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1])
    out.push([0, 1, 2].map(q => b.c[q] + i * b.h[0] * b.ax[0][q] + j * b.h[1] * b.ax[1][q] + k * b.h[2] * b.ax[2][q]));
  return out;
}
// Ray / oriented-box intersection (slab method). Returns entry distance or -1.
export function rayBox(o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  const oc = [o[0] - b.c[0], o[1] - b.c[1], o[2] - b.c[2]];
  for (let i = 0; i < 3; i++) {
    const a = b.ax[i], p = oc[0] * a[0] + oc[1] * a[1] + oc[2] * a[2], q = d[0] * a[0] + d[1] * a[1] + d[2] * a[2], h = b.h[i];
    if (Math.abs(q) < 1e-12) { if (p < -h || p > h) return -1; continue; }
    let t1 = (-h - p) / q, t2 = (h - p) / q; if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1;
  }
  if (tmax < 1e-7) return -1;
  return Math.max(tmin, 0);
}
export function rayHitsAny(o, d, boxes) { for (const b of boxes) if (rayBox(o, d, b) >= 0) return true; return false; }
export function rayFirstHit(o, d, boxes) { let best = Infinity, hb = null; for (const b of boxes) { const t = rayBox(o, d, b); if (t >= 0 && t < best) { best = t; hb = b; } } return hb ? { t: best, box: hb } : null; }

// --------------------------------------------------------- shading devices
export const SHADING_TYPES = {
  none: 'No shading', overhang: 'Horizontal overhang', hlouver: 'Horizontal louvers', vfin: 'Vertical fins',
  combined: 'Combined louvers + fins', eggcrate: 'Egg-crate', blinds: 'Adjustable external blinds', custom: 'Custom geometry (JSON)'
};
export function windowRect(g) { return { x0: -g.winW / 2, x1: g.winW / 2, y0: g.sill, y1: g.head }; }
// Analytic cut-off slat angle (zero-thickness slats): smallest tilt that blocks beam at profile angle phi
export function cutoffAngle(slatW, spacing, phiDeg) {
  const phi = phiDeg * D2R, arg = clamp(spacing * Math.cos(phi) / slatW, -1, 1);
  return clamp((Math.asin(arg) - phi) * R2D, -60, 85);
}
export function buildGeometry(cfg, sL) {
  const g = cfg.geom, W = windowRect(g), d = Math.max(0, g.reveal), dev = [], notes = [];
  const T = cfg.type, wW = W.x1 - W.x0, wH = W.y1 - W.y0, xc = (W.x0 + W.x1) / 2;
  let blindAngle = null;
  const addHL = p => {
    const n = Math.max(0, Math.round(p.count));
    for (let i = 0; i < n; i++) dev.push(makeBox([xc, W.y1 + p.start - i * p.spacing, p.proj + p.depth / 2], [wW + 2 * p.ext, p.thick, p.depth], p.tilt, 0, 'device', 'louver'));
  };
  const addVF = p => {
    const n = Math.max(0, Math.round(p.count)), y0 = W.y0 - p.ext, y1 = W.y1 + p.ext;
    for (let j = 0; j < n; j++) dev.push(makeBox([xc + (j - (n - 1) / 2) * p.spacing, (y0 + y1) / 2, p.proj + p.depth / 2], [p.thick, y1 - y0, p.depth], 0, p.rot, 'device', 'fin'));
  };
  if (T === 'overhang') { const p = cfg.overhang, top = W.y1 + p.offset; dev.push(boxRange(W.x0 - p.ext, W.x1 + p.ext, top - p.thick, top, p.proj, p.proj + p.depth, 'device', 'overhang')); }
  if (T === 'hlouver' || T === 'combined') addHL(cfg.hlouver);
  if (T === 'vfin' || T === 'combined') addVF(cfg.vfin);
  if (T === 'eggcrate') {
    const p = cfg.eggcrate, nV = Math.max(1, Math.round(wW / p.hsp)), nH = Math.max(1, Math.round(wH / p.vsp));
    for (let k = 0; k <= nV; k++) dev.push(makeBox([W.x0 + k * wW / nV, (W.y0 + W.y1) / 2, p.proj + p.depth / 2], [p.thick, wH + p.thick, p.depth], 0, 0, 'device', 'egg-v'));
    for (let k = 0; k <= nH; k++) dev.push(makeBox([xc, W.y0 + k * wH / nH, p.proj + p.depth / 2], [wW + p.thick, p.thick, p.depth], 0, 0, 'device', 'egg-h'));
  }
  if (T === 'blinds') {
    const p = cfg.blinds;
    blindAngle = p.angle;
    if (p.mode === 'cutoff') {
      if (sL && sL[2] > 1e-6) blindAngle = cutoffAngle(p.slatW, p.spacing, Math.atan2(sL[1], sL[2]) * R2D);
      else blindAngle = 0;
    }
    const covH = clamp(p.deploy, 0, 1) * (wH + 0.1), n = Math.ceil(covH / p.spacing - 1e-9);
    for (let i = 0; i < n; i++) dev.push(makeBox([xc, W.y1 + 0.05 - (i + 0.5) * p.spacing, p.proj + p.slatW / 2], [wW + 0.1, p.thick, p.slatW], blindAngle, 0, 'device', 'slat'));
  }
  if (T === 'custom') {
    let arr = [];
    try { arr = JSON.parse(cfg.custom.json); if (!Array.isArray(arr)) throw new Error('JSON must be an array'); }
    catch (e) { notes.push('Custom geometry JSON error: ' + e.message); arr = []; }
    for (const o of arr) {
      const v = k => (Number.isFinite(+o[k]) ? +o[k] : 0);
      if (v('dt') <= 0 || v('dw') <= 0 || v('dn') <= 0) { notes.push('Custom box skipped (dt, dw, dn must be > 0).'); continue; }
      dev.push(makeBox([v('t'), v('w'), v('n')], [v('dt'), v('dw'), v('dn')], v('rotT'), v('rotW'), 'device', 'custom'));
    }
  }
  let adjusted = 0;
  for (const b of dev) {
    const mn = Math.min(...boxVerts(b).map(v => v[2]));
    if (mn < -1e-9) { b.c[2] -= mn; adjusted++; }
  }
  if (adjusted) notes.push(`${adjusted} element(s) penetrated the wall plane and were pushed outward to n ≥ 0 (increase projection distance).`);
  const rev = [];
  if (d > 1e-6) {                          // window reveal (wall thickness in front of glazing)
    const L = 50;
    rev.push(boxRange(W.x0 - L, W.x0, W.y0 - L, W.y1 + L, -d, 0, 'reveal', 'jamb-L'));
    rev.push(boxRange(W.x1, W.x1 + L, W.y0 - L, W.y1 + L, -d, 0, 'reveal', 'jamb-R'));
    rev.push(boxRange(W.x0, W.x1, W.y0 - L, W.y0, -d, 0, 'reveal', 'sill'));
    rev.push(boxRange(W.x0, W.x1, W.y1, W.y1 + L, -d, 0, 'reveal', 'head'));
  }
  return { dev, rev, all: dev.concat(rev), W, ng: -d, notes, blindAngle };
}
export const sunDependentGeometry = cfg => cfg.type === 'blinds' && cfg.blinds.mode === 'cutoff';

// ---------------------------------------- shadow projection & clipping
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-12) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 1e-12) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// Project every box along the sun direction onto the glazing plane -> convex shadow polygons (t,w)
export function shadowPolys(boxes, sL, ng) {
  if (!(sL[2] > 1e-6)) return null;
  const out = [];
  for (const b of boxes) {
    const hull = convexHull(boxVerts(b).map(v => { const k = (v[2] - ng) / sL[2]; return [v[0] - k * sL[0], v[1] - k * sL[1]]; }));
    if (hull.length < 3) continue;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of hull) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    out.push({ hull, x0, x1, y0, y1 });
  }
  return out;
}
export function inShadow(polys, x, y) {
  for (const P of polys) {
    if (x < P.x0 || x > P.x1 || y < P.y0 || y > P.y1) continue;
    const h = P.hull; let inside = true;
    for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < -1e-12) { inside = false; break; } }
    if (inside) return true;
  }
  return false;
}
// Exact-in-t, discretised-in-w union of shadow polygons clipped to the window rectangle.
export function sunlitFraction(polys, W, rows = 200, keepRows = false) {
  const wW = W.x1 - W.x0, dy = (W.y1 - W.y0) / rows; let shaded = 0; const rowsOut = keepRows ? [] : null;
  if (!polys) return { frac: 0, rows: rowsOut };
  for (let r = 0; r < rows; r++) {
    const y = W.y0 + (r + 0.5) * dy, iv = [];
    for (const P of polys) {
      if (y < P.y0 || y > P.y1 || P.x1 < W.x0 || P.x0 > W.x1) continue;
      let a = Infinity, b = -Infinity; const h = P.hull;
      for (let i = 0; i < h.length; i++) {
        const p = h[i], q = h[(i + 1) % h.length];
        if ((p[1] - y) * (q[1] - y) > 0) continue;
        if (Math.abs(q[1] - p[1]) < 1e-14) { a = Math.min(a, p[0], q[0]); b = Math.max(b, p[0], q[0]); continue; }
        const x = p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]); a = Math.min(a, x); b = Math.max(b, x);
      }
      a = Math.max(a, W.x0); b = Math.min(b, W.x1); if (b > a) iv.push([a, b]);
    }
    iv.sort((u, v) => u[0] - v[0]);
    const merged = [];
    for (const s of iv) { if (merged.length && s[0] <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], s[1]); else merged.push(s.slice()); }
    let len = 0; for (const s of merged) len += s[1] - s[0];
    shaded += len;
    if (keepRows) rowsOut.push({ y, dy, shaded: merged });
  }
  return { frac: 1 - shaded / (wW * rows), rows: rowsOut };
}

// ----------------------------------------------- interior sun patch
export function floorPatch(cfg, F, sL, polys, gi, cell = 0.1) {
  const g = cfg.geom, nx = Math.max(1, Math.round(g.facW / cell)), ny = Math.max(1, Math.round(g.roomD / cell));
  const dx = g.facW / nx, dy = g.roomD / ny, grid = new Uint8Array(nx * ny);
  let lit = 0, maxDepth = 0;
  if (polys && sL[2] > 1e-6) {
    const W = gi.W, ng = gi.ng, d = Math.max(0, g.reveal);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = -g.facW / 2 + (i + 0.5) * dx, b = (j + 0.5) * dy;
      const P = [a * F.t[0] - (d + b) * F.nh[0], a * F.t[1] - (d + b) * F.nh[1], 0];
      const Pl = toLocal(P, F), k = (ng - Pl[2]) / sL[2];
      if (k <= 0) continue;
      const x = Pl[0] + k * sL[0], y = Pl[1] + k * sL[1];
      if (x <= W.x0 || x >= W.x1 || y <= W.y0 || y >= W.y1 || inShadow(polys, x, y)) continue;
      grid[j * nx + i] = 1; lit++; if (b + dy / 2 > maxDepth) maxDepth = b + dy / 2;
    }
  }
  const area = lit * dx * dy;
  return { grid, nx, ny, dx, dy, area, frac: area / (g.facW * g.roomD), maxDepth };
}

// --------------------------- diffuse view factors (isotropic sky & ground)
export function diffuseViewFactors(F, gi, nsW = 8, nDir = 22) {
  const W = gi.W, boxes = gi.all; let s0 = 0, g0 = 0, s1 = 0, g1 = 0, N = 0;
  for (let a = 0; a < nsW; a++) for (let b = 0; b < nsW; b++) {
    const o = [W.x0 + (a + 0.5) * (W.x1 - W.x0) / nsW, W.y0 + (b + 0.5) * (W.y1 - W.y0) / nsW, gi.ng];
    for (let u = 0; u < nDir; u++) for (let v = 0; v < nDir; v++) {
      const uu = (u + 0.5) / nDir, ph = 2 * Math.PI * (v + 0.5) / nDir, r = Math.sqrt(uu);   // cosine-weighted
      const dl = [r * Math.cos(ph), r * Math.sin(ph), Math.sqrt(1 - uu)];
      const up = dl[0] * F.t[2] + dl[1] * F.w[2] + dl[2] * F.n[2];
      const blocked = rayHitsAny(o, dl, boxes); N++;
      if (up > 0) { s0++; if (!blocked) s1++; } else { g0++; if (!blocked) g1++; }
    }
  }
  return { Fsky0: s0 / N, Fgnd0: g0 / N, Fsky: s1 / N, Fgnd: g1 / N };
}

// ----------------------- daylight factor: CIE overcast sky + BRE split flux
export function daylightFactor(cfg, F, gi, opts = {}) {
  const g = cfg.geom, cell = opts.cell || 0.25, ns = opts.ns || 16, nw = opts.nw || 12, W = gi.W;
  const nx = Math.max(2, Math.round(g.facW / cell)), ny = Math.max(2, Math.round(g.roomD / cell));
  const dx = g.facW / nx, dy = g.roomD / ny, d = Math.max(0, g.reveal), VT = cfg.glazing.vt;
  const Eh = 7 * Math.PI / 9, Lobs = cfg.material.refl * 0.4 * Eh / Math.PI;     // Lz = 1
  const sw = (W.x1 - W.x0) / ns, sh = (W.y1 - W.y0) / nw, dA = sw * sh, samples = [];
  for (let a = 0; a < ns; a++) for (let b = 0; b < nw; b++) samples.push([W.x0 + (a + 0.5) * sw, W.y0 + (b + 0.5) * sh, gi.ng]);
  const vf = opts.vf || diffuseViewFactors(F, gi);
  // BRE internally reflected component (Hopkinson split-flux), glazing transmittance = VT
  const rf = cfg.room, H = g.facH, Wd = g.facW, D = g.roomD, Aw = (W.x1 - W.x0) * (W.y1 - W.y0);
  const midW = (W.y0 + W.y1) / 2;
  const Afloor = Wd * D, Aceil = Wd * D, wallLen = 2 * D + Wd, Awin = Aw;
  const AwallLow = wallLen * midW + Math.max(0, Wd * midW - Aw / 2), AwallHigh = wallLen * (H - midW) + Math.max(0, Wd * (H - midW) - Aw / 2);
  const Atot = 2 * Afloor + 2 * (D + Wd) * H;
  const Rfw = (Afloor * rf.floor + AwallLow * rf.wall) / (Afloor + AwallLow);
  const Rcw = (Aceil * rf.ceil + AwallHigh * rf.wall) / (Aceil + AwallHigh);
  const R = (Afloor * rf.floor + Aceil * rf.ceil + (Atot - Afloor - Aceil - Awin) * rf.wall + Awin * 0.1) / Atot;
  const C = 39 * (vf.Fsky0 > 0 ? vf.Fsky / vf.Fsky0 : 1);
  const IRC = 100 * VT * Aw / (Atot * (1 - R)) * (C * Rfw + 5 * Rcw) / 100;
  const df = new Float32Array(nx * ny), sc = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = -Wd / 2 + (i + 0.5) * dx, b = (j + 0.5) * dy;
    const Pw = [a * F.t[0] - (d + b) * F.nh[0], a * F.t[1] - (d + b) * F.nh[1], g.wp];
    const P = toLocal(Pw, F); let E = 0;
    for (const s of samples) {
      const v = [s[0] - P[0], s[1] - P[1], s[2] - P[2]], r2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2], r = Math.sqrt(r2);
      const dl = [v[0] / r, v[1] / r, v[2] / r]; if (dl[2] <= 0) continue;
      const up = dl[0] * F.t[2] + dl[1] * F.w[2] + dl[2] * F.n[2]; if (up <= 0) continue;
      const L = rayHitsAny(s, dl, gi.all) ? Lobs : (1 + 2 * up) / 3;
      E += L * up * dA * dl[2] / r2;
    }
    sc[j * nx + i] = 100 * VT * E / Eh; df[j * nx + i] = sc[j * nx + i] + IRC;
  }
  let sum = 0, mn = Infinity, n2 = 0; for (const v of df) { sum += v; mn = Math.min(mn, v); if (v >= 2) n2++; }
  const ic = Math.floor(nx / 2); let depth2 = 0;
  for (let j = 0; j < ny; j++) if (df[j * nx + ic] >= 2) depth2 = (j + 1) * dy;
  const Rb = (rf.floor + rf.wall + rf.ceil) / 3, Hhead = W.y1;
  const limitDepth = 2 / ((1 - Rb) * (1 / Wd + 1 / Hhead));       // BRE limiting depth L/W + L/H <= 2/(1-Rb)
  return { df, sc, nx, ny, dx, dy, mean: sum / df.length, min: mn, uniformity: mn / (sum / df.length), area2: n2 / df.length,
    depth2, IRC, R, C, limitDepth, ruleDepth: 2.5 * (Hhead - g.wp), vf };
}

// --------------------------------------------- radiation & solar gain
export function iam(thetaDeg, b0) { if (thetaDeg >= 89.9) return 0; return Math.max(0, 1 - b0 * (1 / Math.cos(thetaDeg * D2R) - 1)); }
// Brandemuehl & Beckman equivalent incidence angles for diffuse (slope beta from horizontal)
export const thetaSkyEq = beta => 59.7 - 0.1388 * beta + 0.001497 * beta * beta;
export const thetaGndEq = beta => 90 - 0.5788 * beta + 0.002693 * beta * beta;
export function radiation(irr, sunUp, sL, sunlit, vf, glaz, rhoG, Aw, tilt) {
  if (!irr) return null;
  const beta = 90 - tilt, front = sunUp && sL[2] > 1e-6, cosT = front ? sL[2] : 0, th = Math.acos(clamp(cosT, -1, 1)) * R2D;
  const Idir = sunUp ? irr.DNI * cosT : 0;                    // W/m² on façade plane (unshaded)
  const Isky0 = irr.DHI * vf.Fsky0, Isky = irr.DHI * vf.Fsky;
  const Ignd0 = irr.GHI * rhoG * vf.Fgnd0, Ignd = irr.GHI * rhoG * vf.Fgnd;
  const IdirW = Idir * sunlit;
  const kD = iam(th, glaz.b0), kS = iam(thetaSkyEq(beta), glaz.b0), kG = iam(thetaGndEq(beta), glaz.b0);
  const trans = Aw * glaz.tsol * (kD * IdirW + kS * Isky + kG * Ignd);
  const shg = Aw * glaz.shgc * (kD * IdirW + kS * Isky + kG * Ignd);
  const shg0 = Aw * glaz.shgc * (kD * Idir + kS * Isky0 + kG * Ignd0);
  return { Idir, IdirW, Isky0, Isky, Ignd0, Ignd, Itot0: Idir + Isky0 + Ignd0, Itot: IdirW + Isky + Ignd,
    blockedDir: Aw * (Idir - IdirW), blockedDif: Aw * (Isky0 - Isky + Ignd0 - Ignd), trans, shg, shg0, theta: th };
}
// ASHRAE 2009 clear-sky model (requires site-specific taub, taud)
export function ashraeClearSky(alt, doy, taub, taud) {
  if (alt <= 0 || !(taub > 0) || !(taud > 0)) return { DNI: 0, DHI: 0, GHI: 0 };
  const m = 1 / (Math.sin(alt * D2R) + 0.50572 * Math.pow(6.07995 + alt, -1.6364));
  const E0 = 1367 * (1 + 0.033 * Math.cos(2 * Math.PI * (doy - 3) / 365));
  const ab = 1.454 - 0.406 * taub - 0.268 * taud + 0.021 * taub * taud, ad = 0.507 + 0.205 * taub - 0.080 * taud - 0.190 * taub * taud;
  const DNI = E0 * Math.exp(-taub * Math.pow(m, ab)), DHI = E0 * Math.exp(-taud * Math.pow(m, ad));
  return { DNI, DHI, GHI: DNI * Math.sin(alt * D2R) + DHI };
}
// EPW weather file: hourly records; hour h covers [h-1, h) local standard time
export function parseEPW(text) {
  const lines = text.split(/\r?\n/); const L = lines[0].split(',');
  if (!/^LOCATION/i.test(L[0])) throw new Error('Not an EPW file (missing LOCATION header).');
  const map = new Map(); let n = 0;
  for (let i = 8; i < lines.length; i++) {
    const f = lines[i].split(','); if (f.length < 16) continue;
    const m = +f[1], d = +f[2], h = +f[3];
    map.set(m * 10000 + d * 100 + h, { GHI: +f[13], DNI: +f[14], DHI: +f[15], T: +f[6] }); n++;
  }
  return { city: L[1], country: L[3], lat: +L[6], lon: +L[7], tz: +L[8], elev: +L[9], map, n };
}
export function epwLookup(epw, m, d, stdHour) {
  if (!epw) return null; const h = clamp(Math.floor(stdHour) + 1, 1, 24);
  return epw.map.get(m * 10000 + d * 100 + h) || (m === 2 && d === 29 ? epw.map.get(20000 + 2800 + h) : null) || null;
}

// ------------------------------------------------ one time-step evaluation
export function evaluate(cfg, site, date, clockH, o = {}) {
  const sp = solarPosition(site, date.y, date.m, date.d, clockH);
  const F = o.F || facadeFrame(site.facadeAz, site.tilt), s = sunVectorENU(sp.alt, sp.az), sL = toLocal(s, F);
  const ang = facadeAngles(sL), up = sp.alt > 0, front = up && ang.front;
  const gi = o.gi && !sunDependentGeometry(cfg) ? o.gi : buildGeometry(cfg, sL);
  let polys = null, sun = { frac: 0, rows: null };
  if (front) { polys = shadowPolys(gi.all, sL, gi.ng); sun = sunlitFraction(polys, gi.W, o.rows || 200, !!o.keepRows); }
  const floor = o.floorCell ? floorPatch(cfg, F, sL, front ? polys : null, gi, o.floorCell) : null;
  const status = !up ? 'Sun below horizon' : !ang.front ? 'Sun behind façade' : 'Sun in front of façade';
  return { sp, F, s, sL, ang, up, front, gi, polys, sunlit: front ? sun.frac : 0, rows: sun.rows, floor, status };
}

// ------------------------- shading mask on the sky dome (window-average)
export function shadingMask(cfg, F, step = 3, rows = 60) {
  const nA = Math.round(360 / step), nE = Math.round(90 / step), vals = new Float32Array(nA * nE);
  const dep = sunDependentGeometry(cfg), gi0 = dep ? null : buildGeometry(cfg, null);
  for (let e = 0; e < nE; e++) for (let a = 0; a < nA; a++) {
    const sL = toLocal(sunVectorENU((e + 0.5) * step, (a + 0.5) * step), F);
    if (!(sL[2] > 1e-6)) { vals[e * nA + a] = -1; continue; }
    const gi = dep ? buildGeometry(cfg, sL) : gi0;
    vals[e * nA + a] = 1 - sunlitFraction(shadowPolys(gi.all, sL, gi.ng), gi.W, rows).frac;   // shaded fraction
  }
  return { vals, nA, nE, step };
}

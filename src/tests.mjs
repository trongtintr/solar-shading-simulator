import { solarPosition, sunTimes, dstOffset, facadeFrame, toLocal, sunVectorENU, facadeAngles, buildGeometry, shadowPolys, sunlitFraction, floorPatch, diffuseViewFactors, ashraeClearSky, iam, D2R, R2D } from './core.mjs';
// =====================================================================
// VALIDATION SUITE — reference solar cases + analytical shading cases
// =====================================================================
export function runValidation() {
  const R = [];
  const add = (group, name, expected, got, tol, unit = '') => R.push({ group, name, expected, got, tol, unit, pass: Number.isFinite(got) && Math.abs(got - expected) <= tol });
  // ---- Solar position: NREL SPA reference (Reda & Andreas 2004, Table A4.1)
  {
    const site = { lat: 39.742476, lon: -105.1786, tz: -7, dst: 'none' };
    const sp = solarPosition(site, 2003, 10, 17, 12 + 30 / 60 + 30 / 3600);
    add('Solar position', 'NREL SPA ref. 2003-10-17 12:30:30 MST, Golden CO — zenith', 50.11162, 90 - sp.alt, 0.05, '°');
    add('Solar position', 'NREL SPA ref. — azimuth (cw from N)', 194.34024, sp.az, 0.05, '°');
  }
  // ---- Declination at June solstice and December solstice (Astronomical Almanac ≈ ±23.44°)
  {
    const s = { lat: 0, lon: 0, tz: 0, dst: 'none' };
    add('Solar position', 'Declination, 2026-06-21 08:25 UTC (solstice instant)', 23.436, solarPosition(s, 2026, 6, 21, 8.42).decl, 0.01, '°');
    add('Solar position', 'Declination, 2026-12-21 20:50 UTC (solstice instant)', -23.436, solarPosition(s, 2026, 12, 21, 20.83).decl, 0.01, '°');
    add('Solar position', 'Equation of time, 11 Feb (≈ −14.2 min)', -14.2, solarPosition(s, 2026, 2, 11, 12).eot, 0.3, 'min');
    add('Solar position', 'Equation of time, 3 Nov (≈ +16.4 min)', 16.4, solarPosition(s, 2026, 11, 3, 12).eot, 0.3, 'min');
    const st = sunTimes(s, 2026, 3, 20);
    add('Solar position', 'Day length at equator, March equinox (≈ 12 h 07 min incl. refraction)', 12.12, st.dayLength, 0.03, 'h');
  }
  // ---- Noon altitude Taipei, June solstice: 90 − |φ − δ|
  {
    const site = { lat: 25.033, lon: 121.5654, tz: 8, dst: 'none' };
    const st = sunTimes(site, 2026, 6, 21), sp = solarPosition(site, 2026, 6, 21, st.noon);
    add('Solar position', 'Taipei solar-noon altitude 21 Jun = 90 − |φ − δ| (+refraction)', 90 - Math.abs(25.033 - sp.decl), sp.altGeom, 0.02, '°');
    add('Solar position', 'Taipei azimuth at solar noon 21 Jun (sun north of zenith? φ>δ → 180°)', 180, sp.az, 0.5, '°');
  }
  // ---- DST
  add('Time', 'EU DST active 2026-07-01', 1, dstOffset('EU', 2026, 7, 1), 0);
  add('Time', 'EU DST inactive 2026-10-26 (after last Sun Oct = 25)', 0, dstOffset('EU', 2026, 10, 26), 0);
  add('Time', 'US DST starts 2026-03-08 (2nd Sun Mar)', 1, dstOffset('US', 2026, 3, 8), 0);
  add('Time', 'AU (southern) DST active 2026-01-15', 1, dstOffset('AU', 2026, 1, 15), 0);

  // ---- Geometry: synthetic sun vectors in façade-local coordinates
  const base = { type: 'none', geom: { facW: 6, facH: 3.5, winW: 2, sill: 1, head: 2.5, reveal: 0, roomD: 8, wp: 0.75 },
    material: { refl: 0.5 }, glazing: { vt: 0.6 }, room: { floor: 0.2, wall: 0.5, ceil: 0.7 } };
  const F = facadeFrame(180, 0);
  const local = (vsa, hsa) => { const a = vsa * D2R, b = hsa * D2R; const v = [-Math.tan(b), Math.tan(a), 1]; const l = Math.hypot(...v); return v.map(x => x / l); };
  const frac = (cfg, sL) => { const gi = buildGeometry(cfg, sL); return sunlitFraction(shadowPolys(gi.all, sL, gi.ng), gi.W, 400).frac; };
  const custom = arr => ({ ...base, type: 'custom', custom: { json: JSON.stringify(arr) } });
  // incidence
  { const sL = toLocal(sunVectorENU(30, 180), F); add('Shading', 'Incidence on S façade, sun alt 30° az 180°', 30, facadeAngles(sL).incidence, 1e-6, '°'); }
  { const sL = toLocal(sunVectorENU(40, 135), F), a = facadeAngles(sL);
    add('Shading', 'HSA = solar az − façade az (135 − 180)', -45, a.hsa, 1e-6, '°');
    add('Shading', 'VSA: tan VSA = tan alt / cos HSA', Math.atan(Math.tan(40 * D2R) / Math.cos(45 * D2R)) * R2D, a.vsa, 1e-6, '°'); }
  add('Shading', 'No shading, sun in front → sunlit fraction', 1, frac(base, local(40, 20)), 1e-9);
  add('Shading', 'Sun behind façade → shadow polygons null', 1, shadowPolys([], [0, 0.5, -0.5], 0) === null ? 1 : 0, 0);
  // infinite overhang flush at head, depth P: shaded height = P·tan(VSA)
  { const P = 0.5, sL = local(45, 0), c = custom([{ t: 0, w: 2.5 + 0.0005, n: P / 2, dt: 1000, dw: 0.001, dn: P }]);
    add('Shading', 'Infinite overhang P=0.5 m, H=1.5 m, VSA 45° → sunlit = 1 − P·tanVSA/H', 1 - 0.5 / 1.5, frac(c, sL), 0.003); }
  { const P = 0.8, sL = local(30, 35), c = custom([{ t: 0, w: 2.5 + 0.0005, n: P / 2, dt: 1000, dw: 0.001, dn: P }]);
    add('Shading', 'Infinite overhang, oblique sun (VSA 30°, HSA 35°) → depends on VSA only', 1 - 0.8 * Math.tan(30 * D2R) / 1.5, frac(c, sL), 0.003); }
  // infinite fins at both jambs, depth P: shaded width = P·|tan HSA|
  { const P = 0.4, sL = local(20, 30), c = custom([{ t: -1 - 0.0005, w: 0, n: P / 2, dt: 0.001, dw: 1000, dn: P }, { t: 1 + 0.0005, w: 0, n: P / 2, dt: 0.001, dw: 1000, dn: P }]);
    add('Shading', 'Infinite side fins P=0.4 m, W=2 m, HSA 30° → sunlit = 1 − P·tanHSA/W', 1 - 0.4 * Math.tan(30 * D2R) / 2, frac(c, sL), 0.003); }
  // reveal acts as overhang + fins
  { const d = 0.2, sL = local(30, 25), c = { ...base, geom: { ...base.geom, reveal: d } };
    const ew = 2 - d * Math.tan(25 * D2R), eh = 1.5 - d * Math.tan(30 * D2R);
    add('Shading', 'Reveal 0.2 m, VSA 30°, HSA 25° → (W − d·tanHSA)(H − d·tanVSA)/(W·H)', ew * eh / 3, frac(c, sL), 0.003); }
  // louver cut-off: horizontal zero-thickness blades spacing s, depth D: full cut-off when tanVSA ≥ s/D
  { const cfg = { ...base, type: 'hlouver', hlouver: { depth: 0.3, spacing: 0.15, count: 11, thick: 0.0005, tilt: 0, proj: 0, ext: 50, start: 0 } };
    add('Shading', 'Horizontal louvers s/D = 0.5, VSA = atan(0.5)+0.5° → fully shaded', 0, frac(cfg, local(Math.atan(0.5) * R2D + 0.5, 0)), 0.003);
    add('Shading', 'Same louvers, VSA = atan(0.25) → sunlit 1 − D·tanVSA/s = 0.5', 0.5, frac(cfg, local(Math.atan(0.25) * R2D, 0)), 0.01); }
  // blind cut-off angle formula
  { const cfg = { ...base, type: 'blinds', blinds: { slatW: 0.08, spacing: 0.07, thick: 0.0005, angle: 0, mode: 'cutoff', deploy: 1, proj: 0.05 } };
    add('Shading', 'Blinds in cut-off mode (VSA 25°) → direct beam fully blocked', 0, frac(cfg, local(25, 10)), 0.005); }
  // floor penetration depth (no reveal) = head / tan(VSA) for HSA = 0
  { const sL = local(30, 0), gi = buildGeometry(base, sL), polys = shadowPolys(gi.all, sL, gi.ng), fp = floorPatch(base, F, sL, polys, gi, 0.02);
    add('Interior', 'Sun penetration depth, HSA 0, profile 30°, head 2.5 m → 2.5/tan30°', 2.5 / Math.tan(30 * D2R), fp.maxDepth, 0.03, 'm');
    add('Interior', 'Sunlit floor area = window area projection (W·H/tanVSA)', 2 * 1.5 / Math.tan(30 * D2R), fp.area, 0.06, 'm²'); }
  // isotropic view factors
  { const gi = buildGeometry(base, null), vf = diffuseViewFactors(F, gi, 4, 40);
    add('Diffuse', 'Unobstructed vertical window sky view factor (1+cos90°)/2', 0.5, vf.Fsky, 0.002);
    const F2 = facadeFrame(180, 30), vf2 = diffuseViewFactors(F2, gi, 4, 40);
    add('Diffuse', 'Tilted 30° back (slope 60°): (1+cos60°)/2', 0.75, vf2.Fsky, 0.003); }
  // sky component of unglazed horizontal rooflight-equivalent sanity: point far away → DF→IRC only
  { const cs = ashraeClearSky(60, 172, 0.4, 2.3);
    add('Radiation', 'ASHRAE clear-sky closure GHI = DNI·sin(alt) + DHI', cs.DNI * Math.sin(60 * D2R) + cs.DHI, cs.GHI, 1e-9, 'W/m²');
    add('Radiation', 'IAM at normal incidence = 1', 1, iam(0, 0.1), 1e-12); }
  return R;
}

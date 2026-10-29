# Methodology, assumptions & validation

This is a single-file web app for early-stage façade design. It covers solar geometry, direct-beam shading of a window by parametric devices, the interior sun patch, a simplified daylight-factor estimate, estimated solar heat gain, period and annual analysis, and side-by-side comparison of any number of configurations.

## 1. Running locally

The app is a single file, `index.html`. It loads three.js 0.160.0 as an ES module from the jsDelivr CDN, so the first load needs an internet connection.

- **Quickest:** double-click `index.html` and it opens in Chrome, Edge or Firefox.
- **Recommended:** serve the folder over HTTP. This avoids `file://` module restrictions in some browsers. From the folder, run:
  - `python -m http.server 8000`, then open <http://localhost:8000/index.html>
  - or `npx serve .`
- **Offline use:** run `npm i three@0.160.0` in the folder. Then, in the `<script type="importmap">` block of `index.html`, replace `https://cdn.jsdelivr.net/npm/three@0.160.0/` with `./node_modules/three/`.

Dependencies:
- **three@0.160.0:** core library plus `examples/jsm/controls/OrbitControls.js`, used for 3D rendering only.
- **Everything else is plain JavaScript:** the solar position, shading, daylight and radiation calculations, the charts and the CSV/Radiance export.

Configurations and site settings are saved in the browser's `localStorage`. If storage is blocked, the app still works but forgets them on reload.

## 2. Interface

| Panel | Contents |
|---|---|
| **Left: parameters** | <ul><li>Location: presets for Taipei, Singapore, Hanoi and Ho Chi Minh City, plus London, New York and Sydney as DST test cases</li><li>Latitude/longitude, UTC offset and DST rule</li><li>Date, day of year, and a sunrise→sunset time slider with ▶ animation</li><li>Building orientation, façade side and façade azimuth, façade tilt</li><li>Façade/window geometry, including WWR, reveal and room depth</li><li>Shading system (8 types) with their parameters</li><li>Material, glazing (SHGC, VT, τsol, b₀)</li><li>Radiation inputs: manual, EPW, or ASHRAE clear-sky</li><li>Room reflectances</li></ul> |
| **Centre: 3D** | <ul><li>Façade, glazing, devices, ground, interior room and the sun with its direction arrow</li><li>Rays: incident (yellow), blocked (grey dashed) and transmitted to the floor (orange)</li><li>The computed sunlit/shaded pattern on the glass and the computed floor sun patch, or a DF heat map</li><li>Toggles for rays, shadows, dimensions and axes</li><li>Camera presets</li></ul> |
| **Right: tabs** | <ul><li>**Results:** solar position, sun-path diagram with the façade shading mask, façade angles, window shading, floor patch, radiation and SHG</li><li>**Daylight:** DF map and metrics</li><li>**Period:** design days or annual analysis</li><li>**Compare:** configuration manager, charts and parameter table</li><li>**Validation**</li><li>**Method**</li></ul> |

The header buttons export:
- the parameter table as CSV
- the time series from the last Period or Compare run as CSV
- a Radiance scene: `scene.rad`, `grid.pts` and `run_radiance.sh`

## 3. Conventions

- **World frame:** ENU, with x = East, y = North, z = Up, in metres.
- **Solar azimuth:** 0° = North, measured clockwise.
- **Façade azimuth:** the azimuth of the façade's **outward normal**, in the same convention. A south-facing façade is 180°.
- **Façade-local frame (t, w, n):**
  - t runs horizontally along the façade, positive to the right when seen from outside.
  - w points up the façade plane.
  - n is the outward normal.
  - The origin is at the façade base centre on the outer wall face. The glazing sits at n = −reveal.
- **Angles:**
  - Incidence: θ = acos(ŝ·n̂).
  - Horizontal shadow angle: HSA = −atan2(ŝ·t̂, ŝ·n̂). For a vertical façade this equals solar azimuth − façade azimuth.
  - Vertical shadow (profile) angle: VSA = atan2(ŝ·ŵ, ŝ·n̂), so tan VSA = tan(alt)/cos(HSA).
- **Time:** clock time = standard time + DST, and UTC = clock − UTC offset − DST. EPW hours are local standard time, and record h covers (h−1, h].

## 4. Algorithms

**Solar position.** This is the NOAA Solar Calculator formulation (Meeus):
- From the Julian day it computes the Julian century, geometric mean longitude and anomaly, Earth-orbit eccentricity, equation of centre, and apparent longitude with nutation.
- It then computes the corrected obliquity, declination and equation of time.
- The hour angle comes from true solar time = UTC·60 + EoT + 4·longitude.
- Altitude includes the NOAA refraction model.
- Azimuth = atan2(sin H, cos H sin φ − tan δ cos φ) + 180°.
- Sunrise and sunset are iterated at zenith 90.833°.

**Direct-beam shading.** The method is projection plus polygon union. No visual estimation is involved.
- Each device element, and the window reveal, is an oriented box with a centre, three orthonormal axes and half-sizes. Blade tilt and fin rotation are rotations about t and w.
- The box's 8 vertices are projected along the sun vector onto the glazing plane using P = V − ((Vₙ − n_g)/sₙ)·s. The convex hull of those points is the box's exact shadow polygon.
- The shadow polygons are unioned and clipped to the window rectangle with a scan line. This is exact horizontally and uses 200–240 rows vertically.
- Sunlit fraction = 1 − union area / window area.
- If the sun is below the horizon or behind the façade (sₙ ≤ 0), no direct beam reaches the window.
- **Floor patch:** for each 0.10 m floor cell, a ray is cast toward the sun and intersected with the glazing. The cell is sunlit if that hit falls inside the window and outside every shadow polygon. Penetration depth is the furthest sunlit cell from the glazing.
- **Shading mask:** the same engine runs on a 3° sky grid and is overlaid on the sun-path diagram.
- **Blind cut-off tracking:** β = asin(s·cosφ / b) − φ.

**Daylight factor** (simplified and clearly labelled as such in the app):
- Under a CIE overcast sky, the sky component and externally reflected component are integrated over the window aperture, with device obstructions found by ray–box tests.
- The internally reflected component uses the BRE split-flux formula.
- The app also reports the BRE limiting depth and a 2.5 × head-height rule of thumb.

**Radiation and solar heat gain** (estimates):
- Inputs are DNI, DHI and GHI from a manual entry, an EPW file, or the ASHRAE 2009 clear-sky model with user-supplied τb and τd.
- Radiation on the glazing uses an isotropic sky (Liu–Jordan), with sky and ground view factors computed by cosine-weighted ray sampling that includes the devices.
- SHG = A·SHGC·Σ k(θ)·I, where k(θ) = 1 − b₀(1/cosθ − 1). Diffuse radiation uses the Brandemuehl–Beckman equivalent angles.

## 5. Assumptions and known limitations

- The model is a single façade bay with one rectangular window. Neighbouring buildings, terrain and self-shading from other parts of the building are not modelled.
- Devices are opaque boxes. Perforated, translucent, fabric and curved elements are not represented. Reflections from devices into the window are excluded from the radiation figures.
- Radiation uses an isotropic diffuse sky, so circumsolar diffuse is underestimated (Perez is not implemented). The daylight model uses the CIE overcast sky only.
- Glazing has a single angular modifier, with no frame and no spectral or layer-by-layer model. SHG is an instantaneous gain, not a cooling load, and ignores thermal mass.
- The interior floor is horizontal. Interior reveals and furniture are ignored, and the room footprint is approximate for tilted façades.
- DST is applied at day resolution, so the transition hour itself is not modelled. EPW hourly values are reused for each sub-hour step. A leap day uses the 28 Feb records.
- The daylight factor is an analytical estimate, typically within ±20–30 % of ray tracing for simple rooms. It is not a validated illuminance simulation.
- The annual floor-hour map is a clear-sky geometric potential, not LM-83 ASE.
- No weather data is built in, and no τ defaults are assumed. Radiation outputs appear only when the user supplies a source.

## 6. Validation test cases

The **Validation** tab runs these 31 checks; all pass.

| # | Case | Reference | Tolerance |
|---|---|---|---|
| 1–2 | NREL SPA reference: Golden CO, 2003-10-17 12:30:30 MST. Zenith 50.11162°, azimuth 194.34024° | Reda & Andreas 2004 | ±0.05° (achieved < 0.005°) |
| 3–4 | Declination at the 2026 solstice instants is ±23.436° | Astronomical almanac | ±0.01° |
| 5–6 | Equation of time on 11 Feb ≈ −14.2 min and on 3 Nov ≈ +16.4 min | Almanac | ±0.3 min |
| 7 | Day length at the equator at the equinox ≈ 12 h 07 min | Refraction theory | ±0.03 h |
| 8–9 | Taipei solar-noon altitude on 21 Jun = 90 − \|φ − δ\|, azimuth 180° | Geometry | ±0.02° |
| 10–13 | DST rules (EU, US, AU) on known dates | Calendars | exact |
| 14–16 | Incidence, HSA = az − az_f, tan VSA = tan alt / cos HSA | Analytical | 1e-6 |
| 17–18 | With no shading the window is 100 % sunlit; with the sun behind the façade there is no beam | Analytical | exact |
| 19–20 | Infinite overhang: shaded height = P·tanVSA. Also checked at oblique HSA | Analytical | ±0.3 % |
| 21 | Infinite side fins: shaded width = P·tanHSA | Analytical | ±0.3 % |
| 22 | Reveal: sunlit = (W − d tanHSA)(H − d tanVSA)/(WH) | Analytical | ±0.3 % |
| 23–24 | Louver cut-off at tanVSA = s/D; half-shaded at tanVSA = s/2D | Analytical | ±1 % |
| 25 | Blinds in cut-off mode block the beam completely | Analytical | ±0.5 % |
| 26–27 | Floor penetration depth = head/tanVSA; patch area = W·H/tanVSA | Analytical | ±0.03 m / ±0.06 m² |
| 28–29 | Sky view factor of a vertical window = 0.5; with 30° tilt = 0.75 | (1 + cos β)/2 | ±0.003 |
| 30–31 | Clear-sky closure GHI = DNI sin α + DHI; IAM(0°) = 1 | Model identity | 1e-9 |

## 7. Suggested integration architecture

```
             ┌────────────── Browser app (this file) ──────────────┐
 EPW ───────►│ core: solar · geometry · shading · DF · radiation    │──► CSV (params, time-series)
             │ UI / three.js / charts                               │──► scene.rad + grid.pts + run script
             └──────────────┬──────────────────────────────────────┘
                            │  JSON config (geometry as oriented boxes, glazing, site)
                            ▼
              ┌──────── Python service / notebook (optional) ────────┐
              │ honeybee-core / honeybee-radiance / honeybee-energy  │
              │  • Radiance: annual daylight (sDA300/50, ASE1000/250),│
              │    2-/3-phase with EPW (gendaymtx, rfluxmtx)          │
              │  • EnergyPlus: Shading:Building/Zone:Detailed from    │
              │    box faces, WindowMaterial:SimpleGlazingSystem      │
              │    (U, SHGC, VT), hourly zone loads                    │
              │  • ladybug: EPW parsing, sun path, radiation studies  │
              └──────────────────────────┬───────────────────────────┘
                                         ▼ results JSON → app charts / comparison
```

1. **One geometry kernel.** Every shading element is already an oriented box, which maps directly to:
   - Radiance polygons (the existing export)
   - EnergyPlus `Shading:Zone:Detailed` vertices
   - Honeybee `Shade` objects

   So export a single JSON schema and keep this core as the shared reference.
2. **Weather-file mode.** EPW import is already implemented. Add a TMYx/CWB loader and the Perez all-weather sky for anisotropic diffuse.
3. **Radiance.** Run the exported `run_radiance.sh` for point-in-time DF and lux. For sDA/ASE, use the Honeybee-Radiance `annual-daylight` recipe, or the 2-phase method (`rfluxmtx` + `dctimestep` + `gendaymtx`) with the same `grid.pts`.
4. **EnergyPlus.** Generate a single-zone IDF from the configuration via honeybee-energy or eppy:
   - simple glazing from U/SHGC/VT
   - shading surfaces from the boxes
   - hourly cooling loads

   Compare these with the app's SHG estimate for calibration.
5. **Grasshopper / Ladybug.** Read the same JSON in GhPython to rebuild the boxes, run LB Incident Radiation and HB Annual Daylight, and send results back as CSV/JSON.
6. **Calibration loop.** Use Radiance and EnergyPlus results to quantify the app's DF and SHG bias for each typology, and show those ranges in the UI as confidence bands.

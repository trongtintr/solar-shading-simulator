# Solar Shading & Daylight Simulator

An interactive, single-file web app for early-stage façade design. It computes the sun's position, how much direct sun parametric shading devices block from a window, the sun patch on the interior floor, an estimated daylight factor, and an estimated solar heat gain. It also runs period and annual analysis and compares shading configurations side by side.

- **Solar position:** NOAA / Meeus algorithm, checked against the NREL SPA reference case (error < 0.005°). Handles time zones and EU/US/AU daylight-saving rules.
- **Shading engine:** each device is projected onto the glazing plane along the sun vector, and the resulting polygons are combined and clipped to the window. It is tested against closed-form analytical cases.
- **Eight shading systems:** none, overhang, horizontal louvers, vertical fins, combined, egg-crate, external blinds (fixed angle or cut-off tracking), and custom JSON geometry.
- **Daylight factor:** CIE overcast sky with the BRE split-flux method. It is clearly labelled as a simplified estimate.
- **Radiation & solar heat gain:** inputs come from manual DNI/DHI/GHI values, an EPW weather file, or the ASHRAE 2009 clear-sky model. No weather data is built in.
- **Exports:** CSV (parameters and time series) and a Radiance scene with a sensor grid and run script, for lux, sDA and ASE.

## Quick start

Open `index.html` in a modern browser. It loads three.js from the jsDelivr CDN. You can also serve the folder locally:

```bash
npm run serve          # or: python -m http.server 8000
```

## Repository structure

```
├── index.html            # Built, self-contained app (GitHub Pages entry point) — do not edit by hand
├── src/
│   ├── core.mjs          # Calculation core: solar position, geometry, shading, daylight, radiation, EPW
│   ├── tests.mjs         # Validation suite (also shown in the app's Validation tab)
│   ├── app.js            # UI, three.js scene, charts, period/annual analysis, comparison, export
│   └── shell.html        # HTML/CSS template; the build injects the scripts here
├── scripts/build.mjs     # Bundles src/ → index.html
├── tests/run-tests.mjs   # Runs the validation suite in Node (exit code 1 on failure)
├── docs/METHODOLOGY.md   # Conventions, algorithms, assumptions, limitations, test cases, integration roadmap
└── .github/workflows/    # CI (tests + stale-build check) and GitHub Pages deployment
```

## Development

Requires Node ≥ 18. There are no npm dependencies.

```bash
npm test        # 31 validation cases
npm run build   # regenerate index.html from src/
```

Edit the files in `src/`, then run `npm run build` and commit the regenerated `index.html`. CI fails if `index.html` is out of date.

## Deploying to GitHub Pages

In the repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**. Each push to `main` then runs the tests and publishes the app at `https://<user>.github.io/<repo>/`.

## Documentation

Methodology, conventions, limitations, validation cases, and the plan for integrating EnergyPlus, Radiance and Ladybug Tools are in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## License

[MIT](LICENSE)

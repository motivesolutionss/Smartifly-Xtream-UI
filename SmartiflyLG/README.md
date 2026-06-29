# Smartifly LG

Smartifly LG is the LG webOS TV client in this repo. It ships as a dual-runtime app:

- `modern`: the React + TypeScript experience in [`src`](D:\Smartifly-Xtream-UI\SmartiflyLG\src)
- `legacy`: the compatibility app in [`src-legacy`](D:\Smartifly-Xtream-UI\SmartiflyLG\src-legacy)

The packaged app includes a gatekeeper in [`src-gatekeeper/index.html`](D:\Smartifly-Xtream-UI\SmartiflyLG\src-gatekeeper\index.html) that detects the TV browser engine and forwards users to the right runtime.

## Runtime Split

### Modern app

Use the modern app for newer LG browsers and desktop development.

- Stack: `React 19`, `TypeScript`, `Vite`, `zustand`, `hls.js`, `shaka-player`
- Source: [`src`](D:\Smartifly-Xtream-UI\SmartiflyLG\src)
- Main entry: [`src/main.tsx`](D:\Smartifly-Xtream-UI\SmartiflyLG\src\main.tsx)

Main feature areas:

- onboarding and login
- home, live, movies, series, search
- profiles, watchlist, settings
- player and subtitle services

### Legacy app

Use the legacy app for older LG engines that cannot reliably run the modern React bundle.

- Source: [`src-legacy`](D:\Smartifly-Xtream-UI\SmartiflyLG\src-legacy)
- Main entry: [`src-legacy/app.js`](D:\Smartifly-Xtream-UI\SmartiflyLG\src-legacy\app.js)
- Player vendor bundle: [`public/vendor/hls-0.14.17.min.js`](D:\Smartifly-Xtream-UI\SmartiflyLG\public\vendor\hls-0.14.17.min.js)

The legacy app is plain HTML/CSS/JS and is copied into `dist/legacy` during build.

## How Runtime Selection Works

The build produces three layers:

- `dist/index.html`: gatekeeper boot page
- `dist/modern/*`: modern React runtime
- `dist/legacy/*`: legacy compatibility runtime

The gatekeeper sends users to:

- `./modern/index.html` for newer engines
- `./legacy/index.html` for older engines

Current fallback rule:

- webOS with no Chrome version detected goes to `legacy`
- webOS with `Chrome < 68` goes to `legacy`
- non-webOS desktop browsers with `Chrome < 68` also go to `legacy`

## Project Layout

```text
SmartiflyLG/
  src/              modern LG app
  src-legacy/       legacy LG app
  src-gatekeeper/   runtime selector boot page
  public/           app metadata, icons, static vendor files
  docs/             validation and release notes
  dist/             build output
```

## Environment

Copy [`.env.example`](D:\Smartifly-Xtream-UI\SmartiflyLG\.env.example) to `.env` and adjust as needed.

```env
VITE_API_BASE_URL=http://localhost:5000/v1
VITE_SMARTIFLY_LIVE_FRESH_OPEN_TEST=false
CHROME38_COMPAT=false
```

Notes:

- `VITE_API_BASE_URL` is used by the modern app and also injected into the legacy build output.
- `CHROME38_COMPAT=true` forces the build to use the older HLS bundle and extra compatibility post-processing.

## Install

```bash
npm install
```

## Development

Run the modern Vite dev server:

```bash
npm run dev
```

This is best for:

- UI work
- React feature development
- API integration checks
- focus/navigation sanity checks in a desktop browser

## Build

Standard production build:

```bash
npm run build
```

Chrome 38 compatibility build:

```bash
npm run build:chrome38
```

What the build does:

- builds the modern React app
- inlines CSS for webOS file loading safety
- copies player vendor bundles
- transpiles the app bundle for older engines
- partitions output into `modern` and `legacy`
- injects the gatekeeper as the top-level entry page

## Preview

Preview the built output locally:

```bash
npm run start:legacy
```

Despite the script name, this previews the built app package so you can test the gatekeeper flow in a browser.

## webOS Packaging

Build package artifacts:

```bash
npm run webos:package
```

Hosted package artifact:

```bash
npm run webos:package:hosted
```

Install to a configured LG target:

```bash
npm run webos:install
```

Launch on device:

```bash
npm run webos:launch
```

App metadata lives in [`public/appinfo.json`](D:\Smartifly-Xtream-UI\SmartiflyLG\public\appinfo.json).

## Validation

Release validation guidance is documented in [`docs/TV_VALIDATION.md`](D:\Smartifly-Xtream-UI\SmartiflyLG\docs\TV_VALIDATION.md).

Before shipping, validate on a real LG TV for:

- live playback
- VOD playback
- series playback
- remote navigation and Back handling
- suspend/resume behavior
- packaged `.ipk` install and relaunch

## Quick Guidance

Use `src` when:

- building new features
- fixing UI bugs on supported modern LG browsers
- improving routing, state, or player UX

Use `src-legacy` when:

- fixing issues on older LG TVs
- debugging low-capability browser behavior
- changing the compatibility login/catalog/player flow

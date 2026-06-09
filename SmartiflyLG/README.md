# Smartifly LG

LG webOS TV version of the Smartifly TV app. This build is packaged as a plain webOS-friendly static app so the emulator can load it directly from `file://` without ES module CORS issues.

## LG webOS Emulator Package

```sh
npm run webos:package
npm run webos:install
npm run webos:launch
```

The first screen mirrors the existing Android TV app's branded preloader and login experience, with D-pad focus support for LG remote testing.

### Hosted wrapper mode

If the emulator blocks the packaged `file://` app, use the hosted wrapper package instead:

```sh
npm run build
node dev-server.mjs
npm run webos:package:hosted
```

The hosted wrapper redirects to `http://10.20.30.30:4173/`, which serves the built `dist/` files over HTTP instead of `file://`.

## Local Development

Create a `.env` file from `.env.example` so the LG app points at the local backend:

```sh
VITE_API_BASE_URL=http://localhost:5000/v1
```

The backend public routes are mounted under `/v1/public`, so the LG login proxy resolves to `http://localhost:5000/v1/public/xtream/login` during local Vite development.

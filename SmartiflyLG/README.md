# Smartifly LG

LG webOS TV version of the Smartifly TV app. This build is packaged as a plain webOS-friendly static app so the emulator can load it directly from `file://` without ES module CORS issues.

## LG webOS Emulator Package

```sh
npm run webos:package
npm run webos:install
npm run webos:launch
```

The first screen mirrors the existing Android TV app's branded preloader and login experience, with D-pad focus support for LG remote testing.

## Local Development

Create a `.env` file from `.env.example` so the LG app points at the local backend:

```sh
VITE_API_BASE_URL=http://localhost:5000/v1
```

The backend public routes are mounted under `/v1/public`, so the LG login proxy resolves to `http://localhost:5000/v1/public/xtream/login` during local Vite development.

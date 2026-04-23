# Smartifly TV

Android TV / Fire TV React Native client.

This app owns its screens, navigation, visual components, theme, styling, assets, and Android native project. Shared server/API/state functionality comes from `@smartifly/shared`.

## Run

From `Smartifly/tv`:

```sh
npm start
npm run android
```

From the monorepo root:

```sh
npm run tv:start
npm run tv:android
```

## Boundary

- TV UI belongs in `src/screens/tv`, `src/components/tv`, `src/theme`, and `src/assets`.
- Shared functionality belongs in `../shared`.
- Do not add screens, navigation, or visual components from another client to this app.

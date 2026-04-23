# Smartifly Monorepo

This folder splits the React Native clients into separate apps:

- `mobile`: phone/tablet APK entry point and native Android project
- `tv`: Android TV / Fire TV APK entry point and native Android project
- `shared`: extracted shared functionality such as API clients, stores, services, utilities, config, and shared types

Install dependencies from this folder:

```sh
npm install
```

Run mobile:

```sh
npm run mobile:android
```

Run TV:

```sh
npm run tv:android
```

The app entry points are intentionally separate. `mobile/src/AppRoot.tsx` renders `MobileNavigator`, and `tv/src/AppRoot.tsx` renders `TVNavigator`, so each APK can build without runtime switching between mobile and TV surfaces.

UI code is app-owned. Components, navigation, screens, native platform folders, visual assets, and theme/styling stay inside `mobile` or `tv`. Shared code should stay limited to cross-platform functionality.

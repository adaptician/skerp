# Common

Shared code used across features (angular.md → Shared / Common Elements). Nothing here imports from
`features/`.

| Folder | Holds |
|---|---|
| `components/` | Shared presentational components, prefixed `a-`, each mirroring a Figma master: `a-header` (Navigation/Header), `a-toggle` (Control/Toggle), `a-card` (Card/Default), `a-brand-lockup` (Brand/Lockup), `a-avatar` (Media/Avatar), `a-icon` (Icon/*), `a-popup` and `a-popup-host` (Feedback/*Popup), `a-modal` (Overlay/Modal), `a-confirm-modal` (Overlay/ConfirmModal), `a-status-pill` (Status/*), `a-pill-removable` (Feedback/PillRemovable), `a-action-menu` (Button/Actions + Menu/Actions; items may be `danger` or `disabled`), `a-typeahead-menu` (Menu/Typeahead), `a-demo-note` (Feedback/DemoNote), `a-info-tip` (Icon/Info + Overlay/Tooltip) |
| `services/` | `ApiClient`, `NotificationService`, `DemoModeStorageService`, `FeatureService` (release toggles from `GET /api/v1/features`) |
| `guards/` | `featureEnabled(feature)`: a `canMatch` guard mirroring a server release toggle |
| `pipes/` | `MoneyPipe`: symbol, space-grouped thousands, 2–4 decimals; display only |
| `interceptors/` | `apiErrorInterceptor`: API failures → `ApiError` + error popup |
| `models/` | `ApiResult`, `ApiError` |
| `state/demo-mode/` | The app-wide Demo Mode slice: off by default, restored from and persisted to local storage. Read it with `selectDemoModeEnabled`. |

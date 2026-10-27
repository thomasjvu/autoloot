# Steez UI standalone progress

Source: https://steez-ui-6v5.pages.dev/copy/steez/loading-progress-bar.tsx
Retrieved 2026-10-26. MIT license retained alongside the unmodified standalone source.

Autoloot's vanilla adaptation lives in `public/progress-bar.js`; styling is scoped to `.steez-progress` in `public/street.css`. No React or Steez npm package is required. The adaptation retains 20 segments, -15 degree skew, bounded finite percentage, accessible progress semantics, and reduced-motion support. Responsive single-row sizing and Autoloot's display font replace upstream wrapping/monospace formatting.

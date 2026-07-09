/**
 * Inlined in layout.tsx so the calculator stays readable even when
 * /_next/static/css/app/layout.css 404s (stale .next cache).
 */
export const CRITICAL_CSS = `
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  min-height: 100vh;
  background: #0a0a0f;
  color: #f0f0f5;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

main {
  display: block;
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1, h2, h3, p { margin: 0; }

button, input, select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  border: none;
  background: transparent;
}

/* ---- Form fields ---- */
.bio-field {
  display: block;
}

.bio-field + .bio-field,
.bio-form-grid > .bio-field {
  min-width: 0;
}

.bio-field__label-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.4rem;
  margin-bottom: 0.4rem;
}

.bio-field__label {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.62);
}

.bio-field__unit {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 400;
  text-transform: none;
  color: rgba(255, 255, 255, 0.38);
}

.bio-field__hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.38);
}

.bio-field__control {
  display: block;
  width: 100%;
  margin-top: 0;
  padding: 0.5rem 0.75rem;
  background: #111114;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.bio-field__control:focus {
  outline: none;
  border-color: rgba(0, 249, 255, 0.55);
  box-shadow: 0 0 0 1px rgba(0, 249, 255, 0.25);
}

.bio-field__control::placeholder {
  color: rgba(248, 113, 113, 0.85);
  font-style: italic;
}

/* ---- Layout grids ---- */
.bio-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .bio-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .bio-form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.bio-stack > * + * { margin-top: 1rem; }
.bio-stack-lg > * + * { margin-top: 1.5rem; }

.bio-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.bio-row-between {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.bio-check-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.4;
}

.bio-check-row input[type="checkbox"] {
  margin-top: 0.15rem;
  flex-shrink: 0;
}

/* ---- Sections / cards ---- */
.bio-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #00f9ff;
  margin-bottom: 0.5rem;
}

.bio-section-note {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.42);
  margin-bottom: 0.75rem;
  line-height: 1.45;
}

.bio-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  background: rgba(17, 17, 20, 0.55);
  overflow: hidden;
}

.bio-card__header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.82);
  text-align: left;
}

.bio-card__body {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* ---- Tabs ---- */
.bio-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 0.75rem;
  background: #111114;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.bio-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.52);
  border: 1px solid transparent;
  white-space: nowrap;
}

.bio-tab--active {
  color: #00f9ff;
  background: rgba(0, 249, 255, 0.12);
  border-color: rgba(0, 249, 255, 0.28);
}

/* ---- Buttons ---- */
.bio-btn-primary {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #00f9ff;
  background: rgba(0, 249, 255, 0.12);
  border: 1px solid rgba(0, 249, 255, 0.45);
}

.bio-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

/* ---- Disclaimer modal ---- */
.bio-disclaimer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.88);
  pointer-events: auto;
}

.bio-disclaimer-panel {
  width: 100%;
  max-width: 28rem;
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: #111114;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.45);
}

.bio-disclaimer-panel > * + * { margin-top: 1rem; }

.bio-disclaimer-panel p {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.55;
}

.bio-disclaimer-accept {
  display: block;
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #00f9ff;
  background: rgba(0, 249, 255, 0.12);
  border: 1px solid rgba(0, 249, 255, 0.38);
  cursor: pointer;
  pointer-events: auto;
}

#brok-app-main[hidden] {
  display: none !important;
}

/* ---- Header ---- */
.bio-app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.bio-app-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.bio-app-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 0.15rem;
}

.bio-accent { color: #00f9ff; }

/* Tailwind utility fallbacks when bundle 404s */
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.block { display: block; }
.hidden { display: none; }
.flex-wrap { flex-wrap: wrap; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }
.space-y-1\\.5 > * + * { margin-top: 0.375rem; }
.w-full { width: 100%; }
.min-h-screen { min-height: 100vh; }
.max-w-5xl { max-width: 64rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-2xl { font-size: 1.5rem; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: 0.04em; }
.tabular-nums { font-variant-numeric: tabular-nums; }
.opacity-40 { opacity: 0.4; }
.pointer-events-none { pointer-events: none; }
.select-none { user-select: none; }

@media (min-width: 640px) {
  .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .sm\\:flex-row { flex-direction: row; }
  .sm\\:items-center { align-items: center; }
  .sm\\:justify-between { justify-content: space-between; }
  .sm\\:col-span-2 { grid-column: span 2 / span 2; }
  .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .lg\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
  .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
`;
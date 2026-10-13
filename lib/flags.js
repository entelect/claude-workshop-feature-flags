// Static flag store. In a real system this would live in a database.
// 12 flags across dev/staging/prod. Some keys repeat across environments
// (that's normal — a flag typically exists in all three).

export const FLAGS = [
  // --- dev: move fast, everything on ---
  { key: 'new-checkout',    env: 'dev',     enabled: true,  rolloutPercent: 100, description: 'Redesigned checkout flow with single-page form',       owner: 'payments-team' },
  { key: 'dark-mode',       env: 'dev',     enabled: true,  rolloutPercent: 100, description: 'System-aware dark theme across the app',               owner: 'design-systems' },
  { key: 'beta-search',     env: 'dev',     enabled: true,  rolloutPercent: 100, description: 'Typeahead search with fuzzy matching',                 owner: 'search-team' },
  { key: 'ai-recommendations', env: 'dev',  enabled: true,  rolloutPercent: 100, description: 'ML-backed product recommendations on the home feed',   owner: 'ml-platform' },

  // --- staging: graduated rollouts, some off ---
  { key: 'new-checkout',    env: 'staging', enabled: true,  rolloutPercent: 50, description: 'Redesigned checkout flow with single-page form',       owner: 'payments-team' },
  { key: 'dark-mode',       env: 'staging', enabled: true,  rolloutPercent: 100, description: 'System-aware dark theme across the app',               owner: 'design-systems' },
  { key: 'beta-search',     env: 'staging', enabled: true,  rolloutPercent: 25,  description: 'Typeahead search with fuzzy matching',                 owner: 'search-team' },
  { key: 'ai-recommendations', env: 'staging', enabled: false, rolloutPercent: 0, description: 'ML-backed product recommendations on the home feed',  owner: 'ml-platform' },

  // --- prod: conservative ---
  { key: 'dark-mode',       env: 'prod',    enabled: true,  rolloutPercent: 100, description: 'System-aware dark theme across the app',               owner: 'design-systems' },
  { key: 'legacy-export',   env: 'prod',    enabled: true,  rolloutPercent: 50,  description: 'CSV export from the reports page (being deprecated)',  owner: 'data-team' },
  { key: 'new-checkout',    env: 'prod',    enabled: true,  rolloutPercent: 25,  description: 'Redesigned checkout flow with single-page form',       owner: 'payments-team' },
  { key: 'beta-search',     env: 'prod',    enabled: true,  rolloutPercent: 10,  description: 'Typeahead search with fuzzy matching',                 owner: 'search-team' },
];

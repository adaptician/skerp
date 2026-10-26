/**
 * Production configuration. Values that differ between environments live here, never in source
 * (client.md → Environment Configuration). The development build swaps in environment.development.ts.
 */
export const environment = {
  /** Base path of the versioned API, relative to the page's origin (the dev server proxies it). */
  apiBaseUrl: '/api/v1',
  /**
   * The developer credited on the welcome screen. Placeholders until supplied: set the name, a
   * photo URL (or null for the placeholder avatar) and the two links.
   */
  developer: {
    name: '[Tyler Pieterse]',
    role: 'Software Engineer',
    photoUrl: '/marketing/developer-avatar.png',
    linkedInUrl: 'https://www.linkedin.com/in/tech-by-tyler/',
  },
};

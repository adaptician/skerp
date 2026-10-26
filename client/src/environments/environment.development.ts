/**
 * Local development configuration (`ng serve`). `/api` is proxied to the API on
 * http://localhost:5000 by proxy.conf.json. Keep the shape identical to environment.ts.
 */
export const environment = {
  apiBaseUrl: '/api/v1',
  developer: {
    name: '[Tyler Pieterse]',
    role: 'Software Engineer',
    photoUrl: '/marketing/developer-avatar.png',
    linkedInUrl: 'https://www.linkedin.com/in/tech-by-tyler/',
  },
};

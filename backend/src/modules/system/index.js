/**
 * System module
 * Provides API endpoints for Docker system information
 */

import { createSystemRoutes } from './routes.js';

export default {
  name: 'system',

  init(context) {
    // No initialization needed for system module
  },

  registerRoutes(app, context) {
    const routes = createSystemRoutes(context.docker);
    app.use('/api/system', routes);
  },
};

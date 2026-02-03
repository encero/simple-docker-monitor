/**
 * Containers module
 * Provides API endpoints for Docker container management
 */

import { createContainerRoutes } from './routes.js';
import { createContainerService } from './container-service.js';

let containerService = null;

export default {
  name: 'containers',

  init(context) {
    containerService = createContainerService(context.docker);
  },

  registerRoutes(app, context) {
    const routes = createContainerRoutes(context.docker);
    app.use('/api/containers', routes);
  },

  getService() {
    return containerService;
  },
};

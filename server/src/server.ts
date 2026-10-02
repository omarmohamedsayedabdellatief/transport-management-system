import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

const server = app.listen(config.port, process.env.HOST || '127.0.0.1', () => {
  console.log(`🚀 TMS API Server running on port ${config.port} [${config.nodeEnv}]`);
  console.log(`📡 Health endpoint: http://localhost:${config.port}/health`);
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));

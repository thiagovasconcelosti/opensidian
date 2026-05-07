import { OpenSidianServer } from './server.js';
import { Config } from './shared/types.js';

const config: Partial<Config> = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  vaults: {
    defaultPath: process.env.VAULT_PATH || './vaults',
    autoOpen: true,
  },
  sync: {
    enabled: process.env.SYNC_ENABLED !== 'false',
    port: parseInt(process.env.SYNC_PORT || '3001', 10),
  },
  plugins: {
    enabled: process.env.PLUGINS_ENABLED !== 'false',
    paths: process.env.PLUGIN_PATHS?.split(',') || ['./plugins'],
  },
};

const server = new OpenSidianServer(config);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.stop();
  process.exit(0);
});

server.start();

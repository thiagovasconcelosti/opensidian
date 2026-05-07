import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { existsSync } from 'fs';
import { WebSocketServer } from 'ws';
import routes from './api/routes.js';
import authRoutes from './api/auth.js';
import themeRoutes from './api/themes.js';
import { SyncService } from './core/sync.js';
import { Config } from './shared/types.js';

export class OpenSidianServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private syncService: SyncService;
  private port: number;
  private host: string;

  constructor(config: Partial<Config> = {}) {
    this.port = config.server?.port || 3000;
    this.host = config.server?.host || '0.0.0.0';
    this.syncService = new SyncService(config.sync?.port || 3001);
    
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.use('/api', routes);
    this.app.use('/auth', authRoutes);
    this.app.use('/api/themes', themeRoutes);

    const webDist = path.resolve(process.cwd(), 'web', 'dist');
    if (existsSync(webDist)) {
      this.app.use(express.static(webDist));
      this.app.get('*', (_req, res) => {
        res.sendFile(path.join(webDist, 'index.html'));
      });
    }
  }

  start(): void {
    this.httpServer = createServer(this.app);

    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on('connection', (socket) => {
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('WebSocket message:', message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });
    });

    this.syncService.start();

    this.httpServer.listen(this.port, this.host, () => {
      console.error(`OpenSidian server running at http://${this.host}:${this.port}`);
    });
  }

  stop(): void {
    this.syncService.stop();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
  }
}

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface SyncMessage {
  type: 'note_created' | 'note_updated' | 'note_deleted' | 'sync_request' | 'sync_response';
  vaultPath?: string;
  note?: {
    path: string;
    content?: string;
    timestamp?: string;
  };
  timestamp?: string;
}

interface Client {
  id: string;
  socket: WebSocket;
  subscribedVaults: Set<string>;
}

export class SyncService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = 3001) {
    super();
    this.port = port;
  }

  start(): void {
    if (this.isRunning) return;

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (socket) => {
      const clientId = this.generateClientId();
      const client: Client = {
        id: clientId,
        socket,
        subscribedVaults: new Set(),
      };
      this.clients.set(clientId, client);

      socket.on('message', (data) => {
        try {
          const message: SyncMessage = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          console.error('Invalid sync message:', error);
        }
      });

      socket.on('close', () => {
        this.clients.delete(clientId);
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });

    this.isRunning = true;
    console.error(`Sync service running on port ${this.port}`);
  }

  stop(): void {
    if (!this.isRunning) return;

    for (const client of this.clients.values()) {
      client.socket.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.isRunning = false;
  }

  broadcastChange(message: SyncMessage): void {
    const vaultPath = message.note?.path 
      ? message.note.path.split('/')[0] 
      : undefined;
    
    const fullMessage: SyncMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    for (const client of this.clients.values()) {
      if (vaultPath && client.subscribedVaults.has(vaultPath)) {
        this.sendToClient(client, fullMessage);
      } else if (!vaultPath) {
        this.sendToClient(client, fullMessage);
      }
    }

    this.emit('change', fullMessage);
  }

  subscribeToVault(clientId: string, vaultPath: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.subscribedVaults.add(vaultPath);
    return true;
  }

  unsubscribeFromVault(clientId: string, vaultPath: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.subscribedVaults.delete(vaultPath);
    return true;
  }

  private handleMessage(client: Client, message: SyncMessage): void {
    switch (message.type) {
      case 'sync_request':
        this.handleSyncRequest(client, message);
        break;
      case 'note_created':
      case 'note_updated':
      case 'note_deleted':
        this.broadcastChange(message);
        break;
    }
  }

  private handleSyncRequest(client: Client, _message: SyncMessage): void {
    // Send acknowledgment with current state
    const response: SyncMessage = {
      type: 'sync_response',
      timestamp: new Date().toISOString(),
    };
    this.sendToClient(client, response);
  }

  private sendToClient(client: Client, message: SyncMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}

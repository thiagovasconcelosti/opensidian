import net from 'net';
import { WebSocket } from 'ws';
import { OpenSidianServer } from '../src/server.js';

async function getFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to allocate port'));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('OpenSidianServer', () => {
  it('starts, serves health, handles websocket messages and stops', async () => {
    const port = await getFreePort();
    const syncPort = await getFreePort();
    const server = new OpenSidianServer({
      server: { port, host: '127.0.0.1' },
      sync: { enabled: true, port: syncPort },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    server.start();
    await wait(100);

    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toEqual(
      expect.objectContaining({ status: 'ok' })
    );

    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', (error) => reject(error));
    });

    socket.send(JSON.stringify({ hello: 'world' }));
    socket.send('not-json');
    await wait(50);

    expect(logSpy).toHaveBeenCalledWith('WebSocket message:', { hello: 'world' });
    expect(errorSpy).toHaveBeenCalled();

    socket.close();
    server.stop();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('stops safely even when never started', () => {
    const server = new OpenSidianServer();
    expect(() => server.stop()).not.toThrow();
  });
});

import express from 'express';
import fs from 'fs/promises';
import { createServer, type Server } from 'http';
import os from 'os';
import path from 'path';
import themeRoutes from '../../src/api/themes.js';

describe('Theme routes', () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;
  const originalDataDir = process.env.OPENSIDIAN_DATA_DIR;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opensidian-themes-'));
    process.env.OPENSIDIAN_DATA_DIR = tmpDir;

    const app = express();
    app.use(express.json());
    app.use('/api/themes', themeRoutes);

    server = createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to start test server');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    process.env.OPENSIDIAN_DATA_DIR = originalDataDir;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('lists, creates and deletes custom themes', async () => {
    const listEmpty = await fetch(`${baseUrl}/api/themes`);
    expect(listEmpty.status).toBe(200);
    expect((await listEmpty.json()).themes).toEqual([]);

    const badCreate = await fetch(`${baseUrl}/api/themes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(badCreate.status).toBe(400);

    const create = await fetch(`${baseUrl}/api/themes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Meu Tema', variables: { '--bg': '#000' } }),
    });
    expect(create.status).toBe(201);

    const listAfterCreate = await fetch(`${baseUrl}/api/themes`);
    expect(listAfterCreate.status).toBe(200);
    expect((await listAfterCreate.json()).themes).toEqual([
      { name: 'Meu Tema', variables: { '--bg': '#000' } },
    ]);

    const deleteMissing = await fetch(`${baseUrl}/api/themes/nao-existe`, { method: 'DELETE' });
    expect(deleteMissing.status).toBe(404);

    const deleteOk = await fetch(`${baseUrl}/api/themes/meu-tema`, { method: 'DELETE' });
    expect(deleteOk.status).toBe(204);
  });
});


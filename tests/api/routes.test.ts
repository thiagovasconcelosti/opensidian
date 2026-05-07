import express from 'express';
import fs from 'fs/promises';
import { createServer, type Server } from 'http';
import os from 'os';
import path from 'path';
import routes from '../../src/api/routes.js';

describe('API routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', routes);

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
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('lists vaults and validates required params', async () => {
    const listResponse = await fetch(`${baseUrl}/api/vaults`);
    expect(listResponse.status).toBe(200);
    expect(Array.isArray((await listResponse.json()).vaults)).toBe(true);

    const createResponse = await fetch(`${baseUrl}/api/vaults`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(createResponse.status).toBe(400);
    expect(await createResponse.json()).toEqual({
      error: 'name and path are required',
    });

    const notFoundResponse = await fetch(`${baseUrl}/api/vaults/does-not-exist`);
    expect(notFoundResponse.status).toBe(404);

    const deleteResponse = await fetch(`${baseUrl}/api/vaults/any`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(501);
  });

  it('executes the note lifecycle and graph endpoints', async () => {
    const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'opensidian-routes-'));

    const vaultResponse = await fetch(`${baseUrl}/api/vaults`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Routes Vault', path: vaultPath }),
    });
    expect(vaultResponse.status).toBe(201);

    const missingVaultResponse = await fetch(`${baseUrl}/api/notes`);
    expect(missingVaultResponse.status).toBe(400);

    const secondNoteResponse = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vaultPath,
        filename: 'second',
        content: '# Second',
      }),
    });
    expect(secondNoteResponse.status).toBe(201);

    const createNoteResponse = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vaultPath,
        filename: 'first',
        content: '# First\n\nSee [[second]] for more.',
      }),
    });
    expect(createNoteResponse.status).toBe(201);

    const listNotesResponse = await fetch(
      `${baseUrl}/api/notes?${new URLSearchParams({ vault: vaultPath }).toString()}`
    );
    expect(listNotesResponse.status).toBe(200);
    expect((await listNotesResponse.json()).notes.length).toBeGreaterThan(0);

    const readNoteResponse = await fetch(
      `${baseUrl}/api/notes/first.md?${new URLSearchParams({ vault: vaultPath }).toString()}`
    );
    expect(readNoteResponse.status).toBe(200);
    expect((await readNoteResponse.json()).note.filename).toBe('first');

    const missingNoteResponse = await fetch(
      `${baseUrl}/api/notes/missing.md?${new URLSearchParams({ vault: vaultPath }).toString()}`
    );
    expect(missingNoteResponse.status).toBe(404);

    const updateMissingContentResponse = await fetch(
      `${baseUrl}/api/notes/first.md?${new URLSearchParams({ vault: vaultPath }).toString()}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    expect(updateMissingContentResponse.status).toBe(400);

    const updateNoteResponse = await fetch(
      `${baseUrl}/api/notes/first.md?${new URLSearchParams({ vault: vaultPath }).toString()}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: '# Updated\n\nStill linked to [[second]].' }),
      }
    );
    expect(updateNoteResponse.status).toBe(200);

    const graphMissingVaultResponse = await fetch(`${baseUrl}/api/graph`);
    expect(graphMissingVaultResponse.status).toBe(400);

    const graphResponse = await fetch(
      `${baseUrl}/api/graph?${new URLSearchParams({ vault: vaultPath }).toString()}`
    );
    expect(graphResponse.status).toBe(200);
    expect((await graphResponse.json()).graph.metadata.totalNotes).toBeGreaterThan(0);

    const neighborsResponse = await fetch(
      `${baseUrl}/api/graph/neighbors/first.md?${new URLSearchParams({ vault: vaultPath }).toString()}`
    );
    expect(neighborsResponse.status).toBe(200);
    expect((await neighborsResponse.json()).neighbors).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'second.md' })])
    );

    const deleteNoteResponse = await fetch(
      `${baseUrl}/api/notes/first.md?${new URLSearchParams({ vault: vaultPath }).toString()}`,
      {
        method: 'DELETE',
      }
    );
    expect(deleteNoteResponse.status).toBe(204);

    await fs.rm(vaultPath, { recursive: true, force: true });
  });
});

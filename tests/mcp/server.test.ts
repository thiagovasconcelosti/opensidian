import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { handleToolCall, tools } from '../../src/mcp/server.js';

function parseToolResponse(result: Awaited<ReturnType<typeof handleToolCall>>) {
  const first = result.content[0];
  if (first?.type !== 'text') {
    throw new Error('Unexpected MCP response');
  }

  return first.text;
}

describe('MCP server', () => {
  it('exposes the expected tools', () => {
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'vault_list',
        'vault_open',
        'vault_create',
        'note_create',
        'note_read',
        'note_update',
        'note_delete',
        'note_search',
        'graph_get',
        'graph_neighbors',
      ])
    );
  });

  it('handles vault, note and graph operations', async () => {
    const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'opensidian-mcp-'));

    const createVault = await handleToolCall('vault_create', {
      name: 'MCP Vault',
      path: vaultPath,
    });
    expect(createVault.isError).toBeUndefined();
    expect(JSON.parse(parseToolResponse(createVault))).toEqual(
      expect.objectContaining({ name: 'MCP Vault', path: vaultPath })
    );

    const openVault = await handleToolCall('vault_open', { path: vaultPath });
    expect(JSON.parse(parseToolResponse(openVault))).toEqual(
      expect.objectContaining({ path: vaultPath })
    );

    await handleToolCall('note_create', {
      vaultPath,
      filename: 'second',
      content: '# Second',
    });

    const createNote = await handleToolCall('note_create', {
      vaultPath,
      filename: 'first',
      content: '# First\n\nSee [[second]] for details.',
    });
    expect(JSON.parse(parseToolResponse(createNote))).toEqual(
      expect.objectContaining({ filename: 'first' })
    );

    const readNote = await handleToolCall('note_read', {
      vaultPath,
      path: 'first.md',
    });
    expect(JSON.parse(parseToolResponse(readNote))).toEqual(
      expect.objectContaining({ filename: 'first' })
    );

    const updateNote = await handleToolCall('note_update', {
      vaultPath,
      path: 'first.md',
      content: '# Updated\n\nSee [[second]].',
    });
    expect(JSON.parse(parseToolResponse(updateNote))).toEqual(
      expect.objectContaining({ filename: 'first' })
    );

    const searchNotes = await handleToolCall('note_search', {
      vaultPath,
      query: 'updated',
    });
    expect(JSON.parse(parseToolResponse(searchNotes))).toHaveLength(1);

    const graph = await handleToolCall('graph_get', { vaultPath });
    expect(JSON.parse(parseToolResponse(graph))).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({ totalNotes: expect.any(Number) }),
      })
    );

    const neighbors = await handleToolCall('graph_neighbors', {
      vaultPath,
      path: 'first.md',
    });
    expect(JSON.parse(parseToolResponse(neighbors))).toEqual(expect.any(Array));

    const deleteNote = await handleToolCall('note_delete', {
      vaultPath,
      path: 'first.md',
    });
    expect(JSON.parse(parseToolResponse(deleteNote))).toEqual({ success: true });

    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  it('returns typed errors for invalid or unknown tools', async () => {
    const invalidArgs = await handleToolCall('vault_open', {});
    expect(invalidArgs.isError).toBe(true);

    const unknownTool = await handleToolCall('not-a-tool', {});
    expect(unknownTool.isError).toBe(true);
    expect(parseToolResponse(unknownTool)).toContain('Unknown tool');
  });
});

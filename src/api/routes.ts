import express, { Request, Response, NextFunction } from 'express';
import { VaultManager } from '../core/vault.js';
import { GraphEngine } from '../core/graph.js';

const router = express.Router();
const vaultManager = new VaultManager();
const graphEngine = new GraphEngine();

router.get('/vaults', (_req: Request, res: Response) => {
  const vaults = vaultManager.listVaults();
  return res.json({ vaults });
});

router.post('/vaults', (req: Request, res: Response) => {
  const { name, path } = req.body;
  if (!name || !path) {
    return res.status(400).json({ error: 'name and path are required' });
  }
  const vault = vaultManager.createVault(name, path);
  return res.status(201).json({ vault });
});

router.get('/vaults/:id', (req: Request, res: Response) => {
  const vault = vaultManager.openVault(req.params.id);
  if (!vault) {
    return res.status(404).json({ error: 'Vault not found' });
  }
  return res.json({ vault });
});

router.delete('/vaults/:id', (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Not implemented' });
});

router.get('/notes', (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  if (!vaultPath) {
    return res.status(400).json({ error: 'vault query parameter is required' });
  }
  const vault = vaultManager.openVault(vaultPath);
  if (!vault) {
    return res.status(404).json({ error: 'Vault not found' });
  }
  return res.json({ notes: vault.notes });
});

router.post('/notes', async (req: Request, res: Response) => {
  const { vaultPath, filename, content } = req.body;
  if (!vaultPath || !filename || !content) {
    return res.status(400).json({ error: 'vaultPath, filename, and content are required' });
  }
  const note = await vaultManager.createNote(vaultPath, filename, content);
  graphEngine.indexNote(vaultPath, note);
  return res.status(201).json({ note });
});

router.get('/notes/search', async (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  const q = req.query.q as string;
  if (!vaultPath || !q) {
    return res.status(400).json({ error: 'vault and q parameters are required' });
  }
  const tag = req.query.tag as string | undefined;
  const after = req.query.after as string | undefined;
  const before = req.query.before as string | undefined;
  const hasBacklinks = req.query.hasBacklinks === 'true' ? true : req.query.hasBacklinks === 'false' ? false : undefined;
  const results = await vaultManager.fullTextSearch(vaultPath, q, { tag, after, before, hasBacklinks });
  return res.json({ results });
});

router.get('/notes/:path(*)', async (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  if (!vaultPath) {
    return res.status(400).json({ error: 'vault query parameter is required' });
  }
  const note = await vaultManager.readNote(vaultPath, req.params.path);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  return res.json({ note });
});

router.put('/notes/:path(*)', async (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  const { content } = req.body;
  if (!vaultPath) {
    return res.status(400).json({ error: 'vault query parameter is required' });
  }
  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }
  const note = await vaultManager.updateNote(vaultPath, req.params.path, content);
  graphEngine.indexNote(vaultPath, note);
  return res.json({ note });
});

router.delete('/notes/:path(*)', async (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  if (!vaultPath) {
    return res.status(400).json({ error: 'vault query parameter is required' });
  }
  await vaultManager.deleteNote(vaultPath, req.params.path);
  graphEngine.removeNote(vaultPath, req.params.path);
  return res.status(204).send();
});

router.get('/graph', (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  if (!vaultPath) {
    return res.status(400).json({ error: 'vault query parameter is required' });
  }
  const graph = graphEngine.getGraph(vaultPath);
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  return res.json({ graph });
});

router.get('/graph/neighbors/:path(*)', (req: Request, res: Response) => {
  const vaultPath = req.query.vault as string;
  if (!vaultPath) {
    return res.status(400).json({ error: 'vault query parameter is required' });
  }
  const neighbors = graphEngine.getNeighbors(vaultPath, req.params.path);
  return res.json({ neighbors });
});

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  return res.status(500).json({ error: err.message || 'Internal server error' });
});

export default router;

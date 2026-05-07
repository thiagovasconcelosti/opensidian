import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

function getThemesDir(): string {
  const dataDir = process.env.OPENSIDIAN_DATA_DIR
    ? path.resolve(process.env.OPENSIDIAN_DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'themes');
}

interface CustomTheme {
  name: string;
  variables: Record<string, string>;
}

async function ensureDir() {
  await fs.mkdir(getThemesDir(), { recursive: true });
}

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureDir();
    const themesDir = getThemesDir();
    const files = await fs.readdir(themesDir);
    const themes: CustomTheme[] = [];
    for (const f of files) {
      if (f.endsWith('.json')) {
        const data = await fs.readFile(path.join(themesDir, f), 'utf-8');
        themes.push(JSON.parse(data));
      }
    }
    res.json({ themes });
  } catch {
    res.json({ themes: [] });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, variables } = req.body as CustomTheme;
  if (!name || !variables) {
    res.status(400).json({ error: 'name e variables são obrigatórios' });
    return;
  }
  await ensureDir();
  const filename = name.toLowerCase().replace(/\s+/g, '-') + '.json';
  await fs.writeFile(
    path.join(getThemesDir(), filename),
    JSON.stringify({ name, variables }, null, 2)
  );
  res.status(201).json({ theme: { name, variables } });
});

router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const filename = req.params.name.toLowerCase().replace(/\s+/g, '-') + '.json';
    await fs.unlink(path.join(getThemesDir(), filename));
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Tema não encontrado' });
  }
});

export default router;

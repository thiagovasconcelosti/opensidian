import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

if (process.env.CI || process.env.NODE_ENV === 'production' || process.env.HUSKY === '0') {
  process.exit(0);
}

const huskyBin = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'husky.cmd' : 'husky');
if (!existsSync(huskyBin)) {
  process.exit(0);
}

const result = spawnSync(huskyBin, ['install'], { stdio: 'inherit' });
process.exit(result.status ?? 0);


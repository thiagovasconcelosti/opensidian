import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';

interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

const users: User[] = [];
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

function createToken(payload: Record<string, string | number>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: Date.now() }));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (signature !== parts[2]) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }
  const payload = verifyToken(header.slice(7));
  if (!payload || !payload.userId) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
  (req as Request & { user: { userId: string; email: string } }).user = {
    userId: payload.userId as string,
    email: payload.email as string,
  };
  next();
}

const router = express.Router();

router.post('/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password e name são obrigatórios' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    return;
  }
  if (users.find(u => u.email === email)) {
    res.status(409).json({ error: 'Email já cadastrado' });
    return;
  }
  const salt = generateSalt();
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  const token = createToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email e password são obrigatórios' });
    return;
  }
  const user = users.find(u => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password, user.salt)) {
    res.status(401).json({ error: 'Email ou senha inválidos' });
    return;
  }
  const token = createToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: { userId: string; email: string } }).user;
  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }
  res.json({ user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Sessão encerrada' });
});

export default router;

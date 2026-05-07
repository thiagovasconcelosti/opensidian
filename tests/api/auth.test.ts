import express from 'express';
import { createServer, type Server } from 'http';
import authRoutes from '../../src/api/auth.js';

describe('Auth routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

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

  it('registers, logs in, validates token and logs out', async () => {
    const badRegister = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(badRegister.status).toBe(400);

    const shortPassword = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: '123', name: 'A' }),
    });
    expect(shortPassword.status).toBe(400);

    const register = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@site.com', password: '123456', name: 'User' }),
    });
    expect(register.status).toBe(201);
    const registerJson = await register.json();
    expect(registerJson.token).toBeTypeOf('string');

    const dup = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@site.com', password: '123456', name: 'User' }),
    });
    expect(dup.status).toBe(409);

    const badLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@site.com', password: 'wrong' }),
    });
    expect(badLogin.status).toBe(401);

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@site.com', password: '123456' }),
    });
    expect(login.status).toBe(200);
    const loginJson = await login.json();
    expect(loginJson.token).toBeTypeOf('string');

    const missingToken = await fetch(`${baseUrl}/auth/me`);
    expect(missingToken.status).toBe(401);

    const invalidToken = await fetch(`${baseUrl}/auth/me`, {
      headers: { authorization: 'Bearer invalid.token.value' },
    });
    expect(invalidToken.status).toBe(401);

    const me = await fetch(`${baseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${loginJson.token}` },
    });
    expect(me.status).toBe(200);
    const meJson = await me.json();
    expect(meJson.user.email).toBe('user@site.com');

    const logout = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
    expect(logout.status).toBe(200);
  });
});


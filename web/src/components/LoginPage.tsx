import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#6C31E0"/>
            <path d="M8 10h16M8 16h16M8 22h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <h1>OpenSidian</h1>
        </div>
        <h2>Entrar</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-link">
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}

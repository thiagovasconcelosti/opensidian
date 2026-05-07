import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setBusy(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
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
        <h2>Criar conta</h2>
        <form onSubmit={handleSubmit}>
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="auth-link">
          Já tem conta? <Link to="/login">Entre</Link>
        </p>
      </div>
    </div>
  );
}

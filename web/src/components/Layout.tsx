import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthUser } from '../api/auth';
import ThemeSelector from './ThemeSelector';

interface LayoutProps {
  children: ReactNode;
  currentVault: string;
  onVaultChange: (vault: string) => void;
  user: AuthUser;
  onLogout: () => void;
}

export default function Layout(props: LayoutProps) {
  const { children, currentVault, user, onLogout } = props;
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#6C31E0"/>
              <path d="M8 10h16M8 16h16M8 22h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            OpenSidian
          </h1>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            📂 Vaults
          </Link>
          <Link to="/search" className={`nav-item ${location.pathname === '/search' ? 'active' : ''}`}>
            🔍 Busca avançada
          </Link>
          {currentVault && (
            <>
              <Link to="/notes" className={`nav-item ${location.pathname.startsWith('/notes') ? 'active' : ''}`}>
                📝 Notas
              </Link>
              <Link to="/graph" className={`nav-item ${location.pathname === '/graph' ? 'active' : ''}`}>
                🔗 Grafo
              </Link>
            </>
          )}
        </nav>

        <div style={{ flex: 1 }} />

        <ThemeSelector />

        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: 4 }}>{user.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 8 }}>{user.email}</div>
          <button onClick={onLogout} style={{ width: '100%', fontSize: '12px', padding: '4px 8px' }}>
            Sair
          </button>
        </div>

        {currentVault && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Vault: {currentVault.split('/').pop() || currentVault}
          </div>
        )}
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
